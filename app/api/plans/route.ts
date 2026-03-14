import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type CreatePlanBody = {
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
  min_age: number | null;
  max_age: number | null;
  requires_non_smoker: boolean;
  max_dependents: number | null;
};

function getEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY" | "SUPABASE_SERVICE_ROLE_KEY") {
  return process.env[name];
}

export async function POST(request: Request) {
  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return NextResponse.json({ error: "Supabase server configuration is incomplete." }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "Missing authorization token." }, { status: 401 });
  }

  const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const {
    data: { user },
    error: userError,
  } = await anonClient.auth.getUser(token);
  if (userError || !user) {
    return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json({ error: profileError?.message ?? "Profile not found." }, { status: 403 });
  }

  const role = profile.role as "admin" | "employer" | "employee";
  if (role !== "admin" && role !== "employer") {
    return NextResponse.json({ error: "Only admin and employer can create plans." }, { status: 403 });
  }

  const body = (await request.json()) as Partial<CreatePlanBody>;
  const payload = {
    name: body.name,
    carrier: body.carrier,
    premium: body.premium,
    deductible: body.deductible,
    coverage_type: body.coverage_type,
    network_type: body.network_type,
    copay: body.copay,
    out_of_pocket_max: body.out_of_pocket_max,
    prescription_coverage: body.prescription_coverage,
    includes_dental: Boolean(body.includes_dental),
    includes_vision: Boolean(body.includes_vision),
    includes_telemedicine: Boolean(body.includes_telemedicine),
    min_age: body.min_age ?? null,
    max_age: body.max_age ?? null,
    requires_non_smoker: Boolean(body.requires_non_smoker),
    max_dependents: body.max_dependents ?? null,
    created_by: user.id,
    created_by_role: role,
  };

  let { error: insertError } = await adminClient.from("insurance_plans").insert(payload);
  if (insertError && insertError.message.includes("insurance_plans.created_by")) {
    const legacyPayload = {
      name: body.name,
      carrier: body.carrier,
      premium: body.premium,
      deductible: body.deductible,
      coverage_type: body.coverage_type,
      network_type: body.network_type,
      copay: body.copay,
      out_of_pocket_max: body.out_of_pocket_max,
      prescription_coverage: body.prescription_coverage,
      includes_dental: Boolean(body.includes_dental),
      includes_vision: Boolean(body.includes_vision),
      includes_telemedicine: Boolean(body.includes_telemedicine),
      min_age: body.min_age ?? null,
      max_age: body.max_age ?? null,
      requires_non_smoker: Boolean(body.requires_non_smoker),
      max_dependents: body.max_dependents ?? null,
    };
    const legacyInsert = await adminClient.from("insurance_plans").insert(legacyPayload);
    insertError = legacyInsert.error;
  }

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
