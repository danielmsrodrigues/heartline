import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProfile } from '@/hooks/useProfile';
import { useBiomarkers } from '@/hooks/useBiomarkers';
import { useGeneratedContent } from '@/hooks/useGeneratedContent';
import { BiomarkerRow } from '@/components/biomarker-row';
import { NarrativeCard } from '@/components/narrative-card';
import { QuestionsCard } from '@/components/questions-card';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function DashboardScreen() {
  const router = useRouter();
  const {
    profile,
    familyHistory,
    loading: profileLoading,
    refetch: refetchProfile,
  } = useProfile();
  const {
    biomarkers,
    loading: bioLoading,
    refetch: refetchBio,
  } = useBiomarkers(familyHistory.length > 0);
  const {
    narrative,
    questions,
    loading: contentLoading,
    generating,
    regenerate,
    refetch: refetchContent,
  } = useGeneratedContent();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchProfile(), refetchBio(), refetchContent()]);
    setRefreshing(false);
  }, [refetchProfile, refetchBio, refetchContent]);

  // Incompleteness check
  const missing: string[] = [];
  if (profile) {
    if (!profile.sleep_hours_avg) missing.push('Dados de sono');
    if (!profile.exercise_minutes_per_week) missing.push('Minutos de exercício');
    if (familyHistory.length === 0) missing.push('Histórico familiar');
  }

  // Positive factors
  const positives: string[] = [];
  if (profile) {
    if (
      profile.exercise_minutes_per_week &&
      profile.exercise_minutes_per_week >= 150
    )
      positives.push('Praticas exercício regularmente');
    else if (
      profile.exercise_minutes_per_week &&
      profile.exercise_minutes_per_week > 0
    )
      positives.push('Já incluis exercício na tua rotina');
    if (!profile.smoker) positives.push('Não fumas');
    if (profile.sleep_hours_avg && profile.sleep_hours_avg >= 7)
      positives.push('Dormes o suficiente');
  }

  const hasData = biomarkers.length > 0;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8CB369"
          />
        }
      >
        {/* Header */}
        <Text className="text-2xl font-bold text-gray-900">Heartline</Text>
        {profile?.name && (
          <Text className="text-base text-gray-500 mt-0.5">
            Olá, {profile.name}
          </Text>
        )}

        {/* Incompleteness badge */}
        {missing.length > 0 && (
          <View className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-4">
            <View className="flex-row items-center mb-1">
              <Ionicons name="alert-circle-outline" size={16} color="#B8860B" />
              <Text className="text-sm font-semibold text-amber-800 ml-1.5">
                Perfil incompleto
              </Text>
            </View>
            <Text className="text-xs text-amber-700">
              Falta: {missing.join(', ')}
            </Text>
          </View>
        )}

        {/* Empty state */}
        {!hasData && !bioLoading && (
          <Card className="mt-6 items-center py-8">
            <Ionicons name="document-text-outline" size={48} color="#D1D5DB" />
            <Text className="text-base font-semibold text-gray-700 mt-3">
              Sem exames ainda
            </Text>
            <Text className="text-sm text-gray-500 mt-1 text-center px-4">
              Adiciona o teu primeiro exame para ver os teus biomarcadores.
            </Text>
            <View className="mt-4">
              <Button
                title="Adicionar exame"
                onPress={() => router.push('/(tabs)/add-exam')}
              />
            </View>
          </Card>
        )}

        {/* Biomarkers list */}
        {hasData && (
          <View className="mt-6">
            <Text className="text-lg font-semibold text-gray-900 mb-3">
              Os teus biomarcadores
            </Text>
            {biomarkers.map((b) => (
              <BiomarkerRow key={b.name_normalized} biomarker={b} />
            ))}
          </View>
        )}

        {/* Narrative */}
        {hasData && (
          <View className="mt-4">
            <NarrativeCard
              narrative={narrative}
              loading={contentLoading || generating}
            />
          </View>
        )}

        {/* Positive factors */}
        {positives.length > 0 && (
          <Card className="mb-4">
            <Text className="text-base font-semibold text-gray-900 mb-2">
              O que está a teu favor
            </Text>
            {positives.map((p, i) => (
              <View key={i} className="flex-row items-center mt-1.5">
                <Ionicons name="checkmark-circle" size={18} color="#8CB369" />
                <Text className="text-sm text-gray-700 ml-2">{p}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* Questions */}
        {hasData && (
          <QuestionsCard
            questions={questions}
            loading={contentLoading || generating}
          />
        )}

        {/* Disclaimer */}
        <View className="mt-4 mb-2 flex-row items-start bg-blue-50 rounded-xl p-3 border border-blue-100">
          <Ionicons
            name="information-circle"
            size={18}
            color="#3B82F6"
            style={{ marginTop: 1 }}
          />
          <Text className="text-xs text-blue-700 ml-2 flex-1 leading-4">
            O Heartline organiza os teus dados de saúde mas não substitui
            avaliação médica profissional. Fala sempre com o teu médico sobre os
            teus resultados.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
