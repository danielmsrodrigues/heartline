import { useState } from 'react';
import { View, Text, Image, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

function AuthInput({ value, onChangeText, placeholder, secureTextEntry, keyboardType, autoCapitalize, autoComplete, textContentType }: {
  value: string; onChangeText: (t: string) => void; placeholder: string;
  secureTextEntry?: boolean; keyboardType?: any; autoCapitalize?: any; autoComplete?: any; textContentType?: any;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#444444"
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize ?? 'none'}
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

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) { setError('Preenche todos os campos.'); return; }
    if (password.length < 6) { setError('A palavra-passe tem de ter pelo menos 6 caracteres.'); return; }
    if (password !== confirmPassword) { setError('As palavras-passe não coincidem.'); return; }

    setLoading(true);
    setError('');
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({ email: email.trim(), password });
      setLoading(false);
      if (signUpError) {
        if (signUpError.message.includes('already registered')) setError('Este email já está registado. Tenta entrar.');
        else setError(`Erro: ${signUpError.message}`);
      } else if (!data.session) {
        setSuccess(true);
      }
    } catch (err: any) {
      setLoading(false);
      setError(`Erro de ligação: ${err.message ?? 'Verifica a tua internet.'}`);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0A0A0A]">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ paddingTop: 60, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View style={{ paddingHorizontal: 24 }}>
            {/* Logo */}
            <View style={{ alignItems: 'center', marginBottom: 32 }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, overflow: 'hidden', marginBottom: 12 }}>
                <Image source={require('@/assets/images/splash-orb.png')} style={{ width: 80, height: 80 }} resizeMode="cover" />
              </View>
              <Text style={{ fontSize: 24, fontWeight: '700', color: '#FFFFFF' }}>Heartline</Text>
              <Text style={{ fontSize: 14, color: '#666666', marginTop: 4 }}>Cria a tua conta</Text>
            </View>

            {error ? (
              <View style={{ backgroundColor: 'rgba(226,75,74,0.12)', borderRadius: 12, padding: 10, marginBottom: 16 }}>
                <Text style={{ color: '#E24B4A', fontSize: 13, textAlign: 'center' }}>{error}</Text>
              </View>
            ) : null}

            {success ? (
              <View style={{ backgroundColor: 'rgba(29,158,117,0.12)', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 0.5, borderColor: 'rgba(29,158,117,0.2)' }}>
                <Text style={{ color: '#1D9E75', fontSize: 14, fontWeight: '600', textAlign: 'center', marginBottom: 4 }}>Conta criada!</Text>
                <Text style={{ color: 'rgba(29,158,117,0.7)', fontSize: 12, textAlign: 'center' }}>Verifica o teu email para confirmar a conta, depois volta aqui para entrar.</Text>
                <TouchableOpacity onPress={() => router.replace('/(auth)/login')} style={{ marginTop: 12 }}>
                  <Text style={{ textAlign: 'center', color: '#1D9E75', fontWeight: '600', fontSize: 14 }}>Ir para o login</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <AuthInput value={email} onChangeText={setEmail} placeholder="Email" keyboardType="email-address" autoComplete="email" textContentType="emailAddress" />
            <AuthInput value={password} onChangeText={setPassword} placeholder="Palavra-passe (mín. 6 caracteres)" secureTextEntry autoComplete="new-password" textContentType="newPassword" />
            <AuthInput value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirmar palavra-passe" secureTextEntry autoComplete="new-password" textContentType="newPassword" />

            <Text style={{ fontSize: 12, color: '#555555', textAlign: 'center', marginBottom: 16, lineHeight: 18 }}>
              Os teus dados de saúde são encriptados e guardados na União Europeia. Nunca os vendemos ou partilhamos.
            </Text>

            <TouchableOpacity
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
              style={{ backgroundColor: '#1D9E75', borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
            >
              {loading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>Criar conta</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.replace('/(auth)/login')} style={{ marginTop: 24 }}>
              <Text style={{ textAlign: 'center', color: '#888888', fontSize: 14 }}>
                Já tens conta?{' '}<Text style={{ color: '#1D9E75', fontWeight: '600' }}>Entrar</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
