import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProfile } from '@/hooks/useProfile';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const RELATIONSHIPS = [
  'Pai',
  'Mãe',
  'Irmão',
  'Irmã',
  'Avô paterno',
  'Avó paterna',
  'Avô materno',
  'Avó materna',
  'Tio/Tia paterno',
  'Tio/Tia materno',
  'Outro',
];

const EVENT_TYPES = [
  'Enfarte',
  'AVC',
  'Trombose',
  'Arritmia',
  'Hipertensão',
  'Colesterol elevado',
  'Diabetes',
  'Morte súbita',
  'Outro',
];

export default function FamilyOnboardingScreen() {
  const router = useRouter();
  const { familyHistory, addFamilyEntry, removeFamilyEntry, updateProfile } =
    useProfile();

  const [relationship, setRelationship] = useState<string | null>(null);
  const [eventType, setEventType] = useState<string | null>(null);
  const [eventAge, setEventAge] = useState('');
  const [notes, setNotes] = useState('');
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const handleAddEntry = async () => {
    if (!relationship) {
      setError('Seleciona o familiar.');
      return;
    }
    if (!eventType) {
      setError('Seleciona o tipo de evento.');
      return;
    }

    setAdding(true);
    setError('');

    try {
      const result = await addFamilyEntry({
        relationship: relationship.toLowerCase(),
        event_type: eventType.toLowerCase(),
        event_age: eventAge ? parseInt(eventAge, 10) : null,
        notes: notes.trim() || null,
      });

      setAdding(false);

      if (result) {
        setError(`Erro ao adicionar: ${result.message}`);
      } else {
        setRelationship(null);
        setEventType(null);
        setEventAge('');
        setNotes('');
        setShowForm(false);
      }
    } catch (err: any) {
      setAdding(false);
      setError(`Erro: ${err.message ?? 'Tenta novamente.'}`);
    }
  };

  const handleContinue = async () => {
    setSaving(true);
    await updateProfile({ onboarding_completed: true });
    setSaving(false);
    router.replace('/(tabs)');
  };

  const handleSkip = async () => {
    setSaving(true);
    await updateProfile({ onboarding_completed: true });
    setSaving(false);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="px-6 pt-12">
            <Text className="text-2xl font-bold text-gray-900">
              Histórico familiar
            </Text>
            <Text className="mt-2 text-base text-gray-500 mb-6">
              Eventos cardiovasculares na tua família
            </Text>

            {error ? (
              <View className="bg-red-50 rounded-xl p-3 mb-4">
                <Text className="text-red-600 text-sm text-center">
                  {error}
                </Text>
              </View>
            ) : null}

            {/* Existing entries */}
            {familyHistory.map((entry) => (
              <Card key={entry.id} className="mb-3">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-gray-900 capitalize">
                      {entry.relationship}
                    </Text>
                    <Text className="text-sm text-gray-600 capitalize">
                      {entry.event_type}
                      {entry.event_age
                        ? ` aos ${entry.event_age} anos`
                        : ''}
                    </Text>
                    {entry.notes ? (
                      <Text className="text-xs text-gray-400 mt-0.5">{entry.notes}</Text>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    onPress={() => removeFamilyEntry(entry.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="trash-outline" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              </Card>
            ))}

            {/* Add new entry form */}
            {showForm ? (
              <Card className="mb-4">
                <Text className="text-sm font-semibold text-gray-900 mb-3">
                  Adicionar familiar
                </Text>

                {/* Relationship picker */}
                <Text className="text-xs font-medium text-gray-600 mb-1.5">
                  Familiar
                </Text>
                <View className="flex-row flex-wrap mb-3">
                  {RELATIONSHIPS.map((rel) => (
                    <TouchableOpacity
                      key={rel}
                      onPress={() => setRelationship(rel)}
                      className={`px-3 py-2 rounded-lg mr-2 mb-2 border ${
                        relationship === rel
                          ? 'bg-[#8CB369] border-[#8CB369]'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <Text
                        className={`text-xs font-medium ${
                          relationship === rel
                            ? 'text-white'
                            : 'text-gray-700'
                        }`}
                      >
                        {rel}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Event type picker */}
                <Text className="text-xs font-medium text-gray-600 mb-1.5">
                  Tipo de evento
                </Text>
                <View className="flex-row flex-wrap mb-3">
                  {EVENT_TYPES.map((evt) => (
                    <TouchableOpacity
                      key={evt}
                      onPress={() => setEventType(evt)}
                      className={`px-3 py-2 rounded-lg mr-2 mb-2 border ${
                        eventType === evt
                          ? 'bg-[#8CB369] border-[#8CB369]'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <Text
                        className={`text-xs font-medium ${
                          eventType === evt ? 'text-white' : 'text-gray-700'
                        }`}
                      >
                        {evt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Input
                  label="Idade do familiar no evento (opcional)"
                  value={eventAge}
                  onChangeText={setEventAge}
                  placeholder="Ex: 48"
                  keyboardType="number-pad"
                />

                <Input
                  label="Notas adicionais (opcional)"
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Ex: medicado desde os 50 anos"
                  multiline
                />

                <View className="flex-row mt-1">
                  <View className="flex-1 mr-2">
                    <Button
                      title="Cancelar"
                      variant="secondary"
                      onPress={() => {
                        setShowForm(false);
                        setRelationship(null);
                        setEventType(null);
                        setEventAge('');
                        setNotes('');
                        setError('');
                      }}
                    />
                  </View>
                  <View className="flex-1">
                    <Button
                      title="Adicionar"
                      onPress={handleAddEntry}
                      loading={adding}
                    />
                  </View>
                </View>
              </Card>
            ) : (
              <TouchableOpacity
                onPress={() => setShowForm(true)}
                className="flex-row items-center justify-center py-3 mb-4 border border-dashed border-gray-300 rounded-xl"
              >
                <Ionicons name="add-circle-outline" size={20} color="#8CB369" />
                <Text className="text-sm font-medium text-[#8CB369] ml-2">
                  Adicionar evento familiar
                </Text>
              </TouchableOpacity>
            )}

            <View className="mt-4">
              <Button
                title="Continuar"
                onPress={handleContinue}
                loading={saving}
              />
            </View>

            <TouchableOpacity onPress={handleSkip} className="mt-3">
              <Text className="text-center text-sm text-gray-400">
                Saltar — não tenho histórico familiar relevante
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
