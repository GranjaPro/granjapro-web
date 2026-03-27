import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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
  const isDashboard = request.nextUrl.pathname.startsWith("/dashboard");
  const isOnboarding = request.nextUrl.pathname === "/dashboard/onboarding";

  // Check farm for: auth routes (to decide where to send) OR dashboard pages (to enforce onboarding)
  if (user && (isAuthRoute || (isDashboard && !isOnboarding))) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("farm_id")
      .eq("id", user.id)
      .maybeSingle();

    let hasFarm = !!profile?.farm_id;
    if (!hasFarm) {
      const { data: farm } = await supabase
        .from("farms")
        .select("id")
        .eq("owner_id", user.id)
        .limit(1)
        .maybeSingle();
      hasFarm = !!farm;
    }

    if (!hasFarm) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard/onboarding";
      return NextResponse.redirect(url);
    }

    if (isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
