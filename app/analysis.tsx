import { useState } from 'react';
import { Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useGeneratedContent } from '@/hooks/useGeneratedContent';
import { useProfile } from '@/hooks/useProfile';
import { BiomarkerWithScoring, useBiomarkers } from '@/hooks/useBiomarkers';
import { ATTENTION_LABELS } from '@/constants/colors';
import { countByTone, headlineFor, overallTone, plainLabel, rankByAttention, shortStatus } from '@/constants/plain-language';
import { ON_VIVID, Tone, useTheme } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { Donut } from '@/components/donut';
import { Mascot } from '@/components/mascot';
import { Button } from '@/components/ui/Button';
import { IconBubble } from '@/components/ui/Chip';
import { IconName } from '@/components/ui/Icon';
import { Glass, PressableScale } from '@/components/ui/Glass';
import { Status } from '@/components/ui/List';
import { Screen } from '@/components/ui/Screen';
import { Sheet } from '@/components/ui/Sheet';
import { Body, DISCLAIMER, Note, SectionTitle, Sub } from '@/components/ui/Text';
import { Pill } from '@/components/ui/TintCard';
import { TopBar } from '@/components/ui/TopBar';

const TONE_LABEL: Record<Tone, string> = {
  ok: 'dentro do esperado',
  watch: 'a acompanhar',
  att: 'a merecer atenção',
  out: 'fora do intervalo',
  none: '',
};

interface Factor {
  icon: IconName;
  text: string;
}

function weighing(b: BiomarkerWithScoring): Factor {
  const icon: IconName = b.adverseTrend ? (b.trend === 'a_descer' ? 'down' : 'up') : 'chart';
  return { icon, text: `${plainLabel(b)}: ${shortStatus(b).toLowerCase()}` };
}

function Column({ title, tone, factors }: { title: string; tone: Tone; factors: Factor[] }) {
  const t = useTheme();
  return (
    <Glass style={{ flex: 1 }} contentStyle={{ paddingVertical: 16, paddingHorizontal: 14 }}>
      <Text accessibilityRole="header" style={{ fontSize: 15, lineHeight: 20, fontWeight: '600', color: t.level[tone], marginBottom: 4 }}>{title}</Text>
      {factors.map((factor) => (
        <View key={factor.text} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40, marginTop: 8 }}>
          <IconBubble icon={factor.icon} size={34} tone={tone} />
          <Text style={{ flex: 1, fontSize: 14, lineHeight: 18, fontWeight: '500', color: t.ink }}>{factor.text}</Text>
        </View>
      ))}
    </Glass>
  );
}

