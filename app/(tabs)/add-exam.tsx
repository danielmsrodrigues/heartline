import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as DocumentPicker from 'expo-document-picker';
import { File as ExpoFile } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useBiomarkers } from '@/hooks/useBiomarkers';
import { extractExamFromImage } from '@/lib/ai';
import { haptics } from '@/lib/haptics';
import { PendingExam } from '@/lib/types';
import { ON_VIVID, useTheme } from '@/constants/theme';
import { ExtractionScreen } from '@/components/exam/extraction-screen';
import { ScanIllustration } from '@/components/exam/scan-illustration';
import { Mascot } from '@/components/mascot';
import { Button } from '@/components/ui/Button';
import { IconBubble } from '@/components/ui/Chip';
import { Glass, PressableScale } from '@/components/ui/Glass';
import { Icon, IconName } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Sheet } from '@/components/ui/Sheet';
import { Body, Sub, Title } from '@/components/ui/Text';

type Mode = 'choose' | 'camera' | 'failed';

const consentKey = (userId: string) => `health_consent_${userId}`;

function SmallOption({ icon, title, onPress }: { icon: IconName; title: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Glass radius={28} onPress={onPress} accessibilityLabel={title} style={{ flex: 1 }} contentStyle={{ height: 128, padding: 16, justifyContent: 'space-between' }}>
      <IconBubble icon={icon} size={48} />
      <Text style={{ fontSize: 17, lineHeight: 22, fontWeight: '600', color: t.ink }}>{title}</Text>
    </Glass>
  );
}

