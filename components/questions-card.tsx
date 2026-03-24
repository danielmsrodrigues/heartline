import { View, Text, ActivityIndicator } from 'react-native';
import { Card } from './ui/Card';
import { Ionicons } from '@expo/vector-icons';

interface QuestionsCardProps {
  questions: Array<{ question: string; context: string }>;
  loading: boolean;
}

export function QuestionsCard({ questions, loading }: QuestionsCardProps) {
  return (
    <Card className="mb-4">
      <Text className="text-base font-semibold text-gray-900 mb-2">Para a tua próxima consulta</Text>
      {loading ? (
        <View className="py-4 items-center">
          <ActivityIndicator size="small" color="#8CB369" />
          <Text className="text-sm text-gray-400 mt-2">A preparar perguntas...</Text>
        </View>
      ) : questions.length > 0 ? (
        <View>
          {questions.map((q, i) => (
            <View key={i} className={`${i > 0 ? 'mt-3 pt-3 border-t border-gray-100' : ''}`}>
              <View className="flex-row">
                <Ionicons name="chatbubble-outline" size={16} color="#8CB369" style={{ marginTop: 2, marginRight: 8 }} />
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-900">{q.question}</Text>
                  <Text className="text-xs text-gray-500 mt-1">{q.context}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Text className="text-sm text-gray-400">Adiciona exames para receber sugestões de perguntas.</Text>
      )}
    </Card>
  );
}
