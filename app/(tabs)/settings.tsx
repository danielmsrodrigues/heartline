import { useCallback, useState } from 'react';
import { Alert, AlertButton, Linking, Platform, Share, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { deleteAccount } from '@/lib/ai';
import { parseDateOnly, toDateOnly } from '@/lib/dates';
import { haptics } from '@/lib/haptics';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { invalidateHealthData } from '@/hooks/useBiomarkers';
import { useGeneratedContent } from '@/hooks/useGeneratedContent';
import { Exam, PendingExam, Profile } from '@/lib/types';
import { Habit, habitIndex, HABITS } from '@/constants/habits';
import { useTheme } from '@/constants/theme';
import { familyLabel, FamilyPicker } from '@/components/family-history-form';
import { HabitQuestion } from '@/components/habit-question';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Chip, ChipRow, IconBubble } from '@/components/ui/Chip';
import { DatePicker } from '@/components/ui/DatePicker';
import { Glass } from '@/components/ui/Glass';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { ListCard, Row } from '@/components/ui/List';
import { Screen } from '@/components/ui/Screen';
import { Sheet } from '@/components/ui/Sheet';
import { DISCLAIMER, Note, SectionTitle, Title } from '@/components/ui/Text';

const EXAMS_BUCKET = 'exams';

type ExamWithCount = Exam & { biomarker_count: number };

const SEXES: { label: string; value: NonNullable<Profile['sex']> }[] = [
  { label: 'Feminino', value: 'F' },
  { label: 'Masculino', value: 'M' },
  { label: 'Outro', value: 'other' },
];

const longDate = (value: string) =>
  parseDateOnly(value)?.toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' }) ?? '—';

function ageOf(birthDate: string | null | undefined): number | null {
  const birth = parseDateOnly(birthDate);
  if (!birth) return null;
  const now = new Date();
  const hadBirthday = now.getMonth() > birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate());
  return now.getFullYear() - birth.getFullYear() - (hadBirthday ? 0 : 1);
}

