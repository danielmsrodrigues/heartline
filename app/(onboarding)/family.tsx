import { useState } from 'react';
import { useOnboardingContext } from '@/app/_layout';
import { useProfile } from '@/hooks/useProfile';
import { haptics } from '@/lib/haptics';
import { FamilyPicker } from '@/components/family-history-form';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Sub, Title } from '@/components/ui/Text';
import { TopBar } from '@/components/ui/TopBar';

export default function FamilyOnboardingScreen() {
  const { markOnboardingDone } = useOnboardingContext();
  const { familyHistory, addFamilyEntry, removeFamilyEntry, updateProfile } = useProfile();
  const [open, setOpen] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleAdd = async (entry: Parameters<typeof addFamilyEntry>[0]) => {
    setError('');
    const result = await addFamilyEntry(entry);
    if (result) setError('Não foi possível guardar. Tenta novamente.');
  };

  const complete = async () => {
    setSaving(true);
    setError('');
    const result = await updateProfile({ onboarding_completed: true });
    setSaving(false);
    if (result) {
      haptics.warning();
      setError('Não foi possível guardar. Tenta novamente.');
      return;
    }
    haptics.success();
    // O layout raiz trata de navegar para as tabs.
    markOnboardingDone();
  };

  const none = familyHistory.length === 0;
  return (
    <Screen footer={<Button title={none ? 'Ninguém, que eu saiba' : 'Concluir'} onPress={complete} loading={saving} />}>
      <TopBar progress={3} />
      <Title style={{ marginTop: 24 }}>Histórico familiar</Title>
      <Sub style={{ marginTop: 8, fontSize: 16, lineHeight: 23, marginBottom: 16 }}>Alguém da família próxima tem ou teve?</Sub>
      {error ? <Banner tone="out" text={error} /> : null}
      <FamilyPicker entries={familyHistory} open={open} onOpenChange={setOpen} onAdd={handleAdd} onRemove={removeFamilyEntry} />
    </Screen>
  );
}
