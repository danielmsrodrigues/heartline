import { ReactNode } from 'react';
import { StyleProp, Text, View, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ON_VIVID, Tone, useTheme } from '@/constants/theme';
import { Glass } from './Glass';
import { Icon, IconName } from './Icon';

/** Botão em cápsula com seta, usado no fim dos cartões coloridos. */
export function Pill({ label, icon = 'arrow' }: { label: string; icon?: IconName }) {
  const t = useTheme();
  return (
    <View style={{ alignSelf: 'flex-start', height: 44, borderRadius: 22, backgroundColor: t.pill, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 18, paddingRight: 6 }}>
      <Text style={{ fontSize: 15, fontWeight: '600', color: t.pillFg }}>{label}</Text>
      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: t.pillFg, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={15} color={t.pill} weight="bold" />
      </View>
    </View>
  );
}

interface TintCardProps {
  tone: Tone;
  label: string;
  title: string;
  body?: string;
  /** Conteúdo entre o texto e o botão (etiquetas, passos). */
  children?: ReactNode;
  cta?: string;
  ctaIcon?: IconName;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Cartão de vidro colorido pelo tom, com a linha de batimento no canto. */
export function TintCard({ tone, label, title, body, children, cta, ctaIcon, onPress, style }: TintCardProps) {
  return (
    <Glass tone={tone} radius={32} onPress={onPress} accessibilityLabel={onPress ? `${title}. ${cta ?? ''}` : undefined} style={style} contentStyle={{ padding: 22 }}>
      <Svg width={150} height={44} viewBox="0 0 150 44" style={{ position: 'absolute', right: 18, top: 14, opacity: 0.3 }}>
        <Path d="M2 26 H38 L48 10 L60 38 L72 4 L84 30 L92 26 H148" fill="none" stroke={ON_VIVID} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: '600', color: ON_VIVID, opacity: 0.74 }}>{label}</Text>
      <Text style={{ marginTop: 22, fontSize: 26, lineHeight: 32, fontWeight: '700', letterSpacing: -0.5, color: ON_VIVID }}>{title}</Text>
      {body ? <Text style={{ marginTop: 8, fontSize: 16, lineHeight: 23, color: ON_VIVID }}>{body}</Text> : null}
      {children}
      {cta ? <View style={{ marginTop: 16 }}><Pill label={cta} icon={ctaIcon} /></View> : null}
    </Glass>
  );
}
