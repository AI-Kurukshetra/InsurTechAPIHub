import "server-only";

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { Client } from "pg";
import { createClient } from "@supabase/supabase-js";

const MIGRATIONS_DIR = path.join(process.cwd(), "supabase", "migrations");

declare global {
  var __insurancePlansBootstrapPromise: Promise<void> | undefined;
}

async function runBootstrapMigration() {
  const connectionString = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;

  if (!connectionString) {
    return;
  }

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((file) => file.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));

  const client = new Client({ connectionString });
  await client.connect();

  try {
    for (const file of files) {
      const migrationPath = path.join(MIGRATIONS_DIR, file);
      const sql = await readFile(migrationPath, "utf8");
      await client.query(sql);
    }
  } finally {
    await client.end();
  }
}

async function ensureSeedAdminAccount() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return;
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const targetEmail = "admin@platform.com";
  const targetPassword = "admin123";

  const { data: listedUsers, error: listError } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    throw listError;
  }

  let adminUser = listedUsers.users.find((user) => user.email?.toLowerCase() === targetEmail);

  if (!adminUser) {
    const { data: createdUserData, error: createError } = await adminClient.auth.admin.createUser({
      email: targetEmail,
      password: targetPassword,
      email_confirm: true,
      user_metadata: { seeded: true },
    });

    if (createError) {
      throw createError;
    }

    adminUser = createdUserData.user;
  }

  if (!adminUser) {
    throw new Error("Failed to create or locate seeded admin user.");
  }

  const { error: upsertError } = await adminClient.from("profiles").upsert(
    {
      id: adminUser.id,
      email: targetEmail,
      role: "admin",
      employer_request: false,
    },
    { onConflict: "id" },
  );

  if (upsertError) {
    throw upsertError;
  }
}

export async function ensureInsurancePlansBootstrap() {
  if (!globalThis.__insurancePlansBootstrapPromise) {
    globalThis.__insurancePlansBootstrapPromise = (async () => {
      try {
        await runBootstrapMigration();
      } catch (error) {
        console.warn("Skipping SQL bootstrap migration:", error);
      }
      await ensureSeedAdminAccount();
    })().catch((error: unknown) => {
      globalThis.__insurancePlansBootstrapPromise = undefined;
      throw error;
    });
  }

  await globalThis.__insurancePlansBootstrapPromise;
}
