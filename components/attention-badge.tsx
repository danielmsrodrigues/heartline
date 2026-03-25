import { View, Text } from 'react-native';
import { AttentionLevel } from '@/lib/types';
import { ATTENTION_COLORS, ATTENTION_LABELS } from '@/constants/colors';

interface AttentionBadgeProps {
  level: AttentionLevel;
  compact?: boolean;
}

export function AttentionBadge({ level, compact = false }: AttentionBadgeProps) {
  const colors = ATTENTION_COLORS[level];
  return (
    <View
      style={{ backgroundColor: colors.bg }}
      className={`rounded-full ${compact ? 'px-2 py-0.5' : 'px-2.5 py-1'}`}
    >
      <Text
        style={{ color: colors.text, fontSize: compact ? 12 : 14, fontWeight: '500' }}
      >
        {ATTENTION_LABELS[level]}
      </Text>
    </View>
  );
}
