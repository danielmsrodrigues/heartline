import { supabase } from "./supabase";

export async function extractExamFromImage(
  imageBase64: string,
  mimeType: string = "image/jpeg"
) {
  const { data, error } = await supabase.functions.invoke("extract-exam", {
    body: { image: imageBase64, mimeType },
  });
  if (error) throw error;
  return data as {
    lab_name: string | null;
    exam_date: string | null;
    markers: Array<{
      name: string;
      name_normalized: string;
      value: number;
      unit: string;
      ref_min: number | null;
      ref_max: number | null;
      confidence: "high" | "medium" | "low";
    }>;
  };
}

export async function generateNarrative(profileId: string) {
  const { data, error } = await supabase.functions.invoke(
    "generate-narrative",
    {
      body: { profileId },
    }
  );
  if (error) throw error;
  return data as { narrative: string };
}

export async function generateQuestions(profileId: string) {
  const { data, error } = await supabase.functions.invoke(
    "generate-questions",
    {
      body: { profileId },
    }
  );
  if (error) throw error;
  return data as {
    questions: Array<{ question: string; context: string }>;
  };
}
