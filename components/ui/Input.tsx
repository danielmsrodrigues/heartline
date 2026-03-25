import { View, Text, TextInput, TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
}

export function Input({ label, error, autoComplete = 'off', textContentType = 'none', ...props }: InputProps) {
  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-[#888888] mb-1.5">{label}</Text>
      <TextInput
        className={`bg-[#111111] border ${error ? 'border-[#E24B4A]' : 'border-[#151515]'} rounded-xl px-4 py-3 text-base text-[#F5F5F5]`}
        placeholderTextColor="#555555"
        autoComplete={autoComplete}
        textContentType={textContentType}
        {...props}
      />
      {error && <Text className="text-[#E24B4A] text-xs mt-1">{error}</Text>}
    </View>
  );
}
