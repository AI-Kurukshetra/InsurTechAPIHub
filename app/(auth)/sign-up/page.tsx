"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createSupabaseClient,
  getCurrentUser,
  getSupabaseConfigError,
  signInWithPassword,
} from "@/lib/supabase/client";

type FormErrors = {
  email?: string;
  password?: string;
};

function validateForm(email: string, password: string): FormErrors {
  const errors: FormErrors = {};
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  if (password.trim().length < 6) {
    errors.password = "Password must be at least 6 characters.";
  }

  return errors;
}

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [authError, setAuthError] = useState<string | null>(null);
  const [configError] = useState<string | null>(() => getSupabaseConfigError());
  const [checkingAuth, setCheckingAuth] = useState(() => !configError);

  useEffect(() => {
    if (configError) {
      return;
    }

    let isMounted = true;
    const supabase = createSupabaseClient();

    const checkAuthState = async () => {
      const { data } = await getCurrentUser(supabase);

      if (!isMounted) {
        return;
      }

      if (data.user) {
        router.replace("/dashboard");
        return;
      }

      setCheckingAuth(false);
    };

    checkAuthState();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        router.replace("/dashboard");
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [configError, router]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError(null);

    const formErrors = validateForm(email, password);
    setErrors(formErrors);

    if (Object.keys(formErrors).length > 0) {
      return;
    }

    if (configError) {
      setAuthError(configError);
      return;
    }

    const supabase = createSupabaseClient();
    setIsLoading(true);
    const response = await fetch("/api/auth/sign-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setAuthError(payload.error ?? "Unable to create account.");
      setIsLoading(false);
      return;
    }

    const { error } = await signInWithPassword(email.trim(), password, supabase);
    setIsLoading(false);

    if (error) {
      setAuthError(error.message);
      return;
    }
    router.replace("/dashboard");
  }

  if (checkingAuth) {
    return (
      <MainLayout>
        <div className="mx-auto w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle>Checking session...</CardTitle>
              <CardDescription>Please wait while we validate your authentication.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mx-auto w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Sign up</CardTitle>
            <CardDescription>Create your InsurTech API Hub account.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={isLoading || Boolean(configError)}
                />
                {errors.email ? <p className="text-sm text-red-300">{errors.email}</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={isLoading || Boolean(configError)}
                />
                {errors.password ? <p className="text-sm text-red-300">{errors.password}</p> : null}
              </div>

              {configError ? (
                <Alert>
                  <AlertDescription>{configError}</AlertDescription>
                </Alert>
              ) : null}

              {authError ? (
                <Alert>
                  <AlertDescription>{authError}</AlertDescription>
                </Alert>
              ) : null}

              <Button className="w-full" type="submit" disabled={isLoading || Boolean(configError)}>
                {isLoading ? "Creating account..." : "Create account"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-neutral-400">
              Already have an account?{" "}
              <Link className="font-medium text-cyan-300 hover:text-cyan-200" href="/sign-in">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
