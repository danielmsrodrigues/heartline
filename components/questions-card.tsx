import { View, Text, ActivityIndicator } from 'react-native';

interface QuestionsCardProps {
  questions: Array<{ question: string; context: string }>;
  loading: boolean;
}

export function QuestionsCard({ questions, loading }: QuestionsCardProps) {
  // Only show the first (most relevant) question
  const firstQuestion = questions.length > 0 ? questions[0] : null;

  return (
    <View className="bg-[#111111] border border-[#151515] rounded-2xl" style={{ padding: 18 }}>
      <Text className="text-[#555555] mb-3" style={{ fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' }}>
        Para o teu médico
      </Text>
      {loading ? (
        <View className="py-4 items-center">
          <ActivityIndicator size="small" color="#1D9E75" />
          <Text className="text-sm text-[#555555] mt-2">A preparar perguntas...</Text>
        </View>
      ) : firstQuestion ? (
        <Text className="text-sm text-[#EEEEEE]" style={{ fontStyle: 'italic', lineHeight: 22 }}>
          "{firstQuestion.question}"
        </Text>
      ) : null}
    </View>
  );
}
