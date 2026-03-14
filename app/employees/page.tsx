"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { MainLayout } from "@/components/layout/main-layout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseClient, getCurrentUserProfile, getProfilesByRole } from "@/lib/supabase/client";

type EmployeeProfile = {
  id: string;
  email: string | null;
  role: "admin" | "employer" | "employee";
  employer_request: boolean;
  created_at: string;
};

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseClient();

    const loadEmployees = async () => {
      const { data: currentProfile, error: profileError } = await getCurrentUserProfile(supabase);
      if (profileError || !currentProfile) {
        router.replace("/sign-in");
        return;
      }

      if (currentProfile.role !== "admin" && currentProfile.role !== "employer") {
        router.replace("/dashboard");
        return;
      }

      const { data, error } = await getProfilesByRole("employee", supabase);
      if (error) {
        setErrorMessage(error.message);
        setEmployees([]);
        setIsLoading(false);
        return;
      }

      setEmployees((data ?? []) as EmployeeProfile[]);
      setErrorMessage(null);
      setIsLoading(false);
    };

    loadEmployees();
  }, [router]);

  return (
    <MainLayout>
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-100">Manage Employees</h1>
        <p className="text-sm text-neutral-400">View employee accounts and request statuses.</p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Employee Directory</CardTitle>
          <CardDescription>Employees currently in the platform.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? <p className="text-sm text-neutral-400">Loading employees...</p> : null}
          {errorMessage ? <p className="text-sm text-red-300">{errorMessage}</p> : null}
          {!isLoading && !errorMessage && employees.length === 0 ? (
            <p className="text-sm text-neutral-400">No employee users found.</p>
          ) : null}

          {employees.map((employee) => (
            <div
              key={employee.id}
              className="flex flex-col gap-2 rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-neutral-100">{employee.email ?? "Unknown user"}</p>
                <p className="text-xs text-neutral-500">
                  Joined{" "}
                  {new Date(employee.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
              <Badge variant={employee.employer_request ? "success" : "default"}>
                {employee.employer_request ? "Employer Request Pending" : "Employee"}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </MainLayout>
  );
}
