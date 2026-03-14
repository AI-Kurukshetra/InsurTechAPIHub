"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { MainLayout } from "@/components/layout/main-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseClient, getCurrentUserProfile, getEmployerCompanyPlans, removeEmployerCompanyPlan } from "@/lib/supabase/client";

type CompanyPlan = {
  id: string;
  employer_id: string;
  plan_id: string;
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

export default function CompanyPlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<CompanyPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentEmployerId, setCurrentEmployerId] = useState<string | null>(null);
  const [removingPlanId, setRemovingPlanId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseClient();

    const loadCompanyPlans = async () => {
      const { data: profile, error: profileError } = await getCurrentUserProfile(supabase);
      if (profileError || !profile) {
        router.replace("/sign-in");
        return;
      }

      if (profile.role !== "employer" && profile.role !== "admin") {
        router.replace("/dashboard");
        return;
      }

      setCurrentEmployerId(profile.id);

      const { data, error } = await getEmployerCompanyPlans(profile.id, supabase);
      if (error) {
        setErrorMessage(error.message);
        setPlans([]);
        setIsLoading(false);
        return;
      }

      setPlans((data ?? []) as CompanyPlan[]);
      setErrorMessage(null);
      setIsLoading(false);
    };

    loadCompanyPlans();
  }, [router]);

  async function handleRemove(planId: string) {
    if (!currentEmployerId) {
      return;
    }

    setRemovingPlanId(planId);
    setErrorMessage(null);

    const supabase = createSupabaseClient();
    const { error } = await removeEmployerCompanyPlan(currentEmployerId, planId, supabase);
    setRemovingPlanId(null);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setPlans((current) => current.filter((item) => item.plan_id !== planId));
  }

  return (
    <MainLayout>
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-100">Company Plans</h1>
        <p className="text-sm text-neutral-400">Plans selected for your company benefits portfolio.</p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Selected Plans</CardTitle>
          <CardDescription>Manage plans available to your employees.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? <p className="text-sm text-neutral-400">Loading company plans...</p> : null}
          {errorMessage ? <p className="text-sm text-red-300">{errorMessage}</p> : null}

          {!isLoading && !errorMessage && plans.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-neutral-400">No company plans selected yet.</p>
              <Button asChild variant="secondary">
                <Link href="/plans">Browse Plans</Link>
              </Button>
            </div>
          ) : null}

          {plans.map((plan) => (
            <div key={plan.id} className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-neutral-100">{plan.insurance_plans?.name ?? "Unknown Plan"}</p>
                <Badge>{plan.insurance_plans?.coverage_type ?? "Coverage"}</Badge>
              </div>
              <p className="text-sm text-neutral-400">{plan.insurance_plans?.carrier ?? "Unknown Carrier"}</p>
              <div className="mt-2 flex flex-wrap gap-4 text-xs text-neutral-500">
                <span>Premium: {formatMoney(Number(plan.insurance_plans?.premium ?? 0))}</span>
                <span>Deductible: {formatMoney(Number(plan.insurance_plans?.deductible ?? 0))}</span>
              </div>
              <div className="mt-3 flex gap-2">
                <Button asChild variant="secondary">
                  <Link href={`/plans/${plan.plan_id}`}>View Details</Link>
                </Button>
                <Button onClick={() => handleRemove(plan.plan_id)} disabled={removingPlanId === plan.plan_id}>
                  {removingPlanId === plan.plan_id ? "Removing..." : "Remove from Company"}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </MainLayout>
  );
}
