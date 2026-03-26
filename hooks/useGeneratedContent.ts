import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";
import { generateNarrative, generateQuestions } from "@/lib/ai";

export interface InsightCards {
  insight: string;
  positive: string;
  family_note: string;
}

export interface FullAnalysis {
  full_insight: string;
  full_positive: string;
  full_family: string;
}

interface QuestionsContent {
  questions: Array<{ question: string; context: string }>;
}

export function useGeneratedContent() {
  const { user } = useAuth();
  const [cards, setCards] = useState<InsightCards | null>(null);
  const [fullAnalysis, setFullAnalysis] = useState<FullAnalysis | null>(null);
  const [questions, setQuestions] = useState<
    Array<{ question: string; context: string }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const hasLoadedOnce = useRef(false);

  const fetchCached = useCallback(async () => {
    if (!user) return;
    if (!hasLoadedOnce.current) setLoading(true);

    const { data: narrativeData } = await supabase
      .from("generated_content")
      .select("*")
      .eq("profile_id", user.id)
      .eq("content_type", "narrative")
      .order("generated_at", { ascending: false })
      .limit(1)
      .single();

    let needsRegeneration = false;
    if (narrativeData) {
      const content = narrativeData.content as unknown as any;
      if ('insight' in content) {
        setCards({
          insight: content.insight ?? '',
          positive: content.positive ?? '',
          family_note: content.family_note ?? '',
        });
        setFullAnalysis({
          full_insight: content.full_insight ?? '',
          full_positive: content.full_positive ?? '',
          full_family: content.full_family ?? '',
        });
      } else {
        // Old format — needs regeneration
        needsRegeneration = true;
      }
    }

    const { data: questionsData } = await supabase
      .from("generated_content")
      .select("*")
      .eq("profile_id", user.id)
      .eq("content_type", "questions")
      .order("generated_at", { ascending: false })
      .limit(1)
      .single();

    if (questionsData) {
      setQuestions(
        (questionsData.content as unknown as QuestionsContent).questions
      );
    }

    hasLoadedOnce.current = true;
    setLoading(false);
    return needsRegeneration;
  }, [user]);

  useEffect(() => {
    fetchCached().then((needsRegen) => {
      if (needsRegen) regenerate();
    });
  }, [fetchCached]);

  const regenerate = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const [narrativeResult, questionsResult] = await Promise.all([
        generateNarrative(user.id),
        generateQuestions(user.id),
      ]);
      setCards({
        insight: narrativeResult.insight,
        positive: narrativeResult.positive,
        family_note: narrativeResult.family_note,
      });
      setFullAnalysis({
        full_insight: narrativeResult.full_insight,
        full_positive: narrativeResult.full_positive,
        full_family: narrativeResult.full_family,
      });
      setQuestions(questionsResult.questions);
    } catch (e) {
      console.error("Error generating content:", e);
    } finally {
      setGenerating(false);
    }
  };

  return {
    cards,
    fullAnalysis,
    questions,
    loading,
    generating,
    regenerate,
    refetch: fetchCached,
  };
}