export default function AnalysisScreen() {
  const t = useTheme();
  const { cards, fullAnalysis, questions, loading, generating } = useGeneratedContent();
  const { profile, familyHistory } = useProfile();
  const { biomarkers } = useBiomarkers(familyHistory.length > 0);
  const [copied, setCopied] = useState(false);
  const [showFull, setShowFull] = useState(false);

  const tone = overallTone(biomarkers);
  const ranked = rankByAttention(biomarkers);
  const toWatch = ranked.filter((b) => b.attentionLevel !== 'dentro_do_esperado');
  const top = toWatch[0];
  const parts = countByTone(biomarkers);

  const against: Factor[] = toWatch.slice(0, 3).map(weighing);
  if (familyHistory.length > 0 && toWatch.some((b) => b.familyRelevant)) against.push({ icon: 'people', text: 'Histórico familiar' });

  const inFavour: Factor[] = [];
  if (profile && !profile.smoker) inFavour.push({ icon: 'smoke', text: 'Não fumas' });
  if ((profile?.exercise_minutes_per_week ?? 0) >= 150) inFavour.push({ icon: 'exercise', text: 'Exercício regular' });
  if (profile?.sleep_hours_avg != null && profile.sleep_hours_avg >= 6 && profile.sleep_hours_avg <= 8) inFavour.push({ icon: 'sleep', text: 'Sono em dia' });
  const expected = biomarkers.length - toWatch.length;
  if (expected > 0) inFavour.push({ icon: 'check', text: expected === 1 ? '1 valor no intervalo' : `${expected} valores no intervalo` });

  const insightText = fullAnalysis?.full_insight || cards?.insight || '';
  const positiveText = fullAnalysis?.full_positive || cards?.positive || '';
  const familyText = fullAnalysis?.full_family || cards?.family_note || '';

  const copyQuestions = async () => {
    await Clipboard.setStringAsync(questions.map((q, i) => `${i + 1}. ${q.question}`).join('\n'));
    haptics.success();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Screen tone={tone}>
      <TopBar title="Em resumo" />

      <View style={{ marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Mascot size={60} tone={tone} happy={!top && biomarkers.length > 0} interactive />
        <View style={{ flex: 1 }}>
          {top ? <Text style={{ fontSize: 15, lineHeight: 20, fontWeight: '600', color: t.level[tone] }}>{ATTENTION_LABELS[top.attentionLevel]}</Text> : null}
          <Text accessibilityRole="header" style={{ marginTop: 2, fontSize: 26, lineHeight: 32, fontWeight: '700', letterSpacing: -0.5, color: t.ink }}>
            {top ? headlineFor(top) : 'Os teus valores estão dentro do esperado'}
          </Text>
        </View>
      </View>

      <Glass style={{ marginTop: 18 }} contentStyle={{ paddingVertical: 16, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Donut parts={parts} big={String(biomarkers.length)} small={biomarkers.length === 1 ? 'valor' : 'valores'} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, lineHeight: 20, fontWeight: '600', color: t.sub }}>Os teus valores</Text>
          <View style={{ marginTop: 8, gap: 4 }}>
            {parts.map((part) => <Status key={part.tone} tone={part.tone} label={`${part.count} ${TONE_LABEL[part.tone]}`} />)}
          </View>
        </View>
      </Glass>

      <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'stretch', gap: 14 }}>
        {against.length > 0 ? <Column title="O que pesa" tone={tone} factors={against} /> : null}
        {inFavour.length > 0 ? <Column title="A teu favor" tone="ok" factors={inFavour} /> : null}
      </View>

      {insightText ? (
        <View style={{ alignItems: 'flex-start', marginTop: 6 }}>
          <Button variant="text" title="Ler a explicação completa" onPress={() => setShowFull(true)} style={{ paddingHorizontal: 4 }} />
        </View>
      ) : (loading || generating) ? (
        <Sub style={{ marginTop: 16, marginHorizontal: 4 }}>A preparar a explicação…</Sub>
      ) : null}

      {questions.length > 0 && (
        <Glass tone={tone} radius={32} style={{ marginTop: 16 }} contentStyle={{ padding: 22 }}>
          <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: '600', color: ON_VIVID, opacity: 0.74 }}>Perguntas</Text>
          <Text accessibilityRole="header" style={{ marginTop: 22, fontSize: 26, lineHeight: 32, fontWeight: '700', letterSpacing: -0.5, color: ON_VIVID }}>Para levar à consulta</Text>
          {questions.map((q, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: t.pill, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: t.pillFg }}>{i + 1}</Text>
              </View>
              <Text style={{ flex: 1, fontSize: 16, lineHeight: 23, color: ON_VIVID }}>{q.question}</Text>
            </View>
          ))}
          <PressableScale onPress={copyQuestions} accessibilityLabel="Copiar perguntas" style={{ marginTop: 16, alignSelf: 'flex-start' }}>
            <Pill label={copied ? 'Copiado' : 'Copiar perguntas'} icon={copied ? 'check' : 'copy'} />
          </PressableScale>
        </Glass>
      )}

      <Note style={{ marginTop: 20 }}>{DISCLAIMER}</Note>

      <Sheet visible={showFull} onClose={() => setShowFull(false)} title="O que vejo no conjunto">
        <Body style={{ marginTop: 10 }}>{insightText}</Body>
        {positiveText ? (
          <>
            <SectionTitle style={{ marginHorizontal: 0 }}>A teu favor</SectionTitle>
            <Body>{positiveText}</Body>
          </>
        ) : null}
        {familyText ? (
          <>
            <SectionTitle style={{ marginHorizontal: 0 }}>Histórico familiar</SectionTitle>
            <Body>{familyText}</Body>
          </>
        ) : null}
        <Note style={{ marginTop: 16, textAlign: 'left' }}>{DISCLAIMER}</Note>
      </Sheet>
    </Screen>
  );
}
