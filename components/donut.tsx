import { View } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { Tone, useTheme } from '@/constants/theme';

interface DonutProps {
  /** Quantos valores em cada tom, pela ordem em que aparecem no anel. */
  parts: { tone: Tone; count: number }[];
  big: string;
  small: string;
  size?: number;
  stroke?: number;
}

/** Anel com um segmento por valor: de relance, quantos estão em cada nível. */
export function Donut({ parts, big, small, size = 88, stroke = 12 }: DonutProps) {
  const t = useTheme();
  const total = parts.reduce((sum, p) => sum + p.count, 0);
  const r = (size - stroke) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  // Com muitos valores os segmentos deixam de ter pontas redondas, para caberem.
  const round = total > 0 && circ / total > stroke + 8;
  const gap = round ? stroke + 4 : 3;
  const dash = total > 0 ? Math.max(circ / total - gap, 1) : circ;
  const offset = round ? ((stroke / 2 + 2) / circ) * 360 : 0;

  const segments: Tone[] = parts.flatMap((p) => Array.from({ length: p.count }, () => p.tone));

  return (
    <View accessible={false}>
      <Svg width={size} height={size}>
        {total === 0 ? (
          <Circle cx={c} cy={c} r={r} fill="none" stroke={t.track} strokeWidth={stroke} />
        ) : (
          segments.map((tone, i) => (
            <Circle
              key={i}
              cx={c}
              cy={c}
              r={r}
              fill="none"
              stroke={t.dot[tone]}
              strokeWidth={stroke}
              strokeLinecap={round ? 'round' : 'butt'}
              strokeDasharray={`${dash} ${circ - dash}`}
              transform={`rotate(${-90 + (i * 360) / total + offset} ${c} ${c})`}
            />
          ))
        )}
        <SvgText x={c} y={c + 4} textAnchor="middle" fill={t.ink} fontSize={26} fontWeight="700">{big}</SvgText>
        <SvgText x={c} y={c + 19} textAnchor="middle" fill={t.sub} fontSize={12} fontWeight="600">{small}</SvgText>
      </Svg>
    </View>
  );
}
