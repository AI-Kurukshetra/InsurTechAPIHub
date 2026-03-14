"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { MainLayout } from "@/components/layout/main-layout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createSupabaseClient,
  getCarriers,
  getCurrentUserProfile,
  readProfileCache,
} from "@/lib/supabase/client";

function isMissingOwnershipColumnError(message?: string) {
  return Boolean(message && message.includes("insurance_plans.created_by"));
}

export default function NewPlanPage() {
  const router = useRouter();
  const [carriers, setCarriers] = useState<Array<{ id: string; name: string }>>([]);
  const [carrierMode, setCarrierMode] = useState<"select" | "custom">("custom");
  const [selectedCarrierId, setSelectedCarrierId] = useState<string>("");
  const [name, setName] = useState("");
  const [carrier, setCarrier] = useState("");
  const [premium, setPremium] = useState("");
  const [deductible, setDeductible] = useState("");
  const [coverageType, setCoverageType] = useState("");
  const [networkType, setNetworkType] = useState("PPO");
  const [copay, setCopay] = useState("30");
  const [outOfPocketMax, setOutOfPocketMax] = useState("6000");
  const [prescriptionCoverage, setPrescriptionCoverage] = useState("Standard");
  const [includesDental, setIncludesDental] = useState(false);
  const [includesVision, setIncludesVision] = useState(false);
  const [includesTelemedicine, setIncludesTelemedicine] = useState(true);
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [requiresNonSmoker, setRequiresNonSmoker] = useState(false);
  const [maxDependents, setMaxDependents] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<"admin" | "employer" | null>(null);
  const [supportsOwnershipColumns, setSupportsOwnershipColumns] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseClient();

    const validateRole = async () => {
      const cachedProfile = readProfileCache();
      if (cachedProfile && (cachedProfile.role === "admin" || cachedProfile.role === "employer")) {
        setCurrentUserId(cachedProfile.id);
        setCurrentUserRole(cachedProfile.role);
        setIsLoading(false);
      }

      const { data, error } = await getCurrentUserProfile(supabase);
      if (error || !data) {
        router.replace("/sign-in");
        return;
      }

      if (data.role !== "admin" && data.role !== "employer") {
        router.replace("/dashboard");
        return;
      }

      setCurrentUserId(data.id);
      setCurrentUserRole(data.role);

      const [ownershipResult, carriersResult] = await Promise.all([
        supabase.from("insurance_plans").select("created_by").limit(1),
        getCarriers(supabase),
      ]);
      setSupportsOwnershipColumns(!isMissingOwnershipColumnError(ownershipResult.error?.message));

      const carrierData = carriersResult.data;
      if (carrierData && carrierData.length > 0) {
        setCarriers(carrierData.map((item) => ({ id: item.id as string, name: item.name as string })));
        setCarrierMode("select");
      }
      setIsLoading(false);
    };

    validateRole();
  }, [router]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setIsSubmitting(true);

    if (!currentUserId || !currentUserRole) {
      setMessage("Unable to resolve your account role. Refresh and try again.");
      setIsSubmitting(false);
      return;
    }

    const premiumValue = Number(premium);
    const deductibleValue = Number(deductible);
    const copayValue = Number(copay);
    const outOfPocketMaxValue = Number(outOfPocketMax);
    const minAgeValue = minAge ? Number(minAge) : null;
    const maxAgeValue = maxAge ? Number(maxAge) : null;
    const maxDependentsValue = maxDependents ? Number(maxDependents) : null;
    const carrierName =
      carrierMode === "select"
        ? carriers.find((item) => item.id === selectedCarrierId)?.name ?? ""
        : carrier;
    const validationErrors: string[] = [];
    if (!name.trim()) validationErrors.push("Plan name is required.");
    if (!carrierName.trim()) validationErrors.push("Carrier is required.");
    if (!coverageType.trim()) validationErrors.push("Coverage type is required.");
    if (!networkType.trim()) validationErrors.push("Network type is required.");
    if (!prescriptionCoverage.trim()) validationErrors.push("Prescription coverage is required.");
    if (premium.trim() === "" || Number.isNaN(premiumValue) || premiumValue < 0)
      validationErrors.push("Monthly premium must be a non-negative number.");
    if (deductible.trim() === "" || Number.isNaN(deductibleValue) || deductibleValue < 0)
      validationErrors.push("Deductible must be a non-negative number.");
    if (copay.trim() === "" || Number.isNaN(copayValue) || copayValue < 0)
      validationErrors.push("Copay must be a non-negative number.");
    if (outOfPocketMax.trim() === "" || Number.isNaN(outOfPocketMaxValue) || outOfPocketMaxValue < 0)
      validationErrors.push("Out-of-pocket max must be a non-negative number.");
    if (minAge && (Number.isNaN(minAgeValue) || minAgeValue < 0 || minAgeValue > 120))
      validationErrors.push("Minimum age must be between 0 and 120.");
    if (maxAge && (Number.isNaN(maxAgeValue) || maxAgeValue < 0 || maxAgeValue > 120))
      validationErrors.push("Maximum age must be between 0 and 120.");
    if (minAgeValue !== null && maxAgeValue !== null && minAgeValue > maxAgeValue)
      validationErrors.push("Minimum age cannot be greater than maximum age.");
    if (maxDependents && (Number.isNaN(maxDependentsValue) || maxDependentsValue < 0 || maxDependentsValue > 20))
      validationErrors.push("Max dependents must be between 0 and 20.");

    if (validationErrors.length > 0) {
      setMessage(validationErrors[0]);
      setIsSubmitting(false);
      return;
    }

    const supabase = createSupabaseClient();
    const basePayload = {
      name,
      carrier: carrierName,
      premium: premiumValue,
      deductible: deductibleValue,
      coverage_type: coverageType,
      network_type: networkType,
      copay: copayValue,
      out_of_pocket_max: outOfPocketMaxValue,
      prescription_coverage: prescriptionCoverage,
      includes_dental: includesDental,
      includes_vision: includesVision,
      includes_telemedicine: includesTelemedicine,
      min_age: minAgeValue,
      max_age: maxAgeValue,
      requires_non_smoker: requiresNonSmoker,
      max_dependents: maxDependentsValue,
    };

    const payload = supportsOwnershipColumns
      ? {
          ...basePayload,
          created_by: currentUserId,
          created_by_role: currentUserRole,
        }
      : basePayload;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setMessage("Your session has expired. Please sign in again.");
        return;
      }

      const insertPromise = fetch("/api/plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      }).then(async (response) => {
        if (response.ok) {
          return { error: null as { message: string } | null };
        }
        let errorMessage = "Failed to create plan.";
        try {
          const body = (await response.json()) as { error?: string };
          if (body.error) {
            errorMessage = body.error;
          }
        } catch {
          // ignore parse errors
        }
        return { error: { message: errorMessage } };
      });
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Request timed out while creating the plan. Please retry.")), 15000);
      });

      const { error } = await Promise.race([insertPromise, timeoutPromise]);

      if (error) {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem("plan_create_status", `error:${error.message}`);
        }
        if (currentUserRole === "employer" && error.message.toLowerCase().includes("row level security")) {
          setMessage(
            "Employer plan creation is blocked by RLS. Apply the plan ownership migration (20260314190000_plan_ownership_rls.sql) in Supabase, then retry.",
          );
          return;
        }
        setMessage(error.message);
        return;
      }

      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("plan_create_status", "success");
      }
      router.replace("/plans");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create plan. Please try again.";
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("plan_create_status", `error:${errorMessage}`);
      }
      setMessage(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <MainLayout>
        <Card>
          <CardHeader>
            <CardTitle>Validating access...</CardTitle>
            <CardDescription>Checking permissions.</CardDescription>
          </CardHeader>
        </Card>
      </MainLayout>
    );
  }

  const ownershipWarning =
    currentUserRole === "employer" && !supportsOwnershipColumns
      ? "Plan ownership columns are missing in the database. Run 20260314190000_plan_ownership_rls.sql so employer plans can be created."
      : null;

  return (
    <MainLayout>
      <Card>
        <CardHeader>
          <CardTitle>Create Insurance Plan</CardTitle>
          <CardDescription>Add a new plan for the marketplace.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="name">Plan Name</Label>
              <Input id="name" value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="carrier">Carrier</Label>
              {carriers.length > 0 ? (
                <div className="space-y-2">
                  <select
                    id="carrier"
                    className="h-11 w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 text-sm text-neutral-100 outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                    value={carrierMode === "select" ? selectedCarrierId : "custom"}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (value === "custom") {
                        setCarrierMode("custom");
                        setSelectedCarrierId("");
                        setCarrier("");
                      } else {
                        setCarrierMode("select");
                        setSelectedCarrierId(value);
                      }
                    }}
                  >
                    <option value="">Select a carrier</option>
                    {carriers.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                    <option value="custom">Other (enter manually)</option>
                  </select>
                  {carrierMode === "custom" ? (
                    <Input
                      placeholder="Enter carrier name"
                      value={carrier}
                      onChange={(event) => setCarrier(event.target.value)}
                    />
                  ) : null}
                </div>
              ) : (
                <Input id="carrier" value={carrier} onChange={(event) => setCarrier(event.target.value)} />
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="premium">Monthly Premium</Label>
                <Input id="premium" type="number" value={premium} onChange={(event) => setPremium(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deductible">Deductible</Label>
                <Input
                  id="deductible"
                  type="number"
                  value={deductible}
                  onChange={(event) => setDeductible(event.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="coverageType">Coverage Type</Label>
              <Input
                id="coverageType"
                value={coverageType}
                onChange={(event) => setCoverageType(event.target.value)}
                placeholder="Health, Family, Auto, etc."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="networkType">Network Type</Label>
                <Input id="networkType" value={networkType} onChange={(event) => setNetworkType(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prescriptionCoverage">Prescription Coverage</Label>
                <Input
                  id="prescriptionCoverage"
                  value={prescriptionCoverage}
                  onChange={(event) => setPrescriptionCoverage(event.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="copay">Copay</Label>
                <Input id="copay" type="number" value={copay} onChange={(event) => setCopay(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="outOfPocketMax">Out-of-Pocket Max</Label>
                <Input
                  id="outOfPocketMax"
                  type="number"
                  value={outOfPocketMax}
                  onChange={(event) => setOutOfPocketMax(event.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <label className="flex items-center gap-2 text-sm text-neutral-300">
                <input
                  type="checkbox"
                  checked={includesDental}
                  onChange={(event) => setIncludesDental(event.target.checked)}
                />
                Includes Dental
              </label>
              <label className="flex items-center gap-2 text-sm text-neutral-300">
                <input
                  type="checkbox"
                  checked={includesVision}
                  onChange={(event) => setIncludesVision(event.target.checked)}
                />
                Includes Vision
              </label>
              <label className="flex items-center gap-2 text-sm text-neutral-300">
                <input
                  type="checkbox"
                  checked={includesTelemedicine}
                  onChange={(event) => setIncludesTelemedicine(event.target.checked)}
                />
                Includes Telemedicine
              </label>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4">
              <p className="text-sm font-medium text-neutral-100">Eligibility Rules (optional)</p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="minAge">Minimum Age</Label>
                  <Input id="minAge" type="number" value={minAge} onChange={(event) => setMinAge(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxAge">Maximum Age</Label>
                  <Input id="maxAge" type="number" value={maxAge} onChange={(event) => setMaxAge(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxDependents">Max Dependents</Label>
                  <Input
                    id="maxDependents"
                    type="number"
                    value={maxDependents}
                    onChange={(event) => setMaxDependents(event.target.value)}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-neutral-300">
                  <input
                    type="checkbox"
                    checked={requiresNonSmoker}
                    onChange={(event) => setRequiresNonSmoker(event.target.checked)}
                  />
                  Requires Non-Smoker
                </label>
              </div>
            </div>

            {ownershipWarning ? (
              <Alert>
                <AlertDescription>{ownershipWarning}</AlertDescription>
              </Alert>
            ) : null}

            {message ? (
              <Alert>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            ) : null}

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Plan"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
