import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { ExtractedMarker } from '@/lib/types';
import { Ionicons } from '@expo/vector-icons';

interface ConfirmValuesListProps {
  markers: ExtractedMarker[];
  onUpdate: (index: number, field: keyof ExtractedMarker, value: string | number | null) => void;
  onRemove: (index: number) => void;
}

export function ConfirmValuesList({ markers, onUpdate, onRemove }: ConfirmValuesListProps) {
  return (
    <View>
      {markers.map((marker, index) => {
        const isLowConfidence = marker.confidence !== 'high';
        return (
          <View
            key={index}
            className={`rounded-xl p-3 mb-2 border ${isLowConfidence ? 'bg-[#EF9F27]/10 border-[#EF9F27]/30' : 'bg-[#111111] border-[#151515]'}`}
          >
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm font-semibold text-[#F5F5F5] flex-1">{marker.name}</Text>
              {isLowConfidence && (
                <View className="bg-[#EF9F27]/20 rounded-full px-2 py-0.5 mr-2">
                  <Text className="text-xs text-[#EF9F27]">Verificar</Text>
                </View>
              )}
              <TouchableOpacity onPress={() => onRemove(index)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={20} color="#555555" />
              </TouchableOpacity>
            </View>
            <View className="flex-row items-center">
              <View className="flex-1 mr-2">
                <Text className="text-xs text-[#555555] mb-0.5">Valor</Text>
                <TextInput
                  className="bg-[#0A0A0A] border border-[#151515] rounded-lg px-2.5 py-1.5 text-sm text-[#F5F5F5]"
                  value={String(marker.value)}
                  onChangeText={(text) => onUpdate(index, 'value', parseFloat(text) || 0)}
                  keyboardType="decimal-pad"
                  placeholderTextColor="#555555"
                />
              </View>
              <View className="w-20 mr-2">
                <Text className="text-xs text-[#555555] mb-0.5">Unidade</Text>
                <TextInput
                  className="bg-[#0A0A0A] border border-[#151515] rounded-lg px-2.5 py-1.5 text-sm text-[#F5F5F5]"
                  value={marker.unit}
                  onChangeText={(text) => onUpdate(index, 'unit', text)}
                  placeholderTextColor="#555555"
                />
              </View>
              <View className="w-16 mr-2">
                <Text className="text-xs text-[#555555] mb-0.5">Ref. min</Text>
                <TextInput
                  className="bg-[#0A0A0A] border border-[#151515] rounded-lg px-2.5 py-1.5 text-sm text-[#F5F5F5]"
                  value={marker.ref_min != null ? String(marker.ref_min) : ''}
                  onChangeText={(text) => onUpdate(index, 'ref_min', text ? parseFloat(text) : null)}
                  keyboardType="decimal-pad"
                  placeholderTextColor="#555555"
                />
              </View>
              <View className="w-16">
                <Text className="text-xs text-[#555555] mb-0.5">Ref. max</Text>
                <TextInput
                  className="bg-[#0A0A0A] border border-[#151515] rounded-lg px-2.5 py-1.5 text-sm text-[#F5F5F5]"
                  value={marker.ref_max != null ? String(marker.ref_max) : ''}
                  onChangeText={(text) => onUpdate(index, 'ref_max', text ? parseFloat(text) : null)}
                  keyboardType="decimal-pad"
                  placeholderTextColor="#555555"
                />
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}
