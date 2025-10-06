import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.6";
import sharp from "https://esm.sh/sharp@0.33.4";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase configuration for media-process edge function");
}

type VehicleMediaKind = "hero" | "front" | "rear" | "interior" | "damage";
type WorkOrderMediaCategory = "before" | "after" | "issue" | "damage" | "progress";

const isVehicleKind = (value: string): value is VehicleMediaKind =>
  ["hero", "front", "rear", "interior", "damage"].includes(value);

const isWorkOrderCategory = (value: string): value is WorkOrderMediaCategory =>
  ["before", "after", "issue", "damage", "progress"].includes(value);

const parseGps = (gpsRaw: string | null) => {
  if (!gpsRaw) return null;
  try {
    const parsed = JSON.parse(gpsRaw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const { lat, lng, accuracy } = parsed as {
      lat?: number;
      lng?: number;
      accuracy?: number;
    };

    if (typeof lat !== "number" || typeof lng !== "number") {
      return null;
    }

    return {
      lat,
      lng,
      accuracy: typeof accuracy === "number" ? accuracy : undefined,
    };
  } catch (_error) {
    return null;
  }
};

export const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const formData = await req.formData();

    const file = formData.get("file");
    const vehicleId = formData.get("vehicleId")?.toString();
    const workOrderId = formData.get("workOrderId")?.toString();
    const orgId = formData.get("orgId")?.toString();
    const caption = formData.get("caption")?.toString() ?? null;
    const gpsRaw = formData.get("gps")?.toString() ?? null;

    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: "Upload payload requires a file" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!orgId || (!vehicleId && !workOrderId)) {
      return new Response(JSON.stringify({ error: "Context is missing" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!file.type.startsWith("image/")) {
      return new Response(JSON.stringify({ error: "Only image uploads are supported" }), {
        status: 415,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (file.size > 20 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "File exceeds 20MB limit" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, org_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile || profile.org_id !== orgId) {
      return new Response(JSON.stringify({ error: "User does not belong to this organization" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const buffer = new Uint8Array(await file.arrayBuffer());
    const fileId = crypto.randomUUID();
    const basePath = vehicleId
      ? `orgs/${orgId}/vehicles/${vehicleId}/${fileId}`
      : `orgs/${orgId}/work-orders/${workOrderId}/${fileId}`;
    const bucket = vehicleId ? "vehicle-photos" : "work-order-photos";
    const originalExt = file.name.split(".").pop()?.toLowerCase() ?? "upload";

    const sharpImage = sharp(buffer, { failOn: "none" }).rotate();

    const [webpLarge, webpThumb, optimizedOriginal] = await Promise.all([
      sharpImage.clone().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(),
      sharpImage.clone().resize({ width: 480, withoutEnlargement: true }).webp({ quality: 75 }).toBuffer(),
      sharpImage.clone().resize({ width: 2560, withoutEnlargement: true }).toBuffer(),
    ]);

    const uploads = [
      {
        path: `${basePath}/original.${originalExt}`,
        body: optimizedOriginal,
        contentType: file.type,
      },
      {
        path: `${basePath}/large.webp`,
        body: webpLarge,
        contentType: "image/webp",
      },
      {
        path: `${basePath}/thumb.webp`,
        body: webpThumb,
        contentType: "image/webp",
      },
    ];

    for (const asset of uploads) {
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(asset.path, asset.body, {
          contentType: asset.contentType,
          upsert: true,
        });

      if (uploadError) {
        console.error("Upload failed", uploadError);
        return new Response(JSON.stringify({ error: "Failed to upload optimized media" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (vehicleId) {
      const kindRaw = formData.get("kind")?.toString() ?? "front";
      const kind = isVehicleKind(kindRaw) ? kindRaw : "front";

      const { data: maxSort } = await supabase
        .from("vehicle_media")
        .select("sort_order")
        .eq("vehicle_id", vehicleId)
        .order("sort_order", { ascending: false })
        .limit(1);

      const nextSort = maxSort && maxSort.length ? (maxSort[0].sort_order ?? 0) + 1 : 0;

      const { data: record, error: insertError } = await supabase
        .from("vehicle_media")
        .insert({
          org_id: orgId,
          vehicle_id: vehicleId,
          kind,
          storage_path: `${basePath}/large.webp`,
          caption,
          sort_order: nextSort,
          created_by: profile.id,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Failed to record vehicle media", insertError);
        return new Response(JSON.stringify({ error: "Unable to record media metadata" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          record,
          assets: {
            original: `${basePath}/original.${originalExt}`,
            large: `${basePath}/large.webp`,
            thumbnail: `${basePath}/thumb.webp`,
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const categoryRaw = formData.get("category")?.toString() ?? "issue";
    const category = isWorkOrderCategory(categoryRaw) ? categoryRaw : "issue";
    const gps = parseGps(gpsRaw);

    const { data: record, error: insertError } = await supabase
      .from("work_order_media")
      .insert({
        org_id: orgId,
        work_order_id: workOrderId!,
        storage_path: `${basePath}/large.webp`,
        category,
        caption,
        gps,
        uploaded_by: profile.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to record work order media", insertError);
      return new Response(JSON.stringify({ error: "Unable to record media metadata" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        record,
        assets: {
          original: `${basePath}/original.${originalExt}`,
          large: `${basePath}/large.webp`,
          thumbnail: `${basePath}/thumb.webp`,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("media-process error", error);
    return new Response(JSON.stringify({ error: "Unexpected error processing media" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

if (import.meta.main) {
  serve(handler);
}