export default function SettingsScreen() {
  const t = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { profile, familyHistory, updateProfile, addFamilyEntry, removeFamilyEntry } = useProfile();
  const { regenerate } = useGeneratedContent();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Editar "Sobre ti"
  const [editingAbout, setEditingAbout] = useState(false);
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [sex, setSex] = useState<Profile['sex']>(null);
  const [savingAbout, setSavingAbout] = useState(false);

  // Hábito em edição e histórico familiar
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [editingFamily, setEditingFamily] = useState(false);
  const [openEvents, setOpenEvents] = useState<string[]>([]);

  // Palavra-passe
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Exames
  const [exams, setExams] = useState<ExamWithCount[]>([]);

  const fetchExams = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('exams')
      .select('*, biomarkers(count)')
      .eq('profile_id', user.id)
      .order('exam_date', { ascending: false });
    if (data) {
      setExams(data.map((e: any) => ({ ...e, biomarker_count: e.biomarkers?.[0]?.count ?? 0 })));
    }
  }, [user]);

  useFocusEffect(useCallback(() => { fetchExams(); }, [fetchExams]));

  const openAbout = () => {
    setName(profile?.name ?? '');
    setBirthDate(parseDateOnly(profile?.birth_date));
    setSex(profile?.sex ?? null);
    setEditingAbout(true);
  };

  const saveAbout = async () => {
    if (!name.trim() || !birthDate || !sex) {
      haptics.warning();
      Alert.alert('Falta preencher', 'Indica o nome, a data de nascimento e o sexo.');
      return;
    }
    setSavingAbout(true);
    const error = await updateProfile({ name: name.trim(), birth_date: toDateOnly(birthDate), sex });
    setSavingAbout(false);
    if (error) {
      haptics.warning();
      Alert.alert('Erro', 'Não foi possível guardar.');
    } else {
      haptics.success();
      setEditingAbout(false);
    }
  };

  const saveHabit = async (habit: Habit, index: number) => {
    setEditingHabit(null);
    const error = await updateProfile(habit.options[index].updates);
    if (error) Alert.alert('Erro', 'Não foi possível guardar.');
  };

  const handleAddFamily = async (entry: Parameters<typeof addFamilyEntry>[0]) => {
    const error = await addFamilyEntry(entry);
    if (error) Alert.alert('Erro', 'Não foi possível adicionar.');
  };

  const handleRemoveFamily = async (id: string) => {
    const error = await removeFamilyEntry(id);
    if (error) Alert.alert('Erro', 'Não foi possível remover.');
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) { setPasswordError('Preenche os dois campos.'); return; }
    if (newPassword.length < 6) { setPasswordError('A nova palavra-passe tem de ter pelo menos 6 caracteres.'); return; }
    setSavingPassword(true);
    setPasswordError('');
    const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user?.email ?? '', password: currentPassword });
    if (verifyError) { setSavingPassword(false); setPasswordError('A palavra-passe atual não está certa.'); return; }
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (updateError) {
      setPasswordError('Não foi possível atualizar.');
    } else {
      haptics.success();
      setCurrentPassword('');
      setNewPassword('');
      setShowPassword(false);
    }
  };

  const handleExportData = async () => {
    if (!user || exporting) return;
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
    } catch {
      Alert.alert('Erro', 'Não foi possível exportar.');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = () => {
    haptics.warning();
    Alert.alert('Apagar conta', 'Ação irreversível. A conta, os exames e os ficheiros originais serão apagados.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar tudo', style: 'destructive', onPress: async () => {
        if (!user) return;
        setDeleting(true);
        try {
          // A Edge Function apaga ficheiros, dados e a conta em auth.users.
          await deleteAccount();
          await AsyncStorage.multiRemove([`health_consent_${user.id}`, 'pending_exam_data']);
          await supabase.auth.signOut({ scope: 'local' });
        } catch (err) {
          console.error('Delete account error:', err);
          Alert.alert('Erro', 'Não foi possível apagar a conta. Tenta novamente.');
        } finally {
          setDeleting(false);
        }
      } },
    ]);
  };

  const editExam = async (exam: ExamWithCount) => {
    const { data: markers, error } = await supabase.from('biomarkers').select('*').eq('exam_id', exam.id);
    if (error) {
      Alert.alert('Erro', 'Não foi possível carregar os valores.');
      return;
    }
    if (!markers || markers.length === 0) {
      Alert.alert('Sem valores', 'Este exame não tem valores.');
      return;
    }
    const pending: PendingExam = {
      lab_name: exam.lab_name,
      exam_date: exam.exam_date,
      markers: markers.map((m) => ({
        name: m.name,
        name_normalized: m.name_normalized,
        value: m.value,
        unit: m.unit,
        ref_min: m.ref_min,
        ref_max: m.ref_max,
        confidence: m.ai_confidence,
      })),
      editExamId: exam.id,
    };
    await AsyncStorage.setItem('pending_exam_data', JSON.stringify(pending));
    router.push('/confirm-values');
  };

  const viewOriginal = async (exam: ExamWithCount) => {
    if (!exam.original_file_path) return;
    const { data, error } = await supabase.storage.from(EXAMS_BUCKET).createSignedUrl(exam.original_file_path, 300);
    if (error || !data?.signedUrl) {
      Alert.alert('Erro', 'Não foi possível abrir o documento original.');
      return;
    }
    await WebBrowser.openBrowserAsync(data.signedUrl);
  };

  const deleteExam = async (exam: ExamWithCount) => {
    if (!user) return;
    // Os valores vão em cascata com o exame.
    const { error } = await supabase.from('exams').delete().eq('id', exam.id);
    if (error) {
      Alert.alert('Erro', 'Não foi possível apagar o exame.');
      return;
    }
    if (exam.original_file_path) {
      const { error: fileError } = await supabase.storage.from(EXAMS_BUCKET).remove([exam.original_file_path]);
      if (fileError) console.warn('Não foi possível apagar o ficheiro original:', fileError.message);
    }
    const remaining = exams.length - 1;
    if (remaining <= 0) {
      await supabase.from('generated_content').delete().eq('profile_id', user.id);
    }
    await invalidateHealthData(user.id);
    // O resumo em cache ainda fala dos valores apagados.
    if (remaining > 0) regenerate().catch((err) => console.warn('Content regeneration failed:', err));
    haptics.success();
    fetchExams();
  };

  const confirmDeleteExam = (exam: ExamWithCount) => {
    Alert.alert('Apagar exame', 'Os valores deste exame e o documento original serão apagados. Esta ação é irreversível.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: () => deleteExam(exam) },
    ]);
  };

  const openExamActions = (exam: ExamWithCount) => {
    const buttons: AlertButton[] = [{ text: 'Editar valores', onPress: () => editExam(exam) }];
    if (exam.original_file_path) buttons.push({ text: 'Ver original', onPress: () => viewOriginal(exam) });
    buttons.push({ text: 'Apagar', style: 'destructive', onPress: () => confirmDeleteExam(exam) });
    // O Android só mostra três botões; aí fecha-se tocando fora.
    if (Platform.OS === 'ios' || buttons.length < 3) buttons.unshift({ text: 'Cancelar', style: 'cancel' });
    Alert.alert(
      `${longDate(exam.exam_date)}${exam.lab_name ? ` · ${exam.lab_name}` : ''}`,
      exam.biomarker_count === 1 ? '1 valor' : `${exam.biomarker_count} valores`,
      buttons,
      { cancelable: true }
    );
  };

  const age = ageOf(profile?.birth_date);
  const sexLabel = SEXES.find((s) => s.value === profile?.sex)?.label;
  const identity = [age != null ? `${age} anos` : null, sexLabel].filter(Boolean).join(' · ');
  const initial = profile?.name?.trim().charAt(0).toUpperCase();

  return (
    <Screen inTabs top={12}>
      <Title large>Perfil</Title>

      <Glass style={{ marginTop: 18 }} contentStyle={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: t.selected, alignItems: 'center', justifyContent: 'center' }}>
          {initial ? <Text style={{ fontSize: 22, fontWeight: '700', color: t.ink }}>{initial}</Text> : <Icon name="person" size={24} color={t.ink} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ fontSize: 20, lineHeight: 26, fontWeight: '600', color: t.ink }}>{profile?.name || 'Sem nome'}</Text>
          {identity ? <Text style={{ fontSize: 14, lineHeight: 19, color: t.sub }}>{identity}</Text> : null}
        </View>
        <Glass radius={22} flat onPress={openAbout} accessibilityLabel="Editar os meus dados" style={{ width: 44, height: 44 }} contentStyle={{ width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="pencil" size={18} color={t.ink} />
        </Glass>
      </Glass>

      <SectionTitle>Hábitos</SectionTitle>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {HABITS.map((habit) => {
          const index = habitIndex(habit, profile);
          const value = index >= 0 ? habit.options[index].short : 'Por responder';
          return (
            <Glass key={habit.key} radius={24} onPress={() => setEditingHabit(habit)} accessibilityLabel={`${habit.title}: ${value}`} style={{ flexBasis: '47%', flexGrow: 1 }} contentStyle={{ height: 108, padding: 14, justifyContent: 'space-between' }}>
              <IconBubble icon={habit.icon} size={34} />
              <View>
                <Text style={{ fontSize: 13, lineHeight: 18, color: t.sub }}>{habit.title}</Text>
                <Text numberOfLines={1} style={{ fontSize: 17, lineHeight: 22, fontWeight: '600', color: t.ink }}>{value}</Text>
              </View>
            </Glass>
          );
        })}
      </View>

      <SectionTitle>Histórico familiar</SectionTitle>
      <ChipRow>
        {familyHistory.map((entry) => (
          <Chip key={entry.id} icon="person" label={familyLabel(entry)} onPress={() => setEditingFamily(true)} />
        ))}
        <Chip icon="plus" label={familyHistory.length > 0 ? 'Editar' : 'Adicionar'} onPress={() => setEditingFamily(true)} />
      </ChipRow>

      {exams.length > 0 && (
        <>
          <SectionTitle>Exames</SectionTitle>
          <ListCard>
            {exams.map((exam) => (
              <Row
                key={exam.id}
                label={longDate(exam.exam_date)}
                value={exam.biomarker_count === 1 ? '1 valor' : `${exam.biomarker_count} valores`}
                onPress={() => openExamActions(exam)}
              />
            ))}
          </ListCard>
        </>
      )}

      <SectionTitle>Conta</SectionTitle>
      <ListCard>
        <Row label="Mudar palavra-passe" onPress={() => { setPasswordError(''); setShowPassword(true); }} />
        <Row label={exporting ? 'A exportar…' : 'Exportar os meus dados'} onPress={handleExportData} />
        <Row label="Política de privacidade" onPress={() => Linking.openURL('https://heartline.app/privacy')} />
        <Row label="Termos de serviço" onPress={() => Linking.openURL('https://heartline.app/terms')} />
        <Row label="Terminar sessão" chevron={false} onPress={async () => { await supabase.auth.signOut(); }} />
        <Row label={deleting ? 'A apagar…' : 'Apagar conta e dados'} chevron={false} color={t.level.out} onPress={handleDeleteAccount} />
      </ListCard>

      {__DEV__ ? (
        <ListCard style={{ marginTop: 14 }}>
          <Row
            label="Rever a introdução (desenvolvimento)"
            chevron={false}
            onPress={async () => {
              if (!user) return;
              await AsyncStorage.removeItem('has_seen_welcome');
              await supabase.from('profiles').update({ onboarding_completed: false }).eq('id', user.id);
              await supabase.auth.signOut();
            }}
          />
        </ListCard>
      ) : null}

      <Note style={{ marginTop: 22 }}>{DISCLAIMER}</Note>
      <Note style={{ marginTop: 4 }}>Versão {Constants.expoConfig?.version ?? '1.0.0'}</Note>

      <Sheet visible={editingAbout} onClose={() => setEditingAbout(false)} title="Sobre ti">
        <Input label="Nome" value={name} onChangeText={setName} autoCapitalize="words" />
        <DatePicker label="Data de nascimento" value={birthDate} onChange={setBirthDate} maximumDate={new Date()} minimumDate={new Date(1920, 0, 1)} />
        <Text style={{ marginTop: 18, marginHorizontal: 4, fontSize: 15, lineHeight: 20, fontWeight: '600', color: t.ink }}>Sexo</Text>
        <ChipRow style={{ marginTop: 8 }}>
          {SEXES.map((option) => (
            <Chip key={option.value} label={option.label} selected={sex === option.value} choice onPress={() => setSex(option.value)} />
          ))}
        </ChipRow>
        <Button title="Guardar" onPress={saveAbout} loading={savingAbout} style={{ marginTop: 22 }} />
      </Sheet>

      <Sheet visible={!!editingHabit} onClose={() => setEditingHabit(null)}>
        {editingHabit ? (
          <HabitQuestion habit={editingHabit} selected={habitIndex(editingHabit, profile)} onSelect={(index) => saveHabit(editingHabit, index)} />
        ) : null}
      </Sheet>

      <Sheet visible={editingFamily} onClose={() => setEditingFamily(false)} title="Histórico familiar">
        <View style={{ marginTop: 14 }}>
          <FamilyPicker entries={familyHistory} open={openEvents} onOpenChange={setOpenEvents} onAdd={handleAddFamily} onRemove={handleRemoveFamily} />
        </View>
        <Button title="Concluído" onPress={() => setEditingFamily(false)} style={{ marginTop: 22 }} />
      </Sheet>

      <Sheet visible={showPassword} onClose={() => setShowPassword(false)} title="Mudar palavra-passe">
        {passwordError ? <Banner tone="out" text={passwordError} /> : null}
        <PasswordInput label="Palavra-passe atual" value={currentPassword} onChangeText={setCurrentPassword} />
        <PasswordInput label="Nova palavra-passe" value={newPassword} onChangeText={setNewPassword} isNew hint="Pelo menos 6 caracteres." />
        <Button title="Atualizar" onPress={handleChangePassword} loading={savingPassword} style={{ marginTop: 22 }} />
      </Sheet>
    </Screen>
  );
}
