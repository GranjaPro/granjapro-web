import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_DASHBOARD_DESTINATION = "/dashboard";
const ONBOARDING_DESTINATION = "/dashboard/onboarding";
const LOGIN_DESTINATION = "/login";

function sanitizeInternalDestination(value: string | null) {
  const fallback = DEFAULT_DASHBOARD_DESTINATION;
  const destination = value ?? fallback;

  if (
    !destination.startsWith("/") ||
    destination.startsWith("//") ||
    destination.includes("\\")
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(destination, "http://internal.local");
    if (parsed.origin !== "http://internal.local") {
      return fallback;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

function isDashboardDestination(destination: string) {
  const pathname = new URL(destination, "http://internal.local").pathname;
  return (
    pathname === DEFAULT_DASHBOARD_DESTINATION ||
    pathname.startsWith(`${DEFAULT_DASHBOARD_DESTINATION}/`)
  );
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeInternalDestination(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // If redirecting to a non-dashboard route (e.g. /login after email confirm), skip farm check
      if (!isDashboardDestination(next)) {
        return NextResponse.redirect(`${origin}${next}`);
      }

      // Check if user has a farm (first-time user detection)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, farm_id")
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

          if (farm?.id && profile?.id) {
            await supabase
              .from("profiles")
              .update({ farm_id: farm.id })
              .eq("id", user.id);
          }
        }

        if (!hasFarm) {
          return NextResponse.redirect(`${origin}${ONBOARDING_DESTINATION}`);
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}${LOGIN_DESTINATION}`);
}
