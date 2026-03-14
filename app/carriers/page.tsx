"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { MainLayout } from "@/components/layout/main-layout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createCarrier,
  createSupabaseClient,
  deleteCarrier,
  getCarriers,
  getCurrentUserProfile,
  readProfileCache,
} from "@/lib/supabase/client";

type CarrierItem = {
  id: string;
  name: string;
  created_at: string;
};

export default function CarriersPage() {
  const router = useRouter();
  const [carriers, setCarriers] = useState<CarrierItem[]>([]);
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseClient();

    const loadCarriers = async () => {
      const cachedProfile = readProfileCache();
      if (cachedProfile?.role === "admin") {
        setIsLoading(false);
      }

      const { data: profile, error: profileError } = await getCurrentUserProfile(supabase);
      if (profileError || !profile) {
        router.replace("/sign-in");
        return;
      }

      if (profile.role !== "admin") {
        router.replace("/dashboard");
        return;
      }

      const { data, error } = await getCarriers(supabase);
      if (error) {
        setMessage(error.message);
        setIsLoading(false);
        return;
      }

      setCarriers((data ?? []) as CarrierItem[]);
      setIsLoading(false);
    };

    loadCarriers();
  }, [router]);

  async function handleCreateCarrier(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setMessage("Carrier name is required.");
      return;
    }

    setIsSaving(true);
    setMessage(null);
    const optimisticCarrier: CarrierItem = {
      id: `temp-${crypto.randomUUID()}`,
      name: trimmed,
      created_at: new Date().toISOString(),
    };
    setCarriers((current) => [optimisticCarrier, ...current]);
    const supabase = createSupabaseClient();
    const { data, error } = await createCarrier(trimmed, supabase);
    setIsSaving(false);

    if (error) {
      setMessage(error.message);
      setCarriers((current) => current.filter((item) => item.id !== optimisticCarrier.id));
      return;
    }

    if (data) {
      setCarriers((current) => [data as CarrierItem, ...current.filter((item) => item.id !== optimisticCarrier.id)]);
      setName("");
    }
  }

  async function handleDeleteCarrier(carrierId: string) {
    const shouldDelete = window.confirm("Delete this carrier?");
    if (!shouldDelete) {
      return;
    }

    setDeletingId(carrierId);
    setMessage(null);
    const supabase = createSupabaseClient();
    const { error } = await deleteCarrier(carrierId, supabase);
    setDeletingId(null);

    if (error) {
      setMessage(error.message);
      return;
    }

    setCarriers((current) => current.filter((carrier) => carrier.id !== carrierId));
  }

  return (
    <MainLayout>
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-100">Insurance Carriers</h1>
        <p className="text-sm text-neutral-400">Manage carriers available for plan catalog entries.</p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Add Carrier</CardTitle>
          <CardDescription>Admins can add new insurance carriers.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleCreateCarrier}>
            <div className="space-y-2">
              <Label htmlFor="carrier-name">Carrier Name</Label>
              <Input id="carrier-name" value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            {message ? (
              <Alert>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            ) : null}
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Add Carrier"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Carrier Directory</CardTitle>
          <CardDescription>All carriers currently configured.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? <p className="text-sm text-neutral-400">Loading carriers...</p> : null}
          {!isLoading && carriers.length === 0 ? (
            <p className="text-sm text-neutral-400">No carriers added yet.</p>
          ) : null}
          {carriers.map((carrier) => (
            <div
              key={carrier.id}
              className="flex flex-col gap-2 rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-neutral-100">{carrier.name}</p>
                <p className="text-xs text-neutral-500">
                  Added{" "}
                  {new Date(carrier.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => handleDeleteCarrier(carrier.id)}
                disabled={deletingId === carrier.id}
              >
                {deletingId === carrier.id ? "Deleting..." : "Delete"}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </MainLayout>
  );
}
