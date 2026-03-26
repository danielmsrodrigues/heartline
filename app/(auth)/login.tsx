import { useState, useRef } from 'react';
import { View, Text, Image, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) { setError('Preenche todos os campos.'); return; }
    setLoading(true);
    setError('');
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      setLoading(false);
      if (authError) setError('Email ou palavra-passe incorretos.');
    } catch (err: any) {
      setLoading(false);
      setError(`Erro de ligação: ${err.message ?? 'Verifica a tua internet.'}`);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0A0A0A]">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ paddingTop: 80, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View style={{ paddingHorizontal: 24 }}>
            {/* Logo */}
            <View style={{ alignItems: 'center', marginBottom: 32 }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, overflow: 'hidden', marginBottom: 12 }}>
                <Image source={require('@/assets/images/splash-orb.png')} style={{ width: 80, height: 80 }} resizeMode="cover" />
              </View>
              <Text style={{ fontSize: 24, fontWeight: '700', color: '#FFFFFF' }}>Heartline</Text>
              <Text style={{ fontSize: 14, color: '#666666', marginTop: 4 }}>Bem-vindo de volta</Text>
            </View>

            {error ? (
              <View style={{ backgroundColor: 'rgba(226,75,74,0.12)', borderRadius: 12, padding: 10, marginBottom: 16 }}>
                <Text style={{ color: '#E24B4A', fontSize: 13, textAlign: 'center' }}>{error}</Text>
              </View>
            ) : null}

            <AuthInput value={email} onChangeText={setEmail} placeholder="Email" keyboardType="email-address" autoComplete="email" textContentType="emailAddress" />
            <AuthInput value={password} onChangeText={setPassword} placeholder="Palavra-passe" secureTextEntry autoComplete="password" textContentType="password" />

            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
              style={{ backgroundColor: '#1D9E75', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 4 }}
            >
              {loading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>Entrar</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} style={{ marginTop: 16 }}>
              <Text style={{ textAlign: 'center', fontSize: 14, color: '#888888' }}>Esqueci-me da palavra-passe</Text>
            </TouchableOpacity>

            {/* TODO: remover antes de produção */}
            <TouchableOpacity
              onPress={async () => {
                await AsyncStorage.clear();
                Alert.alert('DEV', 'AsyncStorage limpo. Fecha e reabre a app.');
              }}
              style={{ marginTop: 24 }}
            >
              <Text style={{ textAlign: 'center', fontSize: 11, color: '#333' }}>DEV: Limpar AsyncStorage</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.replace('/(auth)/register')} style={{ marginTop: 16 }}>
              <Text style={{ textAlign: 'center', color: '#888888', fontSize: 14 }}>
                Não tens conta?{' '}<Text style={{ color: '#1D9E75', fontWeight: '600' }}>Criar conta</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
