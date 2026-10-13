import { useEffect } from 'react';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Comprimento do traço que risca o olho, de (4,4) a (20,20).
const SLASH = 22.7;

interface EyeToggleProps {
  /** true: olho riscado (a palavra-passe está visível e o toque esconde-a). */
  slashed: boolean;
  size?: number;
  color: string;
}

/** Olho que ganha ou perde o risco com uma transição suave, em vez de trocar de ícone de repente. */
export function EyeToggle({ slashed, size = 22, color }: EyeToggleProps) {
  const progress = useSharedValue(slashed ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(slashed ? 1 : 0, { duration: 260, easing: Easing.inOut(Easing.cubic) });
  }, [slashed, progress]);

  // O risco desenha-se de cima para baixo; a pupila encolhe um pouco enquanto fecha.
  const slash = useAnimatedProps(() => ({ strokeDashoffset: SLASH * (1 - progress.value), opacity: progress.value === 0 ? 0 : 1 }));
  const pupil = useAnimatedProps(() => ({ r: 3.2 - progress.value * 0.7 }));

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2.2 12 C4.9 7.4 8.2 5.2 12 5.2 C15.8 5.2 19.1 7.4 21.8 12 C19.1 16.6 15.8 18.8 12 18.8 C8.2 18.8 4.9 16.6 2.2 12 Z"
        stroke={color}
        strokeWidth={1.9}
        strokeLinejoin="round"
      />
      <AnimatedCircle cx={12} cy={12} fill={color} animatedProps={pupil} />
      <AnimatedPath d="M4 4 L20 20" stroke={color} strokeWidth={2.1} strokeLinecap="round" strokeDasharray={SLASH} animatedProps={slash} />
    </Svg>
  );
}
