import { View, Text, TextInput, TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
}

export function Input({ label, error, autoComplete = 'off', textContentType = 'none', ...props }: InputProps) {
  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-gray-700 mb-1.5">{label}</Text>
      <TextInput
        className={`bg-gray-50 border ${error ? 'border-red-300' : 'border-gray-200'} rounded-xl px-4 py-3 text-base text-gray-900`}
        placeholderTextColor="#9CA3AF"
        autoComplete={autoComplete}
        textContentType={textContentType}
        {...props}
      />
      {error && <Text className="text-red-500 text-xs mt-1">{error}</Text>}
    </View>
  );
}
