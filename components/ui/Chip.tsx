import { ReactNode } from 'react';
import { StyleProp, Text, View, ViewStyle } from 'react-native';
import { Tone, useTheme } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { GlassSurface, LIQUID_GLASS, PressableScale } from './Glass';
import { Icon, IconName } from './Icon';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  height?: number;
  /** Chips de escolha vibram ao selecionar; os de atalho (sugestões) não. */
  choice?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Chip({ label, selected = false, onPress, icon, height = 44, choice = false, style }: ChipProps) {
  const t = useTheme();
  const color = selected ? t.primaryFg : t.ink;
  return (
    <PressableScale
      onPress={() => {
        if (choice && !selected) haptics.select();
        onPress?.();
      }}
      disabled={!onPress}
      accessibilityLabel={label}
      accessibilityState={choice ? { selected } : undefined}
      style={[{ height, borderRadius: height / 2, opacity: 1 }, style]}
    >
      <View
        style={{
          flex: 1,
          borderRadius: height / 2,
          overflow: 'hidden',
          borderWidth: selected || !LIQUID_GLASS ? 1 : 0,
          borderColor: selected ? t.primaryBg : t.glassBorder,
          backgroundColor: selected ? t.primaryBg : 'transparent',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 16,
        }}
      >
        {!selected && <GlassSurface radius={height / 2} />}
        {icon ? <Icon name={icon} size={17} color={color} /> : null}
        <Text style={{ fontSize: 15, fontWeight: selected ? '600' : '500', color }} numberOfLines={1}>{label}</Text>
      </View>
    </PressableScale>
  );
}

/** Linha de chips que quebra para a linha seguinte. */
export function ChipRow({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, style]}>{children}</View>;
}

/** Círculo colorido com um ícone, usado em mosaicos e listas de fatores. */
export function IconBubble({ icon, size = 34, tone = 'none' }: { icon: IconName; size?: number; tone?: Tone }) {
  const t = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        // Fundo neutro e translúcido; a cor fica para o ícone.
        backgroundColor: t.selected,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={icon} size={Math.round(size * 0.52)} color={tone === 'none' ? t.ink : t.level[tone]} />
    </View>
  );
}

/** Etiqueta pequena e sólida com ícone, para dentro dos cartões coloridos. */
export function Fact({ icon, label }: { icon: IconName; label: string }) {
  const t = useTheme();
  return (
    <View style={{ height: 36, borderRadius: 18, backgroundColor: t.pill, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 10, paddingRight: 14 }}>
      <Icon name={icon} size={17} color={t.pillFg} />
      <Text style={{ fontSize: 14, fontWeight: '600', color: t.pillFg }} numberOfLines={1}>{label}</Text>
    </View>
  );
}
