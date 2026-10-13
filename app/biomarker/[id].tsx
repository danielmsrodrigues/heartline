import { useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { formatValue, parseDecimal } from '@/lib/number';
import { haptics } from '@/lib/haptics';
import { useAuth } from '@/hooks/useAuth';
import { useBiomarkers, invalidateHealthData } from '@/hooks/useBiomarkers';
import { useProfile } from '@/hooks/useProfile';
import { useGeneratedContent } from '@/hooks/useGeneratedContent';
import { ATTENTION_LABELS } from '@/constants/colors';
import { BIOMARKER_DESCRIPTIONS } from '@/constants/biomarker-descriptions';
import { hasPlainName, plainLabel, toneOf } from '@/constants/plain-language';
import { useTheme } from '@/constants/theme';
import { EvolutionChart } from '@/components/evolution-chart';
import { RangeBar } from '@/components/range-bar';
import { Button } from '@/components/ui/Button';
import { Fact } from '@/components/ui/Chip';
import { Glass } from '@/components/ui/Glass';
import { Icon, IconName } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { Status } from '@/components/ui/List';
import { Screen } from '@/components/ui/Screen';
import { Sheet } from '@/components/ui/Sheet';
import { Body, Sub } from '@/components/ui/Text';
import { TintCard } from '@/components/ui/TintCard';
import { TopBar } from '@/components/ui/TopBar';

function CardTitle({ left, right }: { left: string; right?: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
      <Text style={{ fontSize: 15, lineHeight: 20, fontWeight: '600', color: t.sub }}>{left}</Text>
      {right ? <Text style={{ fontSize: 15, lineHeight: 20, fontWeight: '600', color: t.ink }}>{right}</Text> : null}
    </View>
  );
}

function referenceText(refMin: number | null, refMax: number | null, rangeType: string): string | undefined {
  if (rangeType === 'bounded') return `Referência: ${formatValue(refMin)} a ${formatValue(refMax)}`;
  if (rangeType === 'max_only') return `Referência: até ${formatValue(refMax)}`;
  if (rangeType === 'min_only') return `Referência: a partir de ${formatValue(refMin)}`;
  return undefined;
}

export default function BiomarkerDetailScreen() {
  const t = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { profile, familyHistory } = useProfile();
  const { biomarkers, loading: bioLoading } = useBiomarkers(familyHistory.length > 0);
  const { regenerate } = useGeneratedContent();
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  const biomarker = useMemo(() => biomarkers.find((b) => b.name_normalized === id), [biomarkers, id]);

  // Só se fala de tendência quando ela afasta o valor da zona de referência.
  const trendVerb = biomarker?.trend === 'a_descer' ? 'descer' : 'subir';

  const suggestedQuestion = useMemo(() => {
    if (!biomarker) return null;
    const name = biomarker.name;
    const val = formatValue(biomarker.latestValue);
    const unit = biomarker.unit;
    if (biomarker.attentionLevel === 'fora_do_range') {
      return `O meu valor de ${name} está em ${val} ${unit}, fora do intervalo de referência do laboratório. O que pergunto ao médico sobre isto?`;
    }
    if (biomarker.adverseTrend) {
      return `O meu ${name} tem vindo a ${trendVerb} (agora ${val} ${unit}). O que pode estar a influenciar esta tendência?`;
    }
    if (biomarker.attentionLevel !== 'dentro_do_esperado') {
      return `O meu ${name} está em ${val} ${unit}, perto do limite. Faz sentido acompanhar este valor mais de perto?`;
    }
    return `Explica-me o meu valor de ${name} (${val} ${unit}).`;
  }, [biomarker, trendVerb]);

  const handleStartEdit = () => {
    if (!biomarker) return;
    setEditValue(formatValue(biomarker.latestValue));
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!biomarker) return;
    const newValue = parseDecimal(editValue);
    if (newValue == null) { Alert.alert('Valor inválido', 'Escreve um número, por exemplo 4,2.'); return; }
    setSavingEdit(true);
    // readings vem ordenado do mais antigo para o mais recente
    const latestReading = biomarker.readings[biomarker.readings.length - 1];
    const { error } = await supabase.from('biomarkers').update({ value: newValue }).eq('id', latestReading.id);
    setSavingEdit(false);
    if (error) {
      haptics.warning();
      Alert.alert('Erro', 'Não foi possível guardar.');
    } else {
      haptics.success();
      setEditing(false);
      await invalidateHealthData(user?.id);
      regenerate().catch(() => {});
    }
  };

  if (bioLoading || !biomarker) {
    return (
      <Screen>
        <TopBar title={bioLoading ? '' : 'Valor'} />
        {!bioLoading && <Sub style={{ marginTop: 40, textAlign: 'center', fontSize: 16 }}>Não encontrei este valor.</Sub>}
      </Screen>
    );
  }

  const tone = toneOf(biomarker);
  const trendIcon: IconName = biomarker.trend === 'a_descer' ? 'down' : 'up';
  const exams = biomarker.readings.length;
  const watching = biomarker.attentionLevel !== 'dentro_do_esperado';
  const description =
    BIOMARKER_DESCRIPTIONS[biomarker.name_normalized] ??
    `${biomarker.name} é um dos valores das tuas análises. O teu médico pode explicar o que significa no teu caso.`;

  const ask = () => {
    router.dismissTo('/(tabs)');
    router.navigate({ pathname: '/(tabs)/ask', params: { q: suggestedQuestion ?? '' } });
  };

  return (
    <Screen
      tone={tone}
      footer={<Button title="Perguntar sobre este valor" icon="chat" onPress={ask} />}
    >
      <TopBar
        title={biomarker.name}
        right={
          <Glass radius={22} flat onPress={handleStartEdit} accessibilityLabel="Corrigir o último valor" style={{ width: 44, height: 44 }} contentStyle={{ width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="pencil" size={18} color={t.ink} />
          </Glass>
        }
      />

      {hasPlainName(biomarker) ? <Sub style={{ marginTop: 22, fontSize: 17, lineHeight: 22 }}>{plainLabel(biomarker)}</Sub> : <View style={{ height: 12 }} />}
      <Text style={{ marginTop: 2, fontSize: 68, lineHeight: 72, fontWeight: '500', letterSpacing: -2, color: t.ink }} numberOfLines={1} adjustsFontSizeToFit>
        {formatValue(biomarker.latestValue)}
        <Text style={{ fontSize: 20, fontWeight: '400', letterSpacing: 0, color: t.sub }}> {biomarker.unit}</Text>
      </Text>
      <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <Glass radius={18} flat contentStyle={{ height: 34, paddingLeft: 12, paddingRight: 14, justifyContent: 'center' }}>
          <Status tone={tone} label={ATTENTION_LABELS[biomarker.attentionLevel]} />
        </Glass>
        {biomarker.adverseTrend ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name={trendIcon} size={14} color={t.level[tone]} weight="bold" />
            <Text style={{ fontSize: 14, fontWeight: '600', color: t.level[tone] }}>A {trendVerb}</Text>
          </View>
        ) : null}
      </View>

      <Glass style={{ marginTop: 22 }} contentStyle={{ padding: 18 }}>
        <CardTitle left="Onde estás" right={referenceText(biomarker.ref_min, biomarker.ref_max, biomarker.rangeType)} />
        <RangeBar tone={tone} unit={biomarker.unit} value={biomarker.latestValue} refMin={biomarker.ref_min} refMax={biomarker.ref_max} rangeType={biomarker.rangeType} />
      </Glass>

      {exams >= 2 && (
        <Glass style={{ marginTop: 14 }} contentStyle={{ padding: 18 }}>
          <CardTitle left="Evolução" right={`${exams} exames`} />
          <EvolutionChart readings={biomarker.readings} tone={tone} refMin={biomarker.ref_min} refMax={biomarker.ref_max} />
          {biomarker.excludedReadings > 0 ? (
            <Text style={{ marginTop: 6, fontSize: 13, lineHeight: 18, color: t.sub }}>
              {biomarker.excludedReadings === 1 ? 'Uma leitura antiga noutra unidade ficou de fora.' : `${biomarker.excludedReadings} leituras antigas noutra unidade ficaram de fora.`}
            </Text>
          ) : null}
        </Glass>
      )}

      <TintCard
        tone={tone}
        label="No teu caso"
        title={watching ? 'Um bom tema para a consulta' : 'Dentro do esperado'}
        body={watching ? undefined : 'Com base nos dados que me deste.'}
        style={{ marginTop: 14 }}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {biomarker.adverseTrend ? <Fact icon={trendIcon} label={exams > 2 ? `A ${trendVerb} há ${exams} exames` : `A ${trendVerb}`} /> : null}
          {biomarker.familyRelevant && familyHistory.length > 0 ? <Fact icon="people" label="Histórico familiar" /> : null}
          {!watching && profile && !profile.smoker ? <Fact icon="smoke" label="Não fumas" /> : null}
          {!watching && (profile?.exercise_minutes_per_week ?? 0) >= 150 ? <Fact icon="exercise" label="Exercício regular" /> : null}
        </View>
      </TintCard>

      <View style={{ alignItems: 'flex-start', marginTop: 6 }}>
        <Button variant="text" title={`O que é ${biomarker.name}?`} onPress={() => setShowAbout(true)} style={{ paddingHorizontal: 4 }} />
      </View>

      <Sheet visible={showAbout} onClose={() => setShowAbout(false)} title={biomarker.name}>
        <Body style={{ marginTop: 10, color: t.ink }}>{description}</Body>
      </Sheet>

      <Sheet visible={editing} onClose={() => setEditing(false)} title="Corrigir o último valor">
        <Input label={`${biomarker.name} (${biomarker.unit})`} value={editValue} onChangeText={setEditValue} keyboardType="decimal-pad" autoFocus selectTextOnFocus />
        <Button title="Guardar" onPress={handleSaveEdit} loading={savingEdit} style={{ marginTop: 20 }} />
      </Sheet>
    </Screen>
  );
}
