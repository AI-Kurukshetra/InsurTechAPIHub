"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { MainLayout } from "@/components/layout/main-layout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseClient, getCurrentUserProfile } from "@/lib/supabase/client";

type QuoteWithPlan = {
  id: string;
  user_id: string;
  plan_id: string;
  estimated_premium: number;
  age: number | null;
  smoker: boolean;
  dependents: number;
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

export default function QuotesPage() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<QuoteWithPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [profileRole, setProfileRole] = useState<"admin" | "employer" | "employee" | null>(null);

  useEffect(() => {
    const supabase = createSupabaseClient();

    const loadQuotes = async () => {
      const { data: profile, error: profileError } = await getCurrentUserProfile(supabase);
      if (profileError || !profile) {
        router.replace("/sign-in");
        return;
      }

      setProfileRole(profile.role);
      let query = supabase
        .from("quotes")
        .select(
          "id, user_id, plan_id, estimated_premium, age, smoker, dependents, created_at, insurance_plans(id, name, carrier, premium, deductible, coverage_type)",
        )
        .order("created_at", { ascending: false });

      if (profile.role === "employee") {
        query = query.eq("user_id", profile.id);
      }

      const { data, error } = await query;
      if (error) {
        setErrorMessage(error.message);
        setQuotes([]);
        setIsLoading(false);
        return;
      }

      setQuotes((data ?? []) as QuoteWithPlan[]);
      setErrorMessage(null);
      setIsLoading(false);
    };

    loadQuotes();
  }, [router]);

  return (
    <MainLayout>
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-100">Quotes</h1>
        <p className="text-sm text-neutral-400">Review generated insurance quotes and demographics.</p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Quote Records</CardTitle>
          <CardDescription>Latest quotes {profileRole === "employee" ? "for your account" : "across users"}.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? <p className="text-sm text-neutral-400">Loading quotes...</p> : null}
          {errorMessage ? <p className="text-sm text-red-300">{errorMessage}</p> : null}

          {!isLoading && !errorMessage && quotes.length === 0 ? (
            <p className="text-sm text-neutral-400">No quotes generated yet.</p>
          ) : null}

          {quotes.map((quote) => (
            <div key={quote.id} className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-neutral-100">
                  {quote.insurance_plans?.name ?? "Unknown Plan"}
                </p>
                <Badge>Quote</Badge>
              </div>
              <p className="text-sm text-neutral-400">{quote.insurance_plans?.carrier ?? "Unknown Carrier"}</p>
              <div className="mt-2 grid gap-2 text-xs text-neutral-500 sm:grid-cols-2">
                <span>Estimated Premium: {formatMoney(Number(quote.estimated_premium))}</span>
                <span>Age: {quote.age ?? "N/A"}</span>
                <span>Smoker: {quote.smoker ? "Yes" : "No"}</span>
                <span>Dependents: {quote.dependents}</span>
                <span>
                  Created{" "}
                  {new Date(quote.created_at).toLocaleDateString("en-US", {
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
