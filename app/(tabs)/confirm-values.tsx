import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useGeneratedContent } from '@/hooks/useGeneratedContent';
import { ExtractedMarker } from '@/lib/types';
import { ConfirmValuesList } from '@/components/confirm-values-list';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';

interface ParsedData {
  lab_name: string | null;
  exam_date: string | null;
  markers: ExtractedMarker[];
  imageUri?: string;
}

export default function ConfirmValuesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ data: string }>();
  const { user } = useAuth();
  const { regenerate } = useGeneratedContent();

  const [labName, setLabName] = useState('');
  const [examDate, setExamDate] = useState<Date | null>(null);
  const [markers, setMarkers] = useState<ExtractedMarker[]>([]);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (params.data) {
      try {
        const decoded = decodeURIComponent(params.data);
        const parsed: ParsedData = JSON.parse(decoded);
        setLabName(parsed.lab_name ?? '');
        setExamDate(parsed.exam_date ? new Date(parsed.exam_date) : null);
        setMarkers(parsed.markers ?? []);
        setImageUri(parsed.imageUri ?? null);
      } catch (err) {
        console.error('Error parsing params:', err);
        Alert.alert('Erro', 'Dados inválidos. Tenta novamente.');
        router.back();
      }
    }
  }, [params.data]);

  const handleUpdateMarker = (
    index: number,
    field: keyof ExtractedMarker,
    value: string | number | null
  ) => {
    setMarkers((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemoveMarker = (index: number) => {
    setMarkers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = async () => {
    if (!user) return;

    if (!examDate) {
      Alert.alert('Data em falta', 'Indica a data do exame.');
      return;
    }

    if (markers.length === 0) {
      Alert.alert('Sem valores', 'Adiciona pelo menos um valor antes de confirmar.');
      return;
    }

    setSaving(true);

    try {
      // Create exam record
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .insert({
          profile_id: user.id,
          lab_name: labName.trim() || null,
          exam_date: examDate!.toISOString().split('T')[0],
          extraction_method: 'ai_extracted',
        })
        .select()
        .single();

      if (examError || !examData) throw examError;

      // Upload original image if available
      if (imageUri) {
        try {
          const response = await fetch(imageUri);
          const blob = await response.blob();
          const filePath = `${user.id}/${examData.id}.jpg`;
          await supabase.storage.from('exams').upload(filePath, blob, {
            contentType: 'image/jpeg',
          });
          await supabase
            .from('exams')
            .update({ original_file_path: filePath })
            .eq('id', examData.id);
        } catch (uploadErr) {
          console.warn('Image upload failed, continuing:', uploadErr);
        }
      }

      // Insert biomarkers
      const biomarkersToInsert = markers.map((m) => ({
        exam_id: examData.id,
        profile_id: user.id,
        name: m.name,
        name_normalized: m.name_normalized,
        value: m.value,
        unit: m.unit,
        ref_min: m.ref_min,
        ref_max: m.ref_max,
        ai_confidence: m.confidence,
        user_confirmed: true,
      }));

      const { error: markersError } = await supabase
        .from('biomarkers')
        .insert(biomarkersToInsert);

      if (markersError) throw markersError;

      // Trigger content regeneration (non-blocking)
      regenerate().catch((err) =>
        console.warn('Content regeneration failed:', err)
      );

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      router.push('/(tabs)');
    } catch (err) {
      console.error('Save error:', err);
      Alert.alert(
        'Erro ao guardar',
        'Não foi possível guardar o exame. Tenta novamente.'
      );
    } finally {
      setSaving(false);
    }
  };

  const lowConfidenceCount = markers.filter(
    (m) => m.confidence !== 'high'
  ).length;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-6 pt-6">
          {/* Header */}
          <View className="flex-row items-center mb-2">
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <Text className="text-2xl font-bold text-gray-900 ml-3">
              Confirmar valores
            </Text>
          </View>
          <Text className="text-sm text-gray-500 mb-4">
            Verifica os valores extraídos e corrige se necessário.
          </Text>

          {/* Low confidence warning */}
          {lowConfidenceCount > 0 && (
            <View className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
              <View className="flex-row items-center">
                <Ionicons
                  name="alert-circle-outline"
                  size={16}
                  color="#B8860B"
                />
                <Text className="text-xs text-amber-800 ml-1.5 flex-1">
                  {lowConfidenceCount} valor(es) com menor confiança — destacados
                  a amarelo. Verifica com atenção.
                </Text>
              </View>
            </View>
          )}

          {/* Original image preview */}
          {imageUri && (
            <View className="mb-4 rounded-xl overflow-hidden border border-gray-200">
              <Image
                source={{ uri: imageUri }}
                style={{ width: '100%', height: 200 }}
                resizeMode="contain"
                className="bg-gray-100"
              />
            </View>
          )}

          {/* Exam metadata */}
          <DatePicker
            label="Data do exame"
            value={examDate}
            onChange={setExamDate}
            maximumDate={new Date()}
            minimumDate={new Date(2000, 0, 1)}
          />
          <Input
            label="Laboratório"
            value={labName}
            onChangeText={setLabName}
            placeholder="Nome do laboratório"
          />

          {/* Extracted values */}
          <Text className="text-base font-semibold text-gray-900 mt-2 mb-3">
            Valores extraídos ({markers.length})
          </Text>

          <ConfirmValuesList
            markers={markers}
            onUpdate={handleUpdateMarker}
            onRemove={handleRemoveMarker}
          />

          {/* Confirm button */}
          <View className="mt-4">
            <Button
              title="Confirmar e guardar"
              onPress={handleConfirm}
              loading={saving}
              disabled={markers.length === 0}
            />
          </View>

          {/* Disclaimer */}
          <View className="mt-4 flex-row items-start bg-blue-50 rounded-xl p-3 border border-blue-100">
            <Ionicons
              name="information-circle"
              size={16}
              color="#3B82F6"
              style={{ marginTop: 1 }}
            />
            <Text className="text-xs text-blue-700 ml-2 flex-1 leading-4">
              Os valores são extraídos automaticamente e podem conter erros.
              Confirma sempre com o documento original.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
