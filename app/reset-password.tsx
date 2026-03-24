import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleReset = async () => {
    if (!password || !confirmPassword) {
      setError('Preenche ambos os campos.');
      return;
    }
    if (password.length < 6) {
      setError('A palavra-passe deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As palavras-passe não coincidem.');
      return;
    }

    setLoading(true);
    setError('');

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (updateError) {
      setError('Não foi possível atualizar a palavra-passe. Tenta novamente.');
    } else {
      setSuccess(true);
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 2000);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 justify-center px-6">
            <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
              Nova palavra-passe
            </Text>
            <Text className="text-sm text-gray-500 text-center mb-8">
              Introduz a tua nova palavra-passe.
            </Text>

            {error ? (
              <View className="bg-red-50 rounded-xl p-3 mb-4">
                <Text className="text-red-600 text-sm text-center">{error}</Text>
              </View>
            ) : null}

            {success ? (
              <View className="bg-green-50 rounded-xl p-3 mb-4">
                <Text className="text-green-700 text-sm text-center">
                  Palavra-passe atualizada! A redirecionar...
                </Text>
              </View>
            ) : (
              <>
                <Input
                  label="Nova palavra-passe"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholder="••••••••"
                />
                <Input
                  label="Confirmar palavra-passe"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  placeholder="••••••••"
                />
                <Button title="Atualizar" onPress={handleReset} loading={loading} />
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
