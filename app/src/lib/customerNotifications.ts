import { supabase } from "@/integrations/supabase/client";

export type CustomerNotificationChannel = "email" | "sms" | "whatsapp" | "call";

export interface SendCustomerNotificationOptions {
  orgId: string;
  customerId: string;
  workOrderId?: string;
  type?: "status" | "issue" | "estimate" | "history" | "approval";
  subject?: string;
  message: string;
  link?: string;
  channels?: CustomerNotificationChannel[];
}

export interface CustomerNotificationResponse {
  status: string;
  results?: Record<string, unknown>;
  error?: string;
}

export const sendCustomerNotification = async (
  options: SendCustomerNotificationOptions,
): Promise<CustomerNotificationResponse> => {
  const { data, error } = await supabase.functions.invoke(
    "customer-notify",
    {
      body: {
        type: options.type ?? "status",
        orgId: options.orgId,
        customerId: options.customerId,
        workOrderId: options.workOrderId ?? null,
        subject: options.subject,
        message: options.message,
        link: options.link,
        channels: options.channels,
      },
    },
  );

  if (error) {
    throw new Error(error.message ?? "Unable to send customer notification");
  }

  if (data?.error) {
    throw new Error(
      typeof data.error === "string"
        ? data.error
        : "Unable to send customer notification",
    );
  }

  return (data ?? { status: "unknown" }) as CustomerNotificationResponse;
};
