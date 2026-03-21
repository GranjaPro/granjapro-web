"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Tables } from "@/lib/database.types";

interface AuthContextType {
  user: User | null;
  profile: Tables<"profiles"> | null;
  farm: Tables<"farms"> | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  farm: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null);
  const [farm, setFarm] = useState<Tables<"farms"> | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const getSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      let foundFarm = false;

      if (user) {
        // Fetch profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        setProfile(profileData);

        // Fetch farm (owned or associated)
        if (profileData?.farm_id) {
          const { data: farmData } = await supabase
            .from("farms")
            .select("*")
            .eq("id", profileData.farm_id)
            .single();
          if (farmData) {
            setFarm(farmData);
            foundFarm = true;
          }
        }

        if (!foundFarm) {
          // Check if user owns a farm
          const { data: farmData } = await supabase
            .from("farms")
            .select("*")
            .eq("owner_id", user.id)
            .limit(1)
            .maybeSingle();

          if (farmData) {
            setFarm(farmData);
            foundFarm = true;
            // Update profile with farm_id
            await supabase
              .from("profiles")
              .update({ farm_id: farmData.id })
              .eq("id", user.id);
          }
        }
      }

      setLoading(false);

      // Redirect to onboarding if authenticated but no farm
      if (user && !foundFarm && pathname?.startsWith("/dashboard") && pathname !== "/dashboard/onboarding") {
        router.push("/dashboard/onboarding");
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        if (!session?.user) {
          setProfile(null);
          setFarm(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setFarm(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, profile, farm, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
