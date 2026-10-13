import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { haptics } from '@/lib/haptics';
import { AuthScaffold } from '@/components/auth-scaffold';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const fail = (message: string) => {
    haptics.warning();
    setError(message);
  };

  const handleLogin = async () => {
    if (!email || !password) { fail('Preenche o email e a palavra-passe.'); return; }
    setLoading(true);
    setError('');
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      setLoading(false);
      if (authError) fail('Email ou palavra-passe incorretos.');
    } catch {
      setLoading(false);
      fail('Erro de ligação. Verifica a tua internet.');
    }
  };

  return (
    <AuthScaffold title="Olá outra vez" back={false}>
      {error ? <Banner tone="out" text={error} /> : null}
      <View style={{ marginTop: 10 }}>
        <Input label="Email" value={email} onChangeText={setEmail} placeholder="O teu email" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" returnKeyType="next" />
        <PasswordInput label="Palavra-passe" value={password} onChangeText={setPassword} placeholder="A tua palavra-passe" returnKeyType="go" onSubmitEditing={handleLogin} />
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Button variant="text" title="Esqueci-me da palavra-passe" onPress={() => router.push('/(auth)/forgot-password')} style={{ paddingHorizontal: 4 }} />
      </View>
      <Button title="Entrar" onPress={handleLogin} loading={loading} style={{ marginTop: 12 }} />
      <Button variant="text" title="Criar conta" onPress={() => router.replace('/(auth)/register')} style={{ marginTop: 6 }} />
    </AuthScaffold>
  );
}
