import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Wrench, Mail, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { z } from 'zod';

const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
});

export default function Auth() {
  const { user, loading, signIn, signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Redirect if already authenticated
  if (user && !loading) {
    return <Navigate to="/" replace />;
  }

  // Show loading while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-dashboard">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    const formData = new FormData(e.currentTarget);
    const data = {
      email: formData.get('email') as string,
    };

    try {
      if (!data.email || !z.string().email().safeParse(data.email).success) {
        setErrors({ email: 'Invalid email address' });
        return;
      }

      await signIn(data.email);
    } catch (error) {
      console.error('Magic link error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    const formData = new FormData(e.currentTarget);
    const data = {
      email: formData.get('email') as string,
      first_name: formData.get('first_name') as string,
      last_name: formData.get('last_name') as string,
    };

    try {
      const validation = signUpSchema.safeParse(data);
      if (!validation.success) {
        const fieldErrors: Record<string, string> = {};
        validation.error.errors.forEach((error) => {
          if (error.path[0]) {
            fieldErrors[error.path[0] as string] = error.message;
          }
        });
        setErrors(fieldErrors);
        return;
      }

      await signUp(data.email, undefined, {
        first_name: data.first_name,
        last_name: data.last_name,
      });
    } catch (error) {
      console.error('Sign up error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-dashboard p-4">
      <Card className="w-full max-w-md shadow-elevated">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-primary text-primary-foreground p-3 rounded-lg">
              <Wrench className="h-8 w-8" />
            </div>
          </div>
          <CardTitle className="text-2xl">Auto Shop ERP</CardTitle>
          <CardDescription>
            Sign in to manage your automotive business
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="signin" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Magic Link</TabsTrigger>
              <TabsTrigger value="signup">Request Access</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email (we'll send a magic link)</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="signin-email"
                      name="email"
                      type="email"
                      placeholder="john@example.com"
                      className="pl-10"
                      required
                    />
                  </div>
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading ? "Sending link..." : "Send magic link"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-first-name">First Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="signup-first-name"
                        name="first_name"
                        placeholder="John"
                        className="pl-10"
                        required
                      />
                    </div>
                    {errors.first_name && <p className="text-sm text-destructive">{errors.first_name}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-last-name">Last Name</Label>
                    <Input
                      id="signup-last-name"
                      name="last_name"
                      placeholder="Doe"
                      required
                    />
                    {errors.last_name && <p className="text-sm text-destructive">{errors.last_name}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="john@example.com"
                      className="pl-10"
                      required
                    />
                  </div>
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading ? "Sending link..." : "Send magic link"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Separator />
          <div className="text-center text-sm text-muted-foreground">
            <p>Demo Accounts (use magic link):</p>
            <p className="font-mono text-xs">owner@demo.com / technician@demo.com</p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
