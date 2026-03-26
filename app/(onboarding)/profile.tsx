import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ChevronLeft } from 'lucide-react-native';
import RNSlider from '@react-native-community/slider';
import { useProfile } from '@/hooks/useProfile';
import { DatePicker } from '@/components/ui/DatePicker';

// Wrapper that fixes iOS bug where initial value is ignored
function FixedSlider({ value, ...props }: React.ComponentProps<typeof RNSlider>) {
  const [mounted, setMounted] = useState(false);
  const [displayValue, setDisplayValue] = useState(props.minimumValue ?? 0);

  useEffect(() => {
    // Render at min first, then set real value on next frame
    const t = setTimeout(() => {
      setDisplayValue(value ?? 0);
      setMounted(true);
    }, 20);
    return () => clearTimeout(t);
  }, []);

  return (
    <RNSlider
      {...props}
      value={mounted ? value : displayValue}
    />
  );
}

const TOTAL_STEPS = 7;

const STEP_CONFIG = [
  { key: 'name', question: 'Como te chamas?' },
  { key: 'birth_date', question: 'Quando nasceste?' },
  { key: 'sex', question: 'Sexo' },
  { key: 'smoker', question: 'Fumas?' },
  { key: 'exercise', question: 'Quantos minutos de exercício fazes por semana?' },
  { key: 'sedentary', question: 'O teu trabalho é sedentário?' },
  { key: 'sleep', question: 'Quantas horas dormes por noite?' },
] as const;

