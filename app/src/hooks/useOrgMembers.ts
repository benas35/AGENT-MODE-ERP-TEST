import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface OrgMemberSummary {
  id: string;
  displayName: string;
  email?: string | null;
  role?: string | null;
  active: boolean;
  avatarUrl?: string | null;
}

interface UseOrgMembersOptions {
  includeInactive?: boolean;
}

const buildDisplayName = (
  firstName?: string | null,
  lastName?: string | null,
  email?: string | null,
) => {
  const name = [firstName, lastName].filter(Boolean).join(" ");
  if (name) return name;
  return email ?? "Unknown";
};

export const useOrgMembers = (options: UseOrgMembersOptions = {}) => {
  const { profile } = useAuth();
  const [members, setMembers] = useState<OrgMemberSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    if (!profile?.org_id) {
      setMembers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from("profiles")
        .select("id, first_name, last_name, email, role, active, avatar_url")
        .eq("org_id", profile.org_id)
        .order("first_name", { ascending: true });

      if (!options.includeInactive) {
        query = query.eq("active", true);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error("Failed to fetch org members", fetchError);
        setError(fetchError.message);
        setMembers([]);
        return;
      }

      const normalized = (data ?? []).map<OrgMemberSummary>((member) => ({
        id: member.id,
        displayName: buildDisplayName(
          member.first_name as string | null,
          member.last_name as string | null,
          member.email as string | null,
        ),
        email: member.email as string | null,
        role: member.role as string | null,
        active: Boolean(member.active),
        avatarUrl: member.avatar_url as string | null,
      }));

      setMembers(normalized);
    } catch (err) {
      console.error("Error loading org members", err);
      setError(err instanceof Error ? err.message : "Unable to load team members");
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [profile?.org_id, options.includeInactive]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  return {
    members,
    loading,
    error,
    refresh: loadMembers,
  };
};
