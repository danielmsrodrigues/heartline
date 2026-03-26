import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ActivityIndicator,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useOnboardingContext } from '@/app/_layout';
import { Ionicons } from '@expo/vector-icons';
import { ChevronLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useProfile } from '@/hooks/useProfile';

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

export default function FamilyOnboardingScreen() {
  const router = useRouter();
  const { markOnboardingDone } = useOnboardingContext();
  const { familyHistory, addFamilyEntry, removeFamilyEntry, updateProfile } = useProfile();

  const [showForm, setShowForm] = useState(false);
  const [famRelationship, setFamRelationship] = useState<string | null>(null);
  const [famEventType, setFamEventType] = useState<string | null>(null);
  const [famEventAge, setFamEventAge] = useState('');
  const [famNotes, setFamNotes] = useState('');
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleAddEntry = async () => {
    if (!famRelationship || !famEventType) {
      setError('Seleciona o familiar e o evento.');
      return;
    }
    setAdding(true);
    setError('');
    const result = await addFamilyEntry({
      relationship: famRelationship.toLowerCase(),
      event_type: famEventType.toLowerCase(),
      event_age: famEventAge ? parseInt(famEventAge, 10) : null,
      notes: famNotes.trim() || null,
    });
    setAdding(false);
    if (result) {
      setError('Erro ao adicionar.');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setFamRelationship(null);
      setFamEventType(null);
      setFamEventAge('');
      setFamNotes('');
      animateLayout();
      setShowForm(false);
    }
  };

  const handleRemove = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    removeFamilyEntry(id);
  };

  const handleContinue = async () => {
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await updateProfile({ onboarding_completed: true });
    setSaving(false);
    // Tell the layout directly — it will navigate to tabs
    markOnboardingDone();
  };

  const handleSkip = async () => {
    setSaving(true);
    await updateProfile({ onboarding_completed: true });
    setSaving(false);
    markOnboardingDone();
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0A0A0A]">
      {/* Back button */}
      <TouchableOpacity
        onPress={() => { Haptics.selectionAsync(); router.back(); }}
        style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}
        activeOpacity={0.7}
      >
        <ChevronLeft size={20} color="#888888" />
        <Text style={{ fontSize: 14, color: '#888888' }}>Voltar</Text>
      </TouchableOpacity>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="px-6 pt-6">
            <Text style={{ fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginBottom: 6 }}>
              Histórico familiar
            </Text>
            <Text style={{ fontSize: 14, color: '#555555', marginBottom: 24 }}>
              Eventos cardiovasculares na tua família
            </Text>

            {error ? (
              <View style={{ backgroundColor: 'rgba(226,75,74,0.12)', borderRadius: 12, padding: 10, marginBottom: 16 }}>
                <Text style={{ color: '#E24B4A', fontSize: 13, textAlign: 'center' }}>{error}</Text>
              </View>
            ) : null}

            {/* Existing entries */}
            <View className="bg-[#111111] rounded-2xl border border-[#151515] overflow-hidden">
              {familyHistory.map((entry) => (
                <TouchableOpacity
                  key={entry.id}
                  onPress={() => handleRemove(entry.id)}
                  activeOpacity={0.7}
                  className="flex-row items-center justify-between py-3.5 px-4 border-b border-[#151515]"
                >
                  <Text className="text-base text-[#888888] capitalize flex-1">
                    {entry.relationship} — {entry.event_type}{entry.event_age ? ` aos ${entry.event_age} anos` : ''}
                  </Text>
                  <Ionicons name="trash-outline" size={16} color="#555555" />
                </TouchableOpacity>
              ))}

              {/* Add button */}
              <TouchableOpacity
                onPress={() => { animateLayout(); setShowForm(!showForm); }}
                className="py-3.5 px-4"
                activeOpacity={0.7}
              >
                <View className="flex-row items-center justify-center" style={{ gap: 6 }}>
                  <Text className="text-base text-[#1D9E75] font-medium">Adicionar familiar</Text>
                  <Ionicons name={showForm ? 'chevron-up' : 'chevron-down'} size={16} color="#1D9E75" />
                </View>
              </TouchableOpacity>

              {/* Inline form (matches Settings style) */}
              {showForm && (
                <View className="px-4 pb-4 border-t border-[#151515]">
                  <Text className="text-xs font-semibold text-[#555555] tracking-wider uppercase mt-3 mb-2">Familiar</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                    <View className="flex-row" style={{ gap: 6 }}>
                      {RELATIONSHIPS.map((r) => (
                        <TouchableOpacity
                          key={r}
                          onPress={() => { Haptics.selectionAsync(); setFamRelationship(r); }}
                          className={`px-3.5 py-2 rounded-full border ${famRelationship === r ? 'bg-[#1D9E75] border-[#1D9E75]' : 'bg-[#0A0A0A] border-[#151515]'}`}
                        >
                          <Text className={`text-sm ${famRelationship === r ? 'text-white font-medium' : 'text-[#888888]'}`}>{r}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>

                  <Text className="text-xs font-semibold text-[#555555] tracking-wider uppercase mb-2">Evento</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                    <View className="flex-row" style={{ gap: 6 }}>
                      {EVENT_TYPES.map((e) => (
                        <TouchableOpacity
                          key={e}
                          onPress={() => { Haptics.selectionAsync(); setFamEventType(e); }}
                          className={`px-3.5 py-2 rounded-full border ${famEventType === e ? 'bg-[#1D9E75] border-[#1D9E75]' : 'bg-[#0A0A0A] border-[#151515]'}`}
                        >
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
                    <TouchableOpacity
                      onPress={() => { animateLayout(); setShowForm(false); setFamRelationship(null); setFamEventType(null); setFamEventAge(''); setFamNotes(''); }}
                      activeOpacity={0.7}
                    >
                      <Text className="text-base text-[#888888]">Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleAddEntry}
                      activeOpacity={0.7}
                      disabled={!famRelationship || !famEventType || adding}
                      className={`rounded-xl px-5 py-2 ${famRelationship && famEventType ? 'bg-[#1D9E75]' : 'bg-[#1D9E75]/40'}`}
                    >
                      {adding ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text className="text-base text-white font-medium">Adicionar</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* Continue */}
            <View style={{ marginTop: 24 }}>
              <TouchableOpacity
                onPress={handleContinue}
                disabled={saving}
                activeOpacity={0.8}
                style={{
                  backgroundColor: '#1D9E75',
                  borderRadius: 14,
                  paddingVertical: 16,
                  alignItems: 'center',
                }}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>Continuar</Text>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={handleSkip} style={{ marginTop: 12 }}>
              <Text style={{ textAlign: 'center', fontSize: 14, color: '#555555' }}>
                Saltar — não tenho histórico familiar relevante
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
