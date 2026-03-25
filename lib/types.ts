export type AttentionLevel =
  | "dentro_do_esperado"
  | "a_acompanhar"
  | "merece_atencao"
  | "fora_do_range";

export type Trend = "a_subir" | "a_descer" | "estavel" | "sem_dados";

export type RangeType = "bounded" | "max_only" | "min_only" | "none";

export interface Profile {
  id: string;
  name: string | null;
  birth_date: string | null;
  sex: "M" | "F" | "other" | null;
  smoker: boolean;
  exercise_minutes_per_week: number | null;
  sedentary_work: boolean;
  sleep_hours_avg: number | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface FamilyHistoryEntry {
  id: string;
  profile_id: string;
  relationship: string;
  event_type: string;
  event_age: number | null;
  notes: string | null;
  created_at: string;
}

export interface Exam {
  id: string;
  profile_id: string;
  lab_name: string | null;
  exam_date: string;
  original_file_path: string | null;
  extraction_method: "manual" | "ai_extracted";
  created_at: string;
}

export interface Biomarker {
  id: string;
  exam_id: string;
  profile_id: string;
  name: string;
  name_normalized: string | null;
  value: number;
  unit: string;
  ref_min: number | null;
  ref_max: number | null;
  ai_confidence: "high" | "medium" | "low" | null;
  user_confirmed: boolean;
  created_at: string;
}

export interface GeneratedContent {
  id: string;
  profile_id: string;
  content_type: "narrative" | "questions";
  content: Record<string, unknown>;
  based_on_exam_ids: string[];
  generated_at: string;
}

export interface ExtractedMarker {
  name: string;
  name_normalized: string;
  value: number;
  unit: string;
  ref_min: number | null;
  ref_max: number | null;
  confidence: "high" | "medium" | "low";
}

export interface ExtractionResult {
  lab_name: string | null;
  exam_date: string | null;
  markers: ExtractedMarker[];
}
