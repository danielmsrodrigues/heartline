import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useProfile } from '@/hooks/useProfile';
import { BiomarkerWithScoring, useBiomarkers } from '@/hooks/useBiomarkers';
import { useTheme } from '@/constants/theme';
import { countByTone, hasPlainName, overallTone, plainLabel, rankByAttention, shortStatus, toneOf } from '@/constants/plain-language';
import { formatDayMonth } from '@/lib/dates';
import { formatValue } from '@/lib/number';
import { Donut } from '@/components/donut';
import { Mascot } from '@/components/mascot';
import { MiniRange } from '@/components/range-bar';
import { Button } from '@/components/ui/Button';
import { Glass } from '@/components/ui/Glass';
import { Icon } from '@/components/ui/Icon';
import { ListCard, Row, Status, ValueText } from '@/components/ui/List';
import { Screen } from '@/components/ui/Screen';
import { SectionTitle, Sub, Title } from '@/components/ui/Text';

function ValueRow({ biomarker }: { biomarker: BiomarkerWithScoring }) {
  const t = useTheme();
  const router = useRouter();
  const tone = toneOf(biomarker);
  return (
    <Row
      label={plainLabel(biomarker)}
      minHeight={60}
      onPress={() => router.push(`/biomarker/${biomarker.name_normalized}` as any)}
      accessibilityLabel={`${biomarker.name}: ${formatValue(biomarker.latestValue)} ${biomarker.unit}. ${shortStatus(biomarker)}`}
      under={
        <>
          {/* O nome técnico fica por baixo, para quem o quiser comparar com o papel. */}
          {hasPlainName(biomarker) ? <Text numberOfLines={1} style={{ fontSize: 13, lineHeight: 18, color: t.sub }}>{biomarker.name}</Text> : null}
          <MiniRange tone={tone} value={biomarker.latestValue} refMin={biomarker.ref_min} refMax={biomarker.ref_max} rangeType={biomarker.rangeType} />
        </>
      }
      right={
        <>
          {biomarker.adverseTrend ? <Icon name={biomarker.trend === 'a_descer' ? 'down' : 'up'} size={14} color={t.level[tone]} weight="bold" /> : null}
          <ValueText value={formatValue(biomarker.latestValue)} unit={biomarker.unit} />
        </>
      }
    />
  );
}

export default function ValuesScreen() {
  const t = useTheme();
  const router = useRouter();
  const isFocused = useIsFocused();
  const { familyHistory } = useProfile();
  const { biomarkers, exams, loading } = useBiomarkers(familyHistory.length > 0);

  const ranked = rankByAttention(biomarkers);
  const toWatch = ranked.filter((b) => b.attentionLevel !== 'dentro_do_esperado');
  const expected = ranked.filter((b) => b.attentionLevel === 'dentro_do_esperado');
  const latest = exams[0];

  if (!loading && biomarkers.length === 0) {
    return (
      <Screen inTabs scroll={false} contentStyle={{ justifyContent: 'center', alignItems: 'center', paddingBottom: 120 }}>
        <Mascot size={150} active={isFocused} interactive />
        <Title style={{ marginTop: 24, textAlign: 'center' }}>Ainda não há valores</Title>
        <Sub style={{ marginTop: 8, textAlign: 'center', fontSize: 16, lineHeight: 23 }}>Aparecem aqui depois do primeiro exame.</Sub>
        <Button title="Adicionar exame" onPress={() => router.navigate('/(tabs)/add-exam')} style={{ marginTop: 24, alignSelf: 'stretch' }} />
      </Screen>
    );
  }

  return (
    <Screen tone={overallTone(biomarkers)} inTabs top={12}>
      <Title large>Valores</Title>

      {loading ? null : (
        <>
          <Glass style={{ marginTop: 18 }} contentStyle={{ paddingVertical: 16, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <Donut parts={countByTone(biomarkers)} big={String(expected.length)} small={`de ${biomarkers.length}`} />
            <View style={{ flex: 1 }} accessible accessibilityLabel={`${expected.length} de ${biomarkers.length} valores dentro do esperado`}>
              <Text style={{ fontSize: 20, lineHeight: 25, fontWeight: '700', letterSpacing: -0.2, color: t.ink }}>dentro do esperado</Text>
              <View style={{ marginTop: 6, gap: 3 }}>
                {toWatch.length > 0 ? <Status tone={toneOf(toWatch[0])} label={`${toWatch.length} a acompanhar`} /> : null}
                {latest ? <Text style={{ fontSize: 13, lineHeight: 18, color: t.sub }}>Exame de {formatDayMonth(latest.exam_date)}</Text> : null}
              </View>
            </View>
          </Glass>

          {toWatch.length > 0 && (
            <>
              <SectionTitle style={{ marginTop: 20 }}>A acompanhar</SectionTitle>
              <ListCard>{toWatch.map((b) => <ValueRow key={b.name_normalized} biomarker={b} />)}</ListCard>
            </>
          )}
          {expected.length > 0 && (
            <>
              <SectionTitle style={{ marginTop: 20 }}>Dentro do esperado</SectionTitle>
              <ListCard>{expected.map((b) => <ValueRow key={b.name_normalized} biomarker={b} />)}</ListCard>
            </>
          )}
        </>
      )}
    </Screen>
  );
}
