import { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as DocumentPicker from 'expo-document-picker';
import { File as ExpoFile } from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { extractExamFromImage } from '@/lib/ai';
import { COMMON_BIOMARKERS } from '@/constants/biomarkers';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DatePicker } from '@/components/ui/DatePicker';

type Mode = 'choose' | 'camera' | 'manual';

interface ManualMarker {
  templateIndex: number | null;
  customName: string;
  name_normalized: string;
  value: string;
  unit: string;
  ref_min: string;
  ref_max: string;
}

const emptyManualMarker = (): ManualMarker => ({
  templateIndex: null,
  customName: '',
  name_normalized: '',
  value: '',
  unit: '',
  ref_min: '',
  ref_max: '',
});

export default function AddExamScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [mode, setMode] = useState<Mode>('choose');
  const [extracting, setExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState('');

  // Manual mode state
  const [examDate, setExamDate] = useState<Date | null>(null);
  const [labName, setLabName] = useState('');
  const [markers, setMarkers] = useState<ManualMarker[]>([emptyManualMarker()]);
  const [savingManual, setSavingManual] = useState(false);

  // GDPR consent for first exam
  const [consentGiven, setConsentGiven] = useState(false);
  const [showConsent, setShowConsent] = useState(false);

  const checkAndRequestConsent = async (callback: () => void) => {
    // Check if user has already given consent (has any exams)
    if (!user) return;
    const { count } = await supabase
      .from('exams')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', user.id);

    if (count && count > 0) {
      callback();
    } else if (consentGiven) {
      callback();
    } else {
      setShowConsent(true);
    }
  };

  const processFile = async (uri: string, mimeType: string = 'image/jpeg') => {
    setExtracting(true);
    setExtractionError('');

    try {
      let base64: string;
      let finalMimeType = mimeType;

      if (mimeType === 'application/pdf') {
        // Read PDF directly as base64 (no image manipulation)
        const file = new ExpoFile(uri);
        base64 = await file.base64();
      } else {
        // Compress image and get base64
        const manipulated = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 1500 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );
        base64 = manipulated.base64 ?? '';
        finalMimeType = 'image/jpeg';
      }

      // Call extraction
      const result = await extractExamFromImage(base64, finalMimeType);

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Navigate to confirm-values with data
      const dataParam = encodeURIComponent(
        JSON.stringify({
          ...result,
          imageUri: mimeType !== 'application/pdf' ? uri : undefined,
        })
      );
      router.push(`/(tabs)/confirm-values?data=${dataParam}` as any);
    } catch (err) {
      console.error('Extraction error:', err);
      setExtractionError(
        'Não foi possível extrair os valores. Tenta novamente ou usa o modo manual.'
      );
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setExtracting(false);
    }
  };

  const handleCamera = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert(
          'Permissão necessária',
          'Para fotografar exames, a app precisa de acesso à câmara.'
        );
        return;
      }
    }
    checkAndRequestConsent(() => setMode('camera'));
  };

  const handleGallery = async () => {
    checkAndRequestConsent(async () => {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await processFile(result.assets[0].uri, 'image/jpeg');
      }
    });
  };

  const handleDocument = async () => {
    checkAndRequestConsent(async () => {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const isPdf = asset.mimeType === 'application/pdf' ||
          asset.uri.toLowerCase().endsWith('.pdf');
        await processFile(asset.uri, isPdf ? 'application/pdf' : 'image/jpeg');
      }
    });
  };

  const handleTakePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });
      if (photo) {
        setMode('choose');
        await processFile(photo.uri, 'image/jpeg');
      }
    } catch (err) {
      console.error('Photo error:', err);
      Alert.alert('Erro', 'Não foi possível tirar a foto. Tenta novamente.');
    }
  };

  const handleManual = () => {
    checkAndRequestConsent(() => setMode('manual'));
  };

  const updateMarker = (
    index: number,
    field: keyof ManualMarker,
    value: string | number | null
  ) => {
    setMarkers((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const selectTemplate = (markerIndex: number, templateIndex: number) => {
    const template = COMMON_BIOMARKERS[templateIndex];
    setMarkers((prev) => {
      const updated = [...prev];
      updated[markerIndex] = {
        ...updated[markerIndex],
        templateIndex,
        customName: template.name,
        name_normalized: template.name_normalized,
        unit: template.unit,
        ref_min: template.ref_min != null ? String(template.ref_min) : '',
        ref_max: template.ref_max != null ? String(template.ref_max) : '',
      };
      return updated;
    });
  };

  const addManualMarker = () => {
    setMarkers((prev) => [...prev, emptyManualMarker()]);
  };

  const removeManualMarker = (index: number) => {
    if (markers.length <= 1) return;
    setMarkers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveManual = async () => {
    if (!user) return;
    if (!examDate) {
      Alert.alert('Data em falta', 'Indica a data do exame.');
      return;
    }

    const validMarkers = markers.filter(
      (m) => (m.customName || m.name_normalized) && m.value
    );
    if (validMarkers.length === 0) {
      Alert.alert(
        'Sem biomarcadores',
        'Adiciona pelo menos um biomarcador com nome e valor.'
      );
      return;
    }

    setSavingManual(true);

    try {
      // Create exam
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .insert({
          profile_id: user.id,
          lab_name: labName.trim() || null,
          exam_date: examDate!.toISOString().split('T')[0],
          extraction_method: 'manual',
        })
        .select()
        .single();

      if (examError || !examData) throw examError;

      // Insert biomarkers
      const biomarkersToInsert = validMarkers.map((m) => ({
        exam_id: examData.id,
        profile_id: user.id,
        name: m.customName || m.name_normalized,
        name_normalized:
          m.name_normalized ||
          m.customName
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '_'),
        value: parseFloat(m.value),
        unit: m.unit || 'mg/dL',
        ref_min: m.ref_min ? parseFloat(m.ref_min) : null,
        ref_max: m.ref_max ? parseFloat(m.ref_max) : null,
        ai_confidence: null,
        user_confirmed: true,
      }));

      const { error: markersError } = await supabase
        .from('biomarkers')
        .insert(biomarkersToInsert);

      if (markersError) throw markersError;

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Reset form
      setMode('choose');
      setExamDate(null);
      setLabName('');
      setMarkers([emptyManualMarker()]);

      router.push('/(tabs)');
    } catch (err) {
      console.error('Save error:', err);
      Alert.alert('Erro', 'Não foi possível guardar o exame. Tenta novamente.');
    } finally {
      setSavingManual(false);
    }
  };

  // GDPR Consent overlay
  if (showConsent && !consentGiven) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center px-6">
          <Text className="text-xl font-bold text-gray-900 text-center mb-4">
            Autorização para processamento
          </Text>
          <Card className="mb-6">
            <Text className="text-sm text-gray-700 leading-5">
              Para analisar os teus exames, processamos dados de saúde.
              Extraímos valores usando IA, guardamos tudo encriptado na UE, e tu
              decides o que partilhar e podes apagar tudo a qualquer momento.
            </Text>
          </Card>
          <Button
            title="Autorizo o processamento dos meus dados de saúde"
            onPress={() => {
              setConsentGiven(true);
              setShowConsent(false);
            }}
          />
          <TouchableOpacity
            onPress={() => setShowConsent(false)}
            className="mt-3"
          >
            <Text className="text-center text-sm text-gray-400">
              Cancelar
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Extracting overlay
  if (extracting) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center px-6">
          <ActivityIndicator size="large" color="#8CB369" />
          <Text className="text-base font-semibold text-gray-700 mt-4">
            A extrair valores...
          </Text>
          <Text className="text-sm text-gray-500 mt-2 text-center">
            Estamos a analisar o teu exame. Pode demorar alguns segundos.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Camera mode
  if (mode === 'camera') {
    return (
      <View className="flex-1 bg-black">
        <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back">
          <SafeAreaView className="flex-1">
            <View className="flex-row justify-between items-center px-4 pt-2">
              <TouchableOpacity
                onPress={() => setMode('choose')}
                className="bg-black/50 rounded-full p-2"
              >
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
              <Text className="text-white text-sm font-medium">
                Enquadra o exame
              </Text>
              <View style={{ width: 40 }} />
            </View>
            <View className="flex-1" />
            <View className="items-center pb-8">
              <TouchableOpacity
                onPress={handleTakePhoto}
                className="w-20 h-20 rounded-full border-4 border-white items-center justify-center"
              >
                <View className="w-16 h-16 rounded-full bg-white" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </CameraView>
      </View>
    );
  }

  // Manual mode
  if (mode === 'manual') {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="px-6 pt-6">
            <View className="flex-row items-center mb-6">
              <TouchableOpacity onPress={() => setMode('choose')}>
                <Ionicons name="arrow-back" size={24} color="#111827" />
              </TouchableOpacity>
              <Text className="text-2xl font-bold text-gray-900 ml-3">
                Input manual
              </Text>
            </View>

            <DatePicker
              label="Data do exame"
              value={examDate}
              onChange={setExamDate}
              maximumDate={new Date()}
              minimumDate={new Date(2000, 0, 1)}
            />
            <Input
              label="Laboratório (opcional)"
              value={labName}
              onChangeText={setLabName}
              placeholder="Nome do laboratório"
              autoComplete="off"
              textContentType="none"
            />

            <Text className="text-base font-semibold text-gray-900 mt-4 mb-3">
              Biomarcadores
            </Text>

            {markers.map((marker, index) => (
              <Card key={index} className="mb-3">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-sm font-semibold text-gray-900">
                    Biomarcador {index + 1}
                  </Text>
                  {markers.length > 1 && (
                    <TouchableOpacity
                      onPress={() => removeManualMarker(index)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons
                        name="close-circle"
                        size={20}
                        color="#9CA3AF"
                      />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Template selector */}
                <Text className="text-xs text-gray-500 mb-1.5">
                  Seleciona ou escreve o nome
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mb-2"
                >
                  {COMMON_BIOMARKERS.map((tmpl, ti) => (
                    <TouchableOpacity
                      key={ti}
                      onPress={() => selectTemplate(index, ti)}
                      className={`px-2.5 py-1.5 rounded-lg mr-1.5 border ${
                        marker.templateIndex === ti
                          ? 'bg-[#8CB369] border-[#8CB369]'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <Text
                        className={`text-xs ${
                          marker.templateIndex === ti
                            ? 'text-white font-medium'
                            : 'text-gray-600'
                        }`}
                      >
                        {tmpl.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {marker.templateIndex === null && (
                  <Input
                    label="Nome do biomarcador"
                    value={marker.customName}
                    onChangeText={(text) =>
                      updateMarker(index, 'customName', text)
                    }
                    placeholder="Ex: Colesterol LDL"
                  />
                )}

                <View className="flex-row">
                  <View className="flex-1 mr-2">
                    <Input
                      label="Valor"
                      value={marker.value}
                      onChangeText={(text) =>
                        updateMarker(index, 'value', text)
                      }
                      placeholder="0"
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View className="w-24">
                    <Input
                      label="Unidade"
                      value={marker.unit}
                      onChangeText={(text) =>
                        updateMarker(index, 'unit', text)
                      }
                      placeholder="mg/dL"
                    />
                  </View>
                </View>

                <View className="flex-row">
                  <View className="flex-1 mr-2">
                    <Input
                      label="Ref. mín (opcional)"
                      value={marker.ref_min}
                      onChangeText={(text) =>
                        updateMarker(index, 'ref_min', text)
                      }
                      placeholder="0"
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View className="flex-1">
                    <Input
                      label="Ref. máx (opcional)"
                      value={marker.ref_max}
                      onChangeText={(text) =>
                        updateMarker(index, 'ref_max', text)
                      }
                      placeholder="0"
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
              </Card>
            ))}

            <TouchableOpacity
              onPress={addManualMarker}
              className="flex-row items-center justify-center py-3 mb-4 border border-dashed border-gray-300 rounded-xl"
            >
              <Ionicons name="add-circle-outline" size={20} color="#8CB369" />
              <Text className="text-sm font-medium text-[#8CB369] ml-2">
                Adicionar biomarcador
              </Text>
            </TouchableOpacity>

            <Button
              title="Guardar exame"
              onPress={handleSaveManual}
              loading={savingManual}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Choose mode (default)
  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="px-6 pt-6">
          <Text className="text-2xl font-bold text-gray-900">
            Adicionar exame
          </Text>
          <Text className="mt-2 text-base text-gray-500 mb-6">
            Fotografa, importa ou introduz manualmente
          </Text>

          {extractionError ? (
            <View className="bg-red-50 rounded-xl p-3 mb-4">
              <Text className="text-red-600 text-sm text-center">
                {extractionError}
              </Text>
            </View>
          ) : null}

          {/* Camera option */}
          <TouchableOpacity
            onPress={handleCamera}
            className="bg-gray-50 border border-gray-200 rounded-2xl p-5 mb-3"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <View className="w-12 h-12 rounded-full bg-[#8CB369]/10 items-center justify-center">
                <Ionicons name="camera-outline" size={24} color="#8CB369" />
              </View>
              <View className="flex-1 ml-4">
                <Text className="text-base font-semibold text-gray-900">
                  Fotografar exame
                </Text>
                <Text className="text-sm text-gray-500 mt-0.5">
                  Tira uma foto ao teu exame em papel
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </View>
          </TouchableOpacity>

          {/* Document/file option */}
          <TouchableOpacity
            onPress={handleDocument}
            className="bg-gray-50 border border-gray-200 rounded-2xl p-5 mb-3"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <View className="w-12 h-12 rounded-full bg-[#8CB369]/10 items-center justify-center">
                <Ionicons name="document-outline" size={24} color="#8CB369" />
              </View>
              <View className="flex-1 ml-4">
                <Text className="text-base font-semibold text-gray-900">
                  Importar ficheiro
                </Text>
                <Text className="text-sm text-gray-500 mt-0.5">
                  Seleciona uma foto ou PDF do exame
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </View>
          </TouchableOpacity>

          {/* Manual option */}
          <TouchableOpacity
            onPress={handleManual}
            className="bg-gray-50 border border-gray-200 rounded-2xl p-5 mb-3"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <View className="w-12 h-12 rounded-full bg-[#8CB369]/10 items-center justify-center">
                <Ionicons name="create-outline" size={24} color="#8CB369" />
              </View>
              <View className="flex-1 ml-4">
                <Text className="text-base font-semibold text-gray-900">
                  Introduzir manualmente
                </Text>
                <Text className="text-sm text-gray-500 mt-0.5">
                  Insere os valores do exame um a um
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </View>
          </TouchableOpacity>

          {/* Info note */}
          <View className="bg-blue-50 rounded-xl p-3 mt-4 border border-blue-100">
            <View className="flex-row items-start">
              <Ionicons
                name="information-circle"
                size={16}
                color="#3B82F6"
                style={{ marginTop: 1 }}
              />
              <Text className="text-xs text-blue-700 ml-2 flex-1 leading-4">
                Ao fotografar ou importar, os valores são extraídos
                automaticamente. Poderás sempre confirmar e editar antes de
                guardar.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
