import { useEffect } from 'react';
import Animated, { Easing, useAnimatedProps, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { G, Line, Path, Rect } from 'react-native-svg';
import { useTheme } from '@/constants/theme';

// Animam-se os atributos de cada forma: um grupo (<G>) não aceita `y` animado, e a linha ficava parada.
const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

const CORNERS = [
  'M12 30 V20 A8 8 0 0 1 20 12 H30',
  'M90 12 H100 A8 8 0 0 1 108 20 V30',
  'M108 90 V100 A8 8 0 0 1 100 108 H90',
  'M30 108 H20 A8 8 0 0 1 12 100 V90',
];

/** Folha de exame dentro do enquadramento da câmara. Com `scanning`, uma linha percorre a folha. */
export function ScanIllustration({ size, scanning = false, frameColor }: { size: number; scanning?: boolean; frameColor?: string }) {
  const t = useTheme();
  const sweep = useSharedValue(0);

  useEffect(() => {
    if (!scanning) return;
    sweep.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [scanning, sweep]);

  const line = useAnimatedProps(() => {
    const y = 22 + sweep.value * 76;
    return { y1: y, y2: y };
  });
  const trail = useAnimatedProps(() => ({ y: 22 + sweep.value * 76 - 18 }));

  const rows: [number, number, string, number][] = [
    [34, 68, t.ink, 0.8],
    [47, 80, t.sub, 0.45],
    [59, 74, t.sub, 0.45],
    [71, 80, t.dot.att, 0.95],
    [83, 64, t.sub, 0.45],
  ];

  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <Rect x={32} y={18} width={56} height={84} rx={8} fill={t.paper} stroke={t.hairline} strokeWidth={1.5} />
      {rows.map(([y, x2, color, opacity]) => (
        <Path key={y} d={`M41 ${y} H${x2}`} stroke={color} strokeWidth={4.5} strokeLinecap="round" opacity={opacity} />
      ))}
      {scanning ? (
        <>
          <AnimatedRect x={14} width={92} height={18} rx={4} fill={t.dot.none} opacity={0.2} animatedProps={trail} />
          <AnimatedLine x1={12} x2={108} stroke={t.dot.none} strokeWidth={4} strokeLinecap="round" animatedProps={line} />
        </>
      ) : null}
      <G stroke={frameColor ?? t.ink} strokeWidth={3.5} strokeLinecap="round">
        {CORNERS.map((d) => <Path key={d} d={d} />)}
      </G>
    </Svg>
  );
}
