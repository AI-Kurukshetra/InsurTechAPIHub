import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type RowData = Record<string, unknown>;
type RowMatch = Record<string, unknown>;
export type UserRole = "admin" | "employer" | "employee";

type Profile = {
  id: string;
  email: string | null;
  role: UserRole;
  employer_request: boolean;
  created_at: string;
};

type ProfileListItem = {
  id: string;
  email: string | null;
  role: UserRole;
  employer_request: boolean;
  created_at: string;
};

type QueryFilters = {
  match?: RowMatch;
  limit?: number;
  orderBy?: {
    column: string;
    ascending?: boolean;
  };
};

type QuoteRecord = {
  id: string;
  user_id: string;
  plan_id: string;
  estimated_premium: number;
  created_at: string;
};

type EnrollmentRecord = {
  id: string;
  user_id: string;
  plan_id: string;
  status: "active" | "cancelled";
  created_at: string;
};

type EmployerCompanyPlanRecord = {
  id: string;
  employer_id: string;
  plan_id: string;
  created_at: string;
};

type PublicSupabaseEnvName = "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY";

let browserClient: SupabaseClient | undefined;

function getEnv(name: PublicSupabaseEnvName): string | undefined {
  const value =
    name === "NEXT_PUBLIC_SUPABASE_URL"
      ? process.env.NEXT_PUBLIC_SUPABASE_URL
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (value) {
    return value;
  }

  if (name === "NEXT_PUBLIC_SUPABASE_URL") {
    return process.env.SUPABASE_URL;
  }

  return process.env.SUPABASE_ANON_KEY;
}

export function getSupabaseConfigError(): string | null {
  const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const missing: PublicSupabaseEnvName[] = [];

  if (!url) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!key) {
    missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  if (missing.length === 0) {
    return null;
  }

  return `Missing required environment variable(s): ${missing.join(", ")}. Add them to .env.local and restart the Next.js server.`;
}

export function createSupabaseClient(): SupabaseClient {
  const configError = getSupabaseConfigError();

  if (configError) {
    throw new Error(configError);
  }

  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL") as string;
  const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") as string;

  if (typeof window === "undefined") {
    return createClient(supabaseUrl, supabaseAnonKey);
  }

  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabaseAnonKey);
  }

  return browserClient;
}

export async function getCurrentUser(client: SupabaseClient = createSupabaseClient()) {
  const { data: sessionData, error: sessionError } = await client.auth.getSession();

  if (sessionError) {
    return {
      data: { user: null },
      error: sessionError,
    };
  }

  if (sessionData.session?.user) {
    return {
      data: { user: sessionData.session.user },
      error: null,
    };
  }

  return client.auth.getUser();
}

export async function getSession(client: SupabaseClient = createSupabaseClient()) {
  return client.auth.getSession();
}

export async function signInWithPassword(
  email: string,
  password: string,
  client: SupabaseClient = createSupabaseClient(),
) {
  return client.auth.signInWithPassword({ email, password });
}

export async function signUpWithPassword(
  email: string,
  password: string,
  client: SupabaseClient = createSupabaseClient(),
) {
  return client.auth.signUp({ email, password });
}

export async function signOut(client: SupabaseClient = createSupabaseClient()) {
  return client.auth.signOut();
}

export async function getProfileByUserId(userId: string, client: SupabaseClient = createSupabaseClient()) {
  return client
    .from("profiles")
    .select("id, email, role, employer_request, created_at")
    .eq("id", userId)
    .maybeSingle<Profile>();
}

export async function getCurrentUserProfile(client: SupabaseClient = createSupabaseClient()) {
  const { data: sessionData, error: sessionError } = await client.auth.getSession();

  if (sessionError || !sessionData.session?.user) {
    return { data: null, error: sessionError };
  }

  const profileResponse = await getProfileByUserId(sessionData.session.user.id, client);

  if (profileResponse.error || !profileResponse.data) {
    return { data: null, error: profileResponse.error };
  }

  return {
    data: {
      id: profileResponse.data.id,
      email: profileResponse.data.email,
      role: profileResponse.data.role,
    },
    error: null,
  };
}

export async function requestEmployerAccess(userId: string, client: SupabaseClient = createSupabaseClient()) {
  return client.from("profiles").update({ employer_request: true }).eq("id", userId).select().maybeSingle<Profile>();
}

export async function getEmployerRequests(client: SupabaseClient = createSupabaseClient()) {
  return client
    .from("profiles")
    .select("id, email, role, employer_request, created_at")
    .eq("employer_request", true)
    .order("created_at", { ascending: false });
}

export async function approveEmployerRequest(userId: string, client: SupabaseClient = createSupabaseClient()) {
  return client
    .from("profiles")
    .update({ role: "employer", employer_request: false })
    .eq("id", userId)
    .select()
    .maybeSingle<Profile>();
}

export async function rejectEmployerRequest(userId: string, client: SupabaseClient = createSupabaseClient()) {
  return client
    .from("profiles")
    .update({ employer_request: false })
    .eq("id", userId)
    .select()
    .maybeSingle<Profile>();
}

