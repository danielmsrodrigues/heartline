import { useState } from 'react';
import { View, Text, Image, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

function AuthInput({ value, onChangeText, placeholder, keyboardType, autoComplete, textContentType }: {
  value: string; onChangeText: (t: string) => void; placeholder: string;
  keyboardType?: any; autoComplete?: any; textContentType?: any;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#444444"
      keyboardType={keyboardType}
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete={autoComplete}
      textContentType={textContentType}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        backgroundColor: '#111111',
        borderWidth: 0.5,
        borderColor: focused ? '#1D9E75' : '#222222',
        borderRadius: 14,
        padding: 16,
        fontSize: 16,
        color: '#FFFFFF',
        marginBottom: 12,
      }}
    />
  );
}

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) { setError('Introduz o teu email.'); return; }
    setLoading(true);
    setError('');
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: 'heartline://reset-password' });
    setLoading(false);
    if (resetError) setError('Não foi possível enviar o email. Verifica o endereço.');
    else setSent(true);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0A0A0A]">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ paddingTop: 80, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View style={{ paddingHorizontal: 24 }}>
            {/* Logo */}
            <View style={{ alignItems: 'center', marginBottom: 32 }}>
              <View style={{ width: 60, height: 60, borderRadius: 30, overflow: 'hidden', marginBottom: 12 }}>
                <Image source={require('@/assets/images/splash-orb.png')} style={{ width: 60, height: 60 }} resizeMode="cover" />
              </View>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#FFFFFF' }}>Recuperar palavra-passe</Text>
              <Text style={{ fontSize: 13, color: '#555555', marginTop: 6, textAlign: 'center', paddingHorizontal: 20 }}>
                Introduz o teu email e enviamos-te um link para redefinir a palavra-passe.
              </Text>
            </View>

            {error ? (
              <View style={{ backgroundColor: 'rgba(226,75,74,0.12)', borderRadius: 12, padding: 10, marginBottom: 16 }}>
                <Text style={{ color: '#E24B4A', fontSize: 13, textAlign: 'center' }}>{error}</Text>
              </View>
            ) : null}

            {sent ? (
              <View style={{ backgroundColor: 'rgba(29,158,117,0.12)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <Text style={{ color: '#1D9E75', fontSize: 15, fontWeight: '600', textAlign: 'center', marginBottom: 4 }}>Email enviado!</Text>
                <Text style={{ color: 'rgba(29,158,117,0.7)', fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
                  Verifica a tua caixa de correio (e a pasta de spam). Clica no link que recebeste para definir uma nova palavra-passe.
                </Text>
                <TouchableOpacity onPress={() => router.replace('/(auth)/login')} style={{ marginTop: 16 }}>
                  <Text style={{ textAlign: 'center', color: '#1D9E75', fontWeight: '600', fontSize: 14 }}>Voltar ao login</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <AuthInput value={email} onChangeText={setEmail} placeholder="Email" keyboardType="email-address" autoComplete="email" textContentType="emailAddress" />

                <TouchableOpacity
                  onPress={handleReset}
                  disabled={loading}
                  activeOpacity={0.8}
                  style={{ backgroundColor: '#1D9E75', borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
                >
                  {loading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>Enviar link de recuperação</Text>}
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
