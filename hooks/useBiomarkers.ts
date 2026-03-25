import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";
import { Biomarker, Exam, RangeType } from "@/lib/types";
import {
  classifyRange,
  getSeverity,
  getProximity,
  getTrend,
  getAttentionLevel,
  AttentionLevel,
  Trend,
} from "@/lib/scoring";

export interface BiomarkerWithScoring {
  name: string;
  name_normalized: string;
  latestValue: number;
  unit: string;
  ref_min: number | null;
  ref_max: number | null;
  rangeType: RangeType;
  severity: number;
  proximity: number;
  trend: Trend;
  attentionLevel: AttentionLevel;
  readings: { id: string; value: number; date: string }[];
}

export function useBiomarkers(hasFamilyHistory: boolean = false) {
  const { user } = useAuth();
  const [biomarkers, setBiomarkers] = useState<BiomarkerWithScoring[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBiomarkers = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: examsData } = await supabase
      .from("exams")
      .select("*")
      .eq("profile_id", user.id)
      .order("exam_date", { ascending: false });
    setExams(examsData ?? []);

    const { data: markersData } = await supabase
      .from("biomarkers")
      .select("*, exams!inner(exam_date)")
      .eq("profile_id", user.id)
      .eq("user_confirmed", true);

    if (!markersData || markersData.length === 0) {
      setBiomarkers([]);
      setLoading(false);
      return;
    }

    // Group by name_normalized
    const grouped: Record<string, { marker: Biomarker; date: string }[]> = {};
    for (const m of markersData) {
      const raw = m.name_normalized || m.name;
      const key = raw.toLowerCase().trim();
      // exams can come back as object or array depending on Supabase version
      const examsField = (m as any).exams;
      const examDate: string = Array.isArray(examsField)
        ? examsField[0]?.exam_date
        : examsField?.exam_date;
      if (!examDate) continue;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({
        marker: m as Biomarker,
        date: examDate,
      });
    }

    const cardiovascularMarkers = [
      'ldl', 'hdl', 'total_cholesterol', 'cholesterol', 'colesterol',
      'triglycerides', 'trigliceridos', 'glucose', 'glicose',
      'hba1c', 'crp', 'pcr', 'apolipoproteina', 'lipoproteina',
    ];

    const scored: BiomarkerWithScoring[] = Object.entries(grouped).map(
      ([key, entries]) => {
        const sorted = entries.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        const latest = sorted[0].marker;
        const readings = sorted
          .map((e) => ({ id: e.marker.id, value: e.marker.value, date: e.date }))
          .reverse();
        const rangeType = classifyRange(latest.ref_min, latest.ref_max);
        const severity = getSeverity(latest.value, latest.ref_min, latest.ref_max, rangeType);
        const proximity = getProximity(latest.value, latest.ref_min, latest.ref_max, rangeType);
        const trend = getTrend(readings);
        const isCardiovascular = cardiovascularMarkers.some(
          (m) => key.includes(m)
        );
        const attentionLevel = getAttentionLevel(
          severity,
          proximity,
          trend,
          hasFamilyHistory && isCardiovascular
        );

        return {
          name: latest.name,
          name_normalized: key,
          latestValue: latest.value,
          unit: latest.unit,
          ref_min: latest.ref_min,
          ref_max: latest.ref_max,
          rangeType,
          severity,
          proximity,
          trend,
          attentionLevel,
          readings,
        };
      }
    );

    // Sort: fora_do_range first, then merece_atencao, etc.
    const order: Record<AttentionLevel, number> = {
      fora_do_range: 0,
      merece_atencao: 1,
      a_acompanhar: 2,
      dentro_do_esperado: 3,
    };
    scored.sort((a, b) => order[a.attentionLevel] - order[b.attentionLevel]);

    setBiomarkers(scored);
    setLoading(false);
  }, [user, hasFamilyHistory]);

  useEffect(() => {
    fetchBiomarkers();
  }, [fetchBiomarkers]);

  return { biomarkers, exams, loading, refetch: fetchBiomarkers };
}
