import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { ON_DOT, Tone, useTheme } from '@/constants/theme';
import { formatDatePt, parseDateOnly } from '@/lib/dates';
import { formatValue } from '@/lib/number';

interface EvolutionChartProps {
  readings: { value: number; date: string }[];
  tone: Tone;
  refMin: number | null;
  refMax: number | null;
}

const HEIGHT = 196;
const PAD = { top: 44, right: 40, bottom: 34, left: 14 };
const MIN_LABEL_GAP = 44;
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function shortDate(dateStr: string) {
  const d = parseDateOnly(dateStr);
  return d ? `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}` : '';
}

/** Evolução de um valor entre exames: curva suave, faixa de referência a verde e o último valor em destaque. */
export function EvolutionChart({ readings, tone, refMin, refMax }: EvolutionChartProps) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  if (readings.length < 2) return null;

  const color = t.dot[tone];
  const plotW = Math.max(width - PAD.left - PAD.right, 1);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const plotBottom = PAD.top + plotH;

  // Escala Y a partir dos dados e do intervalo, com margem proporcional —
  // uma margem fixa achatava marcadores de valores pequenos (ex.: creatinina).
  const domain = readings.map((r) => r.value);
  const hasMin = refMin != null && refMin > 0;
  const hasMax = refMax != null;
  if (hasMin) domain.push(refMin!);
  if (hasMax) domain.push(refMax!);
  const dataMin = Math.min(...domain);
  const dataMax = Math.max(...domain);
  const span = dataMax - dataMin;
  const pad = span > 0 ? span * 0.18 : Math.max(Math.abs(dataMax) * 0.1, 1);
  const yMin = dataMin - pad;
  const yMax = dataMax + pad;
  const y = (value: number) => PAD.top + plotH - ((value - yMin) / (yMax - yMin)) * plotH;

  // Eixo X proporcional ao tempo entre exames, não ao número da leitura.
  const times = readings.map((r) => parseDateOnly(r.date)?.getTime() ?? NaN);
  const t0 = times[0];
  const tN = times[times.length - 1];
  const useTime = times.every(Number.isFinite) && tN > t0;
  const inset = 16;
  const x = (i: number) =>
    PAD.left + inset + (useTime ? (times[i] - t0) / (tN - t0) : i / (readings.length - 1)) * (plotW - inset * 2);

  const points = readings.map((r, i) => ({ x: x(i), y: y(r.value), value: r.value, date: r.date }));
  const lastIndex = points.length - 1;
  const last = points[lastIndex];

  // Com leituras muito próximas no tempo os rótulos sobrepunham-se: fica o mais recente.
  const labelled = new Set<number>();
  let lastLabelX = Infinity;
  for (let i = lastIndex; i >= 0; i--) {
    if (lastLabelX - points[i].x >= MIN_LABEL_GAP) {
      labelled.add(i);
      lastLabelX = points[i].x;
    }
  }

  // Curva em S entre leituras: sai e chega na horizontal, sem inventar picos.
  const curve = points
    .map((p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = points[i - 1];
      const mid = (prev.x + p.x) / 2;
      return `C ${mid} ${prev.y}, ${mid} ${p.y}, ${p.x} ${p.y}`;
    })
    .join(' ');
  const area = `${curve} L ${last.x} ${plotBottom} L ${points[0].x} ${plotBottom} Z`;

  const bandTop = hasMax ? Math.max(y(refMax!), PAD.top - 8) : PAD.top - 8;
  const bandBottom = hasMin ? Math.min(y(refMin!), plotBottom) : plotBottom;
  const badgeW = formatValue(last.value).length * 9 + 22;
  const badgeX = Math.min(Math.max(last.x - badgeW / 2, 0), width - badgeW);

  const first = readings[0];
  const latest = readings[lastIndex];

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Evolução em ${readings.length} leituras: de ${formatValue(first.value)} em ${formatDatePt(first.date)} para ${formatValue(latest.value)} em ${formatDatePt(latest.date)}`}
      style={{ height: HEIGHT, marginTop: 10 }}
    >
      {width > 0 && (
        <Svg width={width} height={HEIGHT}>
          <Defs>
            <LinearGradient id="evoArea" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.42} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>

          {(hasMin || hasMax) && bandBottom > bandTop && (
            <Rect x={PAD.left} y={bandTop} width={plotW} height={bandBottom - bandTop} rx={8} fill={t.okZone} opacity={0.55} />
          )}
          {hasMax && (
            <G>
              <Line x1={PAD.left} y1={y(refMax!)} x2={PAD.left + plotW} y2={y(refMax!)} stroke={t.dot.ok} strokeWidth={1.5} strokeDasharray="3,5" />
              <SvgText x={width - 2} y={y(refMax!) + 4} textAnchor="end" fill={t.sub} fontSize={12}>{formatValue(refMax!)}</SvgText>
            </G>
          )}
          {hasMin && (
            <G>
              <Line x1={PAD.left} y1={y(refMin!)} x2={PAD.left + plotW} y2={y(refMin!)} stroke={t.dot.ok} strokeWidth={1.5} strokeDasharray="3,5" />
              <SvgText x={width - 2} y={y(refMin!) + 4} textAnchor="end" fill={t.sub} fontSize={12}>{formatValue(refMin!)}</SvgText>
            </G>
          )}

          <Path d={area} fill="url(#evoArea)" />
          <Path d={curve} fill="none" stroke={color} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />

          {points.slice(0, lastIndex).map((p, i) => (
            <G key={i}>
              <Circle cx={p.x} cy={p.y} r={5} fill={t.ring} stroke={color} strokeWidth={3} />
              {labelled.has(i) && (
                <>
                  <SvgText x={p.x} y={p.y - 13} textAnchor="middle" fill={t.ink} fontSize={13} fontWeight="600">{formatValue(p.value)}</SvgText>
                  <SvgText x={p.x} y={HEIGHT - 8} textAnchor="middle" fill={t.sub} fontSize={12}>{shortDate(p.date)}</SvgText>
                </>
              )}
            </G>
          ))}

          <Circle cx={last.x} cy={last.y} r={13} fill={color} opacity={0.24} />
          <Circle cx={last.x} cy={last.y} r={6.5} fill={color} stroke={t.ring} strokeWidth={3} />
          <Rect x={badgeX} y={Math.max(last.y - 44, 0)} width={badgeW} height={24} rx={12} fill={color} />
          <SvgText x={badgeX + badgeW / 2} y={Math.max(last.y - 44, 0) + 17} textAnchor="middle" fill={ON_DOT} fontSize={14} fontWeight="700">{formatValue(last.value)}</SvgText>
          <SvgText x={Math.min(last.x, width - 22)} y={HEIGHT - 8} textAnchor="middle" fill={t.ink} fontSize={12} fontWeight="700">{shortDate(last.date)}</SvgText>
        </Svg>
      )}
    </View>
  );
}