function Tip({ icon, label }: { icon: IconName; label: string }) {
  const t = useTheme();
  return (
    <Glass radius={24} style={{ flex: 1 }} contentStyle={{ height: 112, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
      <IconBubble icon={icon} size={44} />
      <Text style={{ fontSize: 13, lineHeight: 18, fontWeight: '600', color: t.ink }}>{label}</Text>
    </Glass>
  );
}

export default function AddExamScreen() {
  const t = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { profile, updateProfile } = useProfile();
  const { exams } = useBiomarkers();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [mode, setMode] = useState<Mode>('choose');
  const [extracting, setExtracting] = useState(false);
  // Cada extração tem o seu número: cancelar a A e começar a B não deixa o
  // resultado tardio da A abrir o ecrã de confirmação.
  const extractionRun = useRef(0);
  const extractionInFlight = useRef(false);

  // Ao voltar de confirm-values este ecrã ainda está montado: sair do modo de extração.
  useFocusEffect(
    useCallback(() => {
      if (!extractionInFlight.current) setExtracting(false);
    }, [])
  );

  // Consentimento RGPD antes do primeiro exame. Quem já tem exames deu-o antes
  // de este ficar registado no perfil.
  const [storedConsent, setStoredConsent] = useState<boolean | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [showConsentInfo, setShowConsentInfo] = useState(false);
  useEffect(() => {
    if (!user) return;
    AsyncStorage.getItem(consentKey(user.id)).then((value) => setStoredConsent(value != null));
  }, [user]);
  const alreadyConsented = !!profile?.health_consent_at || exams.length > 0 || storedConsent === true;
  // A caixa só aparece a quem ainda não consentiu, e fica visível (marcada) até sair do ecrã.
  const [askConsent, setAskConsent] = useState(false);
  useEffect(() => {
    if (storedConsent !== null && !alreadyConsented) setAskConsent(true);
  }, [storedConsent, alreadyConsented]);
  const hasConsent = alreadyConsented || accepted;

  const nudge = useSharedValue(0);
  const nudgeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: nudge.value }] }));

  const acceptConsent = async () => {
    if (!user || accepted) return;
    haptics.select();
    setAccepted(true);
    const consentedAt = new Date().toISOString();
    // A cópia local garante que não voltamos a perguntar se a rede falhar.
    await AsyncStorage.setItem(consentKey(user.id), consentedAt);
    const error = await updateProfile({ health_consent_at: consentedAt });
    if (error) console.warn('Não foi possível registar o consentimento:', error.message);
  };

  /** Só avança com consentimento; sem ele, chama a atenção para a caixa. */
  const withConsent = (action: () => void) => {
    if (hasConsent) {
      action();
      return;
    }
    haptics.warning();
    nudge.value = withSequence(
      withTiming(-8, { duration: 60 }),
      withTiming(8, { duration: 90 }),
      withTiming(-5, { duration: 80 }),
      withTiming(0, { duration: 70 })
    );
  };

  const cancelExtraction = () => {
    extractionRun.current += 1;
    extractionInFlight.current = false;
    setExtracting(false);
    setMode('choose');
  };

  const processFile = async (uri: string, mimeType: string = 'image/jpeg') => {
    const run = ++extractionRun.current;
    const cancelled = () => extractionRun.current !== run;
    extractionInFlight.current = true;
    setExtracting(true);

    try {
      let base64: string;
      let fileUri = uri;
      let fileMimeType = mimeType;

      if (mimeType === 'application/pdf') {
        base64 = await new ExpoFile(uri).base64();
      } else {
        const manipulated = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 1500 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );
        base64 = manipulated.base64 ?? '';
        fileUri = manipulated.uri;
        fileMimeType = 'image/jpeg';
      }
      if (cancelled()) return;

      const result = await extractExamFromImage(base64, fileMimeType);
      if (cancelled()) return;

      if (!result?.markers || result.markers.length === 0) {
        throw new Error('Não encontrei valores neste exame.');
      }

      // Guardar antes de mexer no estado: confirm-values lê daqui.
      const pending: PendingExam = { ...result, fileUri, fileMimeType };
      await AsyncStorage.setItem('pending_exam_data', JSON.stringify(pending));
      haptics.success();
      // Navegar primeiro — sem setExtracting(false), ou as opções piscam por baixo da transição.
      router.push('/confirm-values');
    } catch (err: any) {
      if (cancelled()) return;
      console.warn('Extraction error:', err?.message ?? err);
      haptics.warning();
      setExtracting(false);
      setMode('failed');
    } finally {
      if (!cancelled()) extractionInFlight.current = false;
    }
  };

  const handleCamera = () => withConsent(async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert('Permissão necessária', 'Para fotografar exames, a app precisa de acesso à câmara.');
        return;
      }
    }
    setMode('camera');
  });

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) await processFile(result.assets[0].uri, 'image/jpeg');
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], copyToCacheDirectory: true });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const isPdf = asset.mimeType === 'application/pdf' || asset.uri.toLowerCase().endsWith('.pdf');
      await processFile(asset.uri, isPdf ? 'application/pdf' : 'image/jpeg');
    }
  };

  const handleImport = () => withConsent(() => {
    Alert.alert('Importar exame', undefined, [
      { text: 'Das fotografias', onPress: pickPhoto },
      { text: 'Dos ficheiros (PDF)', onPress: pickDocument },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  });

  // À mão usa o mesmo ecrã de confirmação, a começar sem valores.
  const handleManual = () => withConsent(async () => {
    const pending: PendingExam = { lab_name: null, exam_date: null, markers: [], manual: true };
    await AsyncStorage.setItem('pending_exam_data', JSON.stringify(pending));
    router.push('/confirm-values');
  });

  const handleTakePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo) {
        haptics.press();
        setMode('choose');
        await processFile(photo.uri, 'image/jpeg');
      }
    } catch (err) {
      console.error('Photo error:', err);
      Alert.alert('Erro', 'Não foi possível tirar a fotografia. Tenta novamente.');
    }
  };

  if (extracting) return <ExtractionScreen onCancel={cancelExtraction} />;

  if (mode === 'camera') {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back">
          <SafeAreaView style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8 }}>
              <PressableScale onPress={() => setMode('choose')} accessibilityLabel="Fechar câmara" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="close" size={18} color="#FFF" weight="bold" />
              </PressableScale>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#FFF' }}>Enquadra a folha inteira</Text>
              <View style={{ width: 44 }} />
            </View>
            <View style={{ flex: 1 }} />
            <View style={{ alignItems: 'center', paddingBottom: 96 }}>
              <PressableScale onPress={handleTakePhoto} accessibilityLabel="Tirar fotografia" pressedScale={0.92} style={{ width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#FFF', alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFF' }} />
              </PressableScale>
            </View>
          </SafeAreaView>
        </CameraView>
      </View>
    );
  }

  if (mode === 'failed') {
    return (
      <Screen inTabs tone="watch" scroll={false} contentStyle={{ justifyContent: 'center', paddingBottom: 110 }}>
        <View style={{ alignItems: 'center' }}>
          <Mascot size={168} reading interactive />
        </View>
        <Title style={{ marginTop: 24, textAlign: 'center' }}>Não consegui ler este exame</Title>
        <Sub style={{ marginTop: 8, textAlign: 'center', fontSize: 16, lineHeight: 23 }}>Tenta outra fotografia:</Sub>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <Tip icon="sun" label="Boa luz" />
          <Tip icon="frame" label="Folha inteira" />
          <Tip icon="doc" label="Uma página" />
        </View>
        <Button title="Tentar de novo" icon="retry" onPress={() => setMode('choose')} style={{ marginTop: 28 }} />
        <Button variant="text" title="Inserir à mão" onPress={() => { setMode('choose'); handleManual(); }} style={{ marginTop: 6 }} />
      </Screen>
    );
  }

  return (
    <Screen inTabs top={12}>
      <Title large>Adicionar exame</Title>

      <Glass tone="none" radius={32} onPress={handleCamera} accessibilityLabel="Fotografar. O mais rápido" style={{ marginTop: 20 }} contentStyle={{ height: 196, paddingLeft: 22, paddingRight: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ fontSize: 26, lineHeight: 32, fontWeight: '700', letterSpacing: -0.5, color: ON_VIVID }}>Fotografar</Text>
          <Text style={{ marginTop: 4, fontSize: 15, lineHeight: 20, color: ON_VIVID, opacity: 0.74 }}>O mais rápido</Text>
          <View style={{ marginTop: 14, width: 44, height: 44, borderRadius: 22, backgroundColor: t.pill, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="camera" size={20} color={t.pillFg} />
          </View>
        </View>
        <ScanIllustration size={150} frameColor={ON_VIVID} />
      </Glass>

      <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
        <SmallOption icon="doc" title="Importar" onPress={handleImport} />
        <SmallOption icon="pencil" title="Inserir à mão" onPress={handleManual} />
      </View>

      {askConsent && (
        <Animated.View style={[{ marginTop: 22, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', gap: 12 }, nudgeStyle]}>
          <PressableScale
            onPress={acceptConsent}
            hitSlop={12}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: accepted }}
            accessibilityLabel="Aceito o tratamento dos meus dados de saúde"
            style={{ width: 28, height: 28, borderRadius: 9, borderWidth: 2, borderColor: accepted ? t.primaryBg : t.sub, backgroundColor: accepted ? t.primaryBg : 'transparent', alignItems: 'center', justifyContent: 'center' }}
          >
            {accepted ? <Icon name="check" size={14} color={t.primaryFg} weight="bold" /> : null}
          </PressableScale>
          <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: t.sub }}>
            Aceito o tratamento dos meus dados de saúde.{' '}
            <Text accessibilityRole="link" onPress={() => setShowConsentInfo(true)} style={{ color: t.link, fontWeight: '600' }}>Saber mais</Text>
          </Text>
        </Animated.View>
      )}

      <Sheet visible={showConsentInfo} onClose={() => setShowConsentInfo(false)} title="Os teus dados de saúde">
        <Body style={{ marginTop: 10 }}>
          Para ler os teus exames, o Heartline trata dados de saúde. Os valores são extraídos com IA e ficam guardados, encriptados, na União Europeia.
        </Body>
        <Body style={{ marginTop: 10 }}>
          Nunca os vendemos nem partilhamos. Podes apagar tudo quando quiseres, no Perfil.
        </Body>
        <Button title="Percebi" onPress={() => setShowConsentInfo(false)} style={{ marginTop: 20 }} />
      </Sheet>
    </Screen>
  );
}
