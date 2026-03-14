"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { MainLayout } from "@/components/layout/main-layout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseClient, getCurrentUserProfile, getEnrollments } from "@/lib/supabase/client";

type EnrollmentWithPlan = {
  id: string;
  user_id: string;
  plan_id: string;
  status: "active" | "cancelled";
  created_at: string;
  insurance_plans: {
    id: string;
    name: string;
    carrier: string;
    premium: number;
    deductible: number;
    coverage_type: string;
  } | null;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    value,
  );
}

export default function EnrollmentsPage() {
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<EnrollmentWithPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseClient();

    const loadEnrollments = async () => {
      const { data: profile, error: profileError } = await getCurrentUserProfile(supabase);
      if (profileError || !profile) {
        router.replace("/sign-in");
        return;
      }

      const { data, error } = await getEnrollments(profile.role, profile.id, supabase);
      if (error) {
        setErrorMessage(error.message);
        setEnrollments([]);
        setIsLoading(false);
        return;
      }

      setEnrollments((data ?? []) as EnrollmentWithPlan[]);
      setErrorMessage(null);
      setIsLoading(false);
    };

    loadEnrollments();
  }, [router]);

  return (
    <MainLayout>
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-100">Enrollments</h1>
        <p className="text-sm text-neutral-400">Track insurance enrollments by plan and status.</p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Enrollment Records</CardTitle>
          <CardDescription>Role-based view of enrollment activity.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? <p className="text-sm text-neutral-400">Loading enrollments...</p> : null}
          {errorMessage ? <p className="text-sm text-red-300">{errorMessage}</p> : null}

          {!isLoading && !errorMessage && enrollments.length === 0 ? (
            <p className="text-sm text-neutral-400">No enrollment records found.</p>
          ) : null}

          {enrollments.map((enrollment) => (
            <div
              key={enrollment.id}
              className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-neutral-100">
                  {enrollment.insurance_plans?.name ?? "Unknown Plan"}
                </p>
                <Badge variant={enrollment.status === "active" ? "success" : "default"}>{enrollment.status}</Badge>
              </div>
              <p className="text-sm text-neutral-400">{enrollment.insurance_plans?.carrier ?? "Unknown Carrier"}</p>
              <div className="mt-2 flex flex-wrap gap-4 text-xs text-neutral-500">
                <span>Premium: {formatMoney(Number(enrollment.insurance_plans?.premium ?? 0))}</span>
                <span>Deductible: {formatMoney(Number(enrollment.insurance_plans?.deductible ?? 0))}</span>
                <span>
                  Enrolled on{" "}
                  {new Date(enrollment.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </MainLayout>
  );
}
