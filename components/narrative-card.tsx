import { View, Text, ActivityIndicator } from 'react-native';

interface NarrativeCardProps {
  narrative: string | null;
  loading: boolean;
}

export function NarrativeCard({ narrative, loading }: NarrativeCardProps) {
  return (
    <View className="bg-[#111111] border border-[#151515] rounded-2xl" style={{ padding: 18 }}>
      <Text className="text-[#555555] mb-3" style={{ fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' }}>
        O que vemos no conjunto
      </Text>
      {loading ? (
        <View className="py-4 items-center">
          <ActivityIndicator size="small" color="#1D9E75" />
          <Text className="text-sm text-[#555555] mt-2">A gerar a tua análise...</Text>
        </View>
      ) : narrative ? (
        <Text className="text-sm text-[#CCCCCC]" style={{ lineHeight: 22 }}>{narrative}</Text>
      ) : (
        <Text className="text-sm text-[#555555]">Adiciona exames para ver a tua análise personalizada.</Text>
      )}
    </View>
  );
}
