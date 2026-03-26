import { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
  Linking,
  Animated,
  Easing,
  PanResponder,
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
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  const pendingAction = useRef<(() => void) | null>(null);

  const checkAndRequestConsent = async (callback: () => void) => {
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
      pendingAction.current = callback;
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
        console.log('PDF base64 length:', base64.length);
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

      // Store data in AsyncStorage and navigate
      await AsyncStorage.setItem(
        'pending_exam_data',
        JSON.stringify({
          ...result,
          imageUri: mimeType !== 'application/pdf' ? uri : undefined,
        })
      );
      router.push('/confirm-values' as any);
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

  // GDPR Consent bottom sheet — draggable, clamped at top, dismiss on drag down
  const sheetY = useRef(new Animated.Value(400)).current;
  const dragOffset = useRef(0);

  useEffect(() => {
    if (showConsent && !consentGiven) {
      sheetY.setValue(400);
      Animated.spring(sheetY, { toValue: 0, speed: 14, bounciness: 4, useNativeDriver: true }).start();
    }
  }, [showConsent, consentGiven]);

  const dismissConsent = () => {
    Animated.timing(sheetY, { toValue: 400, duration: 250, easing: Easing.in(Easing.ease), useNativeDriver: true }).start(() => {
      setShowConsent(false);
      pendingAction.current = null;
    });
  };

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
    onPanResponderGrant: () => {
      sheetY.stopAnimation((v) => { dragOffset.current = v; });
    },
    onPanResponderMove: (_, g) => {
      // Clamp: can't go above 0 (original position), free to go down
      const newY = Math.max(0, dragOffset.current + g.dy);
      sheetY.setValue(newY);
    },
    onPanResponderRelease: (_, g) => {
      if (g.dy > 80 || g.vy > 0.5) {
        // Dragged far enough or fast enough → dismiss
        dismissConsent();
      } else {
        // Snap back
        Animated.spring(sheetY, { toValue: 0, speed: 20, bounciness: 6, useNativeDriver: true }).start();
      }
    },
  }), []);

  const deferredAction = useRef<(() => void) | null>(null);

  const handleConsent = () => {
    deferredAction.current = pendingAction.current;
    pendingAction.current = null;
    setConsentGiven(true);
    setShowConsent(false);
  };

  const consentSheet = (
    <Modal
      visible={showConsent && !consentGiven}
      transparent
      animationType="fade"
      onRequestClose={dismissConsent}
      onDismiss={() => {
        if (deferredAction.current) {
          const action = deferredAction.current;
          deferredAction.current = null;
          action();
        }
      }}
    >
      <View style={{ flex: 1 }}>
        {/* Backdrop — tap to dismiss */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={dismissConsent}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
        />
        {/* Sheet */}
        <Animated.View
          style={{
            backgroundColor: '#111111',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 24,
            paddingBottom: 40,
            transform: [{ translateY: sheetY }],
          }}
        >
          {/* Drag handle */}
          <View {...panResponder.panHandlers} style={{ paddingVertical: 10, marginTop: -10, marginBottom: 10 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#333333', alignSelf: 'center' }} />
          </View>
          <Ionicons name="shield-checkmark-outline" size={24} color="#1D9E75" style={{ alignSelf: 'center', marginBottom: 12 }} />
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF', textAlign: 'center', marginBottom: 12 }}>
            Antes de começar
          </Text>
          <Text style={{ fontSize: 14, color: '#888888', textAlign: 'center', lineHeight: 21, marginBottom: 24 }}>
            Para analisar os teus exames, processamos dados de saúde com IA. Tudo é encriptado na UE e podes apagar a qualquer momento.
          </Text>
          <TouchableOpacity
            onPress={handleConsent}
            activeOpacity={0.8}
            style={{ backgroundColor: '#1D9E75', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 12 }}
          >
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>Autorizo e continuar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => Linking.openURL('https://heartline.app/privacy')}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 12, color: '#555555', textAlign: 'center' }}>
              Saber mais sobre privacidade
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );

  // Extracting overlay
  if (extracting) {
    return (
      <SafeAreaView className="flex-1 bg-[#0A0A0A]">
        <View className="flex-1 items-center justify-center px-6">
          <ActivityIndicator size="large" color="#1D9E75" />
          <Text className="text-base font-semibold text-[#F5F5F5] mt-4">
            A extrair valores...
          </Text>
          <Text className="text-sm text-[#555555] mt-2 text-center">
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
      <SafeAreaView className="flex-1 bg-[#0A0A0A]">
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="px-6 pt-6">
            <View className="flex-row items-center mb-6">
              <TouchableOpacity onPress={() => setMode('choose')}>
                <Ionicons name="arrow-back" size={24} color="#F5F5F5" />
              </TouchableOpacity>
              <Text className="text-2xl font-bold text-[#F5F5F5] ml-3">
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

            <Text className="text-base font-semibold text-[#F5F5F5] mt-4 mb-3">
              Biomarcadores
            </Text>

            {markers.map((marker, index) => (
              <Card key={index} className="mb-3">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-sm font-semibold text-[#F5F5F5]">
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
                        color="#555555"
                      />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Template selector */}
                <Text className="text-xs text-[#555555] mb-1.5">
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
                          ? 'bg-[#1D9E75] border-[#1D9E75]'
                          : 'bg-[#0A0A0A] border-[#151515]'
                      }`}
                    >
                      <Text
                        className={`text-xs ${
                          marker.templateIndex === ti
                            ? 'text-white font-medium'
                            : 'text-[#888888]'
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
              className="flex-row items-center justify-center py-3 mb-4 border border-dashed border-[#151515] rounded-xl"
            >
              <Ionicons name="add-circle-outline" size={20} color="#1D9E75" />
              <Text className="text-sm font-medium text-[#1D9E75] ml-2">
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
    <View className="flex-1 bg-[#0A0A0A]">
      {consentSheet}
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="px-6 pt-2">

          {extractionError ? (
            <View className="bg-[#E24B4A]/15 rounded-xl p-3 mb-4">
              <Text className="text-[#E24B4A] text-sm text-center">
                {extractionError}
              </Text>
            </View>
          ) : null}

          {/* Camera option */}
          <TouchableOpacity
            onPress={handleCamera}
            className="bg-[#111111] border border-[#151515] rounded-2xl p-5 mb-3"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <View className="w-12 h-12 rounded-xl bg-[#1D9E75]/15 items-center justify-center">
                <Ionicons name="camera-outline" size={24} color="#1D9E75" />
              </View>
              <View className="flex-1 ml-4">
                <Text className="text-base font-semibold text-[#F5F5F5]">
                  Fotografar exame
                </Text>
                <Text className="text-sm text-[#555555] mt-0.5">
                  Tira uma foto do seu exame e nós extraímos os dados
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Gallery option */}
          <TouchableOpacity
            onPress={handleGallery}
            className="bg-[#111111] border border-[#151515] rounded-2xl p-5 mb-3"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <View className="w-12 h-12 rounded-xl bg-[#1D9E75]/15 items-center justify-center">
                <Ionicons name="images-outline" size={24} color="#1D9E75" />
              </View>
              <View className="flex-1 ml-4">
                <Text className="text-base font-semibold text-[#F5F5F5]">
                  Escolher da galeria
                </Text>
                <Text className="text-sm text-[#555555] mt-0.5">
                  Foto de um exame já guardada
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* File/PDF option */}
          <TouchableOpacity
            onPress={handleDocument}
            className="bg-[#111111] border border-[#151515] rounded-2xl p-5 mb-3"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <View className="w-12 h-12 rounded-xl bg-[#1D9E75]/15 items-center justify-center">
                <Ionicons name="document-outline" size={24} color="#1D9E75" />
              </View>
              <View className="flex-1 ml-4">
                <Text className="text-base font-semibold text-[#F5F5F5]">
                  Importar ficheiro
                </Text>
                <Text className="text-sm text-[#555555] mt-0.5">
                  PDF ou imagem dos Ficheiros
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Manual option */}
          <TouchableOpacity
            onPress={handleManual}
            className="bg-[#111111] border border-[#151515] rounded-2xl p-5 mb-3"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <View className="w-12 h-12 rounded-xl bg-[#1D9E75]/15 items-center justify-center">
                <Ionicons name="create-outline" size={24} color="#1D9E75" />
              </View>
              <View className="flex-1 ml-4">
                <Text className="text-base font-semibold text-[#F5F5F5]">
                  Inserir manualmente
                </Text>
                <Text className="text-sm text-[#555555] mt-0.5">
                  Digite os valores dos biomarcadores
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Bottom text — simple, no bg */}
          <Text className="text-sm text-[#555555] text-center mt-8 px-4 leading-5">
            Os seus dados são processados de forma segura e nunca são partilhados com terceiros.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
