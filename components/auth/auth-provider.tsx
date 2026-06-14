"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from "react";
import { createClient, hasSupabaseConfig } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo<SupabaseClient | null>(
    () => (hasSupabaseConfig() ? createClient() : null),
    []
  );
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null);
  const [farm, setFarm] = useState<Tables<"farms"> | null>(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef<User | null>(null);
  const farmRef = useRef<Tables<"farms"> | null>(null);

  const loadUserData = useCallback(async (currentUser: User) => {
    if (!supabase) return false;

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
          farmRef.current = farmData;
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
          farmRef.current = farmData;
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
  }, [supabase]);

  // Onboarding is now rendered as an overlay in the dashboard layout
  // No redirect needed — layout checks `farm` state directly
  const checkOnboarding = useCallback((_foundFarm: boolean) => {}, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;

    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      if (!active) return;

      if (currentUser) {
        userRef.current = currentUser;
        setUser(currentUser);
        setLoading(false);

        loadUserData(currentUser)
          .then((foundFarm) => {
            if (!active) return;
            checkOnboarding(foundFarm);
          })
          .catch((err) => {
            console.error("Error loading user data:", err);
          });
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
          farmRef.current = null;
          setLoading(false);
          return;
        }

        if (event === "SIGNED_IN") {
          const currentUser = session?.user ?? null;
          if (!currentUser) {
            setLoading(false);
            return;
          }
          if (userRef.current?.id === currentUser.id) {
            // Same user but still check onboarding (e.g. after OAuth redirect)
            if (!farmRef.current) checkOnboarding(false);
            setLoading(false);
            return;
          }
          userRef.current = currentUser;
          setUser(currentUser);
          setLoading(false);

          loadUserData(currentUser)
            .then((foundFarm) => {
              checkOnboarding(foundFarm);
            })
            .catch((err) => {
              console.error("Error handling auth state:", err);
            });
        }
      }
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase, loadUserData, checkOnboarding]);

  const refreshProfile = useCallback(async () => {
    if (!user || !supabase) return;
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
        if (farmData) {
          setFarm(farmData);
          farmRef.current = farmData;
        }
      }
    } catch (err) {
      console.error("Error refreshing profile:", err);
    }
  }, [user, supabase]);

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setFarm(null);
    window.location.href = "/login";
  }, [supabase]);

  return (
    <AuthContext.Provider value={{ user, profile, farm, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
