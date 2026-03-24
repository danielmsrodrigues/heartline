import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}

export function Button({ title, onPress, variant = 'primary', disabled = false, loading = false }: ButtonProps) {
  const baseClass = 'py-3.5 px-6 rounded-2xl items-center justify-center flex-row';
  const variantClass = {
    primary: 'bg-[#8CB369]',
    secondary: 'bg-white border border-gray-300',
    danger: 'bg-red-50 border border-red-200',
  }[variant];
  const textClass = {
    primary: 'text-white font-semibold text-base',
    secondary: 'text-gray-700 font-semibold text-base',
    danger: 'text-red-600 font-semibold text-base',
  }[variant];
  const disabledClass = disabled || loading ? 'opacity-50' : '';

  return (
    <TouchableOpacity
      className={`${baseClass} ${variantClass} ${disabledClass}`}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading && <ActivityIndicator size="small" color={variant === 'primary' ? '#fff' : '#666'} style={{ marginRight: 8 }} />}
      <Text className={textClass}>{title}</Text>
    </TouchableOpacity>
  );
}
