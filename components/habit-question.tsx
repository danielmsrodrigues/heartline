import { Text, View } from 'react-native';
import { Habit } from '@/constants/habits';
import { useTheme } from '@/constants/theme';
import { Chip, ChipRow, IconBubble } from '@/components/ui/Chip';

interface HabitQuestionProps {
  habit: Habit;
  /** Índice da opção escolhida, ou -1. */
  selected: number;
  onSelect: (index: number) => void;
}

/** Uma pergunta de hábitos: ícone, pergunta e escolhas de um toque. */
export function HabitQuestion({ habit, selected, onSelect }: HabitQuestionProps) {
  const t = useTheme();
  return (
    <View style={{ marginTop: 24 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 4 }}>
        <IconBubble icon={habit.icon} size={32} />
        <Text style={{ fontSize: 15, lineHeight: 20, fontWeight: '600', color: t.ink }}>{habit.question}</Text>
      </View>
      <ChipRow style={{ marginTop: 10 }}>
        {habit.options.map((option, i) => (
          <Chip key={option.label} label={option.label} selected={selected === i} choice onPress={() => onSelect(i)} />
        ))}
      </ChipRow>
    </View>
  );
}
