"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { MainLayout } from "@/components/layout/main-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  cancelEnrollment,
  createEnrollment,
  createSupabaseClient,
  deleteFromTable,
  getCurrentUserProfile,
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
  includes_dental: boolean;
  includes_vision: boolean;
  includes_telemedicine: boolean;
  created_by: string | null;
  created_by_role: "admin" | "employer" | null;
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

function getPlanOwnerLabel(plan: InsurancePlan) {
  if (plan.created_by_role === "employer") {
    return "Created by Employer";
  }

  return "Created by Admin";
}

export default function PlansPage() {
  const [plans, setPlans] = useState<InsurancePlan[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "premium" | "deductible">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEmployer, setIsEmployer] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isEmployee, setIsEmployee] = useState(false);
  const [enrollmentStatusByPlan, setEnrollmentStatusByPlan] = useState<Record<string, "active" | "cancelled">>({});
  const [enrollmentIdByPlan, setEnrollmentIdByPlan] = useState<Record<string, string>>({});
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [enrollingPlanId, setEnrollingPlanId] = useState<string | null>(null);
  const [cancellingPlanId, setCancellingPlanId] = useState<string | null>(null);
  const [enrollErrorByPlan, setEnrollErrorByPlan] = useState<Record<string, string>>({});
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);
  const pageSize = 6;

  useEffect(() => {
    const supabase = createSupabaseClient();

    const fetchPlans = async () => {
      setIsLoading(true);
      const { data: currentProfile } = await getCurrentUserProfile(supabase);
      setIsAdmin(currentProfile?.role === "admin");
      setIsEmployer(currentProfile?.role === "employer");
      setIsEmployee(currentProfile?.role === "employee");
      setCurrentUserId(currentProfile?.id ?? null);

      const { data: ownershipData, error: ownershipError } = await supabase
        .from("insurance_plans")
        .select(
          "id, name, carrier, premium, deductible, coverage_type, network_type, copay, includes_dental, includes_vision, includes_telemedicine, created_by, created_by_role, created_at",
        )
        .order("created_at", { ascending: false })
        .returns<InsurancePlan[]>();

      if (ownershipError && !isMissingOwnershipColumnError(ownershipError.message)) {
        setErrorMessage(ownershipError.message);
        setPlans([]);
        setIsLoading(false);
        return;
      }

      let data = ownershipData ?? [];
      if (ownershipError && isMissingOwnershipColumnError(ownershipError.message)) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("insurance_plans")
          .select(
            "id, name, carrier, premium, deductible, coverage_type, network_type, copay, includes_dental, includes_vision, includes_telemedicine, created_at",
          )
          .order("created_at", { ascending: false });

        if (fallbackError) {
          setErrorMessage(fallbackError.message);
          setPlans([]);
          setIsLoading(false);
          return;
        }

        data = (fallbackData ?? []).map((plan) => ({
          ...plan,
          created_by: null,
          created_by_role: "admin",
        })) as InsurancePlan[];
      }

      setPlans(data ?? []);
      if (currentProfile?.role === "employee" && currentProfile.id && data && data.length > 0) {
        const planIds = data.map((plan) => plan.id);
        const { data: enrollmentRows } = await supabase
          .from("enrollments")
          .select("id, plan_id, status, created_at")
          .eq("user_id", currentProfile.id)
          .in("plan_id", planIds)
          .order("created_at", { ascending: false });

        const nextStatuses: Record<string, "active" | "cancelled"> = {};
        const nextIds: Record<string, string> = {};
        for (const row of enrollmentRows ?? []) {
          const planId = row.plan_id as string;
          if (!nextStatuses[planId]) {
            nextStatuses[planId] = row.status as "active" | "cancelled";
            if (row.id) {
              nextIds[planId] = row.id as string;
            }
          }
        }
        setEnrollmentStatusByPlan(nextStatuses);
        setEnrollmentIdByPlan(nextIds);
      } else {
        setEnrollmentStatusByPlan({});
        setEnrollmentIdByPlan({});
      }
      setErrorMessage(null);
      setIsLoading(false);
    };

    fetchPlans();
  }, []);

  async function handleDeletePlan(planId: string) {
    const shouldDelete = window.confirm("Delete this insurance plan?");
    if (!shouldDelete) {
      return;
    }

    setDeletingPlanId(planId);
    setErrorMessage(null);

    const supabase = createSupabaseClient();
    const { error } = await deleteFromTable("insurance_plans", { id: planId }, supabase);
    setDeletingPlanId(null);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setPlans((current) => current.filter((plan) => plan.id !== planId));
    setSelectedPlanIds((current) => current.filter((id) => id !== planId));
  }

  function togglePlanSelection(planId: string) {
    setSelectedPlanIds((current) => {
      if (current.includes(planId)) {
        return current.filter((id) => id !== planId);
      }

      if (current.length >= 3) {
        return current;
      }

      return [...current, planId];
    });
  }

  function canManagePlan(plan: InsurancePlan) {
    if (isAdmin) {
      return true;
    }

    return isEmployer && currentUserId !== null && plan.created_by === currentUserId;
  }

  async function handleEnroll(planId: string) {
    if (!currentUserId) {
      return;
    }

    setEnrollErrorByPlan((current) => ({ ...current, [planId]: "" }));
    setEnrollingPlanId(planId);
    const supabase = createSupabaseClient();
    const { error } = await createEnrollment({ userId: currentUserId, planId }, supabase);
    setEnrollingPlanId(null);

    if (error) {
      setEnrollErrorByPlan((current) => ({
        ...current,
        [planId]: error.message,
      }));
      return;
    }

    const { data: enrollmentData } = await supabase
      .from("enrollments")
      .select("id, plan_id, status")
      .eq("user_id", currentUserId)
      .eq("plan_id", planId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setEnrollmentStatusByPlan((current) => ({
      ...current,
      [planId]: enrollmentData?.status ?? "active",
    }));
    if (enrollmentData?.id) {
      setEnrollmentIdByPlan((current) => ({
        ...current,
        [planId]: enrollmentData.id as string,
      }));
    }
  }

  async function handleCancelEnrollment(planId: string) {
    const enrollmentId = enrollmentIdByPlan[planId];
    if (!enrollmentId) {
      return;
    }

    setEnrollErrorByPlan((current) => ({ ...current, [planId]: "" }));
    setCancellingPlanId(planId);
    const supabase = createSupabaseClient();
    const { data, error } = await cancelEnrollment(enrollmentId, supabase);
    setCancellingPlanId(null);

    if (error) {
      setEnrollErrorByPlan((current) => ({
        ...current,
        [planId]: error.message,
      }));
      return;
    }

    if (data) {
      setEnrollmentStatusByPlan((current) => ({
        ...current,
        [planId]: data.status,
      }));
    }
  }

  const filteredPlans = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const searchedPlans = !term
      ? plans
      : plans.filter((plan) => {
          return plan.name.toLowerCase().includes(term) || plan.carrier.toLowerCase().includes(term);
        });

    return [...searchedPlans].sort((a, b) => {
      if (sortBy === "name") {
        return sortOrder === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }

      if (sortBy === "premium") {
        return sortOrder === "asc" ? Number(a.premium) - Number(b.premium) : Number(b.premium) - Number(a.premium);
      }

      return sortOrder === "asc"
        ? Number(a.deductible) - Number(b.deductible)
        : Number(b.deductible) - Number(a.deductible);
    });
  }, [plans, searchTerm, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredPlans.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedPlans = useMemo(() => {
    const safePage = currentPage;
    const start = (safePage - 1) * pageSize;
    return filteredPlans.slice(start, start + pageSize);
  }, [currentPage, filteredPlans]);

  return (
    <MainLayout>
      <section className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-100">Insurance Plans</h1>
        <p className="text-sm text-neutral-400">Browse, compare, and evaluate available plans.</p>
        <div className="flex flex-wrap gap-2">
          <Button
            asChild
            variant="secondary"
            disabled={selectedPlanIds.length < 2}
          >
            <Link href={`/plans/compare?ids=${selectedPlanIds.join(",")}`}>Compare Selected ({selectedPlanIds.length})</Link>
          </Button>
          {isAdmin || isEmployer ? (
            <Button asChild>
              <Link href="/plans/new">Create Insurance Plan</Link>
            </Button>
          ) : null}
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Search Plans</CardTitle>
          <CardDescription>Filter by plan name/carrier and sort results.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Input
              placeholder="Search by name or carrier..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select
              className="h-11 w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 text-sm text-neutral-100 outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as "name" | "premium" | "deductible")}
            >
              <option value="name">Sort: Name</option>
              <option value="premium">Sort: Premium</option>
              <option value="deductible">Sort: Deductible</option>
            </select>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSortOrder((current) => (current === "asc" ? "desc" : "asc"))}
            >
              {sortOrder === "asc" ? "Asc" : "Desc"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? <p className="text-sm text-neutral-400">Loading plans...</p> : null}
      {errorMessage ? <p className="text-sm text-red-300">{errorMessage}</p> : null}

      {!isLoading && !errorMessage ? (
        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {paginatedPlans.map((plan) => (
            <Card key={plan.id}>
              <CardHeader className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <Badge>{plan.coverage_type}</Badge>
                </div>
                <CardDescription>{plan.carrier}</CardDescription>
                <div>
                  <Badge>{getPlanOwnerLabel(plan)}</Badge>
                </div>
                {isEmployee ? (
                  <div>
                    <Badge variant={enrollmentStatusByPlan[plan.id] === "active" ? "success" : "default"}>
                      {enrollmentStatusByPlan[plan.id] === "active"
                        ? "Enrolled"
                        : enrollmentStatusByPlan[plan.id] === "cancelled"
                          ? "Enrollment Cancelled"
                          : "Not Enrolled"}
                    </Badge>
                  </div>
                ) : null}
                <label className="flex items-center gap-2 text-xs text-neutral-400">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-neutral-700 bg-neutral-900"
                    checked={selectedPlanIds.includes(plan.id)}
                    onChange={() => togglePlanSelection(plan.id)}
                  />
                  Select for compare (up to 3)
                </label>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between text-neutral-300">
                  <span>Monthly Premium</span>
                  <span className="font-semibold text-neutral-100">{formatMoney(Number(plan.premium))}</span>
                </div>
                <div className="flex items-center justify-between text-neutral-300">
                  <span>Deductible</span>
                  <span className="font-semibold text-neutral-100">{formatMoney(Number(plan.deductible))}</span>
                </div>
                <div className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-3 text-xs text-neutral-400">
                  <p>
                    <span className="text-neutral-200">Network:</span> {plan.network_type}
                  </p>
                  <p>
                    <span className="text-neutral-200">Copay:</span> {formatMoney(Number(plan.copay))}
                  </p>
                  <p>
                    <span className="text-neutral-200">Benefits:</span>{" "}
                    {[plan.includes_dental ? "Dental" : null, plan.includes_vision ? "Vision" : null, plan.includes_telemedicine ? "Telemedicine" : null]
                      .filter(Boolean)
                      .join(", ") || "Standard"}
                  </p>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <Button asChild className="w-full" variant="secondary">
                    <Link href={`/plans/${plan.id}`}>View Details</Link>
                  </Button>
                  {canManagePlan(plan) ? (
                    <Button asChild className="w-full" variant="secondary">
                      <Link href={`/plans/${plan.id}/edit`}>Edit</Link>
                    </Button>
                  ) : null}
                </div>
                {isEmployee ? (
                  <div className="space-y-2">
                    <Button
                      className="w-full"
                      onClick={() => handleEnroll(plan.id)}
                      disabled={enrollingPlanId === plan.id || enrollmentStatusByPlan[plan.id] === "active"}
                    >
                      {enrollingPlanId === plan.id
                        ? "Enrolling..."
                        : enrollmentStatusByPlan[plan.id] === "active"
                          ? "Enrolled"
                          : "Enroll Now"}
                    </Button>
                    {enrollmentStatusByPlan[plan.id] === "active" ? (
                      <Button
                        className="w-full"
                        variant="secondary"
                        onClick={() => handleCancelEnrollment(plan.id)}
                        disabled={cancellingPlanId === plan.id}
                      >
                        {cancellingPlanId === plan.id ? "Cancelling..." : "Cancel Enrollment"}
                      </Button>
                    ) : null}
                    {enrollErrorByPlan[plan.id] ? (
                      <p className="text-xs text-red-300">{enrollErrorByPlan[plan.id]}</p>
                    ) : null}
                  </div>
                ) : null}
                {canManagePlan(plan) ? (
                  <Button
                    className="w-full"
                    onClick={() => handleDeletePlan(plan.id)}
                    disabled={deletingPlanId === plan.id}
                  >
                    {deletingPlanId === plan.id ? "Deleting..." : "Delete Plan"}
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </section>
      ) : null}

      {!isLoading && !errorMessage && filteredPlans.length === 0 ? (
        <p className="text-sm text-neutral-400">No plans match your search.</p>
      ) : null}

      {!isLoading && !errorMessage && filteredPlans.length > 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-between gap-3 pt-6 sm:flex-row">
            <p className="text-sm text-neutral-400">
              Showing page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={currentPage <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </MainLayout>
  );
}
