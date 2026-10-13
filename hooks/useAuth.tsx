import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/query";

interface AuthState {
  session: Session | null;
  loading: boolean;
  user: User | null;
}

const AuthContext = createContext<AuthState>({ session: null, loading: true, user: null });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => setSession(session))
      .catch((err) => console.warn("Não foi possível ler a sessão:", err))
      .finally(() => setLoading(false));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      // Os dados de saúde em cache não podem passar para a conta seguinte.
      if (event === "SIGNED_OUT") queryClient.clear();
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo(
    () => ({ session, loading, user: session?.user ?? null }),
    [session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
