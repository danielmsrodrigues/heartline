import { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { Lockup } from '@/components/logo';
import { Screen } from '@/components/ui/Screen';
import { Sub, Title } from '@/components/ui/Text';
import { TopBar } from '@/components/ui/TopBar';

interface AuthScaffoldProps {
  title: string;
  subtitle?: string;
  back?: boolean;
  children: ReactNode;
}

/** Moldura dos ecrãs de conta: logótipo no topo, título e formulário. */
export function AuthScaffold({ title, subtitle, back = true, children }: AuthScaffoldProps) {
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <Screen>
        <TopBar back={back} center={<Lockup size={30} />} />
        <Title style={{ marginTop: 36 }}>{title}</Title>
        {subtitle ? <Sub style={{ marginTop: 8, fontSize: 16, lineHeight: 23 }}>{subtitle}</Sub> : null}
        {children}
      </Screen>
    </KeyboardAvoidingView>
  );
}
