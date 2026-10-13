import { Text, View } from 'react-native';
import { Tone, useTheme } from '@/constants/theme';

/** Mensagem de erro ou de confirmação dentro de um ecrã. */
export function Banner({ tone, title, text }: { tone: Tone; title?: string; text: string }) {
  const t = useTheme();
  const c = t.tint[tone];
  return (
    <View
      accessibilityRole="alert"
      style={{ marginTop: 16, padding: 14, borderRadius: 18, backgroundColor: c.to }}
    >
      {title ? <Text style={{ fontSize: 15, lineHeight: 20, fontWeight: '700', color: c.label, marginBottom: 2 }}>{title}</Text> : null}
      <Text style={{ fontSize: 14, lineHeight: 20, color: c.body }}>{text}</Text>
    </View>
  );
}
