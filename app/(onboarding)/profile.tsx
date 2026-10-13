import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';
import { useProfile } from '@/hooks/useProfile';
import { toDateOnly } from '@/lib/dates';
import { haptics } from '@/lib/haptics';
import { HABITS } from '@/constants/habits';
import { useTheme } from '@/constants/theme';
import { Profile } from '@/lib/types';
import { HabitQuestion } from '@/components/habit-question';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Chip, ChipRow } from '@/components/ui/Chip';
import { DatePicker } from '@/components/ui/DatePicker';
import { Input } from '@/components/ui/Input';
import { slideIn } from '@/components/ui/enter';
import { Screen } from '@/components/ui/Screen';
import { Title } from '@/components/ui/Text';
import { TopBar } from '@/components/ui/TopBar';

const SEXES: { label: string; value: NonNullable<Profile['sex']> }[] = [
  { label: 'Feminino', value: 'F' },
  { label: 'Masculino', value: 'M' },
  { label: 'Outro', value: 'other' },
];

// Dois ecrãs em vez de sete: quem és, e os teus hábitos (só toques).
export default function ProfileOnboardingScreen() {
  const t = useTheme();
  const router = useRouter();
  const { updateProfile } = useProfile();
  const [step, setStep] = useState<1 | 2>(1);

  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [sex, setSex] = useState<Profile['sex']>(null);
  // Índice da opção escolhida em cada hábito (ver HABITS).
  const [habits, setHabits] = useState<number[]>(HABITS.map(() => -1));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fail = (message: string) => {
    haptics.warning();
    setError(message);
  };

  const handleNext = async () => {
    if (step === 1) {
      if (!name.trim()) { fail('Diz-me como te chamas.'); return; }
      if (!birthDate) { fail('Indica a tua data de nascimento.'); return; }
      if (!sex) { fail('Escolhe uma opção em "Sexo".'); return; }
      setError('');
      setStep(2);
      return;
    }

    if (habits.some((h) => h < 0)) { fail('Falta responder a uma das perguntas.'); return; }
    setError('');
    setLoading(true);
    const answers = HABITS.reduce<Partial<Profile>>((all, habit, i) => ({ ...all, ...habit.options[habits[i]].updates }), {});
    const result = await updateProfile({ name: name.trim(), birth_date: toDateOnly(birthDate!), sex: sex!, ...answers });
    setLoading(false);
    if (result) {
      fail('Não foi possível guardar. Tenta novamente.');
    } else {
      router.push('/(onboarding)/family');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <Screen footer={<Button title="Continuar" onPress={handleNext} loading={loading} />}>
        <TopBar progress={step} back={step === 2} onBack={() => { setError(''); setStep(1); }} />
        {step === 1 ? (
          <Animated.View key="about" entering={slideIn}>
            <Title style={{ marginTop: 24 }}>Sobre ti</Title>
            {error ? <Banner tone="out" text={error} /> : null}
            <View style={{ marginTop: 6 }}>
              <Input label="Nome" value={name} onChangeText={setName} placeholder="Como te chamas?" autoCapitalize="words" autoComplete="given-name" textContentType="givenName" returnKeyType="done" />
              <DatePicker label="Data de nascimento" value={birthDate} onChange={setBirthDate} maximumDate={new Date()} minimumDate={new Date(1920, 0, 1)} />
            </View>
            <Text style={{ marginTop: 18, marginHorizontal: 4, fontSize: 15, lineHeight: 20, fontWeight: '600', color: t.ink }}>Sexo</Text>
            <ChipRow style={{ marginTop: 8 }}>
              {SEXES.map((option) => (
                <Chip key={option.value} label={option.label} selected={sex === option.value} choice onPress={() => setSex(option.value)} />
              ))}
            </ChipRow>
          </Animated.View>
        ) : (
          <Animated.View key="habits" entering={slideIn}>
            <Title style={{ marginTop: 24 }}>Os teus hábitos</Title>
            {error ? <Banner tone="out" text={error} /> : null}
            {HABITS.map((habit, i) => (
              <HabitQuestion
                key={habit.key}
                habit={habit}
                selected={habits[i]}
                onSelect={(index) => setHabits((current) => current.map((v, j) => (j === i ? index : v)))}
              />
            ))}
          </Animated.View>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}
