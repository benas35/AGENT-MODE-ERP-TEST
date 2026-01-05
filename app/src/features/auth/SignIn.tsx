import { FormEvent, useMemo, useState } from "react";
import { Mail } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

export function SignIn() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => getSupabaseClient(), []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError("Email is required");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (signInError) {
        const message =
          signInError.message === "Failed to fetch"
            ? "We couldn't reach the authentication service. Please verify your Supabase configuration or try again."
            : signInError.message;
        setError(message);
        return;
      }

      toast({
        title: "Check your email",
        description: "We sent you a magic link to sign in.",
      });
    } catch (unexpected) {
      console.error("Unexpected Supabase sign-in error", unexpected);
      setError("We couldn't send a magic link. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription>Enter your email and we&apos;ll send you a magic link to sign in.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div className="space-y-2">
              <Label htmlFor="signin-email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="signin-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="pl-10"
                  disabled={submitting}
                  required
                />
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Sending magic link…" : "Send magic link"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
