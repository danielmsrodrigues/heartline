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
    <View style={{ backgroundColor: colors.bg, borderColor: colors.border, borderWidth: 1 }} className="rounded-full px-2.5 py-0.5">
      <Text style={{ color: colors.text }} className={compact ? 'text-xs font-medium' : 'text-xs font-semibold'}>
        {ATTENTION_LABELS[level]}
      </Text>
    </View>
  );
}
