import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  Share,
  TouchableOpacity,
  Switch,
  Linking,
  Image,
  Platform,
  TextInput,
  ActivityIndicator,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Rect, Circle, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useHealthKit } from '@/hooks/useHealthKit';
import { Exam } from '@/lib/types';
import Slider from '@react-native-community/slider';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { DatePicker } from '@/components/ui/DatePicker';
import { SkeletonSettingsRow } from '@/components/ui/Skeleton';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const animateLayout = () => {
  LayoutAnimation.configureNext(
    LayoutAnimation.create(250, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity)
  );
};

const RELATIONSHIPS = [
  'Pai', 'Mãe', 'Irmão', 'Irmã',
  'Avô paterno', 'Avó paterna', 'Avô materno', 'Avó materna',
  'Tio/Tia paterno', 'Tio/Tia materno', 'Outro',
];

const EVENT_TYPES = [
  'Enfarte', 'AVC', 'Trombose', 'Arritmia',
  'Hipertensão', 'Colesterol elevado', 'Diabetes', 'Morte súbita', 'Outro',
];

function formatSleepHours(value: number | null | undefined): string {
  if (!value) return '—';
  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);
  if (minutes === 0) return `${hours}h`;
  return `${hours}h${minutes}m`;
}

function parseSleepForStepper(value: number | null | undefined): number {
  return value ?? 7;
}

