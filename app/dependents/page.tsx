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
  createDependent,
  createSupabaseClient,
  deleteDependent,
  getCurrentUserProfile,
  getDependents,
} from "@/lib/supabase/client";

type DependentItem = {
  id: string;
  name: string;
  relationship: string;
  age: number | null;
  created_at: string;
};

export default function DependentsPage() {
  const router = useRouter();
  const [dependents, setDependents] = useState<DependentItem[]>([]);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [age, setAge] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseClient();

    const loadDependents = async () => {
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
      const { data, error } = await getDependents(profile.id, supabase);
      if (error) {
        setMessage(error.message);
        setIsLoading(false);
        return;
      }

      setDependents((data ?? []) as DependentItem[]);
      setIsLoading(false);
    };

    loadDependents();
  }, [router]);

  async function handleAddDependent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentUserId) {
      return;
    }

    const trimmedName = name.trim();
    const trimmedRelationship = relationship.trim();
    if (!trimmedName || !trimmedRelationship) {
      setMessage("Name and relationship are required.");
      return;
    }

    const ageValue = age ? Number(age) : null;
    if (age && (Number.isNaN(ageValue) || ageValue < 0 || ageValue > 120)) {
      setMessage("Age must be between 0 and 120.");
      return;
    }

    setIsSaving(true);
    setMessage(null);
    const supabase = createSupabaseClient();
    const { data, error } = await createDependent(
      { userId: currentUserId, name: trimmedName, relationship: trimmedRelationship, age: ageValue },
      supabase,
    );
    setIsSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (data) {
      setDependents((current) => [data as DependentItem, ...current]);
      setName("");
      setRelationship("");
      setAge("");
    }
  }

  async function handleDeleteDependent(dependentId: string) {
    const shouldDelete = window.confirm("Delete this dependent?");
    if (!shouldDelete) {
      return;
    }

    setDeletingId(dependentId);
    setMessage(null);
    const supabase = createSupabaseClient();
    const { error } = await deleteDependent(dependentId, supabase);
    setDeletingId(null);

    if (error) {
      setMessage(error.message);
      return;
    }

    setDependents((current) => current.filter((dependent) => dependent.id !== dependentId));
  }

  return (
    <MainLayout>
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-100">Dependents</h1>
        <p className="text-sm text-neutral-400">Manage dependents for your coverage profile.</p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Add Dependent</CardTitle>
          <CardDescription>Add a dependent to your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleAddDependent}>
            <div className="space-y-2">
              <Label htmlFor="dependent-name">Name</Label>
              <Input id="dependent-name" value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dependent-relationship">Relationship</Label>
              <Input
                id="dependent-relationship"
                value={relationship}
                onChange={(event) => setRelationship(event.target.value)}
                placeholder="Spouse, Child, Parent, etc."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dependent-age">Age (optional)</Label>
              <Input
                id="dependent-age"
                type="number"
                value={age}
                onChange={(event) => setAge(event.target.value)}
              />
            </div>
            {message ? (
              <Alert>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            ) : null}
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Add Dependent"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Dependents</CardTitle>
          <CardDescription>Dependents linked to your account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? <p className="text-sm text-neutral-400">Loading dependents...</p> : null}
          {!isLoading && dependents.length === 0 ? (
            <p className="text-sm text-neutral-400">No dependents added yet.</p>
          ) : null}
          {dependents.map((dependent) => (
            <div
              key={dependent.id}
              className="flex flex-col gap-2 rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-neutral-100">{dependent.name}</p>
                <p className="text-xs text-neutral-500">
                  {dependent.relationship}
                  {dependent.age !== null ? ` • Age ${dependent.age}` : ""}
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => handleDeleteDependent(dependent.id)}
                disabled={deletingId === dependent.id}
              >
                {deletingId === dependent.id ? "Deleting..." : "Remove"}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </MainLayout>
  );
}
