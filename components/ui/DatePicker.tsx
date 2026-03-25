import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

interface DatePickerProps {
  label: string;
  value: Date | null;
  onChange: (date: Date) => void;
  placeholder?: string;
  maximumDate?: Date;
  minimumDate?: Date;
}

export function DatePicker({
  label,
  value,
  onChange,
  placeholder = 'Seleciona a data',
  maximumDate,
  minimumDate,
}: DatePickerProps) {
  const [show, setShow] = useState(false);

  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-[#888888] mb-1.5">{label}</Text>
      <TouchableOpacity
        onPress={() => setShow(true)}
        className="bg-[#111111] border border-[#151515] rounded-xl px-4 py-3"
      >
        <Text
          className={
            value ? 'text-base text-[#F5F5F5]' : 'text-base text-[#555555]'
          }
        >
          {value ? value.toLocaleDateString('pt-PT') : placeholder}
        </Text>
      </TouchableOpacity>
      <Modal visible={show} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-[#111111] rounded-t-2xl px-4 pb-8 pt-2">
            <View className="flex-row justify-between items-center mb-2 px-2 pt-2">
              <TouchableOpacity onPress={() => setShow(false)}>
                <Text className="text-base text-[#888888]">Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShow(false)}>
                <Text className="text-base font-semibold text-[#1D9E75]">
                  OK
                </Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={value ?? new Date()}
              mode="date"
              display="spinner"
              maximumDate={maximumDate}
              minimumDate={minimumDate}
              themeVariant="dark"
              textColor="#F5F5F5"
              onChange={(_, selectedDate) => {
                if (selectedDate) onChange(selectedDate);
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
