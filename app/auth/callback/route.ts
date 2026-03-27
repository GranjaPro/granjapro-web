import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // If redirecting to a non-dashboard route (e.g. /login after email confirm), skip farm check
      if (!next.startsWith("/dashboard")) {
        return NextResponse.redirect(`${origin}${next}`);
      }

      // Check if user has a farm (first-time user detection)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
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
          return NextResponse.redirect(`${origin}/dashboard/onboarding`);
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
