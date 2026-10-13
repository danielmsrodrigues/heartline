import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query";
import { useAuth } from "./useAuth";
import { Profile, FamilyHistoryEntry } from "@/lib/types";

interface ProfileData {
  profile: Profile | null;
  familyHistory: FamilyHistoryEntry[];
}

async function fetchProfileData(userId: string): Promise<ProfileData> {
  const [profileRes, familyRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("family_history").select("*").eq("profile_id", userId).order("created_at"),
  ]);
  if (profileRes.error) throw profileRes.error;
  if (familyRes.error) throw familyRes.error;
  return { profile: profileRes.data, familyHistory: familyRes.data ?? [] };
}

const EMPTY_FAMILY: FamilyHistoryEntry[] = [];

export function useProfile() {
  const { user } = useAuth();
  const userId = user?.id;
  const client = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.profile(userId),
    queryFn: () => fetchProfileData(userId!),
    enabled: !!userId,
  });

  const { refetch } = query;
  const fetchProfile = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!userId) return;
    // upsert: a linha pode não existir se o trigger de registo falhou.
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: userId, ...updates, updated_at: new Date().toISOString() });
    if (!error) await client.invalidateQueries({ queryKey: queryKeys.profile(userId) });
    return error;
  };

  // O histórico familiar muda o scoring e a narrativa; tocar em updated_at
  // é o que marca a análise em cache como desatualizada.
  const touchProfile = async () => {
    if (!userId) return;
    await supabase
      .from("profiles")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", userId);
    await client.invalidateQueries({ queryKey: queryKeys.profile(userId) });
  };

  const addFamilyEntry = async (
    entry: Omit<FamilyHistoryEntry, "id" | "profile_id" | "created_at">
  ) => {
    if (!userId) return;
    const { error } = await supabase
      .from("family_history")
      .insert({ ...entry, profile_id: userId });
    if (!error) await touchProfile();
    return error;
  };

  const removeFamilyEntry = async (id: string) => {
    const { error } = await supabase
      .from("family_history")
      .delete()
      .eq("id", id);
    if (!error) await touchProfile();
    return error;
  };

  return {
    profile: query.data?.profile ?? null,
    familyHistory: query.data?.familyHistory ?? EMPTY_FAMILY,
    loading: !!userId && query.isPending,
    updateProfile,
    addFamilyEntry,
    removeFamilyEntry,
    refetch: fetchProfile,
  };
}
