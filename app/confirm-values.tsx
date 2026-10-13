import { useState, useEffect } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { File as ExpoFile } from 'expo-file-system';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { invalidateHealthData } from '@/hooks/useBiomarkers';
import { useGeneratedContent } from '@/hooks/useGeneratedContent';
import { ExtractedMarker, PendingExam } from '@/lib/types';
import { canonicalBiomarkerKey } from '@/lib/scoring';
import { parseDecimal } from '@/lib/number';
import { parseDateOnly, toDateOnly } from '@/lib/dates';
import { haptics } from '@/lib/haptics';
import { COMMON_BIOMARKERS } from '@/constants/biomarkers';
import { useTheme } from '@/constants/theme';
import { ConfirmValuesList, EditableMarker } from '@/components/confirm-values-list';
import { Button } from '@/components/ui/Button';
import { Chip, ChipRow } from '@/components/ui/Chip';
import { DatePicker } from '@/components/ui/DatePicker';
import { Glass } from '@/components/ui/Glass';
import { Input } from '@/components/ui/Input';
import { Status } from '@/components/ui/List';
import { Screen } from '@/components/ui/Screen';
import { Sheet } from '@/components/ui/Sheet';
import { Note, Sub } from '@/components/ui/Text';
import { TopBar } from '@/components/ui/TopBar';

const shortDate = (d: Date) => d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' });

const EXAMS_BUCKET = 'exams';

async function uploadOriginal(userId: string, examId: string, fileUri: string, mimeType: string) {
  const extension = mimeType === 'application/pdf' ? 'pdf' : 'jpg';
  const path = `${userId}/${examId}.${extension}`;
  // Ler os bytes do disco: fetch(uri).blob() chega vazio ao Storage em React Native.
  const bytes = await new ExpoFile(fileUri).bytes();
  const { error } = await supabase.storage
    .from(EXAMS_BUCKET)
    .upload(path, bytes, { contentType: mimeType, upsert: true });
  if (error) throw error;
  return path;
}

