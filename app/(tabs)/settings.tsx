import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Alert, Share, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { Exam } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { DatePicker } from '@/components/ui/DatePicker';

const RELATIONSHIPS = [
  'Pai', 'Mãe', 'Irmão', 'Irmã',
  'Avô paterno', 'Avó paterna', 'Avô materno', 'Avó materna',
  'Tio/Tia paterno', 'Tio/Tia materno', 'Outro',
];

const EVENT_TYPES = [
  'Enfarte', 'AVC', 'Trombose', 'Arritmia',
  'Hipertensão', 'Colesterol elevado', 'Diabetes', 'Morte súbita', 'Outro',
];

export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, familyHistory, addFamilyEntry, removeFamilyEntry, refetch: refetchProfile } = useProfile();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);

  // Family history editing
  const [showFamilyForm, setShowFamilyForm] = useState(false);
  const [famRelationship, setFamRelationship] = useState<string | null>(null);
  const [famEventType, setFamEventType] = useState<string | null>(null);
  const [famEventAge, setFamEventAge] = useState('');
  const [famNotes, setFamNotes] = useState('');
  const [addingFamily, setAddingFamily] = useState(false);

  const handleAddFamily = async () => {
    if (!famRelationship || !famEventType) return;
    setAddingFamily(true);
    const err = await addFamilyEntry({
      relationship: famRelationship.toLowerCase(),
      event_type: famEventType.toLowerCase(),
      event_age: famEventAge ? parseInt(famEventAge) : null,
      notes: famNotes.trim() || null,
    });
    if (err) {
      Alert.alert('Erro', 'Não foi possível adicionar.');
    } else {
      setFamRelationship(null);
      setFamEventType(null);
      setFamEventAge('');
      setFamNotes('');
      setShowFamilyForm(false);
      await refetchProfile();
    }
    setAddingFamily(false);
  };

  const handleRemoveFamily = (id: string) => {
    Alert.alert('Remover', 'Tens a certeza que queres remover esta entrada?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          await removeFamilyEntry(id);
          await refetchProfile();
        },
      },
    ]);
  };
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [editName, setEditName] = useState('');
  const [editBirthDate, setEditBirthDate] = useState<Date | null>(null);
  const [editSex, setEditSex] = useState('');
  const [editSmoker, setEditSmoker] = useState(false);
  const [editExercise, setEditExercise] = useState('');
  const [editSedentary, setEditSedentary] = useState(false);
  const [editSleep, setEditSleep] = useState('');

  const startEditing = () => {
    setEditName(profile?.name ?? '');
    setEditBirthDate(profile?.birth_date ? new Date(profile.birth_date) : null);
    setEditSex(profile?.sex ?? '');
    setEditSmoker(profile?.smoker ?? false);
    setEditExercise(profile?.exercise_minutes_per_week?.toString() ?? '');
    setEditSedentary(profile?.sedentary_work ?? false);
    setEditSleep(profile?.sleep_hours_avg?.toString() ?? '');
    setEditing(true);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: editName.trim() || null,
          birth_date: editBirthDate ? editBirthDate.toISOString().split('T')[0] : null,
          sex: editSex || null,
          smoker: editSmoker,
          exercise_minutes_per_week: editExercise ? parseInt(editExercise) : null,
          sedentary_work: editSedentary,
          sleep_hours_avg: editSleep ? parseFloat(editSleep) : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      if (error) throw error;
      await refetchProfile();
      setEditing(false);
    } catch (err) {
      console.error('Save profile error:', err);
      Alert.alert('Erro', 'Não foi possível guardar as alterações.');
    } finally {
      setSaving(false);
    }
  };

  // Change password
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordError('Preenche todos os campos.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('A nova palavra-passe deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('As palavras-passe não coincidem.');
      return;
    }
    setSavingPassword(true);
    setPasswordError('');

    // Verify current password
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user?.email ?? '',
      password: currentPassword,
    });
    if (verifyError) {
      setSavingPassword(false);
      setPasswordError('Palavra-passe atual incorreta.');
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setSavingPassword(false);

    if (updateError) {
      setPasswordError('Não foi possível atualizar. Tenta novamente.');
    } else {
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setTimeout(() => {
        setShowPasswordForm(false);
        setPasswordSuccess(false);
      }, 2000);
    }
  };

  // Exams management
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
      setExams(
        data.map((e: any) => ({
          ...e,
          biomarker_count: e.biomarkers?.[0]?.count ?? 0,
        }))
      );
    }
    setLoadingExams(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchExams();
    }, [fetchExams])
  );

  const handleDeleteExam = (examId: string, examDate: string) => {
    Alert.alert(
      'Apagar exame',
      `Tens a certeza que queres apagar o exame de ${formatExamDate(examDate)}? Os biomarcadores associados serão também apagados.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: async () => {
            // Biomarkers cascade on delete via FK
            await supabase.from('biomarkers').delete().eq('exam_id', examId);
            await supabase.from('exams').delete().eq('id', examId);
            await fetchExams();
          },
        },
      ]
    );
  };

  const handleDeleteAllExams = () => {
    if (exams.length === 0) return;
    Alert.alert(
      'Apagar todos os exames',
      'Tens a certeza? Todos os exames e biomarcadores serão permanentemente apagados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar tudo',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            await supabase.from('biomarkers').delete().eq('profile_id', user.id);
            await supabase.from('exams').delete().eq('profile_id', user.id);
            await supabase.from('generated_content').delete().eq('profile_id', user.id);
            await fetchExams();
          },
        },
      ]
    );
  };

  const formatExamDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  };

  const age = profile?.birth_date
    ? Math.floor(
        (Date.now() - new Date(profile.birth_date).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000)
      )
    : null;

  const sexLabel =
    profile?.sex === 'M'
      ? 'Masculino'
      : profile?.sex === 'F'
      ? 'Feminino'
      : profile?.sex === 'other'
      ? 'Outro'
      : '—';

  const handleExportData = async () => {
    if (!user) return;
    setExporting(true);

    try {
      const [profileRes, familyRes, examsRes, biomarkersRes, contentRes] =
        await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).single(),
          supabase
            .from('family_history')
            .select('*')
            .eq('profile_id', user.id),
          supabase.from('exams').select('*').eq('profile_id', user.id),
          supabase.from('biomarkers').select('*').eq('profile_id', user.id),
          supabase
            .from('generated_content')
            .select('*')
            .eq('profile_id', user.id),
        ]);

      const exportData = {
        exported_at: new Date().toISOString(),
        profile: profileRes.data,
        family_history: familyRes.data,
        exams: examsRes.data,
        biomarkers: biomarkersRes.data,
        generated_content: contentRes.data,
      };

      await Share.share({
        message: JSON.stringify(exportData, null, 2),
        title: 'Heartline — Os meus dados',
      });
    } catch (err) {
      console.error('Export error:', err);
      Alert.alert('Erro', 'Não foi possível exportar os dados.');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Apagar conta',
      'Tens a certeza? Esta ação é irreversível. Todos os teus dados serão permanentemente apagados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar tudo',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            setDeleting(true);
            try {
              // Delete all user data in order (foreign key constraints)
              await supabase
                .from('generated_content')
                .delete()
                .eq('profile_id', user.id);
              await supabase
                .from('biomarkers')
                .delete()
                .eq('profile_id', user.id);
              await supabase
                .from('exams')
                .delete()
                .eq('profile_id', user.id);
              await supabase
                .from('family_history')
                .delete()
                .eq('profile_id', user.id);
              await supabase.from('profiles').delete().eq('id', user.id);

              // Sign out
              await supabase.auth.signOut();
            } catch (err) {
              console.error('Delete error:', err);
              Alert.alert(
                'Erro',
                'Não foi possível apagar a conta. Tenta novamente.'
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text className="text-2xl font-bold text-gray-900 mb-4">Perfil</Text>

        {/* Profile info */}
        <Card className="mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-semibold text-gray-900">
              Dados pessoais
            </Text>
            {!editing && (
              <TouchableOpacity onPress={startEditing}>
                <Ionicons name="pencil-outline" size={18} color="#8CB369" />
              </TouchableOpacity>
            )}
          </View>

          {editing ? (
            <>
              <Input
                label="Nome"
                value={editName}
                onChangeText={setEditName}
                placeholder="O teu nome"
              />
              <DatePicker
                label="Data de nascimento"
                value={editBirthDate}
                onChange={setEditBirthDate}
                maximumDate={new Date()}
                minimumDate={new Date(1940, 0, 1)}
              />
              <Text className="text-sm font-medium text-gray-700 mb-1.5">Sexo</Text>
              <View className="flex-row mb-4">
                {[{ value: 'M', label: 'Masculino' }, { value: 'F', label: 'Feminino' }, { value: 'other', label: 'Outro' }].map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setEditSex(opt.value)}
                    className={`px-3 py-2 rounded-lg mr-2 border ${
                      editSex === opt.value ? 'bg-[#8CB369] border-[#8CB369]' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <Text className={`text-sm ${editSex === opt.value ? 'text-white font-medium' : 'text-gray-600'}`}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-sm text-gray-700">Fumador(a)</Text>
                <Switch value={editSmoker} onValueChange={setEditSmoker} trackColor={{ true: '#8CB369' }} />
              </View>
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-sm text-gray-700">Trabalho sedentário</Text>
                <Switch value={editSedentary} onValueChange={setEditSedentary} trackColor={{ true: '#8CB369' }} />
              </View>

              <View className="flex-row">
                <View className="flex-1 mr-2">
                  <Input
                    label="Exercício (min/semana)"
                    value={editExercise}
                    onChangeText={setEditExercise}
                    placeholder="0"
                    keyboardType="number-pad"
                  />
                </View>
                <View className="flex-1">
                  <Input
                    label="Sono (horas/noite)"
                    value={editSleep}
                    onChangeText={setEditSleep}
                    placeholder="0"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View className="flex-row mt-2">
                <View className="flex-1 mr-2">
                  <Button title="Cancelar" variant="secondary" onPress={() => setEditing(false)} />
                </View>
                <View className="flex-1">
                  <Button title="Guardar" onPress={handleSaveProfile} loading={saving} />
                </View>
              </View>
            </>
          ) : (
            <>
              <View className="mb-2">
                <Text className="text-xs text-gray-500">Nome</Text>
                <Text className="text-sm text-gray-900">{profile?.name ?? '—'}</Text>
              </View>
              <View className="flex-row mb-2">
                <View className="flex-1">
                  <Text className="text-xs text-gray-500">Idade</Text>
                  <Text className="text-sm text-gray-900">{age != null ? `${age} anos` : '—'}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-gray-500">Sexo</Text>
                  <Text className="text-sm text-gray-900">{sexLabel}</Text>
                </View>
              </View>
              <View className="flex-row mb-2">
                <View className="flex-1">
                  <Text className="text-xs text-gray-500">Fumador(a)</Text>
                  <Text className="text-sm text-gray-900">{profile?.smoker ? 'Sim' : 'Não'}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-gray-500">Trabalho sedentário</Text>
                  <Text className="text-sm text-gray-900">{profile?.sedentary_work ? 'Sim' : 'Não'}</Text>
                </View>
              </View>
              <View className="flex-row">
                <View className="flex-1">
                  <Text className="text-xs text-gray-500">Exercício / semana</Text>
                  <Text className="text-sm text-gray-900">
                    {profile?.exercise_minutes_per_week ? `${profile.exercise_minutes_per_week} min` : '—'}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-gray-500">Sono / noite</Text>
                  <Text className="text-sm text-gray-900">
                    {profile?.sleep_hours_avg ? `${profile.sleep_hours_avg}h` : '—'}
                  </Text>
                </View>
              </View>
            </>
          )}
        </Card>

        {/* Family history */}
        <Card className="mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-semibold text-gray-900">
              Histórico familiar
            </Text>
            {!showFamilyForm && (
              <TouchableOpacity onPress={() => setShowFamilyForm(true)}>
                <Ionicons name="add-circle-outline" size={20} color="#8CB369" />
              </TouchableOpacity>
            )}
          </View>

          {familyHistory.length > 0 ? (
            familyHistory.map((entry) => (
              <View key={entry.id} className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center flex-1">
                  <Ionicons name="people-outline" size={14} color="#9CA3AF" />
                  <Text className="text-sm text-gray-700 ml-2 capitalize flex-1">
                    {entry.relationship} — {entry.event_type}
                    {entry.event_age ? ` aos ${entry.event_age} anos` : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleRemoveFamily(entry.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close-circle" size={18} color="#D1D5DB" />
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text className="text-sm text-gray-400 mb-2">
              Sem histórico familiar registado
            </Text>
          )}

          {showFamilyForm && (
            <View className="mt-3 pt-3 border-t border-gray-100">
              <Text className="text-sm font-medium text-gray-700 mb-1.5">Familiar</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                {RELATIONSHIPS.map((r) => (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setFamRelationship(r)}
                    className={`px-2.5 py-1.5 rounded-lg mr-1.5 border ${
                      famRelationship === r ? 'bg-[#8CB369] border-[#8CB369]' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <Text className={`text-xs ${famRelationship === r ? 'text-white font-medium' : 'text-gray-600'}`}>
                      {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text className="text-sm font-medium text-gray-700 mb-1.5">Evento</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                {EVENT_TYPES.map((e) => (
                  <TouchableOpacity
                    key={e}
                    onPress={() => setFamEventType(e)}
                    className={`px-2.5 py-1.5 rounded-lg mr-1.5 border ${
                      famEventType === e ? 'bg-[#8CB369] border-[#8CB369]' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <Text className={`text-xs ${famEventType === e ? 'text-white font-medium' : 'text-gray-600'}`}>
                      {e}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View className="flex-row">
                <View className="flex-1 mr-2">
                  <Input
                    label="Idade no evento"
                    value={famEventAge}
                    onChangeText={setFamEventAge}
                    placeholder="Ex: 48"
                    keyboardType="number-pad"
                  />
                </View>
                <View className="flex-1">
                  <Input
                    label="Notas (opcional)"
                    value={famNotes}
                    onChangeText={setFamNotes}
                    placeholder="Detalhes"
                  />
                </View>
              </View>

              <View className="flex-row mt-1">
                <View className="flex-1 mr-2">
                  <Button title="Cancelar" variant="secondary" onPress={() => setShowFamilyForm(false)} />
                </View>
                <View className="flex-1">
                  <Button
                    title="Adicionar"
                    onPress={handleAddFamily}
                    loading={addingFamily}
                    disabled={!famRelationship || !famEventType}
                  />
                </View>
              </View>
            </View>
          )}
        </Card>

        {/* Change password */}
        <Card className="mb-4">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-base font-semibold text-gray-900">
              Palavra-passe
            </Text>
            {!showPasswordForm && (
              <TouchableOpacity onPress={() => { setShowPasswordForm(true); setPasswordError(''); setPasswordSuccess(false); }}>
                <Ionicons name="pencil-outline" size={18} color="#8CB369" />
              </TouchableOpacity>
            )}
          </View>

          {showPasswordForm ? (
            <View className="mt-2">
              {passwordError ? (
                <View className="bg-red-50 rounded-lg p-2 mb-3">
                  <Text className="text-red-600 text-xs text-center">{passwordError}</Text>
                </View>
              ) : null}
              {passwordSuccess ? (
                <View className="bg-green-50 rounded-lg p-2 mb-3">
                  <Text className="text-green-700 text-xs text-center">Palavra-passe atualizada!</Text>
                </View>
              ) : null}
              <Input
                label="Palavra-passe atual"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                placeholder="••••••••"
              />
              <Input
                label="Nova palavra-passe"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholder="••••••••"
              />
              <Input
                label="Confirmar nova palavra-passe"
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
                secureTextEntry
                placeholder="••••••••"
              />
              <View className="flex-row mt-1">
                <View className="flex-1 mr-2">
                  <Button title="Cancelar" variant="secondary" onPress={() => { setShowPasswordForm(false); setPasswordError(''); }} />
                </View>
                <View className="flex-1">
                  <Button title="Guardar" onPress={handleChangePassword} loading={savingPassword} />
                </View>
              </View>
            </View>
          ) : (
            <Text className="text-xs text-gray-400">••••••••</Text>
          )}
        </Card>

        {/* Exams management */}
        <Card className="mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-semibold text-gray-900">
              Exames ({exams.length})
            </Text>
            {exams.length > 0 && (
              <TouchableOpacity onPress={handleDeleteAllExams}>
                <Text className="text-xs text-red-400">Apagar todos</Text>
              </TouchableOpacity>
            )}
          </View>

          {exams.length > 0 ? (
            exams.map((exam) => (
              <View key={exam.id} className="flex-row items-center justify-between py-2 border-b border-gray-50">
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-900">
                    {formatExamDate(exam.exam_date)}
                  </Text>
                  <Text className="text-xs text-gray-500">
                    {exam.lab_name || 'Sem laboratório'} · {exam.biomarker_count} biomarcador{exam.biomarker_count !== 1 ? 'es' : ''} · {exam.extraction_method === 'ai_extracted' ? 'Extração IA' : 'Manual'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteExam(exam.id, exam.exam_date)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  className="ml-3"
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text className="text-sm text-gray-400">
              Sem exames registados
            </Text>
          )}
        </Card>

        {/* Data actions */}
        <Card className="mb-4">
          <Text className="text-base font-semibold text-gray-900 mb-3">
            Os teus dados
          </Text>

          <View className="mb-3">
            <Button
              title="Exportar os meus dados"
              variant="secondary"
              onPress={handleExportData}
              loading={exporting}
            />
          </View>

          <Button
            title="Apagar conta e todos os dados"
            variant="danger"
            onPress={handleDeleteAccount}
            loading={deleting}
          />
        </Card>

        {/* GDPR info */}
        <View className="bg-blue-50 rounded-xl p-3 mb-4 border border-blue-100">
          <Text className="text-xs text-blue-700 leading-4">
            Os teus dados de saúde são encriptados e guardados na União Europeia.
            Nunca os vendemos ou partilhamos. Tens sempre o direito de exportar
            ou apagar os teus dados.
          </Text>
        </View>

        {/* Sign out */}
        <View className="mb-6">
          <Button title="Terminar sessão" variant="secondary" onPress={handleSignOut} />
        </View>

        {/* Version */}
        <Text className="text-xs text-gray-300 text-center">
          Heartline v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
