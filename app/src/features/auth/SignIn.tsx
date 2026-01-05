import { FormEvent, useMemo, useState } from "react";
import { Lock, Mail } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";

export function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState<"login" | "register">("login");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [registerErrors, setRegisterErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    form?: string;
  }>({});

  const supabase = useMemo(() => getSupabaseClient(), []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = email.trim();
    const trimmedPassword = password.trim();
    const nextErrors: typeof errors = {};

    if (!trimmed) {
      nextErrors.email = "Email is required";
    }

    if (!trimmedPassword) {
      nextErrors.password = "Password is required";
    }

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    setErrors({});

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmed,
        password: trimmedPassword,
      });

      if (signInError) {
        console.error("Supabase sign-in error", signInError);
        const message =
          signInError.message === "Failed to fetch"
            ? "We couldn't reach the authentication service. Please check your Supabase URL/Anon key and network connectivity."
            : signInError.message;
        setErrors({ form: message });
        return;
      }

      toast({
        title: "Signed in",
        description: "Welcome back! Redirecting to your workspace.",
      });
    } catch (unexpected) {
      console.error("Unexpected Supabase sign-in error", unexpected);
      setErrors({ form: "We couldn't sign you in. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedConfirm = confirmPassword.trim();
    const nextErrors: typeof registerErrors = {};

    if (!trimmedEmail) {
      nextErrors.email = "Email is required";
    }

    if (!trimmedPassword) {
      nextErrors.password = "Password is required";
    } else if (trimmedPassword.length < 6) {
      nextErrors.password = "Password must be at least 6 characters";
    }

    if (trimmedConfirm !== trimmedPassword) {
      nextErrors.confirmPassword = "Passwords must match";
    }

    if (Object.keys(nextErrors).length) {
      setRegisterErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    setRegisterErrors({});

    try {
      const { error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: trimmedPassword,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        const message =
          error.message === "Failed to fetch"
            ? "We couldn't reach the authentication service. Please verify your Supabase configuration or try again shortly."
            : error.message;
        setRegisterErrors({ form: message });
        return;
      }

      toast({
        title: "Account created",
        description: "Check your email to confirm your account, then sign in.",
      });
      setTab("login");
    } catch (unexpected) {
      console.error("Unexpected Supabase sign-up error", unexpected);
      setRegisterErrors({ form: "We couldn't create your account. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription>Sign in with your email and password to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign in</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
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
                      placeholder="you@oldauta.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="pl-10"
                      disabled={submitting}
                      required
                    />
                  </div>
                  {errors.email ? <p className="text-sm text-destructive">{errors.email}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="signin-password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="pl-10"
                      disabled={submitting}
                      required
                    />
                  </div>
                  {errors.password ? <p className="text-sm text-destructive">{errors.password}</p> : null}
                </div>

                {errors.form ? <p className="text-sm text-destructive">{errors.form}</p> : null}

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form className="space-y-4" onSubmit={handleRegister} noValidate>
                <div className="space-y-2">
                  <Label htmlFor="register-email">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="register-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="you@oldauta.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="pl-10"
                      disabled={submitting}
                      required
                    />
                  </div>
                  {registerErrors.email ? <p className="text-sm text-destructive">{registerErrors.email}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-password">Password</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="register-password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="pl-10"
                      disabled={submitting}
                      required
                    />
                  </div>
                  {registerErrors.password ? <p className="text-sm text-destructive">{registerErrors.password}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-confirm-password">Confirm password</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="register-confirm-password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className="pl-10"
                      disabled={submitting}
                      required
                    />
                  </div>
                  {registerErrors.confirmPassword ? (
                    <p className="text-sm text-destructive">{registerErrors.confirmPassword}</p>
                  ) : null}
                </div>

                {registerErrors.form ? <p className="text-sm text-destructive">{registerErrors.form}</p> : null}

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Creating account…" : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
