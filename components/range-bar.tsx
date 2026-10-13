import { Text, View } from 'react-native';
import { RangeType } from '@/lib/types';
import { ON_DOT, Tone, useTheme } from '@/constants/theme';
import { formatValue } from '@/lib/number';
import { Status } from './ui/List';

interface RangeInput {
  value: number;
  refMin: number | null;
  refMax: number | null;
  rangeType: RangeType;
}

interface Scale {
  /** Zona de referência, em percentagem da barra. null quando o laboratório não deu intervalo. */
  zone: { from: number; to: number } | null;
  valuePct: number;
  ticks: { pct: number; label: string }[];
}

/** Onde cai o valor e o intervalo de referência numa barra de 0 a 100. */
export function rangeScale({ value, refMin, refMax, rangeType }: RangeInput): Scale {
  const clamp = (pct: number) => Math.max(0, Math.min(100, pct));
  if (rangeType === 'bounded') {
    const start = Math.min(refMin! * 0.7, value * 0.95);
    const end = Math.max(refMax! * 1.4, value * 1.05);
    const span = end - start || 1;
    const pct = (v: number) => clamp(((v - start) / span) * 100);
    return {
      zone: { from: pct(refMin!), to: pct(refMax!) },
      valuePct: pct(value),
      ticks: [{ pct: pct(refMin!), label: formatValue(refMin!) }, { pct: pct(refMax!), label: formatValue(refMax!) }],
    };
  }
  if (rangeType === 'max_only') {
    const end = Math.max(refMax! * 1.4, value * 1.05) || 1;
    const pct = (v: number) => clamp((v / end) * 100);
    return { zone: { from: 0, to: pct(refMax!) }, valuePct: pct(value), ticks: [{ pct: pct(refMax!), label: formatValue(refMax!) }] };
  }
  if (rangeType === 'min_only') {
    const end = Math.max(refMin! * 2, value * 1.05) || 1;
    const pct = (v: number) => clamp((v / end) * 100);
    return { zone: { from: pct(refMin!), to: 100 }, valuePct: pct(value), ticks: [{ pct: pct(refMin!), label: formatValue(refMin!) }] };
  }
  return { zone: null, valuePct: 50, ticks: [] };
}

interface RangeBarProps extends RangeInput {
  tone: Tone;
  unit: string;
}

/** "Onde estás": o valor numa etiqueta por cima do marcador, com a zona de referência a verde. */
export function RangeBar({ tone, unit, ...input }: RangeBarProps) {
  const t = useTheme();
  const { zone, valuePct, ticks } = rangeScale(input);
  // Mantém a etiqueta e o marcador dentro do cartão nas pontas.
  const at = Math.max(7, Math.min(93, valuePct));
  const inZone = zone ? input.value >= (input.refMin ?? -Infinity) && input.value <= (input.refMax ?? Infinity) : false;
  const label = zone
    ? `${formatValue(input.value)} ${unit}, ${inZone ? 'dentro' : 'fora'} do intervalo de referência`
    : `${formatValue(input.value)} ${unit}, sem intervalo de referência indicado pelo laboratório`;

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label}>
      <View style={{ height: 86, marginTop: 14 }}>
        <View style={{ position: 'absolute', left: `${at}%`, top: 0, width: 80, marginLeft: -40, alignItems: 'center' }}>
          <View style={{ height: 28, borderRadius: 14, paddingHorizontal: 11, backgroundColor: t.dot[tone], justifyContent: 'center' }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: ON_DOT }}>{formatValue(input.value)}</Text>
          </View>
          <View style={{ width: 10, height: 10, marginTop: -6, borderRadius: 2, backgroundColor: t.dot[tone], transform: [{ rotate: '45deg' }] }} />
        </View>

        <View style={{ position: 'absolute', left: 0, right: 0, top: 42, height: 14, borderRadius: 7, backgroundColor: zone ? t.outZone : t.track, overflow: 'hidden' }}>
          {zone ? (
            <View style={{ position: 'absolute', left: `${zone.from}%`, width: `${zone.to - zone.from}%`, top: 0, bottom: 0, backgroundColor: t.okZone, borderLeftWidth: zone.from > 0 ? 2 : 0, borderRightWidth: zone.to < 100 ? 2 : 0, borderColor: t.ring }} />
          ) : null}
        </View>

        <View
          style={{
            position: 'absolute', left: `${at}%`, top: 38, width: 22, height: 22, marginLeft: -11, borderRadius: 11,
            backgroundColor: t.dot[tone], borderWidth: 4, borderColor: t.ring,
            shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3, shadowOffset: { width: 0, height: 2 },
          }}
        />

        {ticks.map((tick) => (
          <Text key={tick.label} style={{ position: 'absolute', left: `${tick.pct}%`, top: 66, width: 60, marginLeft: -30, textAlign: 'center', fontSize: 13, lineHeight: 18, fontWeight: '700', color: t.ink }}>
            {tick.label}
          </Text>
        ))}
      </View>
      {zone ? (
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 6 }}>
          <Status tone="ok" label="Dentro do intervalo" />
          <Status tone="att" label="Fora" />
        </View>
      ) : (
        <Text style={{ marginTop: 6, fontSize: 13, lineHeight: 18, color: t.sub }}>O laboratório não indicou intervalo de referência.</Text>
      )}
    </View>
  );
}

/**
 * Versão pequena para cartões e listas. O verde é o intervalo de referência,
 * o resto fica fora dele, e o limite vem escrito por baixo ("mín. 40").
 */
export function MiniRange({ tone, width = 132, ...input }: RangeInput & { tone: Tone; width?: number }) {
  const t = useTheme();
  const { zone, valuePct, ticks } = rangeScale(input);
  if (!zone) return null;
  const at = Math.max(6, Math.min(94, valuePct));
  const prefix = input.rangeType === 'min_only' ? 'mín. ' : input.rangeType === 'max_only' ? 'máx. ' : '';
  return (
    <View style={{ width, marginTop: 9 }}>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: t.outZone }}>
        <View style={{ position: 'absolute', left: `${zone.from}%`, width: `${zone.to - zone.from}%`, top: 0, bottom: 0, borderRadius: 4, backgroundColor: t.okZone }} />
        <View style={{ position: 'absolute', left: `${at}%`, top: -4, width: 16, height: 16, marginLeft: -8, borderRadius: 8, backgroundColor: t.dot[tone], borderWidth: 3, borderColor: t.ring }} />
      </View>
      <View style={{ height: 16, marginTop: 4 }}>
        {ticks.map((tick) => {
          // Perto das pontas o texto alinha-se à ponta, para não sair do cartão.
          const edge = tick.pct < 22 ? 'left' : tick.pct > 78 ? 'right' : 'center';
          return (
            <Text
              key={tick.label}
              numberOfLines={1}
              style={[
                { position: 'absolute', top: 0, fontSize: 11, lineHeight: 16, fontWeight: '600', color: t.sub },
                edge === 'left' ? { left: 0 } : edge === 'right' ? { right: 0 } : { left: `${tick.pct}%`, width: 70, marginLeft: -35, textAlign: 'center' },
              ]}
            >
              {prefix}{tick.label}
            </Text>
          );
        })}
      </View>
    </View>
  );
}
