"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
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
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  farm: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

const supabase = createClient();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null);
  const [farm, setFarm] = useState<Tables<"farms"> | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const userRef = useRef<User | null>(null);

  const loadUserData = useCallback(async (currentUser: User) => {
    let foundFarm = false;
    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single();

      setProfile(profileData);

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
        const { data: farmData } = await supabase
          .from("farms")
          .select("*")
          .eq("owner_id", currentUser.id)
          .limit(1)
          .maybeSingle();

        if (farmData) {
          setFarm(farmData);
          foundFarm = true;
          await supabase
            .from("profiles")
            .update({ farm_id: farmData.id })
            .eq("id", currentUser.id);
        }
      }
    } catch (err) {
      console.error("Error loading user data:", err);
    }
    return foundFarm;
  }, []);

  const checkOnboarding = useCallback((foundFarm: boolean) => {
    const p = pathnameRef.current;
    if (!foundFarm && p?.startsWith("/dashboard") && p !== "/dashboard/onboarding") {
      router.push("/dashboard/onboarding");
    }
  }, [router]);

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(async ({ data: { user: currentUser } }) => {
      if (!active) return;

      if (currentUser) {
        userRef.current = currentUser;
        setUser(currentUser);
        const foundFarm = await loadUserData(currentUser);
        if (!active) return;
        setLoading(false);
        checkOnboarding(foundFarm);
      } else {
        setUser(null);
        setLoading(false);
      }
    }).catch(() => {
      if (active) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_OUT") {
          userRef.current = null;
          setUser(null);
          setProfile(null);
          setFarm(null);
          setLoading(false);
          return;
        }

        if (event === "SIGNED_IN") {
          const currentUser = session?.user ?? null;
          if (!currentUser) return;
          // Skip reload if the same user is already loaded (e.g. tab refocus re-fires SIGNED_IN)
          if (userRef.current?.id === currentUser.id) return;
          userRef.current = currentUser;
          setUser(currentUser);
          setLoading(true);
          const foundFarm = await loadUserData(currentUser);
          setLoading(false);
          checkOnboarding(foundFarm);
        }
      }
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadUserData, checkOnboarding]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (profileData) setProfile(profileData);

      if (profileData?.farm_id) {
        const { data: farmData } = await supabase
          .from("farms")
          .select("*")
          .eq("id", profileData.farm_id)
          .single();
        if (farmData) setFarm(farmData);
      }
    } catch (err) {
      console.error("Error refreshing profile:", err);
    }
  }, [user]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setFarm(null);
    window.location.href = "/login";
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, farm, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
