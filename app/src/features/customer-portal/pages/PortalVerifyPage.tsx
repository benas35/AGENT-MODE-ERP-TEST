import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { usePortalSession } from "../hooks/usePortalSession";

export const PortalVerifyPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyToken, session } = usePortalSession();
  const [state, setState] = useState<"loading" | "error">("loading");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setState("error");
      return;
    }

    verifyToken(token).then((success) => {
      if (success) {
        navigate("/portal/app", { replace: true });
      } else {
        setState("error");
      }
    });
  }, [searchParams, verifyToken, navigate]);

  useEffect(() => {
    if (session) {
      navigate("/portal/app", { replace: true });
    }
  }, [session, navigate]);

  if (state === "error") {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-lg font-medium">Nuoroda nebegalioja</p>
        <p className="text-sm text-muted-foreground">
          Prašome paprašyti naujos nuorodos arba susisiekti su patarėju.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" />
      <p>Tvirtiname nuorodą...</p>
    </div>
  );
};
