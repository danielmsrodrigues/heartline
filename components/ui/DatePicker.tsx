import { ReactNode, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/constants/theme';
import { Glass, PressableScale } from './Glass';
import { Icon } from './Icon';

interface DatePickerProps {
  label: string;
  value: Date | null;
  onChange: (date: Date) => void;
  placeholder?: string;
  maximumDate?: Date;
  minimumDate?: Date;
  /** Substitui o campo por outro gatilho (ex.: um chip). Recebe a função que abre o seletor. */
  renderTrigger?: (open: () => void) => ReactNode;
}

const longDate = (d: Date) => d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' });

export function DatePicker({ label, value, onChange, placeholder = 'Escolher data', maximumDate, minimumDate, renderTrigger }: DatePickerProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [show, setShow] = useState(false);

  return (
    <View style={renderTrigger ? undefined : { marginTop: 16 }}>
      {renderTrigger ? renderTrigger(() => setShow(true)) : (
        <>
        <Text style={{ marginHorizontal: 4, marginBottom: 6, fontSize: 14, lineHeight: 20, fontWeight: '600', color: t.sub }}>{label}</Text>
        <Glass radius={20} flat onPress={() => setShow(true)} accessibilityLabel={`${label}: ${value ? longDate(value) : placeholder}`} contentStyle={{ height: 56, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 17, color: value ? t.ink : t.sub }}>{value ? longDate(value) : placeholder}</Text>
          <Icon name="calendar" size={20} color={t.sub} weight="medium" />
        </Glass>
        </>
      )}
      <Modal visible={show} transparent animationType="slide" onRequestClose={() => setShow(false)}>
        <Pressable style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' }} onPress={() => setShow(false)} accessibilityLabel="Fechar">
          <Pressable style={{ backgroundColor: t.bg[0], borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 16, paddingTop: 8, paddingBottom: insets.bottom + 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 8, paddingTop: 8 }}>
              <PressableScale onPress={() => setShow(false)} hitSlop={12} accessibilityLabel="Concluído">
                <Text style={{ fontSize: 17, fontWeight: '600', color: t.link }}>Concluído</Text>
              </PressableScale>
            </View>
            <DateTimePicker
              value={value ?? maximumDate ?? new Date()}
              mode="date"
              display="spinner"
              locale="pt-PT"
              maximumDate={maximumDate}
              minimumDate={minimumDate}
              themeVariant={t.dark ? 'dark' : 'light'}
              textColor={t.ink}
              onChange={(_, selectedDate) => {
                if (selectedDate) onChange(selectedDate);
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
