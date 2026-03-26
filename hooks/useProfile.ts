import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";
import { Profile, FamilyHistoryEntry } from "@/lib/types";

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [familyHistory, setFamilyHistory] = useState<FamilyHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const hasLoadedOnce = useRef(false);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    if (!hasLoadedOnce.current) setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    setProfile(data);
    const { data: family } = await supabase
      .from("family_history")
      .select("*")
      .eq("profile_id", user.id);
    setFamilyHistory(family ?? []);
    hasLoadedOnce.current = true;
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", user.id);
    if (!error) await fetchProfile();
    return error;
  };

  const addFamilyEntry = async (
    entry: Omit<FamilyHistoryEntry, "id" | "profile_id" | "created_at">
  ) => {
    if (!user) return;
    const { error } = await supabase
      .from("family_history")
      .insert({ ...entry, profile_id: user.id });
    if (!error) await fetchProfile();
    return error;
  };

  const removeFamilyEntry = async (id: string) => {
    const { error } = await supabase
      .from("family_history")
      .delete()
      .eq("id", id);
    if (!error) await fetchProfile();
    return error;
  };

  return {
    profile,
    familyHistory,
    loading,
    updateProfile,
    addFamilyEntry,
    removeFamilyEntry,
    refetch: fetchProfile,
  };
}
