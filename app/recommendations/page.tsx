"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { MainLayout } from "@/components/layout/main-layout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseClient, getCurrentUserProfile } from "@/lib/supabase/client";

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
};

type Recommendation = InsurancePlan & { score: number; reasons: string[] };

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    value,
  );
}

export default function RecommendationsPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<InsurancePlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [budget, setBudget] = useState("");
  const [preferLowDeductible, setPreferLowDeductible] = useState(true);
  const [needDental, setNeedDental] = useState(false);
  const [needVision, setNeedVision] = useState(false);
  const [needTelemedicine, setNeedTelemedicine] = useState(false);
  const [minNetworkType, setMinNetworkType] = useState("Any");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  useEffect(() => {
    const supabase = createSupabaseClient();

    const loadPlans = async () => {
      const { data: profile, error: profileError } = await getCurrentUserProfile(supabase);
      if (profileError || !profile) {
        router.replace("/sign-in");
        return;
      }

      if (profile.role !== "employee") {
        router.replace("/dashboard");
        return;
      }

      const { data, error } = await supabase
        .from("insurance_plans")
        .select(
          "id, name, carrier, premium, deductible, coverage_type, network_type, copay, includes_dental, includes_vision, includes_telemedicine",
        )
        .order("created_at", { ascending: false });

      if (error) {
        setMessage(error.message);
        setIsLoading(false);
        return;
      }

      setPlans((data ?? []) as InsurancePlan[]);
      setIsLoading(false);
    };

    loadPlans();
  }, [router]);

  const budgetValue = Number(budget);
  const hasBudget = !Number.isNaN(budgetValue) && budgetValue > 0;

  const computedRecommendations = useMemo(() => {
    if (plans.length === 0) {
      return [];
    }

    return plans
      .map((plan) => {
        let score = 0;
        const reasons: string[] = [];

        if (hasBudget) {
          if (plan.premium <= budgetValue) {
            score += 25;
            reasons.push("Within your budget");
          } else {
            score -= 10;
          }
        }

        if (preferLowDeductible) {
          score += Math.max(0, 20 - Math.floor(Number(plan.deductible) / 500) * 2);
          reasons.push("Lower deductible");
        }

        if (needDental && plan.includes_dental) {
          score += 10;
          reasons.push("Includes dental");
        }
        if (needVision && plan.includes_vision) {
          score += 10;
          reasons.push("Includes vision");
        }
        if (needTelemedicine && plan.includes_telemedicine) {
          score += 8;
          reasons.push("Includes telemedicine");
        }

        if (minNetworkType !== "Any") {
          if (plan.network_type === minNetworkType) {
            score += 8;
            reasons.push(`Network match: ${plan.network_type}`);
          } else {
            score -= 4;
          }
        }

        score += Math.max(0, 12 - Math.floor(Number(plan.premium) / 50));

        return { ...plan, score, reasons };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [plans, budgetValue, hasBudget, preferLowDeductible, needDental, needVision, needTelemedicine, minNetworkType]);

  function handleGenerate() {
    setRecommendations(computedRecommendations);
  }

  return (
    <MainLayout>
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-100">Plan Recommendations</h1>
        <p className="text-sm text-neutral-400">Get a quick plan recommendation based on your preferences.</p>
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
            <CardDescription>Preparing recommendation engine.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <section className="grid gap-6 lg:grid-cols-12">
          <Card className="lg:col-span-5">
            <CardHeader>
              <CardTitle>Your Preferences</CardTitle>
              <CardDescription>These inputs guide the recommendation score.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="budget">Monthly Budget (optional)</Label>
                <Input
                  id="budget"
                  type="number"
                  value={budget}
                  onChange={(event) => setBudget(event.target.value)}
                  placeholder="e.g. 200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="networkType">Preferred Network</Label>
                <select
                  id="networkType"
                  className="h-11 w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 text-sm text-neutral-100 outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                  value={minNetworkType}
                  onChange={(event) => setMinNetworkType(event.target.value)}
                >
                  <option value="Any">Any</option>
                  <option value="PPO">PPO</option>
                  <option value="HMO">HMO</option>
                  <option value="EPO">EPO</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-neutral-300">
                <input
                  type="checkbox"
                  checked={preferLowDeductible}
                  onChange={(event) => setPreferLowDeductible(event.target.checked)}
                />
                Prefer low deductible
              </label>
              <label className="flex items-center gap-2 text-sm text-neutral-300">
                <input
                  type="checkbox"
                  checked={needDental}
                  onChange={(event) => setNeedDental(event.target.checked)}
                />
                Needs dental coverage
              </label>
              <label className="flex items-center gap-2 text-sm text-neutral-300">
                <input
                  type="checkbox"
                  checked={needVision}
                  onChange={(event) => setNeedVision(event.target.checked)}
                />
                Needs vision coverage
              </label>
              <label className="flex items-center gap-2 text-sm text-neutral-300">
                <input
                  type="checkbox"
                  checked={needTelemedicine}
                  onChange={(event) => setNeedTelemedicine(event.target.checked)}
                />
                Needs telemedicine
              </label>
              <Button onClick={handleGenerate}>Generate Recommendations</Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-7">
            <CardHeader>
              <CardTitle>Top Matches</CardTitle>
              <CardDescription>Best plans based on your preferences.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recommendations.length === 0 ? (
                <p className="text-sm text-neutral-400">No recommendations yet. Update preferences and generate.</p>
              ) : null}
              {recommendations.map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-neutral-100">{plan.name}</p>
                      <p className="text-xs text-neutral-500">{plan.carrier}</p>
                    </div>
                    <Badge>Score {plan.score}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-neutral-500">
                    <span>Premium: {formatMoney(Number(plan.premium))}</span>
                    <span>Deductible: {formatMoney(Number(plan.deductible))}</span>
                    <span>Network: {plan.network_type}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {plan.reasons.map((reason) => (
                      <Badge key={reason} variant="success">
                        {reason}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button asChild variant="secondary">
                      <a href={`/plans/${plan.id}`}>View Details</a>
                    </Button>
                    <Button asChild>
                      <a href="/enroll">Enroll</a>
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}
    </MainLayout>
  );
}
