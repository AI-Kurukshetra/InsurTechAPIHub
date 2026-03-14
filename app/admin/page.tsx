"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseClient, getCurrentUserProfile } from "@/lib/supabase/client";

export default function AdminPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseClient();

    const validateRole = async () => {
      const { data, error } = await getCurrentUserProfile(supabase);
      if (error || !data) {
        router.replace("/sign-in");
        return;
      }

      if (data.role !== "admin") {
        router.replace("/dashboard");
        return;
      }

      setIsLoading(false);
    };

    validateRole();
  }, [router]);

  if (isLoading) {
    return (
      <MainLayout>
        <Card>
          <CardHeader>
            <CardTitle>Loading admin panel...</CardTitle>
            <CardDescription>Checking admin privileges.</CardDescription>
          </CardHeader>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-100">Admin Panel</h1>
        <p className="text-sm text-neutral-400">Manage users, employer approvals, and plan catalog operations.</p>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Manage Users</CardTitle>
            <CardDescription>Browse employee directory and status.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary">
              <Link href="/employees">Open Users</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Employer Requests</CardTitle>
            <CardDescription>Review pending employer access requests.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary">
              <Link href="/dashboard#employer-requests">Review Requests</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create Insurance Plans</CardTitle>
            <CardDescription>Add and manage available insurance plans.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/plans/new">Create Plan</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </MainLayout>
  );
}
