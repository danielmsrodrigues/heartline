import type { IconName } from '@/components/ui/Icon';
import { Profile } from '@/lib/types';

// Os hábitos respondem-se com um toque. Cada opção guarda um valor
// representativo no perfil (minutos de exercício, horas de sono).
export type HabitKey = 'smoker' | 'exercise' | 'sedentary' | 'sleep';

interface HabitOption {
  /** Texto do botão de escolha. */
  label: string;
  /** Texto curto para o mosaico do perfil. */
  short: string;
  updates: Partial<Profile>;
  matches: (p: Profile) => boolean;
}

export interface Habit {
  key: HabitKey;
  question: string;
  title: string;
  icon: IconName;
  options: HabitOption[];
}

export const HABITS: Habit[] = [
  {
    key: 'smoker',
    question: 'Fumas?',
    title: 'Tabaco',
    icon: 'smoke',
    options: [
      { label: 'Não', short: 'Não fumo', updates: { smoker: false }, matches: (p) => !p.smoker },
      { label: 'Sim', short: 'Fumo', updates: { smoker: true }, matches: (p) => p.smoker },
    ],
  },
  {
    key: 'exercise',
    question: 'Exercício por semana',
    title: 'Exercício',
    icon: 'exercise',
    options: [
      { label: 'Pouco ou nenhum', short: 'Pouco', updates: { exercise_minutes_per_week: 0 }, matches: (p) => (p.exercise_minutes_per_week ?? 0) < 45 },
      { label: '1 a 2 vezes', short: '1 a 2 vezes', updates: { exercise_minutes_per_week: 90 }, matches: (p) => (p.exercise_minutes_per_week ?? 0) >= 45 && (p.exercise_minutes_per_week ?? 0) < 150 },
      { label: '3 ou mais', short: '3 ou mais', updates: { exercise_minutes_per_week: 180 }, matches: (p) => (p.exercise_minutes_per_week ?? 0) >= 150 },
    ],
  },
  {
    key: 'sedentary',
    question: 'Passas o dia sentado?',
    title: 'Dia sentado',
    icon: 'sitting',
    options: [
      { label: 'Sim', short: 'Sim', updates: { sedentary_work: true }, matches: (p) => p.sedentary_work },
      { label: 'Não', short: 'Não', updates: { sedentary_work: false }, matches: (p) => !p.sedentary_work },
    ],
  },
  {
    key: 'sleep',
    question: 'Horas de sono',
    title: 'Sono',
    icon: 'sleep',
    options: [
      { label: 'Menos de 6', short: 'Menos de 6 h', updates: { sleep_hours_avg: 5.5 }, matches: (p) => p.sleep_hours_avg != null && p.sleep_hours_avg < 6 },
      { label: '6 a 8', short: '6 a 8 horas', updates: { sleep_hours_avg: 7 }, matches: (p) => p.sleep_hours_avg != null && p.sleep_hours_avg >= 6 && p.sleep_hours_avg <= 8 },
      { label: 'Mais de 8', short: 'Mais de 8 h', updates: { sleep_hours_avg: 8.5 }, matches: (p) => p.sleep_hours_avg != null && p.sleep_hours_avg > 8 },
    ],
  },
];

/** Índice da opção que corresponde ao perfil, ou -1 se ainda não houver resposta. */
export function habitIndex(habit: Habit, profile: Profile | null): number {
  if (!profile) return -1;
  return habit.options.findIndex((o) => o.matches(profile));
}
