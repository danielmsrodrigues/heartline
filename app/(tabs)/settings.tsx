import { useState } from 'react';
import { View, Text, ScrollView, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, familyHistory } = useProfile();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
          <Text className="text-base font-semibold text-gray-900 mb-3">
            Dados pessoais
          </Text>

          <View className="mb-2">
            <Text className="text-xs text-gray-500">Nome</Text>
            <Text className="text-sm text-gray-900">
              {profile?.name ?? '—'}
            </Text>
          </View>

          <View className="flex-row mb-2">
            <View className="flex-1">
              <Text className="text-xs text-gray-500">Idade</Text>
              <Text className="text-sm text-gray-900">
                {age != null ? `${age} anos` : '—'}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-xs text-gray-500">Sexo</Text>
              <Text className="text-sm text-gray-900">{sexLabel}</Text>
            </View>
          </View>

          <View className="flex-row mb-2">
            <View className="flex-1">
              <Text className="text-xs text-gray-500">Fumador(a)</Text>
              <Text className="text-sm text-gray-900">
                {profile?.smoker ? 'Sim' : 'Não'}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-xs text-gray-500">
                Trabalho sedentário
              </Text>
              <Text className="text-sm text-gray-900">
                {profile?.sedentary_work ? 'Sim' : 'Não'}
              </Text>
            </View>
          </View>

          <View className="flex-row">
            <View className="flex-1">
              <Text className="text-xs text-gray-500">
                Exercício / semana
              </Text>
              <Text className="text-sm text-gray-900">
                {profile?.exercise_minutes_per_week
                  ? `${profile.exercise_minutes_per_week} min`
                  : '—'}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-xs text-gray-500">Sono / noite</Text>
              <Text className="text-sm text-gray-900">
                {profile?.sleep_hours_avg
                  ? `${profile.sleep_hours_avg}h`
                  : '—'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Family history summary */}
        <Card className="mb-4">
          <Text className="text-base font-semibold text-gray-900 mb-3">
            Histórico familiar
          </Text>
          {familyHistory.length > 0 ? (
            familyHistory.map((entry) => (
              <View key={entry.id} className="flex-row items-center mb-1.5">
                <Ionicons name="people-outline" size={14} color="#9CA3AF" />
                <Text className="text-sm text-gray-700 ml-2 capitalize">
                  {entry.relationship} — {entry.event_type}
                  {entry.event_age ? ` aos ${entry.event_age} anos` : ''}
                </Text>
              </View>
            ))
          ) : (
            <Text className="text-sm text-gray-400">
              Sem histórico familiar registado
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
