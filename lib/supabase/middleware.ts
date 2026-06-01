import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPlanOrNull, isTrialExpired } from "../plans";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect unauthenticated users to login (except public routes)
  const publicRoutes = ["/", "/login", "/signup", "/forgot-password", "/auth/callback", "/auth/confirm", "/termos-de-uso", "/politica-de-privacidade"];
  const isPublicRoute = publicRoutes.some(
    (route) => request.nextUrl.pathname === route
  );

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  const authRoutes = ["/login", "/signup", "/forgot-password"];
  const isAuthRoute = authRoutes.some(
    (route) => request.nextUrl.pathname === route
  );
  // Redirect authenticated users from auth pages to dashboard
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Plan-based route guards (SEC-01, SEC-04)
  if (user) {
    const PROTECTED_ROUTES = ["/dashboard/workers", "/dashboard/reports"];
    const isProtectedRoute = PROTECTED_ROUTES.some(
      (route) => request.nextUrl.pathname.startsWith(route)
    );

    if (isProtectedRoute) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("plan, trial_ends_at, trial_used_at")
        .eq("id", user.id)
        .single();

      const persistedPlan = getPlanOrNull(profile?.plan);
      const trialExpired = isTrialExpired(profile);
      const activePlan = trialExpired ? "essencial" : (persistedPlan || "essencial");

      if (activePlan !== "pro" && activePlan !== "premium") {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard/select-plan";
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
