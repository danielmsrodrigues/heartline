/**
 * Seeds a demo account with SYNTHETIC data only — no real person's exams.
 *
 * Scenario (the project's reference test case): a 28-year-old man whose father
 * had a heart attack at 48, with LDL rising across three exams while HDL,
 * triglycerides and glucose drift towards their limits.
 *
 * Usage (the service-role key stays on your machine; never commit it):
 *
 *   npx tsx --env-file=.env scripts/seed-demo.ts [--without-latest]
 *
 * It asks for the service-role key and a password for the demo account, unless
 * SUPABASE_SERVICE_ROLE_KEY and DEMO_PASSWORD are set in the environment.
 *
 * `--without-latest` seeds only the two older exams, so the most recent one can
 * be added through the app with docs/demo/synthetic-lab-report.png (useful for
 * recording the add-exam flow). Re-running the script resets the demo account.
 */
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const email = process.env.DEMO_EMAIL ?? "demo@example.com";
const withoutLatest = process.argv.includes("--without-latest");

/**
 * Uses the environment variable when set; otherwise asks in the terminal.
 * What is typed is not echoed, so secrets do not stay in the scrollback.
 */
async function fromEnvOrPrompt(name: string, question: string): Promise<string> {
  const value = process.env[name]?.trim();
  if (value) return value;
  process.stdout.write(question);
  const muted = new Writable({ write: (_chunk, _encoding, done) => done() });
  const rl = createInterface({ input: process.stdin, output: muted, terminal: true });
  const answer = (await rl.question("")).trim();
  rl.close();
  process.stdout.write("\n");
  if (!answer) {
    console.error(`Missing ${name}.`);
    process.exit(1);
  }
  return answer;
}

let admin: SupabaseClient;
let password: string;

/** Local date `monthsAgo` months back, as YYYY-MM-DD. */
function dateMonthsAgo(monthsAgo: number, day: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo, day);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Oldest → newest. The newest matches docs/demo/synthetic-lab-report.png.
const EXAMS = [
  { date: dateMonthsAgo(19, 10), ldl: 118, hdl: 48, triglycerides: 138, glucose: 92 },
  { date: dateMonthsAgo(10, 17), ldl: 129, hdl: 46, triglycerides: 152, glucose: 95 },
  { date: dateMonthsAgo(0, 6), ldl: 142, hdl: 44, triglycerides: 165, glucose: 98 },
];

const MARKERS = [
  { key: "ldl", name: "Colesterol LDL", ref_min: null, ref_max: 130 },
  { key: "hdl", name: "Colesterol HDL", ref_min: 40, ref_max: null },
  { key: "triglycerides", name: "Triglicéridos", ref_min: null, ref_max: 150 },
  { key: "glucose", name: "Glicose", ref_min: 70, ref_max: 100 },
] as const;

async function findOrCreateUser(): Promise<string> {
  const { data: list, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw listError;
  const existing = list.users.find((u) => u.email === email);
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, { password });
    if (error) throw error;
    return existing.id;
  }
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("User not created");
  return data.user.id;
}

async function main() {
  if (!url) {
    console.error("Missing EXPO_PUBLIC_SUPABASE_URL (run with --env-file=.env).");
    process.exit(1);
  }
  const serviceKey = await fromEnvOrPrompt("SUPABASE_SERVICE_ROLE_KEY", "Supabase service_role key: ");
  password = await fromEnvOrPrompt("DEMO_PASSWORD", `Password for ${email}: `);
  admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const userId = await findOrCreateUser();

  // Start from a clean slate: biomarkers cascade with their exams.
  for (const table of ["generated_content", "family_history", "exams"]) {
    const { error } = await admin.from(table).delete().eq("profile_id", userId);
    if (error) throw error;
  }

  const birth = new Date();
  birth.setFullYear(birth.getFullYear() - 28, birth.getMonth() - 3, 14);
  const { error: profileError } = await admin.from("profiles").upsert({
    id: userId,
    name: "Alex",
    birth_date: birth.toISOString().slice(0, 10),
    sex: "M",
    smoker: false,
    exercise_minutes_per_week: 180,
    sedentary_work: true,
    sleep_hours_avg: 7,
    onboarding_completed: true,
    health_consent_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  if (profileError) throw profileError;

  const { error: familyError } = await admin.from("family_history").insert({
    profile_id: userId,
    relationship: "pai",
    event_type: "enfarte",
    event_age: 48,
    notes: "Synthetic demo data",
  });
  if (familyError) throw familyError;

  const exams = withoutLatest ? EXAMS.slice(0, -1) : EXAMS;
  for (const exam of exams) {
    const { data: row, error: examError } = await admin
      .from("exams")
      .insert({ profile_id: userId, lab_name: "Laboratório Demo", exam_date: exam.date, extraction_method: "manual" })
      .select("id")
      .single();
    if (examError || !row) throw examError ?? new Error("Exam not created");

    const { error: markersError } = await admin.from("biomarkers").insert(
      MARKERS.map((m) => ({
        exam_id: row.id,
        profile_id: userId,
        name: m.name,
        name_normalized: m.key,
        value: exam[m.key],
        unit: "mg/dL",
        ref_min: m.ref_min,
        ref_max: m.ref_max,
        ai_confidence: null,
        user_confirmed: true,
      }))
    );
    if (markersError) throw markersError;
  }

  console.log(`Demo account ready: ${email} (${exams.length} synthetic exams).`);
  console.log("The AI narrative and doctor questions are generated the first time the app opens.");
}

main().catch((error) => {
  console.error("Seed failed:", error?.message ?? error);
  process.exit(1);
});