function SettingsRow({
  label,
  value,
  onPress,
  isLast = false,
  danger = false,
  icon,
  expanded = false,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  isLast?: boolean;
  danger?: boolean;
  icon?: string;
  expanded?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      className={`flex-row items-center justify-between py-4 px-4 ${!isLast && !expanded ? 'border-b border-[#151515]' : ''}`}
    >
      <View className="flex-row items-center flex-1">
        {icon && (
          <Ionicons name={icon as any} size={20} color={danger ? '#E24B4A' : '#888888'} style={{ marginRight: 12 }} />
        )}
        <Text className={`text-base ${danger ? 'text-[#E24B4A]' : 'text-[#888888]'}`}>{label}</Text>
      </View>
      <View className="flex-row items-center">
        {value && <Text className="text-base text-[#F5F5F5] mr-2">{value}</Text>}
        {onPress && (
          <Ionicons
            name={expanded ? 'chevron-down' : 'chevron-forward'}
            size={18}
            color="#555555"
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

function InlineActions({
  onCancel,
  onSave,
  saving,
}: {
  onCancel: () => void;
  onSave: () => void;
  saving?: boolean;
}) {
  return (
    <View className="flex-row items-center justify-end pb-3 px-4" style={{ gap: 16 }}>
      <TouchableOpacity onPress={onCancel} activeOpacity={0.7}>
        <Text className="text-base text-[#888888]">Cancelar</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onSave}
        activeOpacity={0.7}
        className="bg-[#1D9E75] rounded-xl px-5 py-2"
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <Text className="text-base text-white font-medium">Guardar</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

function SectionHeader({ icon, label }: { icon: string; label: string }) {
  return (
    <View className="flex-row items-center mt-6 mb-2 px-1">
      <Ionicons name={icon as any} size={18} color="#555555" />
      <Text className="text-sm font-semibold text-[#555555] ml-2 tracking-wider uppercase">{label}</Text>
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, familyHistory, loading: profileLoading, addFamilyEntry, removeFamilyEntry, refetch: refetchProfile } = useProfile();
  const {
    authorized: healthAuthorized,
    loading: healthLoading,
    isAvailable: healthAvailable,
    connect: connectHealth,
    disconnect: disconnectHealth,
  } = useHealthKit();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Inline edit state
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editDate, setEditDate] = useState<Date | null>(null);
  const [editBool, setEditBool] = useState(false);
  const [editNumber, setEditNumber] = useState(0);
  const [editingExerciseText, setEditingExerciseText] = useState(false);
  const [saving, setSaving] = useState(false);

  // Family
  const [showFamilyForm, setShowFamilyForm] = useState(false);
  const [famRelationship, setFamRelationship] = useState<string | null>(null);
  const [famEventType, setFamEventType] = useState<string | null>(null);
  const [famEventAge, setFamEventAge] = useState('');
  const [famNotes, setFamNotes] = useState('');
  const [addingFamily, setAddingFamily] = useState(false);

  // Password
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Exams
  const [exams, setExams] = useState<(Exam & { biomarker_count: number })[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);

  const fetchExams = useCallback(async () => {
    if (!user) return;
    setLoadingExams(true);
    const { data } = await supabase
      .from('exams')
      .select('*, biomarkers(count)')
      .eq('profile_id', user.id)
      .order('exam_date', { ascending: false });
    if (data) {
      setExams(data.map((e: any) => ({ ...e, biomarker_count: e.biomarkers?.[0]?.count ?? 0 })));
    }
    setLoadingExams(false);
  }, [user]);

  useFocusEffect(useCallback(() => { fetchExams(); }, [fetchExams]));

  const sexLabel = profile?.sex === 'M' ? 'Masculino' : profile?.sex === 'F' ? 'Feminino' : profile?.sex === 'other' ? 'Outro' : '—';

  // Toggle field expansion
  const toggleField = (field: string) => {
    animateLayout();
    if (editingField === field) {
      setEditingField(null);
      return;
    }
    // Set up edit state for the field
    if (field === 'name') setEditValue(profile?.name ?? '');
    else if (field === 'exercise') setEditNumber(profile?.exercise_minutes_per_week ?? 180);
    else if (field === 'sleep') setEditNumber(parseSleepForStepper(profile?.sleep_hours_avg));
    else if (field === 'birth_date') setEditDate(profile?.birth_date ? new Date(profile.birth_date) : null);
    else if (field === 'smoker') setEditBool(profile?.smoker ?? false);
    else if (field === 'sedentary') setEditBool(profile?.sedentary_work ?? false);
    else if (field === 'sex') setEditValue(profile?.sex ?? '');
    setEditingField(field);
  };

  const cancelEdit = () => {
    animateLayout();
    setEditingField(null);
    setEditingExerciseText(false);
  };

  const handleSaveField = async () => {
    if (!user) return;
    setSaving(true);
    const updates: any = { updated_at: new Date().toISOString() };
    if (editingField === 'name') updates.name = editValue.trim() || null;
    else if (editingField === 'exercise') updates.exercise_minutes_per_week = editNumber || null;
    else if (editingField === 'sleep') updates.sleep_hours_avg = editNumber || null;
    else if (editingField === 'birth_date') updates.birth_date = editDate ? editDate.toISOString().split('T')[0] : null;
    else if (editingField === 'smoker') updates.smoker = editBool;
    else if (editingField === 'sedentary') updates.sedentary_work = editBool;
    else if (editingField === 'sex') updates.sex = editValue || null;

    const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
    if (error) Alert.alert('Erro', 'Não foi possível guardar.');
    else await refetchProfile();
    setSaving(false);
    animateLayout();
    setEditingField(null);
  };

  // Toggle auto-save (for smoker/sedentary)
  const handleToggleSave = async (field: string, value: boolean) => {
    if (!user) return;
    setEditBool(value);
    const updates: any = { updated_at: new Date().toISOString() };
    if (field === 'smoker') updates.smoker = value;
    else if (field === 'sedentary') updates.sedentary_work = value;
    await supabase.from('profiles').update(updates).eq('id', user.id);
    await refetchProfile();
    setTimeout(() => {
      animateLayout();
      setEditingField(null);
    }, 300);
  };

  const handleAddFamily = async () => {
    if (!famRelationship || !famEventType) return;
    setAddingFamily(true);
    const err = await addFamilyEntry({
      relationship: famRelationship.toLowerCase(),
      event_type: famEventType.toLowerCase(),
      event_age: famEventAge ? parseInt(famEventAge) : null,
      notes: famNotes.trim() || null,
    });
    if (err) Alert.alert('Erro', 'Não foi possível adicionar.');
    else {
      setFamRelationship(null); setFamEventType(null); setFamEventAge(''); setFamNotes('');
      animateLayout();
      setShowFamilyForm(false);
      await refetchProfile();
    }
    setAddingFamily(false);
  };

  const handleRemoveFamily = (id: string) => {
    Alert.alert('Remover', 'Tens a certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: async () => { await removeFamilyEntry(id); await refetchProfile(); } },
    ]);
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) { setPasswordError('Preenche todos os campos.'); return; }
    if (newPassword.length < 6) { setPasswordError('Mínimo 6 caracteres.'); return; }
    if (newPassword !== confirmNewPassword) { setPasswordError('As palavras-passe não coincidem.'); return; }
    setSavingPassword(true); setPasswordError('');
    const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user?.email ?? '', password: currentPassword });
    if (verifyError) { setSavingPassword(false); setPasswordError('Palavra-passe atual incorreta.'); return; }
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (updateError) setPasswordError('Erro ao atualizar.');
    else {
      setPasswordSuccess(true); setCurrentPassword(''); setNewPassword(''); setConfirmNewPassword('');
      setTimeout(() => { setShowPasswordForm(false); setPasswordSuccess(false); }, 2000);
    }
  };

  const handleExportData = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const [profileRes, familyRes, examsRes, biomarkersRes, contentRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('family_history').select('*').eq('profile_id', user.id),
        supabase.from('exams').select('*').eq('profile_id', user.id),
        supabase.from('biomarkers').select('*').eq('profile_id', user.id),
        supabase.from('generated_content').select('*').eq('profile_id', user.id),
      ]);
      await Share.share({
        message: JSON.stringify({ exported_at: new Date().toISOString(), profile: profileRes.data, family_history: familyRes.data, exams: examsRes.data, biomarkers: biomarkersRes.data, generated_content: contentRes.data }, null, 2),
        title: 'Heartline — Os meus dados',
      });
    } catch (err) { Alert.alert('Erro', 'Não foi possível exportar.'); }
    finally { setExporting(false); }
  };

  const handleDeleteAccount = () => {
    Alert.alert('Apagar conta', 'Ação irreversível. Todos os dados serão apagados.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar tudo', style: 'destructive', onPress: async () => {
        if (!user) return; setDeleting(true);
        try {
          await supabase.from('generated_content').delete().eq('profile_id', user.id);
          await supabase.from('biomarkers').delete().eq('profile_id', user.id);
          await supabase.from('exams').delete().eq('profile_id', user.id);
          await supabase.from('family_history').delete().eq('profile_id', user.id);
          await supabase.from('profiles').delete().eq('id', user.id);
          await supabase.auth.signOut();
        } catch (err) { Alert.alert('Erro', 'Não foi possível apagar.'); }
        finally { setDeleting(false); }
      }},
    ]);
  };

  // Render profile row + inline editor
  const renderProfileRow = (
    field: string,
    label: string,
    displayValue: string,
    isLast: boolean = false,
  ) => {
    const isExpanded = editingField === field;

    return (
      <View key={field}>
        <SettingsRow
          label={label}
          value={displayValue}
          onPress={() => toggleField(field)}
          isLast={isLast && !isExpanded}
          expanded={isExpanded}
        />
        {isExpanded && (
          <View className={`px-4 pb-1 ${!isLast ? 'border-b border-[#151515]' : ''}`}>
            {/* Text input: name */}
            {field === 'name' && (
              <>
                <TextInput
                  value={editValue}
                  onChangeText={setEditValue}
                  className="bg-[#0A0A0A] border border-[#151515] rounded-xl px-4 py-3 text-base text-[#F5F5F5] mb-3"
                  placeholderTextColor="#555555"
                  placeholder="O teu nome"
                  autoFocus
                />
                <InlineActions onCancel={cancelEdit} onSave={handleSaveField} saving={saving} />
              </>
            )}

            {/* Date picker: birth_date */}
            {field === 'birth_date' && (
              <>
                <DatePicker
                  label=""
                  value={editDate}
                  onChange={setEditDate}
                  maximumDate={new Date()}
                  minimumDate={new Date(1940, 0, 1)}
                />
                <InlineActions onCancel={cancelEdit} onSave={handleSaveField} saving={saving} />
              </>
            )}

            {/* Segmented: sex */}
            {field === 'sex' && (
              <>
                <View className="flex-row mb-3" style={{ gap: 8 }}>
                  {[{ value: 'M', label: 'Masculino' }, { value: 'F', label: 'Feminino' }, { value: 'other', label: 'Outro' }].map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => setEditValue(opt.value)}
                      className={`flex-1 py-3 rounded-xl border items-center ${editValue === opt.value ? 'bg-[#1D9E75] border-[#1D9E75]' : 'bg-[#0A0A0A] border-[#151515]'}`}
                    >
                      <Text className={`text-base ${editValue === opt.value ? 'text-white font-medium' : 'text-[#888888]'}`}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <InlineActions onCancel={cancelEdit} onSave={handleSaveField} saving={saving} />
              </>
            )}

            {/* Toggle: smoker */}
            {field === 'smoker' && (
              <View className="flex-row items-center justify-between py-2 pb-4">
                <Text className="text-base text-[#888888]">
                  {editBool ? 'Sim, fumo' : 'Não, não fumo'}
                </Text>
                <Switch
                  value={editBool}
                  onValueChange={(val) => handleToggleSave('smoker', val)}
                  trackColor={{ false: '#3A3A3A', true: '#1D9E75' }}
                  thumbColor="#FFF"
                />
              </View>
            )}

            {/* Toggle: sedentary */}
            {field === 'sedentary' && (
              <View className="flex-row items-center justify-between py-2 pb-4">
                <Text className="text-base text-[#888888]">
                  {editBool ? 'Sim, trabalho sedentário' : 'Não, trabalho ativo'}
                </Text>
                <Switch
                  value={editBool}
                  onValueChange={(val) => handleToggleSave('sedentary', val)}
                  trackColor={{ false: '#3A3A3A', true: '#1D9E75' }}
                  thumbColor="#FFF"
                />
              </View>
            )}

            {/* Slider: exercise */}
            {field === 'exercise' && (
              <>
                <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                  <Text className="text-2xl font-semibold text-[#F5F5F5]">{editNumber} min</Text>
                  {editNumber >= 60 ? (
                    <Text className="text-xs text-[#444444] mt-1">
                      {Math.floor(editNumber / 60)}h{editNumber % 60 > 0 ? `${editNumber % 60}m` : ''} por semana
                    </Text>
                  ) : null}
                </View>
                <Slider
                  style={{ width: '100%', height: 40 }}
                  minimumValue={0}
                  maximumValue={600}
                  step={15}
                  value={editNumber}
                  onValueChange={setEditNumber}
                  minimumTrackTintColor="#1D9E75"
                  maximumTrackTintColor="#222222"
                  thumbTintColor="#1D9E75"
                />
                <View className="flex-row justify-between mb-2">
                  <Text className="text-xs text-[#444444]">0</Text>
                  <Text className="text-xs text-[#444444]">300</Text>
                  <Text className="text-xs text-[#444444]">600</Text>
                </View>
                <InlineActions onCancel={cancelEdit} onSave={handleSaveField} saving={saving} />
              </>
            )}

            {/* Slider: sleep */}
            {field === 'sleep' && (
              <>
                <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                  <Text className="text-2xl font-semibold text-[#F5F5F5]">{formatSleepHours(editNumber)}</Text>
                </View>
                <Slider
                  style={{ width: '100%', height: 40 }}
                  minimumValue={4}
                  maximumValue={10}
                  step={0.5}
                  value={editNumber}
                  onValueChange={setEditNumber}
                  minimumTrackTintColor="#1D9E75"
                  maximumTrackTintColor="#222222"
                  thumbTintColor="#1D9E75"
                />
                <View className="flex-row justify-between mb-2">
                  <Text className="text-xs text-[#444444]">4h</Text>
                  <Text className="text-xs text-[#444444]">7h</Text>
                  <Text className="text-xs text-[#444444]">10h</Text>
                </View>
                <InlineActions onCancel={cancelEdit} onSave={handleSaveField} saving={saving} />
              </>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {/* PERFIL */}
        <SectionHeader icon="person-outline" label="Perfil" />
        {profileLoading && !profile ? (
          <View className="bg-[#111111] rounded-2xl border border-[#151515] overflow-hidden">
            <SkeletonSettingsRow />
            <SkeletonSettingsRow />
            <SkeletonSettingsRow />
            <SkeletonSettingsRow />
            <SkeletonSettingsRow />
            <SkeletonSettingsRow />
            <SkeletonSettingsRow isLast />
          </View>
        ) : (
          <View className="bg-[#111111] rounded-2xl border border-[#151515] overflow-hidden">
            {renderProfileRow('name', 'Nome', profile?.name ?? '—')}
            {renderProfileRow('birth_date', 'Data de nascimento', profile?.birth_date ? new Date(profile.birth_date).toLocaleDateString('pt-PT') : '—')}
            {renderProfileRow('sex', 'Sexo', sexLabel)}
            {renderProfileRow('smoker', 'Fumador', profile?.smoker ? 'Sim' : 'Não')}
            {renderProfileRow('exercise', 'Exercício semanal', profile?.exercise_minutes_per_week ? `${profile.exercise_minutes_per_week} min` : '—')}
            {renderProfileRow('sedentary', 'Trabalho sedentário', profile?.sedentary_work ? 'Sim' : 'Não')}
            {renderProfileRow('sleep', 'Horas de sono', formatSleepHours(profile?.sleep_hours_avg), true)}
          </View>
        )}

        {/* HISTÓRICO FAMILIAR */}
        <SectionHeader icon="heart-outline" label="Histórico familiar" />
        {profileLoading && !profile ? (
          <View className="bg-[#111111] rounded-2xl border border-[#151515] overflow-hidden">
            <SkeletonSettingsRow />
            <SkeletonSettingsRow />
            <SkeletonSettingsRow isLast />
          </View>
        ) : (
        <View className="bg-[#111111] rounded-2xl border border-[#151515] overflow-hidden">
          {familyHistory.map((entry, i) => (
            <TouchableOpacity key={entry.id} onPress={() => handleRemoveFamily(entry.id)} activeOpacity={0.7}
              className={`flex-row items-center justify-between py-3.5 px-4 border-b border-[#151515]`}>
              <Text className="text-base text-[#888888] capitalize flex-1">
                {entry.relationship} — {entry.event_type}{entry.event_age ? ` aos ${entry.event_age} anos` : ''}
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#555555" />
            </TouchableOpacity>
          ))}

          {/* Add button */}
          <TouchableOpacity
            onPress={() => { animateLayout(); setShowFamilyForm(!showFamilyForm); }}
            className="py-3.5 px-4"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center justify-center" style={{ gap: 6 }}>
              <Text className="text-base text-[#1D9E75] font-medium">Adicionar familiar</Text>
              <Ionicons name={showFamilyForm ? 'chevron-up' : 'chevron-down'} size={16} color="#1D9E75" />
            </View>
          </TouchableOpacity>

          {/* Inline family form */}
          {showFamilyForm && (
            <View className="px-4 pb-4 border-t border-[#151515]">
              <Text className="text-xs font-semibold text-[#555555] tracking-wider uppercase mt-3 mb-2">Familiar</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                <View className="flex-row" style={{ gap: 6 }}>
                  {RELATIONSHIPS.map((r) => (
                    <TouchableOpacity key={r} onPress={() => setFamRelationship(r)}
                      className={`px-3.5 py-2 rounded-full border ${famRelationship === r ? 'bg-[#1D9E75] border-[#1D9E75]' : 'bg-[#0A0A0A] border-[#151515]'}`}>
                      <Text className={`text-sm ${famRelationship === r ? 'text-white font-medium' : 'text-[#888888]'}`}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text className="text-xs font-semibold text-[#555555] tracking-wider uppercase mb-2">Evento</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                <View className="flex-row" style={{ gap: 6 }}>
                  {EVENT_TYPES.map((e) => (
                    <TouchableOpacity key={e} onPress={() => setFamEventType(e)}
                      className={`px-3.5 py-2 rounded-full border ${famEventType === e ? 'bg-[#1D9E75] border-[#1D9E75]' : 'bg-[#0A0A0A] border-[#151515]'}`}>
                      <Text className={`text-sm ${famEventType === e ? 'text-white font-medium' : 'text-[#888888]'}`}>{e}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <View className="flex-row" style={{ gap: 10 }}>
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-[#555555] tracking-wider uppercase mb-2">Idade</Text>
                  <TextInput
                    value={famEventAge}
                    onChangeText={setFamEventAge}
                    placeholder="48"
                    placeholderTextColor="#555555"
                    keyboardType="number-pad"
                    className="bg-[#0A0A0A] border border-[#151515] rounded-xl px-4 py-3 text-base text-[#F5F5F5]"
                  />
                </View>
                <View className="flex-[2]">
                  <Text className="text-xs font-semibold text-[#555555] tracking-wider uppercase mb-2">Notas</Text>
                  <TextInput
                    value={famNotes}
                    onChangeText={setFamNotes}
                    placeholder="Opcional"
                    placeholderTextColor="#555555"
                    className="bg-[#0A0A0A] border border-[#151515] rounded-xl px-4 py-3 text-base text-[#F5F5F5]"
                  />
                </View>
              </View>

              <View className="flex-row items-center justify-end mt-4" style={{ gap: 16 }}>
                <TouchableOpacity onPress={() => { animateLayout(); setShowFamilyForm(false); setFamRelationship(null); setFamEventType(null); setFamEventAge(''); setFamNotes(''); }} activeOpacity={0.7}>
                  <Text className="text-base text-[#888888]">Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleAddFamily}
                  activeOpacity={0.7}
                  disabled={!famRelationship || !famEventType || addingFamily}
                  className={`rounded-xl px-5 py-2 ${famRelationship && famEventType ? 'bg-[#1D9E75]' : 'bg-[#1D9E75]/40'}`}
                >
                  {addingFamily ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text className="text-base text-white font-medium">Adicionar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
        )}

        {/* CONEXÕES */}
        <SectionHeader icon="link-outline" label="Conexões" />
        <View className="bg-[#111111] rounded-2xl border border-[#151515] overflow-hidden">
          {/* Apple Health */}
          {healthAvailable && (
            <View className="flex-row items-center justify-between py-4 px-4 border-b border-[#151515]">
              <View className="flex-row items-center flex-1" style={{ gap: 12 }}>
                <Svg width={28} height={28} viewBox="0 0 120 120">
                  <Defs>
                    <LinearGradient id="ahg" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor="#FF6482" />
                      <Stop offset="1" stopColor="#FF2D55" />
                    </LinearGradient>
                  </Defs>
                  <Rect width="120" height="120" rx="26" fill="url(#ahg)" />
                  <Path d="M60 90C47 80 30 68 30 52c0-10 8-18 17-18 6 0 10 3 13 7 3-4 7-7 13-7 9 0 17 8 17 18 0 16-17 28-30 38z" fill="#FFF" />
                </Svg>
                <View>
                  <Text className="text-base text-[#F5F5F5]">Apple Health</Text>
                  <Text className="text-xs text-[#555555]">Frequência cardíaca, passos, PA</Text>
                </View>
              </View>
              <Switch
                value={healthAuthorized}
                onValueChange={async (val) => { if (val) await connectHealth(); else disconnectHealth(); }}
                trackColor={{ false: '#3A3A3A', true: '#8CB369' }}
                thumbColor="#FFF"
              />
            </View>
          )}

          {/* Google Fit */}
          <View className="flex-row items-center justify-between py-4 px-4 border-b border-[#151515]">
            <View className="flex-row items-center flex-1" style={{ gap: 12 }}>
              <Svg width={28} height={28} viewBox="0 0 120 120">
                <Rect width="120" height="120" rx="26" fill="#FFF" />
                <Path d="M38 74l12-20 12 20" fill="none" stroke="#4285F4" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M50 54l12 20 12-20" fill="none" stroke="#EA4335" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M62 74l12-20" fill="none" stroke="#FBBC05" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M50 54l12-20" fill="none" stroke="#34A853" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <View>
                <Text className="text-base text-[#F5F5F5]">Google Fit</Text>
                <Text className="text-xs text-[#555555]">Atividade, passos, frequência cardíaca</Text>
              </View>
            </View>
            <Switch
              value={false}
              onValueChange={() => Alert.alert('Em breve', 'Google Fit estará disponível numa próxima versão.')}
              trackColor={{ false: '#3A3A3A', true: '#8CB369' }}
              thumbColor="#FFF"
              disabled
            />
          </View>

          {/* Samsung Health */}
          <View className="flex-row items-center justify-between py-4 px-4 border-b border-[#151515]">
            <View className="flex-row items-center flex-1" style={{ gap: 12 }}>
              <Svg width={28} height={28} viewBox="0 0 120 120">
                <Rect width="120" height="120" rx="26" fill="#1428A0" />
                <Path d="M40 68c0-6 20-12 20-22 0-5-3-8-7-8s-8 4-8 4M80 52c0 6-20 12-20 22 0 5 3 8 7 8s8-4 8-4" fill="none" stroke="#FFF" strokeWidth="6" strokeLinecap="round" />
              </Svg>
              <View>
                <Text className="text-base text-[#F5F5F5]">Samsung Health</Text>
                <Text className="text-xs text-[#555555]">Atividade, sono, frequência cardíaca</Text>
              </View>
            </View>
            <Switch
              value={false}
              onValueChange={() => Alert.alert('Em breve', 'Samsung Health estará disponível numa próxima versão.')}
              trackColor={{ false: '#3A3A3A', true: '#8CB369' }}
              thumbColor="#FFF"
              disabled
            />
          </View>

          {/* Oura */}
          <View className="flex-row items-center justify-between py-4 px-4 border-b border-[#151515]">
            <View className="flex-row items-center flex-1" style={{ gap: 12 }}>
              <Svg width={28} height={28} viewBox="0 0 120 120">
                <Rect width="120" height="120" rx="26" fill="#0A0A0A" />
                <Circle cx="60" cy="60" r="24" fill="none" stroke="#FFF" strokeWidth="6" />
              </Svg>
              <View>
                <Text className="text-base text-[#F5F5F5]">Oura Ring</Text>
                <Text className="text-xs text-[#555555]">Sono, recuperação, temperatura</Text>
              </View>
            </View>
            <Switch
              value={false}
              onValueChange={() => Alert.alert('Em breve', 'Oura estará disponível numa próxima versão.')}
              trackColor={{ false: '#3A3A3A', true: '#8CB369' }}
              thumbColor="#FFF"
              disabled
            />
          </View>

          {/* Fitbit */}
          <View className="flex-row items-center justify-between py-4 px-4">
            <View className="flex-row items-center flex-1" style={{ gap: 12 }}>
              <Svg width={28} height={28} viewBox="0 0 120 120">
                <Rect width="120" height="120" rx="26" fill="#00B0B9" />
                <G fill="#FFF">
                  <Circle cx="60" cy="36" r="6" />
                  <Circle cx="60" cy="52" r="6" />
                  <Circle cx="60" cy="68" r="6" />
                  <Circle cx="60" cy="84" r="6" />
                  <Circle cx="44" cy="44" r="5" />
                  <Circle cx="44" cy="60" r="5" />
                  <Circle cx="44" cy="76" r="5" />
                  <Circle cx="76" cy="44" r="5" />
                  <Circle cx="76" cy="60" r="5" />
                  <Circle cx="76" cy="76" r="5" />
                  <Circle cx="32" cy="52" r="4" />
                  <Circle cx="32" cy="68" r="4" />
                  <Circle cx="88" cy="52" r="4" />
                  <Circle cx="88" cy="68" r="4" />
                </G>
              </Svg>
              <View>
                <Text className="text-base text-[#F5F5F5]">Fitbit</Text>
                <Text className="text-xs text-[#555555]">Atividade, sono, frequência cardíaca</Text>
              </View>
            </View>
            <Switch
              value={false}
              onValueChange={() => Alert.alert('Em breve', 'Fitbit estará disponível numa próxima versão.')}
              trackColor={{ false: '#3A3A3A', true: '#8CB369' }}
              thumbColor="#FFF"
              disabled
            />
          </View>
        </View>

        {/* PRIVACIDADE E DADOS */}
        <SectionHeader icon="shield-outline" label="Privacidade e dados" />
        <View className="bg-[#111111] rounded-2xl border border-[#151515] overflow-hidden">
          <SettingsRow label="Exportar dados" icon="download-outline" onPress={handleExportData} />
          <SettingsRow label="Apagar conta" icon="trash-outline" onPress={handleDeleteAccount} danger isLast />
        </View>

        {!showPasswordForm ? (
          <View className="mt-4 bg-[#111111] rounded-2xl border border-[#151515] overflow-hidden">
            <SettingsRow label="Alterar palavra-passe" icon="lock-closed-outline" onPress={() => { setShowPasswordForm(true); setPasswordError(''); }} isLast />
          </View>
        ) : (
          <Card className="mt-4">
            <Text className="text-base font-semibold text-[#F5F5F5] mb-3">Alterar palavra-passe</Text>
            {passwordError ? <View className="bg-[#E24B4A]/15 rounded-lg p-2 mb-3"><Text className="text-[#E24B4A] text-sm text-center">{passwordError}</Text></View> : null}
            {passwordSuccess ? <View className="bg-[#8CB369]/15 rounded-lg p-2 mb-3"><Text className="text-[#8CB369] text-sm text-center">Atualizada!</Text></View> : null}
            <Input label="Atual" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry placeholder="••••••••" />
            <Input label="Nova" value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholder="••••••••" />
            <Input label="Confirmar" value={confirmNewPassword} onChangeText={setConfirmNewPassword} secureTextEntry placeholder="••••••••" />
            <View className="flex-row mt-1">
              <View className="flex-1 mr-2"><Button title="Cancelar" variant="secondary" onPress={() => { setShowPasswordForm(false); setPasswordError(''); }} /></View>
              <View className="flex-1"><Button title="Guardar" onPress={handleChangePassword} loading={savingPassword} /></View>
            </View>
          </Card>
        )}

        {/* SOBRE */}
        <SectionHeader icon="information-circle-outline" label="Sobre" />
        <View className="bg-[#111111] rounded-2xl border border-[#151515] overflow-hidden">
          <SettingsRow label="Versão" value="1.0.0" />
          <SettingsRow label="Termos de serviço" onPress={() => Linking.openURL('https://heartline.app/terms')} />
          <SettingsRow label="Política de privacidade" onPress={() => Linking.openURL('https://heartline.app/privacy')} />
          <SettingsRow
            label="Rever onboarding"
            icon="refresh-outline"
            onPress={async () => {
              if (!user) return;
              await AsyncStorage.removeItem('has_seen_welcome');
              await supabase.from('profiles').update({ onboarding_completed: false }).eq('id', user.id);
              await supabase.auth.signOut();
            }}
            isLast
          />
        </View>

        {/* Disclaimer */}
        <View className="bg-[#111111] rounded-2xl border border-[#151515] p-4 mt-4">
          <Text className="text-sm text-[#555555] text-center leading-5">
            O Heartline é uma ferramenta de acompanhamento e não substitui diagnóstico ou aconselhamento médico profissional. Consulte sempre um profissional de saúde qualificado.
          </Text>
        </View>

        <View className="mt-6 mb-4">
          <Button title="Terminar sessão" variant="secondary" onPress={async () => { await supabase.auth.signOut(); }} />
        </View>
      </ScrollView>
    </View>
  );
}
