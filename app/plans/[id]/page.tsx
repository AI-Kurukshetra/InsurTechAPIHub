"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { MainLayout } from "@/components/layout/main-layout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addEmployerCompanyPlan,
  cancelEnrollment,
  createEnrollment,
  createQuote,
  createSupabaseClient,
  getCurrentUserProfile,
  getEmployerCompanyPlanForPlan,
  removeEmployerCompanyPlan,
  getUserEnrollmentForPlan,
  type UserRole,
} from "@/lib/supabase/client";

type InsurancePlan = {
  id: string;
  name: string;
  carrier: string;
  premium: number;
  deductible: number;
  coverage_type: string;
  network_type: string;
  copay: number;
  out_of_pocket_max: number;
  prescription_coverage: string;
  includes_dental: boolean;
  includes_vision: boolean;
  includes_telemedicine: boolean;
  created_by: string | null;
  created_at: string;
};

function isMissingOwnershipColumnError(message?: string) {
  return Boolean(message && message.includes("insurance_plans.created_by"));
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    value,
  );
}

export default function PlanDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const planId = params.id;

  const [plan, setPlan] = useState<InsurancePlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isGeneratingQuote, setIsGeneratingQuote] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [enrollment, setEnrollment] = useState<{ id: string; status: "active" | "cancelled" } | null>(null);
  const [isInCompanyPlans, setIsInCompanyPlans] = useState(false);
  const [isUpdatingCompanyPlans, setIsUpdatingCompanyPlans] = useState(false);
  const [age, setAge] = useState("");
  const [isSmoker, setIsSmoker] = useState(false);
  const [dependents, setDependents] = useState("0");

  useEffect(() => {
    const supabase = createSupabaseClient();

    const loadPlan = async () => {
      const { data: currentProfile, error: profileError } = await getCurrentUserProfile(supabase);
      if (profileError || !currentProfile) {
        router.replace("/sign-in");
        return;
      }

      setIsAdmin(currentProfile.role === "admin");
      setUserRole(currentProfile.role);
      setCurrentUserId(currentProfile.id);

      const { data: ownershipData, error: ownershipError } = await supabase
        .from("insurance_plans")
        .select(
          "id, name, carrier, premium, deductible, coverage_type, network_type, copay, out_of_pocket_max, prescription_coverage, includes_dental, includes_vision, includes_telemedicine, created_by, created_at",
        )
        .eq("id", planId)
        .maybeSingle<InsurancePlan>();

      if (ownershipError && !isMissingOwnershipColumnError(ownershipError.message)) {
        setErrorMessage(ownershipError.message);
        setPlan(null);
        setIsLoading(false);
        return;
      }

      let data = ownershipData;
      if (ownershipError && isMissingOwnershipColumnError(ownershipError.message)) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("insurance_plans")
          .select(
            "id, name, carrier, premium, deductible, coverage_type, network_type, copay, out_of_pocket_max, prescription_coverage, includes_dental, includes_vision, includes_telemedicine, created_at",
          )
          .eq("id", planId)
          .maybeSingle();

        if (fallbackError) {
          setErrorMessage(fallbackError.message);
          setPlan(null);
          setIsLoading(false);
          return;
        }

        data = fallbackData ? ({ ...fallbackData, created_by: null } as InsurancePlan) : null;
      }

      if (!data) {
        setErrorMessage("Plan not found.");
        setPlan(null);
        setIsLoading(false);
        return;
      }

      setPlan(data);
      if (currentProfile.role === "employee") {
        const { data: enrollmentData } = await getUserEnrollmentForPlan(currentProfile.id, planId, supabase);
        setEnrollment(
          enrollmentData
            ? {
                id: enrollmentData.id,
                status: enrollmentData.status,
              }
            : null,
        );
      } else if (currentProfile.role === "employer") {
        const { data: companyPlan } = await getEmployerCompanyPlanForPlan(currentProfile.id, planId, supabase);
        setIsInCompanyPlans(Boolean(companyPlan));
      }
      setErrorMessage(null);
      setIsLoading(false);
    };

    loadPlan();
  }, [planId, router]);

  return (
    <MainLayout>
      {actionMessage ? (
        <Alert>
          <AlertDescription>{actionMessage}</AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? (
        <Card>
          <CardHeader>
            <CardTitle>Loading plan details...</CardTitle>
            <CardDescription>Fetching insurance plan information.</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {!isLoading && errorMessage ? (
        <Card>
          <CardHeader>
            <CardTitle>Unable to load plan</CardTitle>
            <CardDescription>{errorMessage}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary">
              <Link href="/plans">Back to Plans</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && !errorMessage && plan ? (
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <CardTitle className="text-3xl">{plan.name}</CardTitle>
                <CardDescription className="text-base">{plan.carrier}</CardDescription>
              </div>
              <Badge>{plan.coverage_type}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-neutral-400">Monthly Premium</p>
                <p className="text-xl font-semibold text-neutral-100">{formatMoney(Number(plan.premium))}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-400">Deductible</p>
                <p className="text-xl font-semibold text-neutral-100">{formatMoney(Number(plan.deductible))}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-400">Coverage Type</p>
                <p className="font-medium text-neutral-100">{plan.coverage_type}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-400">Network Type</p>
                <p className="font-medium text-neutral-100">{plan.network_type}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-400">Copay</p>
                <p className="font-medium text-neutral-100">{formatMoney(Number(plan.copay))}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-400">Out-of-Pocket Max</p>
                <p className="font-medium text-neutral-100">{formatMoney(Number(plan.out_of_pocket_max))}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-400">Prescription Coverage</p>
                <p className="font-medium text-neutral-100">{plan.prescription_coverage}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-400">Benefits Included</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  <Badge variant={plan.includes_dental ? "success" : "default"}>
                    Dental {plan.includes_dental ? "Included" : "Not Included"}
                  </Badge>
                  <Badge variant={plan.includes_vision ? "success" : "default"}>
                    Vision {plan.includes_vision ? "Included" : "Not Included"}
                  </Badge>
                  <Badge variant={plan.includes_telemedicine ? "success" : "default"}>
                    Telemedicine {plan.includes_telemedicine ? "Included" : "Not Included"}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-sm text-neutral-400">Plan Created</p>
                <p className="font-medium text-neutral-100">
                  {new Date(plan.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild variant="secondary">
                <Link href="/plans">Back to Plans</Link>
              </Button>
              {userRole === "employee" ? (
                <>
                  <Badge variant={enrollment?.status === "active" ? "success" : "default"}>
                    {enrollment?.status === "active"
                      ? "You are enrolled in this plan"
                      : enrollment?.status === "cancelled"
                        ? "Previous enrollment cancelled"
                        : "Not enrolled"}
                  </Badge>
                  <div className="w-full rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 text-sm text-neutral-300">
                    <p className="font-medium text-neutral-100">Generate Quote</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="quote-age">Age</Label>
                        <Input
                          id="quote-age"
                          type="number"
                          min={18}
                          max={100}
                          value={age}
                          onChange={(event) => setAge(event.target.value)}
                          placeholder="e.g. 32"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="quote-dependents">Dependents</Label>
                        <Input
                          id="quote-dependents"
                          type="number"
                          min={0}
                          max={10}
                          value={dependents}
                          onChange={(event) => setDependents(event.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="quote-smoker">Smoker</Label>
                        <select
                          id="quote-smoker"
                          className="h-11 w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 text-sm text-neutral-100 outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                          value={isSmoker ? "yes" : "no"}
                          onChange={(event) => setIsSmoker(event.target.value === "yes")}
                        >
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </select>
                      </div>
                    </div>
                    <Button
                      className="mt-4"
                      onClick={async () => {
                        if (!plan || !currentUserId) {
                          return;
                        }

                        const ageValue = Number(age);
                        const dependentValue = Number(dependents);
                        if (
                          Number.isNaN(ageValue) ||
                          ageValue < 18 ||
                          ageValue > 100 ||
                          Number.isNaN(dependentValue) ||
                          dependentValue < 0 ||
                          dependentValue > 10
                        ) {
                          setActionMessage("Please provide valid demographics (age 18-100, dependents 0-10).");
                          return;
                        }

                        const basePremium = Number(plan.premium);
                        let multiplier = 1;
                        if (ageValue < 30) {
                          multiplier *= 0.9;
                        } else if (ageValue <= 45) {
                          multiplier *= 1.0;
                        } else if (ageValue <= 60) {
                          multiplier *= 1.2;
                        } else {
                          multiplier *= 1.5;
                        }
                        if (isSmoker) {
                          multiplier *= 1.25;
                        }
                        const dependentFactor = Math.min(dependentValue * 0.05, 0.25);
                        multiplier *= 1 + dependentFactor;
                        const estimatedPremium = Math.round(basePremium * multiplier);

                        setActionMessage(null);
                        setIsGeneratingQuote(true);
                        const supabase = createSupabaseClient();
                        const { error } = await createQuote(
                          {
                            userId: currentUserId,
                            planId: plan.id,
                            estimatedPremium,
                            age: ageValue,
                            smoker: isSmoker,
                            dependents: dependentValue,
                          },
                          supabase,
                        );
                        setIsGeneratingQuote(false);

                        if (error) {
                          setActionMessage(error.message);
                          return;
                        }

                        setActionMessage(`Quote generated. Estimated premium: ${formatMoney(estimatedPremium)}.`);
                      }}
                      disabled={isGeneratingQuote}
                      variant="secondary"
                    >
                      {isGeneratingQuote ? "Generating Quote..." : "Generate Quote"}
                    </Button>
                  </div>
                  <Button
                    onClick={async () => {
                      if (!plan || !currentUserId) {
                        return;
                      }

                      if (enrollment?.status === "active") {
                        setActionMessage("You already have an active enrollment for this plan.");
                        return;
                      }

                      setActionMessage(null);
                      setIsEnrolling(true);
                      const supabase = createSupabaseClient();
                      const { error } = await createEnrollment(
                        {
                          userId: currentUserId,
                          planId: plan.id,
                        },
                        supabase,
                      );
                      setIsEnrolling(false);

                      if (error) {
                        setActionMessage(error.message);
                        return;
                      }

                      const { data: latestEnrollment } = await getUserEnrollmentForPlan(currentUserId, plan.id, supabase);
                      setEnrollment(
                        latestEnrollment
                          ? {
                              id: latestEnrollment.id,
                              status: latestEnrollment.status,
                            }
                          : null,
                      );
                      setActionMessage("Enrollment created successfully.");
                    }}
                    disabled={isEnrolling || enrollment?.status === "active"}
                  >
                    {isEnrolling ? "Enrolling..." : "Enroll Now"}
                  </Button>
                  {enrollment?.status === "active" ? (
                    <Button
                      variant="secondary"
                      onClick={async () => {
                        if (!enrollment.id) {
                          return;
                        }

                        setActionMessage(null);
                        setIsCancelling(true);
                        const supabase = createSupabaseClient();
                        const { data: cancelled, error } = await cancelEnrollment(enrollment.id, supabase);
                        setIsCancelling(false);

                        if (error) {
                          setActionMessage(error.message);
                          return;
                        }

                        if (cancelled) {
                          setEnrollment({
                            id: cancelled.id,
                            status: cancelled.status,
                          });
                        }
                        setActionMessage("Enrollment cancelled.");
                      }}
                      disabled={isCancelling}
                    >
                      {isCancelling ? "Cancelling..." : "Cancel Enrollment"}
                    </Button>
                  ) : null}
                </>
              ) : null}
              {userRole === "employer" ? (
                <Button
                  onClick={async () => {
                    if (!currentUserId || !plan) {
                      return;
                    }

                    setActionMessage(null);
                    setIsUpdatingCompanyPlans(true);
                    const supabase = createSupabaseClient();

                    if (isInCompanyPlans) {
                      const { error } = await removeEmployerCompanyPlan(currentUserId, plan.id, supabase);
                      setIsUpdatingCompanyPlans(false);
                      if (error) {
                        setActionMessage(error.message);
                        return;
                      }

                      setIsInCompanyPlans(false);
                      setActionMessage("Plan removed from company plans.");
                      return;
                    }

                    const { error } = await addEmployerCompanyPlan(currentUserId, plan.id, supabase);
                    setIsUpdatingCompanyPlans(false);
                    if (error) {
                      setActionMessage(error.message);
                      return;
                    }

                    setIsInCompanyPlans(true);
                    setActionMessage("Plan added to company plans.");
                  }}
                  disabled={isUpdatingCompanyPlans}
                >
                  {isUpdatingCompanyPlans
                    ? "Updating..."
                    : isInCompanyPlans
                      ? "Remove from Company Plans"
                      : "Add to Company Plans"}
                </Button>
              ) : null}
              {isAdmin ? (
                <Button asChild>
                  <Link href={`/plans/${plan.id}/edit`}>Edit Plan</Link>
                </Button>
              ) : null}
              {userRole === "employer" && currentUserId && plan.created_by === currentUserId ? (
                <Button asChild>
                  <Link href={`/plans/${plan.id}/edit`}>Edit Plan</Link>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </MainLayout>
  );
}
