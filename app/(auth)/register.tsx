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
import { Note } from '@/components/ui/Text';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Em vez de pedir a palavra-passe duas vezes, o campo deixa vê-la (olho).
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const fail = (message: string) => {
    haptics.warning();
    setError(message);
  };

  const handleRegister = async () => {
    if (!email || !password) { fail('Preenche o email e a palavra-passe.'); return; }
    if (password.length < 6) { fail('A palavra-passe tem de ter pelo menos 6 caracteres.'); return; }
    setLoading(true);
    setError('');
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({ email: email.trim(), password });
      setLoading(false);
      if (signUpError) {
        if (signUpError.message.includes('already registered')) fail('Este email já está registado. Tenta entrar.');
        else fail('Não foi possível criar a conta. Tenta novamente.');
      } else if (!data.session) {
        haptics.success();
        setSuccess(true);
      }
    } catch {
      setLoading(false);
      fail('Erro de ligação. Verifica a tua internet.');
    }
  };

  if (success) {
    return (
      <AuthScaffold title="Confirma o teu email" back={false}>
        <Banner tone="ok" title="Conta criada" text="Enviámos-te um email. Abre o link para confirmar a conta e depois volta aqui para entrar." />
        <Button title="Ir para o início de sessão" onPress={() => router.replace('/(auth)/login')} style={{ marginTop: 24 }} />
      </AuthScaffold>
    );
  }

  return (
    <AuthScaffold title="Cria a tua conta" back={false}>
      {error ? <Banner tone="out" text={error} /> : null}
      <View style={{ marginTop: 10 }}>
        <Input label="Email" value={email} onChangeText={setEmail} placeholder="O teu email" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" returnKeyType="next" />
        <PasswordInput label="Palavra-passe" value={password} onChangeText={setPassword} placeholder="Escolhe uma palavra-passe" hint="Pelo menos 6 caracteres." isNew returnKeyType="go" onSubmitEditing={handleRegister} />
      </View>
      <Button title="Criar conta" onPress={handleRegister} loading={loading} style={{ marginTop: 24 }} />
      <Button variant="text" title="Já tenho conta" onPress={() => router.replace('/(auth)/login')} style={{ marginTop: 6 }} />
      <Note style={{ marginTop: 14 }}>Os teus dados de saúde ficam encriptados e guardados na União Europeia. Nunca os vendemos nem partilhamos.</Note>
    </AuthScaffold>
  );
}
