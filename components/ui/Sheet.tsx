import { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/constants/theme';

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

/** Folha que sobe de baixo, para escolhas rápidas sem sair do ecrã. */
export function Sheet({ visible, onClose, title, children }: SheetProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* Sem isto, um campo de texto dentro da folha ficava atrás do teclado. */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <Pressable style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' }} onPress={onClose} accessibilityLabel="Fechar">
        <Pressable
          accessibilityViewIsModal
          style={{ backgroundColor: t.bg[0], borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 24, paddingTop: 10, paddingBottom: insets.bottom + 20 }}
        >
          <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: t.track, marginBottom: 14 }} />
          {title ? <Text accessibilityRole="header" style={{ fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.4, color: t.ink }}>{title}</Text> : null}
          {children}
        </Pressable>
      </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
