import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { BiomarkerWithScoring } from '@/hooks/useBiomarkers';
import { Sparkline } from './sparkline';
import { AttentionBadge } from './attention-badge';
import { ATTENTION_COLORS } from '@/constants/colors';

interface BiomarkerRowProps {
  biomarker: BiomarkerWithScoring;
}

export function BiomarkerRow({ biomarker }: BiomarkerRowProps) {
  const router = useRouter();
  const color = ATTENTION_COLORS[biomarker.attentionLevel].border;

  return (
    <TouchableOpacity
      className="bg-white rounded-2xl p-4 border border-gray-100 mb-3"
      activeOpacity={0.7}
      onPress={() => router.push(`/biomarker/${biomarker.name_normalized}` as any)}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 mr-3">
          <Text className="text-base font-semibold text-gray-900">{biomarker.name}</Text>
          <View className="flex-row items-center mt-1">
            <Text className="text-lg font-bold text-gray-800">{biomarker.latestValue}</Text>
            <Text className="text-sm text-gray-500 ml-1">{biomarker.unit}</Text>
          </View>
        </View>
        <View className="items-end">
          <Sparkline data={biomarker.readings.map(r => r.value)} color={color} />
          <View className="mt-1.5">
            <AttentionBadge level={biomarker.attentionLevel} compact />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
