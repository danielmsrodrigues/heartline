import { Children, Fragment, ReactNode } from 'react';
import { Pressable, StyleProp, Text, View, ViewStyle } from 'react-native';
import { Tone, useTheme } from '@/constants/theme';
import { Glass } from './Glass';
import { Icon } from './Icon';

/** Cartão de vidro com linhas separadas por um fio. */
export function ListCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <Glass style={style}>
      {rows.map((row, i) => (
        <Fragment key={i}>
          {i > 0 && <View style={{ height: 1, marginHorizontal: 18, backgroundColor: t.hairline }} />}
          {row}
        </Fragment>
      ))}
    </Glass>
  );
}

interface RowProps {
  label: string;
  /** Texto à direita. */
  value?: string;
  /** Conteúdo à direita em vez de texto. */
  right?: ReactNode;
  /** Conteúdo por baixo do rótulo (mini-barra, estado). */
  under?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  color?: string;
  minHeight?: number;
  accessibilityLabel?: string;
}

export function Row({ label, value, right, under, onPress, chevron = !!onPress, color, minHeight = 52, accessibilityLabel }: RowProps) {
  const t = useTheme();
  const content = (
    <View style={{ minHeight, paddingLeft: 18, paddingRight: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <View style={{ flexShrink: 1 }}>
        <Text style={{ fontSize: 16, lineHeight: 21, color: color ?? t.ink }} numberOfLines={1}>{label}</Text>
        {under}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0, maxWidth: '62%' }}>
        {value ? <Text style={{ fontSize: 16, color: t.sub, flexShrink: 1 }} numberOfLines={1}>{value}</Text> : null}
        {right}
        {chevron ? <Icon name="chevron" size={13} color={t.sub} weight="bold" /> : null}
      </View>
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (value ? `${label}: ${value}` : label)}
      style={({ pressed }) => (pressed ? { backgroundColor: t.selected } : null)}
    >
      {content}
    </Pressable>
  );
}

/** Valor com unidade pequena, como nas listas de valores. */
export function ValueText({ value, unit, size = 18 }: { value: string; unit: string; size?: number }) {
  const t = useTheme();
  return (
    <Text style={{ fontSize: size, fontWeight: '600', color: t.ink }} numberOfLines={1}>
      {value} <Text style={{ fontSize: 13, fontWeight: '400', color: t.sub }}>{unit}</Text>
    </Text>
  );
}

/** Ponto colorido + texto do nível. A cor nunca vai sozinha: o texto diz o mesmo. */
export function Status({ tone, label }: { tone: Tone; label: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.dot[tone] }} />
      <Text style={{ fontSize: 13, lineHeight: 18, fontWeight: '600', color: t.level[tone] }}>{label}</Text>
    </View>
  );
}
