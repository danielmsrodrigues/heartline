import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
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

  const TrendIcon =
    biomarker.trend === 'a_subir'
      ? TrendingUp
      : biomarker.trend === 'a_descer'
      ? TrendingDown
      : Minus;

  return (
    <TouchableOpacity
      className="bg-[#111111] rounded-2xl p-4 border border-[#151515]"
      activeOpacity={0.7}
      onPress={() => router.push(`/biomarker/${biomarker.name_normalized}` as any)}
    >
      {/* Top: name + badge */}
      <View className="flex-row items-start justify-between mb-3">
        <Text className="text-base text-[#888888]" numberOfLines={1} style={{ flex: 1 }}>
          {biomarker.name}
        </Text>
        <View className="ml-1">
          <AttentionBadge level={biomarker.attentionLevel} compact />
        </View>
      </View>

      {/* Middle: large value */}
      <View className="flex-row items-baseline" style={{ gap: 4 }}>
        <Text className="text-3xl font-semibold text-[#F5F5F5]">{biomarker.latestValue}</Text>
        <Text className="text-sm text-[#555555]">{biomarker.unit}</Text>
      </View>

      {/* Bottom: sparkline + trend */}
      <View className="flex-row items-center justify-between mt-3">
        <Sparkline data={biomarker.readings.map(r => r.value)} color={color} width={48} height={24} />
        <TrendIcon size={14} color={color} />
      </View>
    </TouchableOpacity>
  );
}
