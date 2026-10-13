import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, RefreshControl, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import Animated from 'react-native-reanimated';
import { useProfile } from '@/hooks/useProfile';
import { BiomarkerWithScoring, useBiomarkers } from '@/hooks/useBiomarkers';
import { useGeneratedContent } from '@/hooks/useGeneratedContent';
import { useFloat } from '@/hooks/useFloat';
import { MASCOT_NAME, Tone, useTheme } from '@/constants/theme';
import { headlineFor, plainLabel, rankByAttention, shortStatus, toneOf } from '@/constants/plain-language';
import { formatValue } from '@/lib/number';
import { parseDateOnly } from '@/lib/dates';
import { Mascot } from '@/components/mascot';
import { MiniRange } from '@/components/range-bar';
import { Sparkline } from '@/components/sparkline';
import { Fact } from '@/components/ui/Chip';
import { Glass, PressableScale } from '@/components/ui/Glass';
import { Icon, IconName } from '@/components/ui/Icon';
import { riseIn } from '@/components/ui/enter';
import { Screen } from '@/components/ui/Screen';
import { DISCLAIMER, Note } from '@/components/ui/Text';
import { TintCard } from '@/components/ui/TintCard';

// Uma tentativa automática por estado dos dados: se a geração falhar (ex.: rate
// limit), não se volta a chamar a IA em ciclo — fica o botão "Tentar de novo".
const autoRegenAttempts = new Set<string>();

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function daysAgo(date: Date): string {
  const days = Math.max(0, Math.round((Date.now() - date.getTime()) / 86_400_000));
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Ontem';
  if (days < 60) return `Há ${days} dias`;
  const months = Math.round(days / 30);
  return months < 24 ? `Há ${months} meses` : `Há ${Math.round(months / 12)} anos`;
}

interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  footer: string;
  footerColor: string;
  children?: React.ReactNode;
  onPress?: () => void;
  offset?: boolean;
}

/** Cartão de vidro com um número grande: um valor a acompanhar ou um resumo. */
function StatCard({ label, value, unit, footer, footerColor, children, onPress, offset }: StatCardProps) {
  const t = useTheme();
  // Flutuam devagar, cada um ao seu ritmo, para o ecrã não parecer parado.
  const float = useFloat(offset ? 0 : 700, 7, offset ? 3000 : 3400);
  return (
    <Animated.View style={[{ flex: 1, marginTop: offset ? 32 : 0 }, float]}>
      <Glass
        radius={28}
        onPress={onPress}
        accessibilityLabel={`${label}: ${value} ${unit ?? ''}. ${footer}`}
        contentStyle={{ height: 166, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14 }}
      >
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={{ fontSize: 15, lineHeight: 20, fontWeight: '500', color: t.sub }}>{label}</Text>
        <Text numberOfLines={1} adjustsFontSizeToFit style={{ marginTop: 4, fontSize: 40, lineHeight: 44, fontWeight: '500', letterSpacing: -0.8, color: t.ink }}>
          {value}
          {unit ? <Text style={{ fontSize: 15, fontWeight: '400', letterSpacing: 0, color: t.sub }}> {unit}</Text> : null}
        </Text>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>{children}</View>
        <Text numberOfLines={1} style={{ marginTop: 6, fontSize: 13, lineHeight: 18, fontWeight: '600', color: footerColor }}>{footer}</Text>
      </Glass>
    </Animated.View>
  );
}

function BiomarkerCard({ biomarker, offset }: { biomarker: BiomarkerWithScoring; offset?: boolean }) {
  const t = useTheme();
  const router = useRouter();
  const tone = toneOf(biomarker);
  const values = biomarker.readings.map((r) => r.value);
  return (
    <StatCard
      label={plainLabel(biomarker)}
      value={formatValue(biomarker.latestValue)}
      unit={biomarker.unit}
      footer={shortStatus(biomarker)}
      footerColor={t.level[tone]}
      offset={offset}
      onPress={() => router.push(`/biomarker/${biomarker.name_normalized}` as any)}
    >
      {values.length >= 2 ? (
        <Sparkline data={values} color={t.dot[tone]} width={130} height={40} />
      ) : (
        <MiniRange tone={tone} value={biomarker.latestValue} refMin={biomarker.ref_min} refMax={biomarker.ref_max} rangeType={biomarker.rangeType} width={130} />
      )}
    </StatCard>
  );
}

