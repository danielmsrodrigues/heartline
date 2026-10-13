import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { json, serveAuthenticated } from "../_shared/runtime.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EXAMS_BUCKET = "exams";

// Direito ao apagamento: ficheiros originais, todas as linhas e a conta em auth.users.
// A service role só é usada aqui, e sempre sobre o id que veio do JWT.
serveAuthenticated("delete-account", async (_req, { userId }) => {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Limite de voltas: se algum item não puder ser removido, não ficar em ciclo até ao timeout.
  for (let page = 0; page < 50; page++) {
    const { data: files, error } = await admin.storage
      .from(EXAMS_BUCKET)
      .list(userId, { limit: 100 });
    if (error) throw error;
    if (!files || files.length === 0) break;

    const { error: removeError } = await admin.storage
      .from(EXAMS_BUCKET)
      .remove(files.map((f) => `${userId}/${f.name}`));
    if (removeError) throw removeError;
  }

  // As restantes tabelas referenciam profiles com on delete cascade.
  const { error: profileError } = await admin.from("profiles").delete().eq("id", userId);
  if (profileError) throw profileError;

  const { error: authError } = await admin.auth.admin.deleteUser(userId);
  if (authError) throw authError;

  return json({ deleted: true });
});
