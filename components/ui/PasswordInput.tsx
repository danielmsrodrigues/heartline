import { useState } from 'react';
import { TextInputProps } from 'react-native';
import { useTheme } from '@/constants/theme';
import { PressableScale } from './Glass';
import { EyeToggle } from './EyeToggle';
import { Input } from './Input';

interface PasswordInputProps extends TextInputProps {
  label: string;
  hint?: string;
  /** true para uma palavra-passe nova (o sistema sugere uma forte). */
  isNew?: boolean;
}

/** Campo de palavra-passe com o olho para a mostrar ou esconder. */
export function PasswordInput({ label, hint, isNew = false, ...props }: PasswordInputProps) {
  const t = useTheme();
  const [visible, setVisible] = useState(false);
  return (
    <Input
      label={label}
      hint={hint}
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete={isNew ? 'new-password' : 'password'}
      textContentType={isNew ? 'newPassword' : 'password'}
      {...props}
      trailing={
        <PressableScale onPress={() => setVisible((v) => !v)} hitSlop={12} accessibilityLabel={visible ? 'Esconder palavra-passe' : 'Mostrar palavra-passe'}>
          <EyeToggle slashed={visible} size={23} color={t.sub} />
        </PressableScale>
      }
    />
  );
}
