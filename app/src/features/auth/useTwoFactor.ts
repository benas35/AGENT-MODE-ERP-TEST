import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface EnrollmentResult {
  id: string;
  totp?: {
    qr_code: string | null;
    secret: string | null;
    uri: string | null;
  };
}

export const useTwoFactor = () => {
  const { toast } = useToast();
  const [enrolling, setEnrolling] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [loadingFactors, setLoadingFactors] = useState(false);

  const enroll = useCallback(async (): Promise<EnrollmentResult | null> => {
    setEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });

      if (error) {
        throw error;
      }

      return data as EnrollmentResult;
    } catch (error: any) {
      toast({
        title: "Unable to start 2FA",
        description: error?.message ?? "Check your connection and try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setEnrolling(false);
    }
  }, [toast]);

  const verify = useCallback(
    async (factorId: string, code: string, challengeId?: string) => {
      setVerifying(true);
      try {
        const challenge =
          challengeId ||
          (await supabase.auth.mfa.challenge({ factorId })).data?.id;

        const { error } = await supabase.auth.mfa.verify({
          factorId,
          challengeId: challenge ?? "",
          code,
        });

        if (error) {
          throw error;
        }

        toast({
          title: "Two-factor enabled",
          description: "Codes verified and factor activated.",
        });
        return true;
      } catch (error: any) {
        toast({
          title: "Two-factor verification failed",
          description: error?.message ?? "Invalid code. Please try again.",
          variant: "destructive",
        });
        return false;
      } finally {
        setVerifying(false);
      }
    },
    [toast],
  );

  const disable = useCallback(async (factorId: string) => {
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;

      toast({
        title: "Two-factor disabled",
        description: "Codes will no longer be required at sign in.",
      });
      return true;
    } catch (error: any) {
      toast({
        title: "Unable to disable 2FA",
        description: error?.message ?? "Check your connection and try again.",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  const listFactors = useCallback(async () => {
    setLoadingFactors(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      return data;
    } catch (error: any) {
      toast({
        title: "Unable to load 2FA status",
        description: error?.message ?? "Try refreshing the page.",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoadingFactors(false);
    }
  }, [toast]);

  return {
    enroll,
    verify,
    disable,
    listFactors,
    enrolling,
    verifying,
    loadingFactors,
  };
};