/** Três passos em ícones: fotografas, eu leio, tu perguntas. */
function Steps() {
  const t = useTheme();
  const icons: IconName[] = ['camera', 'chart', 'chat'];
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="Fotografas, eu leio os valores, tu perguntas" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 }}>
      {icons.map((icon, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {i > 0 && <Icon name="arrow" size={13} color={t.ink} weight="bold" />}
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: t.pill, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={icon} size={20} color={t.pillFg} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function DashboardScreen() {
  const t = useTheme();
  const router = useRouter();
  const isFocused = useIsFocused();
  const { profile, familyHistory, loading: profileLoading, refetch: refetchProfile } = useProfile();
  const { biomarkers, exams, dataSignature, loading: bioLoading, refetch: refetchBio } = useBiomarkers(familyHistory.length > 0);
  const {
    cards,
    generatedAt,
    basedOnExams,
    loading: contentLoading,
    generating,
    failed: generationFailed,
    regenerate,
    refetch: refetchContent,
  } = useGeneratedContent();
  const [refreshing, setRefreshing] = useState(false);
  const [draggingMascot, setDraggingMascot] = useState(false);

  // Atualização silenciosa ao voltar ao ecrã e ao reabrir a app.
  useFocusEffect(
    useCallback(() => {
      refetchProfile();
      refetchBio();
      refetchContent();
    }, [refetchProfile, refetchBio, refetchContent])
  );
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refetchProfile();
        refetchBio();
        refetchContent();
      }
    });
    return () => sub.remove();
  }, [refetchProfile, refetchBio, refetchContent]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchProfile(), refetchBio(), refetchContent()]);
    setRefreshing(false);
  }, [refetchProfile, refetchBio, refetchContent]);

  const hasData = biomarkers.length > 0;

  // Gerar a análise quando ainda não existe, ou quando deixou de corresponder
  // aos dados: perfil / histórico familiar alterado depois, ou exames diferentes.
  const profileUpdatedAt = profile?.updated_at ?? null;
  const profileChanged =
    !!generatedAt && !!profileUpdatedAt &&
    new Date(profileUpdatedAt).getTime() > new Date(generatedAt).getTime();
  const examsChanged = basedOnExams != null && basedOnExams !== dataSignature;
  const contentStale = !!cards && (profileChanged || examsChanged);
  const biomarkerCount = biomarkers.length;
  const profileId = profile?.id;
  useEffect(() => {
    if (!hasData || !profileId || profileLoading || contentLoading || generating) return;
    if (cards && !contentStale) return;
    const attemptKey = `${profileId}|${biomarkerCount}|${dataSignature}|${cards ? profileUpdatedAt : 'empty'}`;
    if (autoRegenAttempts.has(attemptKey)) return;
    autoRegenAttempts.add(attemptKey);
    regenerate().catch((err) => console.warn('Content regeneration failed:', err));
  }, [hasData, profileId, profileLoading, contentLoading, generating, cards, contentStale, biomarkerCount, dataSignature, profileUpdatedAt, regenerate]);

  // O valor que mais pesa dita o tom do ecrã: boneco, fundo e cartão de resumo.
  const ranked = rankByAttention(biomarkers);
  const toWatch = ranked.filter((b) => b.attentionLevel !== 'dentro_do_esperado');
  const top = toWatch[0];
  const loading = bioLoading || profileLoading;
  const tone: Tone = !hasData ? 'none' : top ? toneOf(top) : 'ok';

  const firstName = profile?.name?.trim().split(/\s+/)[0];
  const headline = !hasData
      ? 'Ainda não tenho exames teus'
      : top
        ? headlineFor(top)
        : 'Os teus valores estão dentro do esperado';

  const latestExam = exams[0];
  const latestDate = latestExam ? parseDateOnly(latestExam.exam_date) : null;
  const retry = () => { regenerate().catch(() => {}); };

  // Até haver perfil e valores não se desenha nada: senão via-se o boneco
  // lilás e o texto por defeito a mudarem para o estado real logo a seguir.
  if (loading) {
    return (
      <Screen tone={null} inTabs scroll={false} contentStyle={{ alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={t.sub} />
      </Screen>
    );
  }

  return (
    <Screen tone={tone} inTabs top={8} scrollEnabled={!draggingMascot} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.sub} />}>
      <Text style={{ fontSize: 20, lineHeight: 26, color: t.sub }}>{firstName ? `Olá, ${firstName}` : 'Olá'}</Text>
      <Text accessibilityRole="header" style={{ marginTop: 2, fontSize: 30, lineHeight: 34, fontWeight: '600', letterSpacing: -0.6, color: t.ink }}>
        {headline}
      </Text>

      {/* O boneco fica ao centro, a espreitar por cima dos cartões; pode ser arrastado. */}
      <View style={{ alignItems: 'center', marginTop: 10, marginBottom: hasData ? -44 : 4, zIndex: 0 }}>
        <Mascot
          size={228}
          tone={tone}
          happy={hasData && !top}
          active={isFocused}
          interactive
          wander
          onDragChange={setDraggingMascot}
          accessibilityLabel={`${MASCOT_NAME}, o boneco do Heartline`}
        />
      </View>

      {!hasData ? (
        <Animated.View entering={riseIn()}>
          <TintCard
            tone="none"
            label={`Olá, eu sou o ${MASCOT_NAME}`}
            title="Mostra-me as tuas análises"
            cta="Adicionar exame"
            onPress={() => router.navigate('/(tabs)/add-exam')}
          >
            <Steps />
          </TintCard>
        </Animated.View>
      ) : (
        <>
          <Animated.View entering={riseIn()} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
            {top ? (
              <>
                <BiomarkerCard biomarker={top} offset />
                {toWatch[1] ? (
                  <BiomarkerCard biomarker={toWatch[1]} />
                ) : (
                  <StatCard
                    label="Valores lidos"
                    value={String(biomarkers.length)}
                    footer={`${biomarkers.length - toWatch.length} dentro do intervalo`}
                    footerColor={t.level.ok}
                    onPress={() => router.navigate('/(tabs)/values')}
                  />
                )}
              </>
            ) : (
              <>
                <StatCard
                  label="Valores lidos"
                  value={String(biomarkers.length)}
                  footer="Todos no intervalo"
                  footerColor={t.level.ok}
                  offset
                  onPress={() => router.navigate('/(tabs)/values')}
                />
                <StatCard
                  label="Último exame"
                  value={latestDate ? String(latestDate.getDate()) : '—'}
                  unit={latestDate ? MONTHS[latestDate.getMonth()] : undefined}
                  footer={latestDate ? daysAgo(latestDate) : ''}
                  footerColor={t.sub}
                />
              </>
            )}
          </Animated.View>

          <Animated.View entering={riseIn(120)} style={{ marginTop: 24 }}>
            {cards ? (
              <TintCard
                tone={tone}
                label="Em resumo"
                title={top ? 'Para levar à consulta' : 'A teu favor'}
                body={top ? cards.insight : cards.positive}
                cta="Ver porquê"
                onPress={() => router.push('/analysis')}
              >
                {!top && profile ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                    {!profile.smoker && <Fact icon="smoke" label="Não fumas" />}
                    {(profile.exercise_minutes_per_week ?? 0) >= 150 && <Fact icon="exercise" label="Exercício regular" />}
                  </View>
                ) : null}
              </TintCard>
            ) : generationFailed ? (
              <TintCard tone={tone} label="Em resumo" title="Não consegui preparar o resumo" cta="Tentar de novo" ctaIcon="retry" onPress={retry} />
            ) : (
              <TintCard tone={tone} label="Em resumo" title="A preparar o teu resumo" body="Demora uns segundos." />
            )}
            {cards && !generating && (generationFailed || contentStale) ? (
              <PressableScale onPress={retry} accessibilityLabel="Atualizar o resumo" style={{ marginTop: 12, paddingHorizontal: 4 }}>
                <Text style={{ fontSize: 13, lineHeight: 18, color: t.sub }}>
                  Este resumo pode não refletir os teus dados mais recentes. <Text style={{ color: t.link, fontWeight: '600' }}>Atualizar</Text>
                </Text>
              </PressableScale>
            ) : null}
          </Animated.View>
        </>
      )}

      <Note style={{ marginTop: 24 }}>{DISCLAIMER}</Note>
    </Screen>
  );
}