export async function getProfilesByRole(role: UserRole, client: SupabaseClient = createSupabaseClient()) {
  return client
    .from("profiles")
    .select("id, email, role, employer_request, created_at")
    .eq("role", role)
    .order("created_at", { ascending: false })
    .returns<ProfileListItem[]>();
}

export async function createQuote(
  payload: { userId: string; planId: string; estimatedPremium: number },
  client: SupabaseClient = createSupabaseClient(),
) {
  return client
    .from("quotes")
    .insert({
      user_id: payload.userId,
      plan_id: payload.planId,
      estimated_premium: payload.estimatedPremium,
    })
    .select()
    .maybeSingle<QuoteRecord>();
}

export async function createEnrollment(
  payload: { userId: string; planId: string; status?: "active" | "cancelled" },
  client: SupabaseClient = createSupabaseClient(),
) {
  return client
    .from("enrollments")
    .insert({
      user_id: payload.userId,
      plan_id: payload.planId,
      status: payload.status ?? "active",
    })
    .select()
    .maybeSingle<EnrollmentRecord>();
}

export async function getEnrollments(
  role: UserRole,
  userId: string,
  client: SupabaseClient = createSupabaseClient(),
) {
  const baseQuery = client
    .from("enrollments")
    .select("id, user_id, plan_id, status, created_at, insurance_plans(id, name, carrier, premium, deductible, coverage_type)")
    .order("created_at", { ascending: false });

  if (role === "employee") {
    return baseQuery.eq("user_id", userId);
  }

  return baseQuery;
}

export async function getUserEnrollmentForPlan(
  userId: string,
  planId: string,
  client: SupabaseClient = createSupabaseClient(),
) {
  return client
    .from("enrollments")
    .select("id, user_id, plan_id, status, created_at")
    .eq("user_id", userId)
    .eq("plan_id", planId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<EnrollmentRecord>();
}

export async function cancelEnrollment(
  enrollmentId: string,
  client: SupabaseClient = createSupabaseClient(),
) {
  return client
    .from("enrollments")
    .update({ status: "cancelled" })
    .eq("id", enrollmentId)
    .select("id, user_id, plan_id, status, created_at")
    .maybeSingle<EnrollmentRecord>();
}

export async function getEmployerCompanyPlans(
  employerId: string,
  client: SupabaseClient = createSupabaseClient(),
) {
  return client
    .from("employer_company_plans")
    .select(
      "id, employer_id, plan_id, created_at, insurance_plans(id, name, carrier, premium, deductible, coverage_type, network_type, copay, out_of_pocket_max, includes_dental, includes_vision, includes_telemedicine, prescription_coverage)",
    )
    .eq("employer_id", employerId)
    .order("created_at", { ascending: false });
}

export async function addEmployerCompanyPlan(
  employerId: string,
  planId: string,
  client: SupabaseClient = createSupabaseClient(),
) {
  return client
    .from("employer_company_plans")
    .insert({ employer_id: employerId, plan_id: planId })
    .select("id, employer_id, plan_id, created_at")
    .maybeSingle<EmployerCompanyPlanRecord>();
}

export async function removeEmployerCompanyPlan(
  employerId: string,
  planId: string,
  client: SupabaseClient = createSupabaseClient(),
) {
  return client
    .from("employer_company_plans")
    .delete()
    .eq("employer_id", employerId)
    .eq("plan_id", planId);
}

export async function getEmployerCompanyPlanForPlan(
  employerId: string,
  planId: string,
  client: SupabaseClient = createSupabaseClient(),
) {
  return client
    .from("employer_company_plans")
    .select("id, employer_id, plan_id, created_at")
    .eq("employer_id", employerId)
    .eq("plan_id", planId)
    .maybeSingle<EmployerCompanyPlanRecord>();
}

export async function selectFromTable(
  table: string,
  columns = "*",
  filters: QueryFilters = {},
  client: SupabaseClient = createSupabaseClient(),
) {
  let query = client.from(table).select(columns);

  if (filters.match) {
    query = query.match(filters.match);
  }

  if (filters.orderBy) {
    query = query.order(filters.orderBy.column, {
      ascending: filters.orderBy.ascending ?? true,
    });
  }

  if (typeof filters.limit === "number") {
    query = query.limit(filters.limit);
  }

  return query;
}

export async function insertIntoTable(
  table: string,
  values: RowData | RowData[],
  client: SupabaseClient = createSupabaseClient(),
) {
  return client.from(table).insert(values).select();
}

export async function updateTable(
  table: string,
  values: RowData,
  match: RowMatch,
  client: SupabaseClient = createSupabaseClient(),
) {
  return client.from(table).update(values).match(match).select();
}

export async function deleteFromTable(
  table: string,
  match: RowMatch,
  client: SupabaseClient = createSupabaseClient(),
) {
  return client.from(table).delete().match(match);
}