export default function ConfirmValuesScreen() {
  const t = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { regenerate } = useGeneratedContent();

  const [labName, setLabName] = useState('');
  const [examDate, setExamDate] = useState<Date | null>(null);
  const [markers, setMarkers] = useState<EditableMarker[]>([]);
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [fileMimeType, setFileMimeType] = useState<string | null>(null);
  const [editExamId, setEditExamId] = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showLab, setShowLab] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  // Chave seguinte para valores acrescentados à mão.
  const [nextKey, setNextKey] = useState(1000);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('pending_exam_data');
        if (!raw) {
          Alert.alert('Erro', 'Dados não encontrados. Tenta novamente.');
          router.back();
          return;
        }
        await AsyncStorage.removeItem('pending_exam_data');
        const parsed: PendingExam = JSON.parse(raw);
        setLabName(parsed.lab_name ?? '');
        setExamDate(parseDateOnly(parsed.exam_date));
        setMarkers(
          (parsed.markers ?? []).map((m, i) => ({
            ...m,
            name: m.name ?? '',
            unit: m.unit ?? '',
            value: parseDecimal(m.value) ?? NaN,
            ref_min: parseDecimal(m.ref_min),
            ref_max: parseDecimal(m.ref_max),
            key: String(i),
          }))
        );
        setFileUri(parsed.fileUri ?? null);
        setFileMimeType(parsed.fileMimeType ?? null);
        setEditExamId(parsed.editExamId ?? null);
        setManual(!!parsed.manual);
        // À mão começa-se por escolher o primeiro valor.
        if (parsed.manual) setShowAdd(true);
      } catch (err) {
        console.error('Error loading exam data:', err);
        Alert.alert('Erro', 'Dados inválidos. Tenta novamente.');
        router.back();
      }
    })();
    // Só à entrada: os dados pendentes são consumidos (e apagados) uma única vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdateMarker = (
    key: string,
    field: keyof ExtractedMarker,
    value: string | number | null
  ) => {
    setMarkers((prev) => prev.map((m) => (m.key === key ? { ...m, [field]: value } : m)));
  };

  const handleRemoveMarker = (key: string) => {
    setMarkers((prev) => prev.filter((m) => m.key !== key));
  };

  const handleAddMarker = (template?: (typeof COMMON_BIOMARKERS)[number]) => {
    haptics.select();
    setMarkers((prev) => [
      ...prev,
      {
        name: template?.name ?? '',
        name_normalized: template?.name_normalized ?? '',
        unit: template?.unit ?? '',
        ref_min: template?.ref_min ?? null,
        ref_max: template?.ref_max ?? null,
        value: NaN,
        confidence: null,
        key: String(nextKey),
      },
    ]);
    setNextKey((k) => k + 1);
    setShowAdd(false);
  };
  /** Substitui os valores de um exame sem nunca o deixar vazio a meio. */
  const replaceBiomarkers = async (examId: string, rows: Record<string, unknown>[]) => {
    const { data: previous, error: previousError } = await supabase
      .from('biomarkers')
      .select('id')
      .eq('exam_id', examId);
    if (previousError) throw previousError;

    const { data: inserted, error: insertError } = await supabase
      .from('biomarkers')
      .insert(rows)
      .select('id');
    if (insertError) throw insertError;

    const previousIds = (previous ?? []).map((b) => b.id);
    if (previousIds.length === 0) return;

    const { error: deleteError } = await supabase.from('biomarkers').delete().in('id', previousIds);
    if (deleteError) {
      // Sem isto ficavam os valores antigos e os novos lado a lado.
      await supabase.from('biomarkers').delete().in('id', (inserted ?? []).map((b) => b.id));
      throw deleteError;
    }
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

    const unnamed = markers.some((m) => !m.name.trim());
    if (unnamed) {
      Alert.alert('Nome em falta', 'Há um valor sem nome. Preenche-o ou remove-o.');
      return;
    }

    const invalid = markers.find((m) => !Number.isFinite(m.value));
    if (invalid) {
      Alert.alert('Valor inválido', `Verifica o valor de "${invalid.name}".`);
      return;
    }

    setSaving(true);

    try {
      const examFields = {
        lab_name: labName.trim() || null,
        exam_date: toDateOnly(examDate),
      };
      const toRow = (m: EditableMarker, examId: string) => ({
        exam_id: examId,
        profile_id: user.id,
        name: m.name.trim(),
        name_normalized: canonicalBiomarkerKey(m.name_normalized, m.name),
        value: m.value,
        unit: m.unit.trim(),
        ref_min: m.ref_min,
        ref_max: m.ref_max,
        ai_confidence: m.confidence ?? null,
        user_confirmed: true,
      });

      if (editExamId) {
        const { error: examError } = await supabase
          .from('exams')
          .update(examFields)
          .eq('id', editExamId);
        if (examError) throw examError;

        await replaceBiomarkers(editExamId, markers.map((m) => toRow(m, editExamId)));
      } else {
        const { data: examData, error: examError } = await supabase
          .from('exams')
          .insert({
            ...examFields,
            profile_id: user.id,
            extraction_method: manual ? 'manual' : 'ai_extracted',
          })
          .select()
          .single();

        if (examError || !examData) throw examError;

        const { error: markersError } = await supabase
          .from('biomarkers')
          .insert(markers.map((m) => toRow(m, examData.id)));

        if (markersError) {
          // Sem valores o exame ficaria vazio na lista.
          await supabase.from('exams').delete().eq('id', examData.id);
          throw markersError;
        }

        if (fileUri && fileMimeType) {
          try {
            const filePath = await uploadOriginal(user.id, examData.id, fileUri, fileMimeType);
            await supabase
              .from('exams')
              .update({ original_file_path: filePath })
              .eq('id', examData.id);
          } catch (uploadErr) {
            console.warn('Original upload failed, continuing:', uploadErr);
          }
        }
      }

      await invalidateHealthData(user.id);
      regenerate().catch((err) =>
        console.warn('Content regeneration failed:', err)
      );
      haptics.success();

      router.replace('/(tabs)');
    } catch (err) {
      console.error('Save error:', err);
      haptics.warning();
      Alert.alert(
        'Erro ao guardar',
        'Não foi possível guardar o exame. Tenta novamente.'
      );
    } finally {
      setSaving(false);
    }
  };

  const lowConfidenceCount = markers.filter(
    (m) => m.confidence === 'low' || m.confidence === 'medium'
  ).length;
  const isPdf = fileMimeType === 'application/pdf';
  const count = markers.length;
  const used = new Set(markers.map((m) => canonicalBiomarkerKey(m.name_normalized, m.name)));
  const available = COMMON_BIOMARKERS.filter((b) => !used.has(b.name_normalized));

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <Screen footer={<Button title="Guardar exame" onPress={handleConfirm} loading={saving} />}>
        <TopBar title={editExamId ? 'Editar exame' : 'Confirmar valores'} />

        <View style={{ marginTop: 22 }}>
          <Text accessibilityRole="header" style={{ fontSize: 30, lineHeight: 34, fontWeight: '600', letterSpacing: -0.6, color: t.ink }}>
            {count === 1 ? '1 valor' : `${count} valores`}
          </Text>
          <Sub style={{ marginTop: 2 }}>{manual ? 'Escreve os valores do papel' : editExamId ? 'Corrige o que for preciso' : 'Confirma com o papel'}</Sub>
          {lowConfidenceCount > 0 ? (
            <View style={{ marginTop: 8 }}>
              <Status tone="watch" label={lowConfidenceCount === 1 ? '1 valor a rever' : `${lowConfidenceCount} valores a rever`} />
            </View>
          ) : null}
        </View>

        {/* Data e laboratório — a IA nem sempre os encontra */}
        <ChipRow style={{ marginTop: 16 }}>
          <DatePicker
            label="Data do exame"
            value={examDate}
            onChange={setExamDate}
            maximumDate={new Date()}
            minimumDate={new Date(2000, 0, 1)}
            renderTrigger={(open) => <Chip icon="calendar" label={examDate ? shortDate(examDate) : 'Data do exame'} selected={!examDate} onPress={open} />}
          />
          <Chip icon="lab" label={labName.trim() || 'Laboratório'} onPress={() => setShowLab(true)} />
          {fileUri ? <Chip icon="doc" label="Ver original" onPress={() => setShowOriginal(true)} /> : null}
        </ChipRow>

        <View style={{ marginTop: 18 }}>
          <ConfirmValuesList markers={markers} onUpdate={handleUpdateMarker} onRemove={handleRemoveMarker} />
        </View>
        <View style={{ alignItems: 'flex-start', marginTop: 6 }}>
          <Button variant="text" icon="plus" title="Adicionar valor" onPress={() => setShowAdd(true)} style={{ paddingHorizontal: 4 }} />
        </View>

        {!editExamId && !manual ? (
          <Note style={{ marginTop: 8, textAlign: 'left', marginHorizontal: 4 }}>Os valores foram lidos automaticamente e podem ter erros. Compara-os com o documento original.</Note>
        ) : null}
      </Screen>

      <Sheet visible={showAdd} onClose={() => setShowAdd(false)} title="Que valor queres adicionar?">
        <ChipRow style={{ marginTop: 14 }}>
          {available.map((b) => <Chip key={b.name_normalized} label={b.name} onPress={() => handleAddMarker(b)} />)}
          <Chip icon="plus" label="Outro" onPress={() => handleAddMarker()} />
        </ChipRow>
      </Sheet>

      <Sheet visible={showLab} onClose={() => setShowLab(false)} title="Laboratório">
        <Input label="Nome (opcional)" value={labName} onChangeText={setLabName} placeholder="Onde fizeste o exame" autoFocus returnKeyType="done" onSubmitEditing={() => setShowLab(false)} />
        <Button title="Concluído" onPress={() => setShowLab(false)} style={{ marginTop: 20 }} />
      </Sheet>

      <Sheet visible={showOriginal} onClose={() => setShowOriginal(false)} title="Documento original">
        {fileUri && !isPdf ? (
          <Glass radius={20} style={{ marginTop: 14 }}>
            <Image source={{ uri: fileUri }} style={{ width: '100%', height: 420 }} resizeMode="contain" accessibilityLabel="Fotografia original do exame" />
          </Glass>
        ) : (
          <Sub style={{ marginTop: 10, fontSize: 16, lineHeight: 23 }}>O PDF original fica guardado com o exame. Compara os valores com o documento.</Sub>
        )}
      </Sheet>
    </KeyboardAvoidingView>
  );
}
