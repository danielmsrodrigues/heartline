import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/constants/theme';
import { Mascot } from '@/components/mascot';
import { Button } from '@/components/ui/Button';
import { Glass } from '@/components/ui/Glass';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Title } from '@/components/ui/Text';
import { ScanIllustration } from './scan-illustration';

const STEPS = ['Imagem', 'Valores', 'Intervalos'];

/** Enquanto a IA lê o exame: a folha a ser percorrida, o boneco a ler e três passos. */
export function ExtractionScreen({ onCancel }: { onCancel: () => void }) {
  const t = useTheme();
  // O servidor não reporta progresso: os passos avançam por tempo e o último fica ativo até acabar.
  const [step, setStep] = useState(0);
  useEffect(() => {
    const first = setTimeout(() => setStep(1), 1400);
    const second = setTimeout(() => setStep(2), 5200);
    return () => {
      clearTimeout(first);
      clearTimeout(second);
    };
  }, []);

  // O passo em curso pulsa, para se ver que há trabalho a decorrer.
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 800, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [pulse]);
  const pulsing = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pulse.value * 0.16 }] }));

  return (
    <Screen inTabs scroll={false} contentStyle={{ alignItems: 'center', justifyContent: 'center', paddingBottom: 110 }}>
      <View style={{ width: 232, height: 232 }}>
        <ScanIllustration size={232} scanning />
        <View style={{ position: 'absolute', right: -26, bottom: -18 }}>
          <Mascot size={96} reading wander />
        </View>
      </View>
      <Title style={{ marginTop: 36, textAlign: 'center' }}>A ler o teu exame</Title>

      <Glass style={{ marginTop: 30, alignSelf: 'stretch' }} contentStyle={{ paddingVertical: 18, paddingHorizontal: 8 }}>
        <View accessible accessibilityRole="progressbar" accessibilityLabel={`Passo ${step + 1} de 3: ${STEPS[step]}`} style={{ flexDirection: 'row' }}>
          <View style={{ position: 'absolute', left: '16.67%', width: '33.33%', top: 13, height: 4, borderRadius: 2, backgroundColor: step > 0 ? t.dot.ok : t.track }} />
          <View style={{ position: 'absolute', left: '50%', width: '33.33%', top: 13, height: 4, borderRadius: 2, backgroundColor: step > 1 ? t.dot.ok : t.track }} />
          {STEPS.map((label, i) => {
            const done = i < step;
            const now = i === step;
            return (
              <View key={label} style={{ flex: 1, alignItems: 'center', gap: 8 }}>
                <Animated.View
                  style={[now ? pulsing : null, {
                    width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: done ? t.dot.ok : t.ring,
                    borderWidth: done ? 0 : now ? 9 : 2,
                    borderColor: now ? t.dot.none : t.sub,
                    opacity: done || now ? 1 : 0.55,
                  }]}
                >
                  {done ? <Icon name="check" size={14} color="#10201A" weight="bold" /> : null}
                </Animated.View>
                <Text style={{ fontSize: 13, lineHeight: 18, fontWeight: now ? '700' : '500', color: done || now ? t.ink : t.sub }}>{label}</Text>
              </View>
            );
          })}
        </View>
      </Glass>

      <Button variant="text" title="Cancelar" onPress={onCancel} style={{ marginTop: 18 }} />
    </Screen>
  );
}
