import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.6";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
const SENDGRID_SENDER = Deno.env.get("SENDGRID_SENDER_EMAIL") ?? "noreply@example.com";
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_FROM_NUMBER = Deno.env.get("TWILIO_FROM_NUMBER");
const WHATSAPP_FROM_NUMBER = Deno.env.get("TWILIO_WHATSAPP_FROM_NUMBER");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase configuration for customer-notify edge function");
}

type NotificationType = "status" | "issue" | "estimate" | "history";

type NotificationPayload = {
  type?: NotificationType;
  orgId?: string;
  customerId?: string;
  workOrderId?: string;
  subject?: string;
  message?: string;
  link?: string;
};

const sendEmail = async (to: string, subject: string, html: string) => {
  if (!SENDGRID_API_KEY) {
    return { delivered: false, reason: "sendgrid not configured" };
  }

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email: to }],
          subject,
        },
      ],
      from: { email: SENDGRID_SENDER, name: "ProFix Auto Services" },
      content: [{ type: "text/html", value: html }],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("SendGrid error", text);
    return { delivered: false, reason: text };
  }

  return { delivered: true };
};

const sendSms = async (to: string, body: string) => {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    return { delivered: false, reason: "twilio not configured" };
  }

  const params = new URLSearchParams({ To: to, From: TWILIO_FROM_NUMBER, Body: body });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("Twilio SMS error", text);
    return { delivered: false, reason: text };
  }

  return { delivered: true };
};

const sendWhatsAppPlaceholder = async (to: string, body: string) => {
  if (!WHATSAPP_FROM_NUMBER) {
    return { delivered: false, reason: "whatsapp not configured" };
  }
  console.log(`WhatsApp message to ${to} from ${WHATSAPP_FROM_NUMBER}: ${body}`);
  return { delivered: false, reason: "placeholder" };
};

const buildEmailTemplate = (type: NotificationType, message: string, link?: string) => {
  const header =
    type === "status"
      ? "Darbo užsakymo statusas atnaujintas"
      : type === "issue"
        ? "Nauja nuotrauka iš serviso"
        : type === "estimate"
          ? "Naujas sąmatos pasiūlymas"
          : "Serviso istorijos eksportas";

  const action = link ? `<p><a href="${link}" style="color:#2563eb;">Peržiūrėti detales</a></p>` : "";
  return `<h2>${header}</h2><p>${message}</p>${action}`;
};

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

  let payload: NotificationPayload;
  try {
    payload = (await req.json()) as NotificationPayload;
  } catch (error) {
    console.error("Invalid JSON payload", error);
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { type = "status", customerId, orgId, workOrderId, message, subject, link } = payload;

  if (!customerId || !orgId) {
    return new Response(JSON.stringify({ error: "Missing customerId or orgId" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!);

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("first_name, last_name, email, phone")
    .eq("id", customerId)
    .maybeSingle();

  if (customerError || !customer) {
    console.error("Customer fetch error", customerError);
    return new Response(JSON.stringify({ error: "Unable to load customer" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: preferences } = await supabase
    .from("customer_notification_preferences")
    .select("notify_email, notify_sms, notify_whatsapp")
    .eq("customer_id", customerId)
    .maybeSingle();

  const emailMessage = message ?? "Turime naujienų dėl jūsų darbo užsakymo.";
  const emailSubject = subject ?? "ProFix Auto pranešimas";
  const html = buildEmailTemplate(type, emailMessage, link);

  const results: Record<string, unknown> = {};

  if (preferences?.notify_email !== false && customer.email) {
    results.email = await sendEmail(customer.email, emailSubject, html);
  }

  if (preferences?.notify_sms !== false && customer.phone) {
    results.sms = await sendSms(customer.phone, emailMessage.slice(0, 150));
  }

  if (preferences?.notify_whatsapp && customer.phone) {
    results.whatsapp = await sendWhatsAppPlaceholder(customer.phone, emailMessage);
  }

  await supabase.from("customer_messages").insert({
    org_id: orgId,
    customer_id: customerId,
    work_order_id: workOrderId ?? null,
    direction: "staff",
    body: emailMessage,
    metadata: {
      type,
      link,
      subject: emailSubject,
      notification: true,
    },
  });

  return new Response(JSON.stringify({ status: "queued", results }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
};

serve(handler);
