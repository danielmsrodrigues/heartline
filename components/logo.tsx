import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { useTheme } from '@/constants/theme';

// Logótipo "2a Afinado": uma só linha desenha o coração e pára antes de fechar;
// o ponto é a análise de hoje.
const OPEN = 'M50,84 L22,56 A19.8,19.8 0 0 1 50,28 A19.8,19.8 0 0 1 78,56';
export const WORDMARK_FONT = 'Manrope_600SemiBold';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface LogoProps {
  size: number;
  /** O ponto pulsa uma vez (ecrã de arranque). O traço fica parado para coincidir com o splash nativo. */
  animated?: boolean;
}

export function Logo({ size, animated = false }: LogoProps) {
  const t = useTheme();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (!animated) return;
    pulse.value = withDelay(260, withSequence(withTiming(1.45, { duration: 180 }), withSpring(1, { damping: 7, stiffness: 160 })));
  }, [animated, pulse]);

  const point = useAnimatedProps(() => ({ r: 7.5 * pulse.value }));

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <G transform="translate(0,-3)">
        <Path d={OPEN} fill="none" stroke={t.logo.main} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
        <AnimatedCircle cx={64} cy={70} fill={t.logo.accent} animatedProps={point} />
      </G>
    </Svg>
  );
}

/** Símbolo + nome. */
export function Lockup({ size = 30 }: { size?: number }) {
  const t = useTheme();
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="Heartline" style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.26 }}>
      <Logo size={size} />
      <Text style={{ fontFamily: WORDMARK_FONT, fontSize: size * 0.65, letterSpacing: -size * 0.02, color: t.ink }}>Heartline</Text>
    </View>
  );
}
