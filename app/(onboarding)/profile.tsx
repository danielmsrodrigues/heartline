import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';

const SEX_OPTIONS = [
  { label: 'Masculino', value: 'M' as const },
  { label: 'Feminino', value: 'F' as const },
  { label: 'Outro', value: 'other' as const },
];

export default function ProfileOnboardingScreen() {
  const router = useRouter();
  const { updateProfile } = useProfile();

  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [sex, setSex] = useState<'M' | 'F' | 'other' | null>(null);
  const [smoker, setSmoker] = useState(false);
  const [exerciseMinutes, setExerciseMinutes] = useState('');
  const [sedentaryWork, setSedentaryWork] = useState(false);
  const [sleepHours, setSleepHours] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Indica o teu nome.');
      return;
    }
    if (!birthDate) {
      setError('Indica a data de nascimento.');
      return;
    }
    if (!sex) {
      setError('Seleciona o sexo.');
      return;
    }

    setLoading(true);
    setError('');

    const result = await updateProfile({
      name: name.trim(),
      birth_date: birthDate!.toISOString().split('T')[0],
      sex,
      smoker,
      exercise_minutes_per_week: exerciseMinutes
        ? parseInt(exerciseMinutes, 10)
        : null,
      sedentary_work: sedentaryWork,
      sleep_hours_avg: sleepHours ? parseFloat(sleepHours) : null,
    });

    setLoading(false);

    if (result) {
      setError('Erro ao guardar. Tenta novamente.');
    } else {
      router.push('/(onboarding)/family');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0A0A0A]">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="px-6 pt-12">
            <Text className="text-2xl font-bold text-[#F5F5F5]">
              Fala-nos sobre ti
            </Text>
            <Text className="mt-2 text-base text-[#555555] mb-4">
              Dados pessoais e hábitos de vida
            </Text>

            {/* TODO: remover antes de produção */}
            <TouchableOpacity
              onPress={() => supabase.auth.signOut()}
              className="mb-4"
            >
              <Text className="text-xs text-[#E24B4A] text-center">DEV: Terminar sessão</Text>
            </TouchableOpacity>

            {error ? (
              <View className="bg-[#E24B4A]/15 rounded-xl p-3 mb-4">
                <Text className="text-[#E24B4A] text-sm text-center">
                  {error}
                </Text>
              </View>
            ) : null}

            <Input
              label="Nome"
              value={name}
              onChangeText={setName}
              placeholder="O teu nome"
              autoCapitalize="words"
              autoComplete="off"
              textContentType="none"
            />

            <DatePicker
              label="Data de nascimento"
              value={birthDate}
              onChange={setBirthDate}
              maximumDate={new Date()}
              minimumDate={new Date(1930, 0, 1)}
            />

            {/* Sex selector */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-[#888888] mb-1.5">
                Sexo
              </Text>
              <View className="flex-row">
                {SEX_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => setSex(option.value)}
                    className={`flex-1 py-3 rounded-xl items-center mr-2 last:mr-0 border ${
                      sex === option.value
                        ? 'bg-[#1D9E75] border-[#1D9E75]'
                        : 'bg-[#111111] border-[#151515]'
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        sex === option.value ? 'text-white' : 'text-[#888888]'
                      }`}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Smoker toggle */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-[#888888] mb-1.5">
                Fumador(a)?
              </Text>
              <View className="flex-row">
                <TouchableOpacity
                  onPress={() => setSmoker(false)}
                  className={`flex-1 py-3 rounded-xl items-center mr-2 border ${
                    !smoker
                      ? 'bg-[#1D9E75] border-[#1D9E75]'
                      : 'bg-[#111111] border-[#151515]'
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      !smoker ? 'text-white' : 'text-[#888888]'
                    }`}
                  >
                    Não
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSmoker(true)}
                  className={`flex-1 py-3 rounded-xl items-center border ${
                    smoker
                      ? 'bg-[#1D9E75] border-[#1D9E75]'
                      : 'bg-[#111111] border-[#151515]'
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      smoker ? 'text-white' : 'text-[#888888]'
                    }`}
                  >
                    Sim
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <Input
              label="Minutos de exercício por semana"
              value={exerciseMinutes}
              onChangeText={setExerciseMinutes}
              placeholder="Ex: 180"
              keyboardType="number-pad"
            />

            {/* Sedentary work toggle */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-[#888888] mb-1.5">
                Trabalho sedentário?
              </Text>
              <View className="flex-row">
                <TouchableOpacity
                  onPress={() => setSedentaryWork(false)}
                  className={`flex-1 py-3 rounded-xl items-center mr-2 border ${
                    !sedentaryWork
                      ? 'bg-[#1D9E75] border-[#1D9E75]'
                      : 'bg-[#111111] border-[#151515]'
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      !sedentaryWork ? 'text-white' : 'text-[#888888]'
                    }`}
                  >
                    Não
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSedentaryWork(true)}
                  className={`flex-1 py-3 rounded-xl items-center border ${
                    sedentaryWork
                      ? 'bg-[#1D9E75] border-[#1D9E75]'
                      : 'bg-[#111111] border-[#151515]'
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      sedentaryWork ? 'text-white' : 'text-[#888888]'
                    }`}
                  >
                    Sim
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <Input
              label="Horas de sono por noite (média)"
              value={sleepHours}
              onChangeText={setSleepHours}
              placeholder="Ex: 7.5"
              keyboardType="decimal-pad"
            />

            <View className="mt-2">
              <Button title="Continuar" onPress={handleSave} loading={loading} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