function PillOption({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={() => { Haptics.selectionAsync(); onPress(); }}
      activeOpacity={0.8}
      style={{
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        backgroundColor: selected ? '#1D9E75' : '#111111',
        borderWidth: 0.5,
        borderColor: selected ? '#1D9E75' : '#222222',
      }}
    >
      <Text style={{ fontSize: 15, fontWeight: '500', color: selected ? '#FFFFFF' : '#888888' }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function ProfileOnboardingScreen() {
  const router = useRouter();
  const { updateProfile } = useProfile();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [sex, setSex] = useState<'M' | 'F' | 'other' | null>(null);
  const [smoker, setSmoker] = useState<boolean | null>(null);
  const [exercise, setExercise] = useState(150);
  const [sedentary, setSedentary] = useState<boolean | null>(null);
  const [sleep, setSleep] = useState(7.5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const animateTransition = (direction: 'forward' | 'back') => {
    const from = direction === 'forward' ? 30 : -30;
    slideAnim.setValue(from);
    fadeAnim.setValue(0);
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 250, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]).start();
  };

  const handleNext = async () => {
    // Validate current step
    if (step === 0 && !name.trim()) { setError('Indica o teu nome.'); return; }
    if (step === 1 && !birthDate) { setError('Indica a data de nascimento.'); return; }
    if (step === 2 && !sex) { setError('Seleciona uma opção.'); return; }
    if (step === 3 && smoker === null) { setError('Seleciona uma opção.'); return; }
    if (step === 5 && sedentary === null) { setError('Seleciona uma opção.'); return; }

    setError('');
    Haptics.selectionAsync();

    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
      animateTransition('forward');
    } else {
      // Save
      setLoading(true);
      const result = await updateProfile({
        name: name.trim(),
        birth_date: birthDate!.toISOString().split('T')[0],
        sex: sex!,
        smoker: smoker ?? false,
        exercise_minutes_per_week: exercise,
        sedentary_work: sedentary ?? false,
        sleep_hours_avg: sleep,
      });
      setLoading(false);
      if (result) {
        setError('Erro ao guardar. Tenta novamente.');
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.push('/(onboarding)/family');
      }
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setError('');
      Haptics.selectionAsync();
      setStep(step - 1);
      animateTransition('back');
    }
  };

  const isLast = step === TOTAL_STEPS - 1;
  const progress = (step + 1) / TOTAL_STEPS;

  const renderStepContent = () => {
    switch (step) {
      case 0: // Name
        return (
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="O teu nome"
            placeholderTextColor="#444444"
            autoCapitalize="words"
            autoFocus
            style={{
              backgroundColor: '#111111',
              borderWidth: 0.5,
              borderColor: '#222222',
              borderRadius: 14,
              padding: 16,
              fontSize: 17,
              color: '#FFFFFF',
            }}
          />
        );

      case 1: // Birth date
        return (
          <DatePicker
            label=""
            value={birthDate}
            onChange={setBirthDate}
            maximumDate={new Date()}
            minimumDate={new Date(1930, 0, 1)}
          />
        );

      case 2: // Sex
        return (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <PillOption label="Masculino" selected={sex === 'M'} onPress={() => setSex('M')} />
            <PillOption label="Feminino" selected={sex === 'F'} onPress={() => setSex('F')} />
            <PillOption label="Outro" selected={sex === 'other'} onPress={() => setSex('other')} />
          </View>
        );

      case 3: // Smoker
        return (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <PillOption label="Não" selected={smoker === false} onPress={() => setSmoker(false)} />
            <PillOption label="Sim" selected={smoker === true} onPress={() => setSmoker(true)} />
          </View>
        );

      case 4: // Exercise
        const hours = Math.floor(exercise / 60);
        const mins = exercise % 60;
        const hoursLabel = hours > 0
          ? `${hours}h${mins > 0 ? `${mins}m` : ''}`
          : '';
        return (
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 48, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 }}>
              {exercise}
            </Text>
            <Text style={{ fontSize: 14, color: '#555555', marginBottom: 4 }}>
              minutos por semana
            </Text>
            {hoursLabel ? (
              <Text style={{ fontSize: 13, color: '#444444', marginBottom: 24 }}>
                {hoursLabel} por semana
              </Text>
            ) : (
              <View style={{ height: 17, marginBottom: 24 }} />
            )}
            <FixedSlider
              key={`ex-${step}`}
              style={{ width: '100%', height: 40 }}
              minimumValue={0}
              maximumValue={600}
              step={15}
              value={exercise}
              onValueChange={(v) => setExercise(v)}
              minimumTrackTintColor="#1D9E75"
              maximumTrackTintColor="#222222"
              thumbTintColor="#1D9E75"
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 4 }}>
              <Text style={{ fontSize: 11, color: '#444444' }}>0</Text>
              <Text style={{ fontSize: 11, color: '#444444' }}>300</Text>
              <Text style={{ fontSize: 11, color: '#444444' }}>600</Text>
            </View>
          </View>
        );

      case 5: // Sedentary
        return (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <PillOption label="Não" selected={sedentary === false} onPress={() => setSedentary(false)} />
            <PillOption label="Sim" selected={sedentary === true} onPress={() => setSedentary(true)} />
          </View>
        );

      case 6: // Sleep
        const sleepDisplay = sleep % 1 === 0 ? `${sleep}h` : `${Math.floor(sleep)}h${Math.round((sleep % 1) * 60)}m`;
        return (
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 48, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 }}>
              {sleepDisplay}
            </Text>
            <Text style={{ fontSize: 14, color: '#555555', marginBottom: 24 }}>
              por noite
            </Text>
            <FixedSlider
              key={`sl-${step}`}
              style={{ width: '100%', height: 40 }}
              minimumValue={4}
              maximumValue={10}
              step={0.5}
              value={sleep}
              onValueChange={(v) => setSleep(v)}
              minimumTrackTintColor="#1D9E75"
              maximumTrackTintColor="#222222"
              thumbTintColor="#1D9E75"
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 4 }}>
              <Text style={{ fontSize: 11, color: '#444444' }}>4h</Text>
              <Text style={{ fontSize: 11, color: '#444444' }}>7h</Text>
              <Text style={{ fontSize: 11, color: '#444444' }}>10h</Text>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0A0A0A]">
      {/* Progress bar */}
      <View style={{ height: 3, backgroundColor: '#151515', marginHorizontal: 20, marginTop: 8, borderRadius: 1.5 }}>
        <View style={{ width: `${progress * 100}%`, height: '100%', backgroundColor: '#1D9E75', borderRadius: 1.5 }} />
      </View>

      {/* Back button */}
      {step > 0 ? (
        <TouchableOpacity
          onPress={handleBack}
          style={{ paddingHorizontal: 20, paddingTop: 16, flexDirection: 'row', alignItems: 'center', gap: 4 }}
          activeOpacity={0.7}
        >
          <ChevronLeft size={20} color="#888888" />
          <Text style={{ fontSize: 14, color: '#888888' }}>Voltar</Text>
        </TouchableOpacity>
      ) : (
        <View style={{ height: 44 }} />
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={0}
      >
        {/* Content */}
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 28 }}>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateX: slideAnim }] }}>
            <Text style={{ fontSize: 24, fontWeight: '700', color: '#FFFFFF', textAlign: 'center', marginBottom: 32 }}>
              {STEP_CONFIG[step].question}
            </Text>

            {error ? (
              <View style={{ backgroundColor: 'rgba(226,75,74,0.12)', borderRadius: 12, padding: 10, marginBottom: 16 }}>
                <Text style={{ color: '#E24B4A', fontSize: 13, textAlign: 'center' }}>{error}</Text>
              </View>
            ) : null}

            {renderStepContent()}
          </Animated.View>
        </View>

        {/* Bottom button */}
        <View style={{ paddingHorizontal: 24, paddingBottom: 16 }}>
          <TouchableOpacity
            onPress={handleNext}
            disabled={loading}
            activeOpacity={0.8}
            style={{
              backgroundColor: '#1D9E75',
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: 'center',
            }}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>
                {isLast ? 'Concluir' : 'Seguinte'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
