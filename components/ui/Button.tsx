import { ActivityIndicator, StyleProp, Text, ViewStyle } from 'react-native';
import { useTheme } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { PressableScale } from './Glass';
import { Icon, IconName } from './Icon';

interface ButtonProps {
  title: string;
  onPress: () => void;
  /** primary: ação principal do ecrã. text: ação secundária, sem fundo. danger: apagar. */
  variant?: 'primary' | 'text' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}

export function Button({ title, onPress, variant = 'primary', disabled = false, loading = false, icon, style }: ButtonProps) {
  const t = useTheme();
  const primary = variant === 'primary';
  const color = primary ? t.primaryFg : variant === 'danger' ? t.level.out : t.link;
  return (
    <PressableScale
      onPress={() => {
        // Só a ação principal vibra; as secundárias ficam em silêncio.
        if (primary) haptics.press();
        onPress();
      }}
      disabled={disabled || loading}
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading }}
      style={[
        {
          height: primary ? 56 : 48,
          borderRadius: 28,
          backgroundColor: primary ? t.primaryBg : 'transparent',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          paddingHorizontal: 20,
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={color} /> : icon ? <Icon name={icon} size={19} color={color} /> : null}
      <Text style={{ fontSize: primary ? 17 : 16, fontWeight: '600', color }}>{title}</Text>
    </PressableScale>
  );
}
