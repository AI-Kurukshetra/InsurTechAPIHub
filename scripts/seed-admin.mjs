import { readFile } from "node:fs/promises";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAIL = "admin@platform.com";
const ADMIN_PASSWORD = "admin123";

async function loadEnvFile() {
  const envPath = path.join(process.cwd(), ".env.local");

  let raw;
  try {
    raw = await readFile(envPath, "utf8");
  } catch {
    return;
  }

  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const sepIndex = trimmed.indexOf("=");
    if (sepIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, sepIndex).trim();
    const value = trimmed.slice(sepIndex + 1).trim().replace(/^['"]|['"]$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

async function main() {
  await loadEnvFile();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing env vars: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY are required.",
    );
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    throw listError;
  }

  let adminUser = usersData.users.find((user) => user.email?.toLowerCase() === ADMIN_EMAIL);

  if (!adminUser) {
    const { data: createdData, error: createError } = await adminClient.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { seeded: true },
    });

    if (createError) {
      throw createError;
    }

    adminUser = createdData.user;
  } else {
    const { error: updateError } = await adminClient.auth.admin.updateUserById(adminUser.id, {
      password: ADMIN_PASSWORD,
      email_confirm: true,
    });

    if (updateError) {
      throw updateError;
    }
  }

  if (!adminUser) {
    throw new Error("Failed to create or find admin user.");
  }

  const { error: upsertError } = await adminClient
    .from("profiles")
    .upsert(
      {
        id: adminUser.id,
        email: ADMIN_EMAIL,
        role: "admin",
        employer_request: false,
      },
      { onConflict: "id" },
    );

  if (upsertError?.code === "PGRST205") {
    throw new Error(
      "profiles table not found. Run your SQL migrations in Supabase SQL Editor first, then run `npm run seed:admin` again.",
    );
  }

  if (upsertError) {
    throw new Error(upsertError.message);
  }

  console.log("Admin user is ready:", ADMIN_EMAIL);
}

main().catch((error) => {
  console.error("Failed to seed admin:", error);
  process.exit(1);
});
