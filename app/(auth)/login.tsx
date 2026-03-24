import { useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Preenche todos os campos.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      setLoading(false);
      if (authError) {
        setError('Email ou palavra-passe incorretos.');
      }
    } catch (err: any) {
      setLoading(false);
      setError(`Erro de ligação: ${err.message ?? 'Verifica a tua internet.'}`);
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
            <Text className="text-3xl font-bold text-gray-900 text-center">
              Heartline
            </Text>
            <Text className="text-base text-gray-500 text-center mt-2 mb-8">
              O contexto completo da tua saúde
            </Text>

            {error ? (
              <View className="bg-red-50 rounded-xl p-3 mb-4">
                <Text className="text-red-600 text-sm text-center">
                  {error}
                </Text>
              </View>
            ) : null}

            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="o.teu@email.com"
            />
            <Input
              label="Palavra-passe"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
            />

            <Button title="Entrar" onPress={handleLogin} loading={loading} />

            <TouchableOpacity
              onPress={() => router.push('/(auth)/register')}
              className="mt-4"
            >
              <Text className="text-center text-gray-500">
                Não tens conta?{' '}
                <Text className="text-[#8CB369] font-semibold">
                  Criar conta
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
