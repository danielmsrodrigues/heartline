import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}

export function Button({ title, onPress, variant = 'primary', disabled = false, loading = false }: ButtonProps) {
  const baseClass = 'py-3.5 px-6 rounded-xl items-center justify-center flex-row';
  const variantClass = {
    primary: 'bg-[#1D9E75]',
    secondary: 'bg-[#111111] border border-[#151515]',
    danger: 'bg-[#E24B4A]/15 border border-[#E24B4A]/30',
  }[variant];
  const textClass = {
    primary: 'text-white font-semibold text-base',
    secondary: 'text-[#F5F5F5] font-semibold text-base',
    danger: 'text-[#E24B4A] font-semibold text-base',
  }[variant];
  const disabledClass = disabled || loading ? 'opacity-50' : '';

  return (
    <TouchableOpacity
      className={`${baseClass} ${variantClass} ${disabledClass}`}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading && <ActivityIndicator size="small" color={variant === 'primary' ? '#fff' : '#888888'} style={{ marginRight: 8 }} />}
      <Text className={textClass}>{title}</Text>
    </TouchableOpacity>
  );
}
