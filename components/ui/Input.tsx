import { ReactNode, useState } from 'react';
import { Text, TextInput, TextInputProps, View } from 'react-native';
import { useTheme } from '@/constants/theme';
import { Glass } from './Glass';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
  /** Elemento à direita do campo (ícone, botão de mostrar palavra-passe). */
  trailing?: ReactNode;
}

/** Campo de texto em vidro, com rótulo por cima. */
export function Input({ label, error, hint, trailing, autoComplete = 'off', textContentType = 'none', onFocus, onBlur, style, ...props }: InputProps) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginTop: 16 }}>
      <Text style={{ marginHorizontal: 4, marginBottom: 6, fontSize: 14, lineHeight: 20, fontWeight: '600', color: t.sub }}>{label}</Text>
      <Glass radius={20} flat style={error ? { borderRadius: 20, borderWidth: 1.5, borderColor: t.dot.out } : focused ? { borderRadius: 20, borderWidth: 1.5, borderColor: t.link } : { borderRadius: 20, borderWidth: 1.5, borderColor: 'transparent' }} contentStyle={{ flexDirection: 'row', alignItems: 'center', paddingRight: trailing ? 14 : 0 }}>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={t.sub}
          autoComplete={autoComplete}
          textContentType={textContentType}
          selectionColor={t.link}
          {...props}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          style={[{ flex: 1, height: 54, paddingHorizontal: 18, fontSize: 17, color: t.ink }, style]}
        />
        {trailing}
      </Glass>
      {error ? (
        <Text style={{ marginTop: 6, marginHorizontal: 4, fontSize: 13, lineHeight: 18, color: t.level.out }}>{error}</Text>
      ) : hint ? (
        <Text style={{ marginTop: 6, marginHorizontal: 4, fontSize: 13, lineHeight: 18, color: t.sub }}>{hint}</Text>
      ) : null}
    </View>
  );
}
