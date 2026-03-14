"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseClient } from "@/lib/supabase/client";

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
  includes_dental: boolean;
  includes_vision: boolean;
  includes_telemedicine: boolean;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    value,
  );
}

export default function ComparePlansPage() {
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<InsurancePlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedIds = useMemo(() => {
    const raw = searchParams.get("ids") ?? "";
    return raw
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
      .slice(0, 3);
  }, [searchParams]);

  useEffect(() => {
    const supabase = createSupabaseClient();

    const fetchPlans = async () => {
      if (selectedIds.length < 2) {
        setPlans([]);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("insurance_plans")
        .select(
          "id, name, carrier, premium, deductible, coverage_type, network_type, copay, out_of_pocket_max, includes_dental, includes_vision, includes_telemedicine",
        )
        .in("id", selectedIds)
        .returns<InsurancePlan[]>();

      if (error) {
        setErrorMessage(error.message);
        setPlans([]);
        setIsLoading(false);
        return;
      }

      setPlans(data ?? []);
      setErrorMessage(null);
      setIsLoading(false);
    };

    fetchPlans();
  }, [selectedIds]);

  return (
    <MainLayout>
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-100">Plan Comparison</h1>
        <p className="text-sm text-neutral-400">Compare premiums, deductibles, and coverage side-by-side.</p>
      </section>

      {isLoading ? <p className="text-sm text-neutral-400">Loading comparison...</p> : null}
      {errorMessage ? <p className="text-sm text-red-300">{errorMessage}</p> : null}

      {!isLoading && !errorMessage && selectedIds.length < 2 ? (
        <Card>
          <CardHeader>
            <CardTitle>Select at least 2 plans</CardTitle>
            <CardDescription>Go back to plans and choose two or three plans to compare.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary">
              <Link href="/plans">Back to Plans</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && !errorMessage && plans.length >= 2 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-left text-neutral-400">
                <th className="p-3">Field</th>
                {plans.map((plan) => (
                  <th key={plan.id} className="p-3 text-neutral-200">
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-neutral-900">
                <td className="p-3 text-neutral-400">Carrier</td>
                {plans.map((plan) => (
                  <td key={`${plan.id}-carrier`} className="p-3 text-neutral-200">
                    {plan.carrier}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-neutral-900">
                <td className="p-3 text-neutral-400">Monthly Premium</td>
                {plans.map((plan) => (
                  <td key={`${plan.id}-premium`} className="p-3 text-neutral-200">
                    {formatMoney(Number(plan.premium))}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-neutral-900">
                <td className="p-3 text-neutral-400">Deductible</td>
                {plans.map((plan) => (
                  <td key={`${plan.id}-deductible`} className="p-3 text-neutral-200">
                    {formatMoney(Number(plan.deductible))}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3 text-neutral-400">Coverage Type</td>
                {plans.map((plan) => (
                  <td key={`${plan.id}-coverage`} className="p-3 text-neutral-200">
                    {plan.coverage_type}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-neutral-900">
                <td className="p-3 text-neutral-400">Network Type</td>
                {plans.map((plan) => (
                  <td key={`${plan.id}-network`} className="p-3 text-neutral-200">
                    {plan.network_type}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-neutral-900">
                <td className="p-3 text-neutral-400">Copay</td>
                {plans.map((plan) => (
                  <td key={`${plan.id}-copay`} className="p-3 text-neutral-200">
                    {formatMoney(Number(plan.copay))}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-neutral-900">
                <td className="p-3 text-neutral-400">Out-of-Pocket Max</td>
                {plans.map((plan) => (
                  <td key={`${plan.id}-oop`} className="p-3 text-neutral-200">
                    {formatMoney(Number(plan.out_of_pocket_max))}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-neutral-900">
                <td className="p-3 text-neutral-400">Dental</td>
                {plans.map((plan) => (
                  <td key={`${plan.id}-dental`} className="p-3 text-neutral-200">
                    {plan.includes_dental ? "Included" : "Not Included"}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-neutral-900">
                <td className="p-3 text-neutral-400">Vision</td>
                {plans.map((plan) => (
                  <td key={`${plan.id}-vision`} className="p-3 text-neutral-200">
                    {plan.includes_vision ? "Included" : "Not Included"}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3 text-neutral-400">Telemedicine</td>
                {plans.map((plan) => (
                  <td key={`${plan.id}-tele`} className="p-3 text-neutral-200">
                    {plan.includes_telemedicine ? "Included" : "Not Included"}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      ) : null}
    </MainLayout>
  );
}
