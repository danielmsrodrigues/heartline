import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";
import { generateNarrative, generateQuestions } from "@/lib/ai";

interface NarrativeContent {
  narrative: string;
}

interface QuestionsContent {
  questions: Array<{ question: string; context: string }>;
}

export function useGeneratedContent() {
  const { user } = useAuth();
  const [narrative, setNarrative] = useState<string | null>(null);
  const [questions, setQuestions] = useState<
    Array<{ question: string; context: string }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchCached = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: narrativeData } = await supabase
      .from("generated_content")
      .select("*")
      .eq("profile_id", user.id)
      .eq("content_type", "narrative")
      .order("generated_at", { ascending: false })
      .limit(1)
      .single();

    if (narrativeData) {
      setNarrative(
        (narrativeData.content as unknown as NarrativeContent).narrative
      );
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

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchCached();
  }, [fetchCached]);

  const regenerate = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const [narrativeResult, questionsResult] = await Promise.all([
        generateNarrative(user.id),
        generateQuestions(user.id),
      ]);
      setNarrative(narrativeResult.narrative);
      setQuestions(questionsResult.questions);
    } catch (e) {
      console.error("Error generating content:", e);
    } finally {
      setGenerating(false);
    }
  };

  return {
    narrative,
    questions,
    loading,
    generating,
    regenerate,
    refetch: fetchCached,
  };
}
