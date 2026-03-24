import { View, Text, ActivityIndicator } from 'react-native';
import { Card } from './ui/Card';

interface NarrativeCardProps {
  narrative: string | null;
  loading: boolean;
}

export function NarrativeCard({ narrative, loading }: NarrativeCardProps) {
  return (
    <Card className="mb-4">
      <Text className="text-base font-semibold text-gray-900 mb-2">O que vemos no conjunto</Text>
      {loading ? (
        <View className="py-4 items-center">
          <ActivityIndicator size="small" color="#8CB369" />
          <Text className="text-sm text-gray-400 mt-2">A gerar a tua análise...</Text>
        </View>
      ) : narrative ? (
        <Text className="text-sm text-gray-700 leading-5">{narrative}</Text>
      ) : (
        <Text className="text-sm text-gray-400">Adiciona exames para ver a tua análise personalizada.</Text>
      )}
    </Card>
  );
}
