import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type SignUpBody = {
  email?: string;
  password?: string;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as SignUpBody;
  const email = body.email?.trim() ?? "";
  const password = body.password ?? "";

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Server auth configuration is missing. Contact support." },
      { status: 500 },
    );
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    const message =
      createError.message?.toLowerCase().includes("already") || createError.status === 422
        ? "User already exists. Please sign in."
        : createError.message;
    return NextResponse.json({ error: message }, { status: createError.status ?? 400 });
  }

  const user = created.user;
  if (!user) {
    return NextResponse.json({ error: "Failed to create user." }, { status: 500 });
  }

  const { error: profileError } = await adminClient.from("profiles").upsert(
    {
      id: user.id,
      email,
      role: "employee",
      employer_request: false,
    },
    { onConflict: "id" },
  );

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
