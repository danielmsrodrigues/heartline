import { useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) {
      setError('Introduz o teu email.');
      return;
    }
    setLoading(true);
    setError('');

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: 'heartline://reset-password' }
    );

    setLoading(false);

    if (resetError) {
      setError('Não foi possível enviar o email. Verifica o endereço.');
    } else {
      setSent(true);
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
          <View className="px-6 pt-4">
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
          </View>

          <View className="flex-1 justify-center px-6">
            <Ionicons
              name="lock-open-outline"
              size={48}
              color="#8CB369"
              style={{ alignSelf: 'center' }}
            />
            <Text className="text-2xl font-bold text-gray-900 text-center mt-4 mb-2">
              Recuperar palavra-passe
            </Text>
            <Text className="text-sm text-gray-500 text-center mb-8">
              Introduz o teu email e enviamos-te um link para redefinir a palavra-passe.
            </Text>

            {error ? (
              <View className="bg-red-50 rounded-xl p-3 mb-4">
                <Text className="text-red-600 text-sm text-center">{error}</Text>
              </View>
            ) : null}

            {sent ? (
              <View className="bg-green-50 rounded-xl p-4 mb-4">
                <View className="flex-row items-center justify-center mb-2">
                  <Ionicons name="checkmark-circle" size={24} color="#16a34a" />
                  <Text className="text-green-800 font-semibold text-base ml-2">
                    Email enviado!
                  </Text>
                </View>
                <Text className="text-green-700 text-sm text-center leading-5">
                  Verifica a tua caixa de correio (e a pasta de spam).
                  Clica no link que recebeste para definir uma nova palavra-passe.
                </Text>
                <TouchableOpacity
                  onPress={() => router.back()}
                  className="mt-4"
                >
                  <Text className="text-center text-sm text-[#8CB369] font-semibold">
                    Voltar ao login
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Input
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="o.teu@email.com"
                />
                <Button
                  title="Enviar link de recuperação"
                  onPress={handleReset}
                  loading={loading}
                />
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
