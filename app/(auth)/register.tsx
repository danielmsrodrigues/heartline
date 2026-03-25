import { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SocialAuthButtons } from '@/components/social-auth-buttons';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      setError('Preenche todos os campos.');
      return;
    }
    if (password.length < 6) {
      setError('A palavra-passe tem de ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As palavras-passe não coincidem.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      setLoading(false);

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setError('Este email já está registado. Tenta entrar.');
        } else {
          setError(`Erro: ${signUpError.message}`);
        }
      } else if (data.session) {
        // Email confirmation disabled — session created, auth listener handles redirect
      } else {
        // Email confirmation enabled — show success message
        setSuccess(true);
      }
    } catch (err: any) {
      setLoading(false);
      setError(`Erro de ligação: ${err.message ?? 'Verifica a tua internet.'}`);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0A0A0A]">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 justify-center px-6">
            <View className="items-center mb-2">
              <Image
                source={require('@/assets/images/logo.png')}
                style={{ width: 80, height: 80 }}
                resizeMode="contain"
              />
            </View>
            <Text className="text-base text-[#555555] text-center mt-2 mb-8">
              Criar a tua conta
            </Text>

            {error ? (
              <View className="bg-[#E24B4A]/15 rounded-xl p-3 mb-4">
                <Text className="text-[#E24B4A] text-sm text-center">
                  {error}
                </Text>
              </View>
            ) : null}

            {success ? (
              <View className="bg-[#1D9E75]/15 rounded-xl p-4 mb-4 border border-[#1D9E75]/30">
                <Text className="text-[#1D9E75] text-sm text-center font-semibold mb-1">
                  Conta criada!
                </Text>
                <Text className="text-[#1D9E75]/80 text-xs text-center">
                  Verifica o teu email para confirmar a conta, depois volta aqui para entrar.
                </Text>
                <TouchableOpacity onPress={() => router.back()} className="mt-3">
                  <Text className="text-center text-[#1D9E75] font-semibold text-sm">
                    Ir para o login
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              placeholder="o.teu@email.com"
            />
            <Input
              label="Palavra-passe"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              placeholder="Mínimo 6 caracteres"
            />
            <Input
              label="Confirmar palavra-passe"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              placeholder="Repete a palavra-passe"
            />

            <View className="bg-[#4A90D9]/10 rounded-xl p-3 mb-4 border border-[#4A90D9]/20">
              <Text className="text-xs text-[#4A90D9] leading-4 text-center">
                Os teus dados de saúde são encriptados e guardados na União
                Europeia. Nunca os vendemos ou partilhamos.
              </Text>
            </View>

            <Button
              title="Criar conta"
              onPress={handleRegister}
              loading={loading}
            />

            <SocialAuthButtons />

            <TouchableOpacity
              onPress={() => router.back()}
              className="mt-6"
            >
              <Text className="text-center text-[#888888]">
                Já tens conta?{' '}
                <Text className="text-[#1D9E75] font-semibold">Entrar</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
