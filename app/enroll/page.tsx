"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { MainLayout } from "@/components/layout/main-layout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createEnrollment, createSupabaseClient, getCurrentUserProfile } from "@/lib/supabase/client";

type InsurancePlan = {
  id: string;
  name: string;
  carrier: string;
  premium: number;
  deductible: number;
  coverage_type: string;
  network_type: string;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    value,
  );
}

export default function EnrollmentWizardPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<InsurancePlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [enrollmentStatusByPlan, setEnrollmentStatusByPlan] = useState<Record<string, "active" | "cancelled">>({});
  const [step, setStep] = useState<1 | 2>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseClient();

    const loadData = async () => {
      const { data: profile, error: profileError } = await getCurrentUserProfile(supabase);
      if (profileError || !profile) {
        router.replace("/sign-in");
        return;
      }

      if (profile.role !== "employee") {
        router.replace("/dashboard");
        return;
      }

      setCurrentUserId(profile.id);
      const { data: planData, error: planError } = await supabase
        .from("insurance_plans")
        .select("id, name, carrier, premium, deductible, coverage_type, network_type")
        .order("created_at", { ascending: false });

      if (planError) {
        setMessage(planError.message);
        setIsLoading(false);
        return;
      }

      const { data: enrollmentRows } = await supabase
        .from("enrollments")
        .select("plan_id, status, created_at")
        .eq("user_id", profile.id)
        .in("plan_id", (planData ?? []).map((plan) => plan.id))
        .order("created_at", { ascending: false });

      const statusMap: Record<string, "active" | "cancelled"> = {};
      for (const row of enrollmentRows ?? []) {
        const planId = row.plan_id as string;
        if (!statusMap[planId]) {
          statusMap[planId] = row.status as "active" | "cancelled";
        }
      }

      setEnrollmentStatusByPlan(statusMap);
      setPlans((planData ?? []) as InsurancePlan[]);
      setIsLoading(false);
    };

    loadData();
  }, [router]);

  const filteredPlans = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return plans;
    }

    return plans.filter((plan) => {
      return plan.name.toLowerCase().includes(term) || plan.carrier.toLowerCase().includes(term);
    });
  }, [plans, searchTerm]);

  const selectedPlan = selectedPlanId ? plans.find((plan) => plan.id === selectedPlanId) ?? null : null;

  async function handleEnroll() {
    if (!currentUserId || !selectedPlanId) {
      return;
    }

    if (enrollmentStatusByPlan[selectedPlanId] === "active") {
      setMessage("You already have an active enrollment for this plan.");
      return;
    }

    setIsEnrolling(true);
    setMessage(null);
    const supabase = createSupabaseClient();
    const { error } = await createEnrollment({ userId: currentUserId, planId: selectedPlanId }, supabase);
    setIsEnrolling(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setEnrollmentStatusByPlan((current) => ({
      ...current,
      [selectedPlanId]: "active",
    }));
    setMessage("Enrollment created successfully.");
    router.replace("/enrollments");
  }

  return (
    <MainLayout>
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-100">Enrollment Wizard</h1>
        <p className="text-sm text-neutral-400">Pick a plan and complete your enrollment.</p>
      </section>

      {message ? (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? (
        <Card>
          <CardHeader>
            <CardTitle>Loading plans...</CardTitle>
            <CardDescription>Preparing enrollment options.</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {!isLoading ? (
        <section className="grid gap-6 lg:grid-cols-12">
          <Card className="lg:col-span-7">
            <CardHeader>
              <CardTitle>Step 1: Choose a Plan</CardTitle>
              <CardDescription>Select a plan to enroll.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Search by plan name or carrier..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              <div className="space-y-3">
                {filteredPlans.length === 0 ? (
                  <p className="text-sm text-neutral-400">No plans match your search.</p>
                ) : null}
                {filteredPlans.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      selectedPlanId === plan.id
                        ? "border-cyan-300 bg-neutral-900"
                        : "border-neutral-800 bg-neutral-950/60 hover:border-neutral-700"
                    }`}
                    onClick={() => {
                      setSelectedPlanId(plan.id);
                      setStep(2);
                    }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-neutral-100">{plan.name}</p>
                        <p className="text-xs text-neutral-500">{plan.carrier}</p>
                      </div>
                      <Badge>{plan.coverage_type}</Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-neutral-500">
                      <span>Premium: {formatMoney(Number(plan.premium))}</span>
                      <span>Deductible: {formatMoney(Number(plan.deductible))}</span>
                      <span>Network: {plan.network_type}</span>
                    </div>
                    {enrollmentStatusByPlan[plan.id] === "active" ? (
                      <div className="mt-2 text-xs text-emerald-300">Already enrolled</div>
                    ) : null}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-5">
            <CardHeader>
              <CardTitle>Step 2: Confirm Enrollment</CardTitle>
              <CardDescription>Review your selected plan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedPlan ? (
                <p className="text-sm text-neutral-400">Select a plan to continue.</p>
              ) : (
                <>
                  <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 text-sm text-neutral-300">
                    <p className="text-base font-semibold text-neutral-100">{selectedPlan.name}</p>
                    <p className="text-xs text-neutral-500">{selectedPlan.carrier}</p>
                    <div className="mt-2 grid gap-2 text-xs text-neutral-500">
                      <span>Coverage: {selectedPlan.coverage_type}</span>
                      <span>Network: {selectedPlan.network_type}</span>
                      <span>Premium: {formatMoney(Number(selectedPlan.premium))}</span>
                      <span>Deductible: {formatMoney(Number(selectedPlan.deductible))}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setStep(1)}>
                      Back
                    </Button>
                    <Button
                      onClick={handleEnroll}
                      disabled={isEnrolling || enrollmentStatusByPlan[selectedPlan.id] === "active"}
                    >
                      {isEnrolling ? "Enrolling..." : "Confirm Enrollment"}
                    </Button>
                  </div>
                </>
              )}
              {step === 1 ? (
                <p className="text-xs text-neutral-500">Choose a plan on the left to proceed.</p>
              ) : null}
            </CardContent>
          </Card>
        </section>
      ) : null}
    </MainLayout>
  );
}
