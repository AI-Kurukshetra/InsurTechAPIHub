"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  createSupabaseClient,
  clearSupabaseAuthStorage,
  getCurrentUserProfile,
  getSupabaseConfigError,
  readProfileCache,
  signOut,
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
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [configError] = useState<string | null>(() => getSupabaseConfigError());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const [initialCachedProfile] = useState(() => readProfileCache());
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(initialCachedProfile));
  const [authReady, setAuthReady] = useState(() => Boolean(configError) || Boolean(initialCachedProfile));

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (configError) {
      return;
    }

    const supabase = createSupabaseClient();
    let isMounted = true;

    const checkUser = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (isMounted) {
        setIsAuthenticated(Boolean(sessionData.session?.user));
      }

      const { data } = await getCurrentUserProfile(supabase);
      if (isMounted) {
        if (data) {
          setIsAuthenticated(true);
        }
        setAuthReady(true);
      }
    };

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        setIsAuthenticated(false);
        return;
      }

      const { data } = await getCurrentUserProfile(supabase);
      setIsAuthenticated(Boolean(data));
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
    setIsAuthenticated(false);
    setAuthReady(true);
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem("insuretech_profile_cache_v1");
      window.localStorage.removeItem("insuretech_profile_cache_v1");
    }

    const supabase = createSupabaseClient();
    const signOutPromise = signOut(supabase).catch(() => null);
    const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 800));
    await Promise.race([signOutPromise, timeoutPromise]);
    clearSupabaseAuthStorage();

    router.replace("/sign-in");
    setIsSigningOut(false);
    if (isMountedRef.current) {
      setToastMessage("Signed out successfully.");
      setTimeout(() => {
        if (isMountedRef.current) {
          setToastMessage(null);
        }
      }, 3000);
    }
  }

  const navLinks = baseNavLinks;

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

          {authReady ? (
            isAuthenticated ? (
              <Button size="sm" variant="secondary" onClick={handleSignOut} disabled={isSigningOut}>
                {isSigningOut ? "Signing Out..." : "Sign Out"}
              </Button>
            ) : (
              <Button asChild size="sm">
                <Link href="/sign-in">Sign In</Link>
              </Button>
            )
          ) : (
            <div className="h-9 w-20 rounded-md border border-neutral-800 bg-neutral-900" />
          )}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">{children}</main>

      <footer className="border-t border-neutral-800 bg-neutral-950">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-2 px-6 py-6 text-center text-sm text-neutral-400">
          <p>© {new Date().getFullYear()} InsurTech API Hub. All rights reserved.</p>
          {!isAuthenticated ? (
            <div className="flex items-center gap-4">
              <Link className="hover:text-cyan-300" href="/sign-in">
                Sign In
              </Link>
              <Link className="hover:text-cyan-300" href="/sign-up">
                Sign Up
              </Link>
            </div>
          ) : null}
        </div>
      </footer>

      {toastMessage ? (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 shadow-lg">
          {toastMessage}
        </div>
      ) : null}
    </div>
  );
}



