"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  createSupabaseClient,
  getCurrentUserProfile,
  getSupabaseConfigError,
  signOut,
  type UserRole,
} from "@/lib/supabase/client";

type MainLayoutProps = {
  children: React.ReactNode;
};

const baseNavLinks = [
  { href: "/", label: "Home" },
  { href: "/plans", label: "Plans" },
  { href: "/dashboard", label: "Dashboard" },
];

export function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [configError] = useState<string | null>(() => getSupabaseConfigError());

  useEffect(() => {
    if (configError) {
      setIsAuthenticated(false);
      setUserRole(null);
      return;
    }

    const supabase = createSupabaseClient();
    let isMounted = true;

    const checkUser = async () => {
      const { data } = await getCurrentUserProfile(supabase);
      if (isMounted) {
        setIsAuthenticated(Boolean(data));
        setUserRole(data?.role ?? null);
      }
    };

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        setIsAuthenticated(false);
        setUserRole(null);
        return;
      }

      const { data } = await getCurrentUserProfile(supabase);
      setIsAuthenticated(Boolean(data));
      setUserRole(data?.role ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [configError]);

  async function handleSignOut() {
    if (configError) {
      router.replace("/sign-in");
      return;
    }

    setIsSigningOut(true);
    try {
      const supabase = createSupabaseClient();
      await signOut(supabase);
    } finally {
      setIsSigningOut(false);
      setIsAuthenticated(false);
      setUserRole(null);
      router.replace("/sign-in");
    }
  }

  const navLinks = userRole === "admin" ? [...baseNavLinks, { href: "/admin", label: "Admin Panel" }] : baseNavLinks;

  return (
    <div className="flex min-h-screen flex-col bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-800 bg-neutral-950/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <Link href="/" className="text-lg font-semibold tracking-tight text-neutral-100">
            InsurTech API Hub
          </Link>

          <nav className="flex items-center gap-3 sm:gap-6">
            {navLinks.map((link) => (
              <Link
                key={`${link.href}-${link.label}`}
                href={link.href}
                className={cn(
                  "text-xs font-medium text-neutral-400 transition-colors hover:text-cyan-300 sm:text-sm",
                  pathname === link.href ? "text-cyan-300" : "",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {isAuthenticated ? (
            <Button size="sm" variant="secondary" onClick={handleSignOut} disabled={isSigningOut}>
              {isSigningOut ? "Signing Out..." : "Sign Out"}
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link href="/sign-in">Sign In</Link>
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">{children}</main>

      <footer className="border-t border-neutral-800 bg-neutral-950">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-2 px-6 py-6 text-center text-sm text-neutral-400">
          <p>© {new Date().getFullYear()} InsurTech API Hub. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link className="hover:text-cyan-300" href="/sign-in">
              Sign In
            </Link>
            <Link className="hover:text-cyan-300" href="/sign-up">
              Sign Up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
