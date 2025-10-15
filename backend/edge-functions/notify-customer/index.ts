import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.6";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_FROM_NUMBER = Deno.env.get("TWILIO_FROM_NUMBER");
const CUSTOMER_PORTAL_URL = Deno.env.get("CUSTOMER_PORTAL_URL") ?? "https://portal.example.com";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase configuration for notify-customer edge function");
}

type NotificationPayload = {
  orgId?: string;
  workOrderId?: string;
  mediaId?: string;
  category?: string;
  mockContext?: NotificationContext;
};

type NotificationContext = {
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerName: string;
  workOrderNumber: string;
  workOrderStatus?: string | null;
  vehicleLabel?: string | null;
  approvalUrl: string;
  mediaSignedUrl?: string | null;
  caption?: string | null;
};

const buildApprovalUrl = (workOrderId: string) => {
  const url = new URL(CUSTOMER_PORTAL_URL);
  url.searchParams.set("workOrderId", workOrderId);
  return url.toString();
};

const fetchNotificationContext = async (
  supabase: ReturnType<typeof createClient>,
  orgId: string,
  workOrderId: string,
  mediaId: string,
): Promise<NotificationContext | Response> => {
  const { data: workOrder, error: workOrderError } = await supabase
    .from("work_orders")
    .select(
      `id, work_order_number, status,
       customers:customer_id(first_name, last_name, email, phone),
       vehicles:vehicle_id(make, model, year, license_plate)`
    )
    .eq("id", workOrderId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (workOrderError) {
    console.error("Failed to load work order", workOrderError);
    return new Response(JSON.stringify({ error: "Unable to load work order" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!workOrder) {
    return new Response(JSON.stringify({ error: "Work order not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: mediaRecord, error: mediaError } = await supabase
    .from("work_order_media")
    .select("storage_path, caption")
    .eq("id", mediaId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (mediaError) {
    console.error("Failed to load media record", mediaError);
    return new Response(JSON.stringify({ error: "Unable to load media record" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!mediaRecord) {
    return new Response(JSON.stringify({ error: "Media record not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: signed, error: signedError } = await supabase.storage
    .from("work-order-photos")
    .createSignedUrl(mediaRecord.storage_path, 60 * 60 * 4);

  let mediaSignedUrl: string | null = null;
  if (signedError) {
    console.warn("Failed to sign media url", signedError);
  } else {
    mediaSignedUrl = signed?.signedUrl ?? null;
  }

  const vehicle = workOrder.vehicles;
  const customer = workOrder.customers;

  const vehicleLabel = vehicle
    ? `${vehicle.year ?? ""} ${vehicle.make ?? ""} ${vehicle.model ?? ""} ${
        vehicle.license_plate ? `(${vehicle.license_plate})` : ""
      }`.trim()
    : null;

  return {
    customerEmail: customer?.email,
    customerPhone: customer?.phone,
    customerName: [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") || "Customer",
    workOrderNumber: workOrder.work_order_number,
    workOrderStatus: workOrder.status,
    vehicleLabel,
    approvalUrl: buildApprovalUrl(workOrderId),
    mediaSignedUrl,
    caption: mediaRecord.caption,
  };
};

const sendEmail = async (context: NotificationContext) => {
  if (!SENDGRID_API_KEY) {
    return "SendGrid credentials missing";
  }

  if (!context.customerEmail) {
    return "Customer email unavailable";
  }

  const body = {
    personalizations: [
      {
        to: [{ email: context.customerEmail, name: context.customerName }],
        subject: `Action needed: ${context.workOrderNumber} approval`,
      },
    ],
    from: {
      email: "notifications@profix-auto.example",
      name: "ProFix Auto",
    },
    content: [
      {
        type: "text/html",
        value: `
          <p>Hi ${context.customerName},</p>
          <p>We've documented an item that requires your attention for work order <strong>${context.workOrderNumber}</strong>.</p>
          ${context.vehicleLabel ? `<p>Vehicle: ${context.vehicleLabel}</p>` : ""}
          ${context.caption ? `<p><strong>Notes:</strong> ${context.caption}</p>` : ""}
          ${context.mediaSignedUrl ? `<p><img src="${context.mediaSignedUrl}" alt="Issue photo" style="max-width: 100%;" /></p>` : ""}
          <p>Please review and approve the work here: <a href="${context.approvalUrl}">${context.approvalUrl}</a></p>
          <p>Thank you!</p>
        `,
      },
    ],
  };

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("SendGrid error", response.status, errorBody);
    return `SendGrid error: ${response.status}`;
  }

  return null;
};

const sendSms = async (context: NotificationContext) => {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    return "Twilio credentials missing";
  }

  if (!context.customerPhone) {
    return "Customer phone unavailable";
  }

  const payload = new URLSearchParams({
    Body: `Approval requested for ${context.workOrderNumber}. Review: ${context.approvalUrl}`,
    From: TWILIO_FROM_NUMBER,
    To: context.customerPhone,
  });

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: payload,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Twilio error", response.status, errorBody);
    return `Twilio error: ${response.status}`;
  }

  return null;
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

  try {
    const payload = (await req.json()) as NotificationPayload;
    const { orgId, workOrderId, mediaId, category, mockContext } = payload;

    if (!orgId || !workOrderId || !mediaId) {
      return new Response(JSON.stringify({ error: "orgId, workOrderId and mediaId are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (category && category !== "issue") {
      return new Response(JSON.stringify({ status: "ignored", reason: "notifications only fire for issue uploads" }), {
        status: 202,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const contextOrResponse = mockContext
      ? mockContext
      : await fetchNotificationContext(supabase, orgId, workOrderId, mediaId);

    if (contextOrResponse instanceof Response) {
      return contextOrResponse;
    }

    const warnings: string[] = [];

    const emailWarning = await sendEmail(contextOrResponse);
    if (emailWarning) warnings.push(emailWarning);

    const smsWarning = await sendSms(contextOrResponse);
    if (smsWarning) warnings.push(smsWarning);

    return new Response(
      JSON.stringify({
        status: warnings.length ? "queued_with_warnings" : "queued",
        warnings,
      }),
      {
        status: 202,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("notify-customer error", error);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

if (import.meta.main) {
  serve(handler);
}
