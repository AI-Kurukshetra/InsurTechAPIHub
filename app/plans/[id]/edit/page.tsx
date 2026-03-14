"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { MainLayout } from "@/components/layout/main-layout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseClient, getCarriers, getCurrentUserProfile, updateTable } from "@/lib/supabase/client";

type PlanRecord = {
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
};

function isMissingOwnershipColumnError(message?: string) {
  return Boolean(message && message.includes("insurance_plans.created_by"));
}

export default function EditPlanPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const planId = params.id;

  const [name, setName] = useState("");
  const [carrier, setCarrier] = useState("");
  const [carriers, setCarriers] = useState<Array<{ id: string; name: string }>>([]);
  const [carrierMode, setCarrierMode] = useState<"select" | "custom">("custom");
  const [selectedCarrierId, setSelectedCarrierId] = useState<string>("");
  const [premium, setPremium] = useState("");
  const [deductible, setDeductible] = useState("");
  const [coverageType, setCoverageType] = useState("");
  const [networkType, setNetworkType] = useState("");
  const [copay, setCopay] = useState("");
  const [outOfPocketMax, setOutOfPocketMax] = useState("");
  const [prescriptionCoverage, setPrescriptionCoverage] = useState("");
  const [includesDental, setIncludesDental] = useState(false);
  const [includesVision, setIncludesVision] = useState(false);
  const [includesTelemedicine, setIncludesTelemedicine] = useState(false);
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [requiresNonSmoker, setRequiresNonSmoker] = useState(false);
  const [maxDependents, setMaxDependents] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseClient();

    const loadPlan = async () => {
      const { data: profile, error: profileError } = await getCurrentUserProfile(supabase);
      if (profileError || !profile) {
        router.replace("/sign-in");
        return;
      }

      const { data: ownershipData, error: ownershipError } = await supabase
        .from("insurance_plans")
        .select(
          "id, name, carrier, premium, deductible, coverage_type, network_type, copay, out_of_pocket_max, prescription_coverage, includes_dental, includes_vision, includes_telemedicine, min_age, max_age, requires_non_smoker, max_dependents, created_by",
        )
        .eq("id", planId)
        .maybeSingle<PlanRecord>();

      if (ownershipError && !isMissingOwnershipColumnError(ownershipError.message)) {
        setErrorMessage(ownershipError.message);
        setIsLoading(false);
        return;
      }

      let data = ownershipData;
      if (ownershipError && isMissingOwnershipColumnError(ownershipError.message)) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("insurance_plans")
          .select(
            "id, name, carrier, premium, deductible, coverage_type, network_type, copay, out_of_pocket_max, prescription_coverage, includes_dental, includes_vision, includes_telemedicine, min_age, max_age, requires_non_smoker, max_dependents",
          )
          .eq("id", planId)
          .maybeSingle();

        if (fallbackError) {
          setErrorMessage(fallbackError.message);
          setIsLoading(false);
          return;
        }

        data = fallbackData ? ({ ...fallbackData, created_by: null } as PlanRecord) : null;
      }

      if (!data) {
        setErrorMessage("Plan not found.");
        setIsLoading(false);
        return;
      }

      const canManagePlan =
        profile.role === "admin" || (profile.role === "employer" && data.created_by !== null && data.created_by === profile.id);
      if (!canManagePlan) {
        router.replace("/plans");
        return;
      }

      setName(data.name);
      setCarrier(data.carrier);
      const { data: carrierData } = await getCarriers(supabase);
      if (carrierData && carrierData.length > 0) {
        const normalized = carrierData.map((item) => ({ id: item.id as string, name: item.name as string }));
        setCarriers(normalized);
        const matched = normalized.find((item) => item.name === data.carrier);
        if (matched) {
          setCarrierMode("select");
          setSelectedCarrierId(matched.id);
        } else {
          setCarrierMode("custom");
        }
      }
      setPremium(String(data.premium));
      setDeductible(String(data.deductible));
      setCoverageType(data.coverage_type);
      setNetworkType(data.network_type);
      setCopay(String(data.copay));
      setOutOfPocketMax(String(data.out_of_pocket_max));
      setPrescriptionCoverage(data.prescription_coverage);
      setIncludesDental(data.includes_dental);
      setIncludesVision(data.includes_vision);
      setIncludesTelemedicine(data.includes_telemedicine);
      setMinAge(data.min_age ? String(data.min_age) : "");
      setMaxAge(data.max_age ? String(data.max_age) : "");
      setRequiresNonSmoker(Boolean(data.requires_non_smoker));
      setMaxDependents(data.max_dependents ? String(data.max_dependents) : "");
      setIsLoading(false);
    };

    loadPlan();
  }, [planId, router]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

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
    if (
      !name.trim() ||
      !carrierName.trim() ||
      !coverageType.trim() ||
      !networkType.trim() ||
      !prescriptionCoverage.trim() ||
      Number.isNaN(premiumValue) ||
      Number.isNaN(deductibleValue) ||
      Number.isNaN(copayValue) ||
      Number.isNaN(outOfPocketMaxValue) ||
      premiumValue < 0 ||
      deductibleValue < 0 ||
      copayValue < 0 ||
      outOfPocketMaxValue < 0 ||
      (minAge && (Number.isNaN(minAgeValue) || minAgeValue < 0 || minAgeValue > 120)) ||
      (maxAge && (Number.isNaN(maxAgeValue) || maxAgeValue < 0 || maxAgeValue > 120)) ||
      (minAgeValue !== null && maxAgeValue !== null && minAgeValue > maxAgeValue) ||
      (maxDependents && (Number.isNaN(maxDependentsValue) || maxDependentsValue < 0 || maxDependentsValue > 20))
    ) {
      setErrorMessage("Please provide valid benefit details. Numeric fields must be non-negative.");
      return;
    }

    setIsSaving(true);
    const supabase = createSupabaseClient();
    const { error } = await updateTable(
      "insurance_plans",
      {
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
      },
      { id: planId },
      supabase,
    );
    setIsSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    router.replace("/plans");
  }

  if (isLoading) {
    return (
      <MainLayout>
        <Card>
          <CardHeader>
            <CardTitle>Loading plan...</CardTitle>
            <CardDescription>Checking permissions and fetching plan details.</CardDescription>
          </CardHeader>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Card>
        <CardHeader>
          <CardTitle>Edit Insurance Plan</CardTitle>
          <CardDescription>Update plan details and save changes.</CardDescription>
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
              <Input id="coverageType" value={coverageType} onChange={(event) => setCoverageType(event.target.value)} />
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

            {errorMessage ? (
              <Alert>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex gap-2">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => router.push("/plans")} disabled={isSaving}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
