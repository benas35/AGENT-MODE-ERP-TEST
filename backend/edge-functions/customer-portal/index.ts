import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.6";
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const JWT_SECRET = Deno.env.get("SUPABASE_JWT_SECRET");
const MAGIC_LINK_BASE_URL = Deno.env.get("PORTAL_MAGIC_LINK_BASE_URL") ?? "https://localhost:8080/portal/session";
const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
const SENDGRID_SENDER = Deno.env.get("SENDGRID_SENDER_EMAIL") ?? "noreply@example.com";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !JWT_SECRET) {
  throw new Error("Missing Supabase configuration for customer-portal edge function");
}

type GenerateLinkPayload = {
  action: "generate_link";
  email: string;
  orgId?: string;
  workOrderNumber?: string;
  customerId?: string;
  advisorId?: string;
};

type VerifyPayload = {
  action: "verify_token";
  token?: string;
};

type RequestPayload = GenerateLinkPayload | VerifyPayload | Record<string, unknown>;

const textEncoder = new TextEncoder();

const hashToken = async (token: string): Promise<string> => {
  const buffer = await crypto.subtle.digest("SHA-256", textEncoder.encode(token));
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const createSupabaseClient = (authHeader?: string) =>
  createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
    global: authHeader ? { headers: { Authorization: authHeader } } : undefined,
  });

const sendMagicLinkEmail = async (email: string, subject: string, html: string) => {
  if (!SENDGRID_API_KEY) return { delivered: false, reason: "missing sendgrid" };

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email }],
          subject,
        },
      ],
      from: { email: SENDGRID_SENDER, name: "ProFix Auto Services" },
      content: [{ type: "text/html", value: html }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("SendGrid failure", errorText);
    return { delivered: false, reason: errorText };
  }

  return { delivered: true };
};

const createPortalJwt = async (sessionId: string, orgId: string, customerId: string, workOrderId: string | null) => {
  const key = textEncoder.encode(JWT_SECRET);
  const payload = {
    sub: sessionId,
    aud: "authenticated",
    role: "customer_portal",
    org_id: orgId,
    customer_id: customerId,
    work_order_id: workOrderId,
    exp: getNumericDate(60 * 60),
    iat: getNumericDate(0),
  };

  return await create({ alg: "HS256", typ: "JWT" }, payload, key);
};

const normalizeEmail = (email?: string) => email?.trim().toLowerCase() ?? "";

const badRequest = (message: string, details?: Record<string, unknown>) =>
  new Response(
    JSON.stringify({ error: message, details }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );

export const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let payload: RequestPayload;
  try {
    payload = (await req.json()) as RequestPayload;
  } catch (error) {
    console.error("Invalid JSON payload", error);
    return badRequest("Invalid JSON payload");
  }

  const authHeader = req.headers.get("Authorization") ?? undefined;
  const supabase = createSupabaseClient(authHeader);

  if (payload.action === "generate_link") {
    const email = normalizeEmail(payload.email);
    const workOrderNumber = payload.workOrderNumber?.trim();
    if (!email) {
      return badRequest("Email is required for magic link generation");
    }

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, org_id, first_name, last_name, email, phone")
      .eq("email", email)
      .maybeSingle();

    if (customerError) {
      console.error("Failed to lookup customer", customerError);
      return new Response(JSON.stringify({ error: "Unable to lookup customer" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!customer) {
      return new Response(JSON.stringify({ error: "Customer not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let workOrderId: string | null = null;
    if (workOrderNumber) {
      const { data: workOrder } = await supabase
        .from("work_orders")
        .select("id")
        .eq("work_order_number", workOrderNumber)
        .eq("customer_id", customer.id)
        .maybeSingle();
      workOrderId = workOrder?.id ?? null;
    }

    const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const hashedToken = await hashToken(token);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();

    const { error: insertError } = await supabase
      .from("customer_portal_sessions")
      .insert({
        org_id: customer.org_id,
        customer_id: customer.id,
        work_order_id: workOrderId,
        magic_token: hashedToken,
        expires_at: expiresAt,
        created_by: payload.advisorId ?? null,
      });

    if (insertError) {
      console.error("Failed to create portal session", insertError);
      return new Response(JSON.stringify({ error: "Unable to create magic link" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const link = `${MAGIC_LINK_BASE_URL}?token=${token}`;
    const html = `
      <p>Sveiki, ${customer.first_name ?? ""} ${customer.last_name ?? ""}</p>
      <p>Paspauskite žemiau esančią nuorodą, kad peržiūrėtumėte savo darbo užsakymo eigą:</p>
      <p><a href="${link}" style="color:#2563eb;">Atidaryti klientų portalą</a></p>
      <p>Nuoroda galioja iki ${new Date(expiresAt).toUTCString()} (UTC).</p>
    `;

    const delivery = await sendMagicLinkEmail(customer.email ?? email, "Jūsų ProFix Auto kliento portalas", html);

    return new Response(
      JSON.stringify({
        status: "sent",
        expiresAt,
        email: customer.email ?? email,
        delivered: delivery.delivered,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (payload.action === "verify_token") {
    const token = payload.token?.trim();
    if (!token) {
      return badRequest("Token is required");
    }

    const hashedToken = await hashToken(token);
    const { data: session, error: sessionError } = await supabase
      .from("customer_portal_sessions")
      .select("id, org_id, customer_id, work_order_id, expires_at, consumed_at")
      .eq("magic_token", hashedToken)
      .gte("expires_at", new Date().toISOString())
      .maybeSingle();

    if (sessionError) {
      console.error("Session lookup failed", sessionError);
      return new Response(JSON.stringify({ error: "Unable to verify token" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!session) {
      return new Response(JSON.stringify({ error: "Session expired or invalid" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await createPortalJwt(session.id, session.org_id, session.customer_id, session.work_order_id);

    await supabase
      .from("customer_portal_sessions")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", session.id);

    const { data: preferences } = await supabase
      .from("customer_notification_preferences")
      .select("notify_email, notify_sms, notify_whatsapp")
      .eq("customer_id", session.customer_id)
      .maybeSingle();

    return new Response(
      JSON.stringify({
        access_token: accessToken,
        token_type: "bearer",
        expires_in: 3600,
        org_id: session.org_id,
        customer_id: session.customer_id,
        work_order_id: session.work_order_id,
        preferences: preferences ?? {
          notify_email: true,
          notify_sms: true,
          notify_whatsapp: false,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return badRequest("Unsupported action", { action: (payload as { action?: string }).action });
};

serve(handler);
