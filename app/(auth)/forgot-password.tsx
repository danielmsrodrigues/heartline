import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { haptics } from '@/lib/haptics';
import { AuthScaffold } from '@/components/auth-scaffold';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) { haptics.warning(); setError('Escreve o teu email.'); return; }
    setLoading(true);
    setError('');
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: 'heartline://reset-password' });
    setLoading(false);
    if (resetError) {
      haptics.warning();
      setError('Não foi possível enviar o email. Verifica o endereço.');
    } else {
      haptics.success();
      setSent(true);
    }
  };

  if (sent) {
    return (
      <AuthScaffold title="Vê o teu email">
        <Banner tone="ok" title="Email enviado" text="Abre o link que recebeste para definires uma nova palavra-passe. Se não o vires, espreita a pasta de spam." />
        <Button title="Voltar ao início de sessão" onPress={() => router.replace('/(auth)/login')} style={{ marginTop: 24 }} />
      </AuthScaffold>
    );
  }

  return (
    <AuthScaffold title="Recuperar palavra-passe" subtitle="Envio-te um link por email.">
      {error ? <Banner tone="out" text={error} /> : null}
      <View style={{ marginTop: 10 }}>
        <Input label="Email" value={email} onChangeText={setEmail} placeholder="O teu email" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" returnKeyType="send" onSubmitEditing={handleReset} />
      </View>
      <Button title="Enviar link" onPress={handleReset} loading={loading} style={{ marginTop: 24 }} />
    </AuthScaffold>
  );
}
