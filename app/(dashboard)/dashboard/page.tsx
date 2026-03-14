"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { MainLayout } from "@/components/layout/main-layout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  approveEmployerRequest,
  createSupabaseClient,
  getCurrentUser,
  getEmployerRequests,
  getProfileByUserId,
  rejectEmployerRequest,
  requestEmployerAccess,
  type UserRole,
} from "@/lib/supabase/client";

type UserProfileState = {
  id: string;
  email: string | null;
  role: UserRole;
  employerRequest: boolean;
  createdAt: string;
};

type EmployerRequestItem = {
  id: string;
  email: string | null;
  created_at: string;
};

type RoleAction = {
  label: string;
  href?: string;
};

function roleActions(role: UserRole): RoleAction[] {
  if (role === "admin") {
    return [
      { label: "Admin Panel", href: "/admin" },
      { label: "Manage Users", href: "/admin" },
      { label: "View Employer Requests", href: "#employer-requests" },
      { label: "Create Insurance Plans", href: "/plans" },
      { label: "View Enrollments", href: "/enrollments" },
    ];
  }

  if (role === "employer") {
    return [
      { label: "Manage Employees", href: "/employees" },
      { label: "View Company Plans", href: "/company-plans" },
      { label: "View Enrollments", href: "/enrollments" },
    ];
  }

  return [
    { label: "Browse Insurance Plans", href: "/plans" },
    { label: "My Enrollments", href: "/enrollments" },
  ];
}

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfileState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [employerRequests, setEmployerRequests] = useState<EmployerRequestItem[]>([]);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const supabase = createSupabaseClient();

    const loadUserAndProfile = async () => {
      const { data: userData, error: userError } = await getCurrentUser(supabase);

      if (!isMounted) {
        return;
      }

      if (userError || !userData.user) {
        router.replace("/sign-in");
        return;
      }

      const { data: profileData, error: profileError } = await getProfileByUserId(userData.user.id, supabase);

      if (!isMounted) {
        return;
      }

      if (profileError || !profileData) {
        setMessage(profileError?.message ?? "Unable to load user profile.");
        setIsLoading(false);
        return;
      }

      setProfile({
        id: profileData.id,
        email: profileData.email,
        role: profileData.role,
        employerRequest: profileData.employer_request,
        createdAt: profileData.created_at,
      });

      if (profileData.role === "admin") {
        const { data: requestData } = await getEmployerRequests(supabase);
        if (requestData) {
          setEmployerRequests(
            requestData.map((item) => ({
              id: item.id as string,
              email: (item.email as string | null) ?? null,
              created_at: item.created_at as string,
            })),
          );
        }
      }
      setIsLoading(false);
    };

    loadUserAndProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        router.replace("/sign-in");
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  const actions = useMemo(() => (profile ? roleActions(profile.role) : []), [profile]);

  async function handleRequestEmployerAccess() {
    if (!profile) {
      return;
    }

    setMessage(null);
    setIsSubmittingRequest(true);
    const supabase = createSupabaseClient();
    const { data, error } = await requestEmployerAccess(profile.id, supabase);
    setIsSubmittingRequest(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setProfile((current) =>
      current
        ? {
            ...current,
            employerRequest: data?.employer_request ?? true,
          }
        : current,
    );
    setMessage("Employer access request submitted. An admin will review your request.");
  }

  async function handleApproveEmployerRequest(userId: string) {
    const supabase = createSupabaseClient();
    setProcessingRequestId(userId);
    setMessage(null);

    const { error } = await approveEmployerRequest(userId, supabase);
    setProcessingRequestId(null);

    if (error) {
      setMessage(error.message);
      return;
    }

    setEmployerRequests((current) => current.filter((request) => request.id !== userId));
    setMessage("Employer request approved.");
  }

  async function handleRejectEmployerRequest(userId: string) {
    const supabase = createSupabaseClient();
    setProcessingRequestId(userId);
    setMessage(null);

    const { error } = await rejectEmployerRequest(userId, supabase);
    setProcessingRequestId(null);

    if (error) {
      setMessage(error.message);
      return;
    }

    setEmployerRequests((current) => current.filter((request) => request.id !== userId));
    setMessage("Employer request rejected.");
  }

  if (isLoading) {
    return (
      <MainLayout>
        <Card>
          <CardHeader>
            <CardTitle>Loading dashboard...</CardTitle>
            <CardDescription>Checking your authentication and role.</CardDescription>
          </CardHeader>
        </Card>
      </MainLayout>
    );
  }

  if (!profile) {
    return (
      <MainLayout>
        <Card>
          <CardHeader>
            <CardTitle>Profile unavailable</CardTitle>
            <CardDescription>Unable to load profile data for this account.</CardDescription>
          </CardHeader>
        </Card>
      </MainLayout>
    );
  }

  const userInitial = profile.email?.[0]?.toUpperCase() ?? "U";
  const roleLabel = profile.role.charAt(0).toUpperCase() + profile.role.slice(1);
  const formattedCreatedAt = new Date(profile.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <MainLayout>
      <header className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-lg shadow-black/20">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback>{userInitial}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-100 sm:text-3xl">Dashboard</h1>
            <p className="text-sm text-neutral-400">{profile.email ?? "Unknown user"}</p>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Role: {roleLabel}</p>
          </div>
        </div>
      </header>

      {message ? (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle>Role Actions</CardTitle>
            <CardDescription>Available actions based on your account role.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              {actions.map((action) => {
                return (
                  <Card key={action.label} className="border-neutral-800 shadow-none">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{action.label}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Button asChild className="w-full" variant="secondary">
                        <Link href={action.href ?? "/dashboard"}>{action.label}</Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Account Overview</CardTitle>
            <CardDescription>Your profile and permissions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="text-neutral-500">Email</p>
              <p className="font-medium text-neutral-100">{profile.email ?? "Unknown user"}</p>
            </div>
            <div>
              <p className="text-neutral-500">Role</p>
              <Badge className="mt-1">{roleLabel}</Badge>
            </div>
            <div>
              <p className="text-neutral-500">Employer Request</p>
              <Badge className="mt-1" variant={profile.employerRequest ? "success" : "default"}>
                {profile.employerRequest ? "Pending" : "None"}
              </Badge>
            </div>
            <div>
              <p className="text-neutral-500">Joined</p>
              <p className="font-medium text-neutral-100">{formattedCreatedAt}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      {profile.role === "employee" ? (
        <Card>
          <CardHeader>
            <CardTitle>Employer Access</CardTitle>
            <CardDescription>Request an employer role upgrade for organization management features.</CardDescription>
          </CardHeader>
          <CardContent>
            {profile.employerRequest ? (
              <p className="text-sm text-emerald-300">Employer access request pending approval</p>
            ) : (
              <Button onClick={handleRequestEmployerAccess} disabled={isSubmittingRequest}>
                {isSubmittingRequest ? "Submitting Request..." : "Request Employer Access"}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : null}

      {profile.role === "admin" ? (
        <Card id="employer-requests">
          <CardHeader>
            <CardTitle>Employer Requests</CardTitle>
            <CardDescription>Review employees requesting employer role access.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {employerRequests.length === 0 ? (
              <p className="text-sm text-neutral-400">No pending employer requests.</p>
            ) : null}

            {employerRequests.map((request) => (
              <div
                key={request.id}
                className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-neutral-100">{request.email ?? "Unknown user"}</p>
                  <p className="text-xs text-neutral-500">
                    Requested on{" "}
                    {new Date(request.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleApproveEmployerRequest(request.id)} disabled={processingRequestId === request.id}>
                    Approve
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleRejectEmployerRequest(request.id)}
                    disabled={processingRequestId === request.id}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </MainLayout>
  );
}
