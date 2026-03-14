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
  getSession,
  getEmployerRequests,
  getEnrollments,
  getProfileByUserId,
  getProfilesByRole,
  rejectEmployerRequest,
  readProfileCache,
  requestEmployerAccess,
  writeProfileCache,
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

type EmployeeListItem = {
  id: string;
  email: string | null;
  created_at: string;
};

type EnrollmentAdminItem = {
  id: string;
  status: "active" | "cancelled";
  created_at: string;
  user_id: string;
  plan_id: string;
  user_email?: string | null;
  insurance_plans: {
    id: string;
    name: string;
    carrier: string;
    premium: number;
    deductible: number;
    coverage_type: string;
  } | null;
};

type RoleAction = {
  label: string;
  href?: string;
};

function roleActions(role: UserRole): RoleAction[] {
  if (role === "admin") {
    return [
      { label: "Manage Users", href: "/employees" },
      { label: "View Employer Requests", href: "#employer-requests" },
      { label: "Create Insurance Plans", href: "/plans/new" },
      { label: "View Enrollments", href: "#admin-enrollments" },
      { label: "View Quotes", href: "/quotes" },
      { label: "Manage Carriers", href: "/carriers" },
    ];
  }

  if (role === "employer") {
    return [
      { label: "Manage Employees", href: "/employees" },
      { label: "View Company Plans", href: "/company-plans" },
      { label: "View Enrollments", href: "/enrollments" },
      { label: "View Quotes", href: "/quotes" },
    ];
  }

  return [
    { label: "Browse Insurance Plans", href: "/plans" },
    { label: "My Enrollments", href: "/enrollments" },
    { label: "My Quotes", href: "/quotes" },
    { label: "Manage Dependents", href: "/dependents" },
    { label: "Enrollment Wizard", href: "/enroll" },
    { label: "Plan Recommendations", href: "/recommendations" },
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
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [adminEnrollments, setAdminEnrollments] = useState<EnrollmentAdminItem[]>([]);
  const [isLoadingEnrollments, setIsLoadingEnrollments] = useState(false);
  const [enrollmentPage, setEnrollmentPage] = useState(1);
  const enrollmentPageSize = 6;

  useEffect(() => {
    let isMounted = true;
    const supabase = createSupabaseClient();

    const loadUserAndProfile = async () => {
      const cachedProfile = readProfileCache();
      if (cachedProfile && isMounted) {
        setProfile({
          id: cachedProfile.id,
          email: cachedProfile.email,
          role: cachedProfile.role,
          employerRequest: cachedProfile.employer_request,
          createdAt: cachedProfile.created_at,
        });
        setIsLoading(false);
      }

      const { data: sessionData, error: sessionError } = await getSession(supabase);

      if (!isMounted) {
        return;
      }

      if (sessionError || !sessionData.session?.user) {
        router.replace("/sign-in");
        return;
      }

      const { data: profileData, error: profileError } = await getProfileByUserId(
        sessionData.session.user.id,
        supabase,
      );

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
      writeProfileCache({
        id: profileData.id,
        email: profileData.email,
        role: profileData.role,
        employer_request: profileData.employer_request,
        created_at: profileData.created_at,
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
        setIsLoadingEmployees(true);
        const { data: employeeData } = await getProfilesByRole("employee", supabase);
        if (employeeData) {
          setEmployees(
            employeeData.map((item) => ({
              id: item.id as string,
              email: (item.email as string | null) ?? null,
              created_at: item.created_at as string,
            })),
          );
        }
        setIsLoadingEmployees(false);

        setIsLoadingEnrollments(true);
        const { data: enrollmentData } = await getEnrollments("admin", profileData.id, supabase);
        if (enrollmentData) {
          setAdminEnrollments(enrollmentData as EnrollmentAdminItem[]);
        }
        setIsLoadingEnrollments(false);
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
    if (profile) {
      writeProfileCache({
        id: profile.id,
        email: profile.email,
        role: profile.role,
        employer_request: data?.employer_request ?? true,
        created_at: profile.createdAt,
      });
    }
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

  const totalEnrollmentPages = Math.max(1, Math.ceil(adminEnrollments.length / enrollmentPageSize));
  const currentEnrollmentPage = Math.min(enrollmentPage, totalEnrollmentPages);
  const paginatedEnrollments = adminEnrollments.slice(
    (currentEnrollmentPage - 1) * enrollmentPageSize,
    currentEnrollmentPage * enrollmentPageSize,
  );

  return (
    <MainLayout>
      <header className="animate-fade-up rounded-2xl border border-neutral-800 bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 p-6 shadow-lg shadow-black/30 transition">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href="/plans">Browse Plans</Link>
            </Button>
            {profile.role === "employee" ? (
              <Button asChild>
                <Link href="/enroll">Enroll Now</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      {message ? (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-12">
        <Card className="animate-fade-up-delay-1 lg:col-span-8 transition hover:-translate-y-0.5 hover:border-neutral-700 hover:shadow-xl hover:shadow-black/20">
          <CardHeader>
            <CardTitle>Role Actions</CardTitle>
            <CardDescription>Available actions based on your account role.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {actions.map((action) => {
                return (
                  <Card
                    key={action.label}
                    className="border-neutral-800 bg-neutral-950/60 shadow-none transition hover:-translate-y-0.5 hover:border-neutral-700"
                  >
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

        <Card className="animate-fade-up-delay-1 lg:col-span-4 transition hover:-translate-y-0.5 hover:border-neutral-700 hover:shadow-xl hover:shadow-black/20">
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
        <Card className="animate-fade-up-delay-2 transition hover:-translate-y-0.5 hover:border-neutral-700 hover:shadow-xl hover:shadow-black/20">
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
        <Card id="employer-requests" className="animate-fade-up-delay-2 transition hover:-translate-y-0.5 hover:border-neutral-700 hover:shadow-xl hover:shadow-black/20">
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

      {profile.role === "admin" ? (
        <Card id="admin-enrollments" className="animate-fade-up-delay-2 transition hover:-translate-y-0.5 hover:border-neutral-700 hover:shadow-xl hover:shadow-black/20">
          <CardHeader>
            <CardTitle>Manage Employees</CardTitle>
            <CardDescription>Current employee accounts in the system.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoadingEmployees ? <p className="text-sm text-neutral-400">Loading employees...</p> : null}
            {!isLoadingEmployees && employees.length === 0 ? (
              <p className="text-sm text-neutral-400">No employees found.</p>
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
                <Badge>Employee</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {profile.role === "admin" ? (
        <Card className="animate-fade-up-delay-2 transition hover:-translate-y-0.5 hover:border-neutral-700 hover:shadow-xl hover:shadow-black/20">
          <CardHeader>
            <CardTitle>Enrollments</CardTitle>
            <CardDescription>Latest plan enrollments across all users.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoadingEnrollments ? <p className="text-sm text-neutral-400">Loading enrollments...</p> : null}
            {!isLoadingEnrollments && adminEnrollments.length === 0 ? (
              <p className="text-sm text-neutral-400">No enrollments recorded.</p>
            ) : null}
            {paginatedEnrollments.map((enrollment) => (
              <div
                key={enrollment.id}
                className="flex flex-col gap-2 rounded-xl border border-neutral-800 bg-neutral-950/60 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-neutral-100">
                    {enrollment.insurance_plans?.name ?? "Unknown Plan"}
                  </p>
                  <Badge variant={enrollment.status === "active" ? "success" : "default"}>{enrollment.status}</Badge>
                </div>
                <p className="text-sm text-neutral-400">
                  {enrollment.insurance_plans?.carrier ?? "Unknown Carrier"}
                </p>
                {enrollment.user_email ? (
                  <p className="text-xs text-neutral-500">Enrolled by: {enrollment.user_email}</p>
                ) : null}
                <div className="flex flex-wrap gap-4 text-xs text-neutral-500">
                  <span>Premium: {Number(enrollment.insurance_plans?.premium ?? 0)}</span>
                  <span>Deductible: {Number(enrollment.insurance_plans?.deductible ?? 0)}</span>
                  <span>
                    Enrolled on{" "}
                    {new Date(enrollment.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            ))}

            {!isLoadingEnrollments && adminEnrollments.length > 0 ? (
              <div className="flex flex-col items-center justify-between gap-3 pt-2 text-sm text-neutral-400 sm:flex-row">
                <p>
                  Showing page {currentEnrollmentPage} of {totalEnrollmentPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={currentEnrollmentPage <= 1}
                    onClick={() => setEnrollmentPage((current) => Math.max(1, current - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={currentEnrollmentPage >= totalEnrollmentPages}
                    onClick={() => setEnrollmentPage((current) => Math.min(totalEnrollmentPages, current + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </MainLayout>
  );
}
