import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { haptics } from '@/lib/haptics';
import { AuthScaffold } from '@/components/auth-scaffold';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Sub } from '@/components/ui/Text';

type LinkStatus = 'checking' | 'ready' | 'invalid';

export default function ResetPasswordScreen() {
  const router = useRouter();
  // O link do email abre heartline://reset-password?code=… (fluxo PKCE)
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [status, setStatus] = useState<LinkStatus>('checking');
  const exchangedCode = useRef<string | null>(null);

  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    (async () => {
      if (code) {
        // Cada código só pode ser trocado uma vez, mesmo que o efeito repita.
        if (exchangedCode.current === code) return;
        exchangedCode.current = code;
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (!exchangeError) {
          setStatus('ready');
          return;
        }
        // Link aberto pela segunda vez: o código já foi gasto, mas a sessão pode existir.
      }
      const { data } = await supabase.auth.getSession();
      setStatus(data.session ? 'ready' : 'invalid');
    })();
  }, [code]);

  const handleReset = async () => {
    if (password.length < 6) {
      haptics.warning();
      setError('A palavra-passe tem de ter pelo menos 6 caracteres.');
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
      haptics.success();
      setSuccess(true);
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 2000);
    }
  };

  if (status === 'checking') {
    return (
      <AuthScaffold title="Nova palavra-passe" back={false}>
        <Sub style={{ marginTop: 12, fontSize: 16 }}>A validar o link…</Sub>
      </AuthScaffold>
    );
  }

  if (status === 'invalid') {
    return (
      <AuthScaffold title="Nova palavra-passe" back={false}>
        <Banner tone="out" text="Este link já não é válido. Pede um novo email de recuperação." />
        <Button title="Pedir novo link" onPress={() => router.replace('/(auth)/forgot-password')} style={{ marginTop: 24 }} />
      </AuthScaffold>
    );
  }

  return (
    <AuthScaffold title="Nova palavra-passe" back={false}>
      {error ? <Banner tone="out" text={error} /> : null}
      {success ? (
        <Banner tone="ok" title="Palavra-passe atualizada" text="A entrar na app…" />
      ) : (
        <>
          <View style={{ marginTop: 10 }}>
            <PasswordInput label="Nova palavra-passe" value={password} onChangeText={setPassword} placeholder="Escolhe uma palavra-passe" hint="Pelo menos 6 caracteres." isNew returnKeyType="go" onSubmitEditing={handleReset} />
          </View>
          <Button title="Atualizar" onPress={handleReset} loading={loading} style={{ marginTop: 24 }} />
        </>
      )}
    </AuthScaffold>
  );
}
