import { ReactNode } from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';
import { useTheme } from '@/constants/theme';

interface Props {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

/** Título de ecrã. `large` é o das tabs (34), o normal é o dos ecrãs com barra (30). */
export function Title({ children, style, large, numberOfLines }: Props & { large?: boolean }) {
  const t = useTheme();
  return (
    <Text
      accessibilityRole="header"
      numberOfLines={numberOfLines}
      style={[
        large
          ? { fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.7 }
          : { fontSize: 30, lineHeight: 34, fontWeight: '600', letterSpacing: -0.6 },
        { color: t.ink },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Body({ children, style, numberOfLines }: Props) {
  const t = useTheme();
  return <Text numberOfLines={numberOfLines} style={[{ fontSize: 16, lineHeight: 23, color: t.ink }, style]}>{children}</Text>;
}

/** Texto secundário. */
export function Sub({ children, style, numberOfLines }: Props) {
  const t = useTheme();
  return <Text numberOfLines={numberOfLines} style={[{ fontSize: 15, lineHeight: 20, color: t.sub }, style]}>{children}</Text>;
}

/** Título de secção por cima de um cartão ou lista. */
export function SectionTitle({ children, style }: Props) {
  const t = useTheme();
  return (
    <Text accessibilityRole="header" style={[{ marginTop: 22, marginBottom: 8, marginHorizontal: 4, fontSize: 15, lineHeight: 20, fontWeight: '600', color: t.sub }, style]}>
      {children}
    </Text>
  );
}

/** Nota discreta e centrada (aviso médico, texto legal). */
export function Note({ children, style }: Props) {
  const t = useTheme();
  return <Text style={[{ fontSize: 13, lineHeight: 18, textAlign: 'center', color: t.sub }, style]}>{children}</Text>;
}

export const DISCLAIMER = 'O Heartline não substitui avaliação médica.';
