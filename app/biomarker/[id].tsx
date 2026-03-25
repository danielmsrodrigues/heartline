import { useMemo, useState } from 'react';
import { View, Text, ScrollView, Dimensions, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { AlertCircle, Heart, MessageSquare } from 'lucide-react-native';
import Svg, { Path, Line, Circle as SvgCircle, Text as SvgText, G, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { useBiomarkers, BiomarkerWithScoring } from '@/hooks/useBiomarkers';
import { useProfile } from '@/hooks/useProfile';
import { AttentionBadge } from '@/components/attention-badge';
import { Card } from '@/components/ui/Card';
import { ATTENTION_COLORS } from '@/constants/colors';
import { Skeleton, SkeletonDetailCard } from '@/components/ui/Skeleton';

const SCREEN_WIDTH = Dimensions.get('window').width;

function RangeBar({
  value,
  refMin,
  refMax,
  rangeType,
  status,
}: {
  value: number;
  refMin: number | null;
  refMax: number | null;
  rangeType: string;
  status: string;
}) {
  const statusColors: Record<string, string> = {
    dentro_do_esperado: '#1D9E75',
    a_acompanhar: '#EF9F27',
    merece_atencao: '#EF9F27',
    fora_do_range: '#E24B4A',
  };

  const markerColor = statusColors[status] ?? '#EF9F27';

  const segments: { flex: number; color: string }[] = [];
  let valuePct = 50;
  let tickMarks: { pct: number; label: string }[] = [];

  if (rangeType === 'bounded') {
    const min = refMin!;
    const max = refMax!;
    const barStart = min * 0.7;
    const barEnd = max * 1.4;
    const barRange = barEnd - barStart || 1;
    const refMinPct = ((min - barStart) / barRange) * 100;
    const refMaxPct = ((max - barStart) / barRange) * 100;
    const abovePct = 100 - refMaxPct;

    segments.push({ flex: refMinPct, color: 'rgba(245,199,35,0.3)' });
    segments.push({ flex: refMaxPct - refMinPct, color: 'rgba(140,179,105,0.35)' });
    segments.push({ flex: abovePct * 0.4, color: 'rgba(245,199,35,0.35)' });
    segments.push({ flex: abovePct * 0.3, color: 'rgba(232,130,58,0.4)' });
    segments.push({ flex: abovePct * 0.3, color: 'rgba(217,83,79,0.4)' });

    valuePct = Math.max(2, Math.min(98, ((value - barStart) / barRange) * 100));
    tickMarks = [
      { pct: refMinPct, label: String(min) },
      { pct: refMaxPct, label: String(max) },
    ];
  } else if (rangeType === 'max_only') {
    const max = refMax!;
    const barEnd = max * 1.4;
    const barRange = barEnd || 1;
    const refMaxPct = (max / barRange) * 100;
    const abovePct = 100 - refMaxPct;

    segments.push({ flex: refMaxPct, color: 'rgba(140,179,105,0.35)' });
    segments.push({ flex: abovePct * 0.4, color: 'rgba(245,199,35,0.35)' });
    segments.push({ flex: abovePct * 0.3, color: 'rgba(232,130,58,0.4)' });
    segments.push({ flex: abovePct * 0.3, color: 'rgba(217,83,79,0.4)' });

    valuePct = Math.max(2, Math.min(98, (value / barRange) * 100));
    tickMarks = [{ pct: refMaxPct, label: String(max) }];
  } else if (rangeType === 'min_only') {
    const min = refMin!;
    const barEnd = min * 2;
    const barRange = barEnd || 1;
    const refMinPct = (min / barRange) * 100;

    segments.push({ flex: refMinPct * 0.3, color: 'rgba(217,83,79,0.4)' });
    segments.push({ flex: refMinPct * 0.3, color: 'rgba(232,130,58,0.4)' });
    segments.push({ flex: refMinPct * 0.4, color: 'rgba(245,199,35,0.35)' });
    segments.push({ flex: 100 - refMinPct, color: 'rgba(140,179,105,0.35)' });

    valuePct = Math.max(2, Math.min(98, (value / barRange) * 100));
    tickMarks = [{ pct: refMinPct, label: String(min) }];
  } else {
    // none
    segments.push({ flex: 1, color: 'rgba(107,114,128,0.3)' });
    valuePct = 50;
  }

  return (
    <View style={{ marginTop: 16 }}>
      {/* Bar */}
      <View style={{ height: 12, borderRadius: 6, overflow: 'hidden', flexDirection: 'row' }}>
        {segments.map((seg, i) => (
          <View key={i} style={{ flex: seg.flex, backgroundColor: seg.color }} />
        ))}
      </View>

      {/* Ref markers */}
      <View style={{ position: 'relative', height: 16, marginTop: 2 }}>
        {tickMarks.map((tick, i) => (
          <Text key={i} style={{ position: 'absolute', left: `${tick.pct}%`, marginLeft: -10, fontSize: 11, color: '#555555' }}>
            {tick.label}
          </Text>
        ))}
      </View>

      {/* Indicator */}
      <View style={{ position: 'absolute', left: `${valuePct}%`, top: -2, marginLeft: -8 }}>
        <View
          style={{
            width: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: markerColor,
            borderWidth: 2,
            borderColor: '#0A0A0A',
          }}
        />
      </View>

      {/* Legend */}
      <View className="flex-row flex-wrap mt-2" style={{ gap: 12 }}>
        {[
          { label: 'Esperado', color: 'rgba(140,179,105,0.5)' },
          { label: 'Limite', color: 'rgba(245,199,35,0.5)' },
          { label: 'Fora do range', color: 'rgba(217,83,79,0.5)' },
        ].map((item) => (
          <View key={item.label} className="flex-row items-center" style={{ gap: 5 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.color }} />
            <Text className="text-xs text-[#555555]">{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function EvolutionChart({
  readings,
  status,
}: {
  readings: { value: number; date: string }[];
  status: string;
}) {
  if (readings.length < 2) return null;

  const statusColors: Record<string, string> = {
    dentro_do_esperado: '#1D9E75',
    a_acompanhar: '#EF9F27',
    merece_atencao: '#EF9F27',
    fora_do_range: '#E24B4A',
  };

  const color = statusColors[status] ?? '#EF9F27';
  const width = SCREEN_WIDTH - 80;
  const height = 140;
  const padding = { top: 30, right: 20, bottom: 30, left: 20 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const values = readings.map(r => r.value);
  const min = Math.min(...values) - 10;
  const max = Math.max(...values) + 10;
  const range = max - min;

  const points = readings.map((r, i) => ({
    x: padding.left + (i / (readings.length - 1)) * plotW,
    y: padding.top + plotH - ((r.value - min) / range) * plotH,
    value: r.value,
    date: r.date,
  }));

  const linePath = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + plotH} L ${points[0].x} ${padding.top + plotH} Z`;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear().toString().slice(-2);
    return `${month}/${year}`;
  };

  return (
    <Svg width={width} height={height}>
      {/* Grid lines */}
      {[0, 1, 2, 3].map((i) => (
        <Line
          key={i}
          x1={padding.left}
          y1={padding.top + (i * plotH) / 3}
          x2={padding.left + plotW}
          y2={padding.top + (i * plotH) / 3}
          stroke="#151515"
          strokeDasharray="4,4"
        />
      ))}

      {/* Area fill */}
      <Path d={areaPath} fill={color} opacity={0.08} />

      {/* Line */}
      <Path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

      {/* Points + labels */}
      {points.map((p, i) => (
        <G key={i}>
          <SvgCircle cx={p.x} cy={p.y} r={6} fill="#0A0A0A" stroke={color} strokeWidth={2} />
          <SvgText x={p.x} y={p.y - 14} textAnchor="middle" fill="#F5F5F5" fontSize={12} fontWeight="500">
            {p.value}
          </SvgText>
          <SvgText x={p.x} y={height - 4} textAnchor="middle" fill="#555555" fontSize={11}>
            {formatDate(p.date)}
          </SvgText>
        </G>
      ))}
    </Svg>
  );
}

export default function BiomarkerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { familyHistory } = useProfile();
  const { biomarkers, loading: bioLoading } = useBiomarkers(familyHistory.length > 0);

  const biomarker = useMemo(
    () => biomarkers.find((b) => b.name_normalized === id),
    [biomarkers, id]
  );

  const cardiovascularMarkers = ['ldl', 'hdl', 'total_cholesterol', 'triglycerides', 'glucose', 'hba1c', 'crp'];

  const hasFamilyHistory = familyHistory.length > 0;
  const isFamilyRelevant = biomarker
    ? hasFamilyHistory && cardiovascularMarkers.includes(biomarker.name_normalized)
    : false;

  // Explain WHY the attention level is what it is
  const attentionReason = useMemo(() => {
    if (!biomarker) return null;
    const { attentionLevel, severity, proximity, trend } = biomarker;

    const refMax = biomarker.ref_max;
    const refMin = biomarker.ref_min;
    const val = biomarker.latestValue;
    const aboveMax = refMax != null && val > refMax;
    const belowMin = refMin != null && refMin > 0 && val < refMin;

    switch (attentionLevel) {
      case 'dentro_do_esperado':
        return 'Dentro do range de referência';
      case 'a_acompanhar':
        if (aboveMax) return `${val} ligeiramente acima de ${refMax}`;
        if (belowMin) return `${val} ligeiramente abaixo de ${refMin}`;
        if (trend === 'a_subir') return 'Tendência de subida';
        if (proximity > 0.66) return 'Valor perto do limite';
        return 'Valor a acompanhar';
      case 'merece_atencao':
        if (aboveMax) return `${val} acima de ${refMax}`;
        if (belowMin) return `${val} abaixo de ${refMin}`;
        if (isFamilyRelevant && trend === 'a_subir') return 'A subir + histórico familiar';
        if (isFamilyRelevant && proximity > 0.66) return 'Perto do limite + histórico familiar';
        if (isFamilyRelevant) return 'Histórico familiar relevante';
        if (trend === 'a_subir') return 'Tendência de subida';
        if (proximity > 0.66) return 'Valor perto do limite';
        return 'Merece acompanhamento';
      case 'fora_do_range':
        if (aboveMax) return `${val} bem acima de ${refMax}`;
        if (belowMin) return `${val} bem abaixo de ${refMin}`;
        return 'Fora do range de referência';
      default:
        return null;
    }
  }, [biomarker, isFamilyRelevant]);

  const suggestedQuestion = useMemo(() => {
    if (!biomarker) return null;
    const name = biomarker.name;
    const val = biomarker.latestValue;
    const unit = biomarker.unit;

    if (biomarker.attentionLevel === 'fora_do_range') {
      return `O meu valor de ${name} está em ${val} ${unit}, fora do range de referência indicado pelo laboratório. Que avaliação faz deste resultado no meu contexto?`;
    }
    if (biomarker.attentionLevel === 'merece_atencao') {
      return `O meu ${name} está em ${val} ${unit} e a tendência parece ser de subida. Faz sentido acompanhar este valor mais de perto?`;
    }
    if (biomarker.trend === 'a_subir') {
      return `Tenho notado que o meu ${name} tem vindo a subir (atualmente ${val} ${unit}). Seria útil explorar o que pode estar a influenciar esta tendência?`;
    }
    return null;
  }, [biomarker]);

  const descriptions: Record<string, string> = {
    ldl: "O LDL (colesterol 'mau') transporta colesterol para as artérias. Valores elevados merecem acompanhamento, especialmente com histórico familiar.",
    hdl: "O HDL (colesterol 'bom') remove o colesterol das artérias. Valores acima de 60 mg/dL são considerados protectores. O exercício físico ajuda a elevar o HDL.",
    triglycerides: "Os triglicéridos são um tipo de gordura no sangue. Valores elevados, especialmente combinados com HDL baixo, merecem acompanhamento.",
    glucose: "A glicose em jejum indica como o corpo processa o açúcar. Valores entre 100-125 mg/dL indicam pré-diabetes. Manter valores abaixo de 100 é ideal.",
    total_cholesterol: "O colesterol total é a soma de LDL, HDL e outros componentes lipídicos. Um valor elevado pode indicar necessidade de análise mais detalhada do perfil lipídico.",
    hba1c: "A hemoglobina glicada (HbA1c) reflecte a média de glicose nos últimos 2-3 meses. É um indicador importante do controlo metabólico.",
    crp: "A proteína C-reactiva (PCR) é um marcador de inflamação. Valores elevados podem indicar inflamação no organismo, incluindo nos vasos sanguíneos.",
    hemoglobin: "A hemoglobina transporta oxigénio no sangue. Valores baixos podem indicar anemia, enquanto valores altos podem sugerir desidratação ou outras condições.",
    hemoglobina: "A hemoglobina transporta oxigénio no sangue. Valores baixos podem indicar anemia, enquanto valores altos podem sugerir desidratação ou outras condições.",
    hematocrit: "O hematócrito representa a percentagem de glóbulos vermelhos no sangue. Alterações podem indicar anemia, desidratação ou outras condições.",
    hematocrito: "O hematócrito representa a percentagem de glóbulos vermelhos no sangue. Alterações podem indicar anemia, desidratação ou outras condições.",
    platelets: "As plaquetas são essenciais para a coagulação do sangue. Valores alterados podem afectar a capacidade de coagulação.",
    plaquetas: "As plaquetas são essenciais para a coagulação do sangue. Valores alterados podem afectar a capacidade de coagulação.",
    white_blood_cells: "Os glóbulos brancos (leucócitos) fazem parte do sistema imunitário. Valores elevados podem indicar infecção ou inflamação.",
    leucocitos: "Os glóbulos brancos (leucócitos) fazem parte do sistema imunitário. Valores elevados podem indicar infecção ou inflamação.",
    red_blood_cells: "Os glóbulos vermelhos (eritrócitos) transportam oxigénio. Alterações podem indicar anemia ou outras condições hematológicas.",
    eritrocitos: "Os glóbulos vermelhos (eritrócitos) transportam oxigénio. Alterações podem indicar anemia ou outras condições hematológicas.",
    urea: "A ureia é um produto do metabolismo das proteínas, eliminado pelos rins. Valores elevados podem sugerir alterações na função renal.",
    ureia: "A ureia é um produto do metabolismo das proteínas, eliminado pelos rins. Valores elevados podem sugerir alterações na função renal.",
    creatinine: "A creatinina é um indicador da função renal. Valores elevados podem sugerir que os rins não estão a filtrar eficazmente.",
    creatinina: "A creatinina é um indicador da função renal. Valores elevados podem sugerir que os rins não estão a filtrar eficazmente.",
    uric_acid: "O ácido úrico é um produto do metabolismo das purinas. Valores elevados podem estar associados a gota e merecem acompanhamento cardiovascular.",
    acido_urico: "O ácido úrico é um produto do metabolismo das purinas. Valores elevados podem estar associados a gota e merecem acompanhamento cardiovascular.",
    iron: "O ferro é essencial para a produção de hemoglobina. Valores baixos podem causar anemia, enquanto valores altos podem indicar sobrecarga de ferro.",
    ferro: "O ferro é essencial para a produção de hemoglobina. Valores baixos podem causar anemia, enquanto valores altos podem indicar sobrecarga de ferro.",
    ferritin: "A ferritina reflecte as reservas de ferro no organismo. Valores baixos indicam esgotamento das reservas, valores altos podem indicar inflamação ou sobrecarga.",
    ferritina: "A ferritina reflecte as reservas de ferro no organismo. Valores baixos indicam esgotamento das reservas, valores altos podem indicar inflamação ou sobrecarga.",
    alt: "A ALT (alanina aminotransferase) é uma enzima hepática. Valores elevados podem indicar lesão ou inflamação do fígado.",
    ast: "A AST (aspartato aminotransferase) é uma enzima presente no fígado e coração. Valores elevados podem indicar lesão destes órgãos.",
    ggt: "A GGT (gama-glutamil transferase) é uma enzima hepática. Valores elevados podem estar associados a doenças do fígado ou consumo excessivo de álcool.",
    tsh: "A TSH (hormona estimulante da tiróide) regula a função tiroideia. Valores alterados podem indicar hipotiroidismo ou hipertiroidismo.",
    t3: "A T3 (triiodotironina) é uma hormona tiroideia activa. Alterações podem indicar disfunção da tiróide.",
    triiodotironina: "A T3 (triiodotironina) é uma hormona tiroideia activa. Alterações podem indicar disfunção da tiróide.",
    t4: "A T4 (tiroxina) é a principal hormona produzida pela tiróide. Valores alterados ajudam a diagnosticar disfunções tiroideias.",
    tiroxina: "A T4 (tiroxina) é a principal hormona produzida pela tiróide. Valores alterados ajudam a diagnosticar disfunções tiroideias.",
    vitamin_d: "A vitamina D é importante para ossos, sistema imunitário e saúde cardiovascular. Deficiência é comum e pode afectar múltiplos sistemas.",
    vitamina_d: "A vitamina D é importante para ossos, sistema imunitário e saúde cardiovascular. Deficiência é comum e pode afectar múltiplos sistemas.",
    vitamin_b12: "A vitamina B12 é essencial para o sistema nervoso e produção de glóbulos vermelhos. Deficiência pode causar anemia e sintomas neurológicos.",
    vitamina_b12: "A vitamina B12 é essencial para o sistema nervoso e produção de glóbulos vermelhos. Deficiência pode causar anemia e sintomas neurológicos.",
    folic_acid: "O ácido fólico é essencial para a produção de células sanguíneas e o metabolismo. Deficiência pode causar anemia megaloblástica.",
    acido_folico: "O ácido fólico é essencial para a produção de células sanguíneas e o metabolismo. Deficiência pode causar anemia megaloblástica.",
    sodium: "O sódio é um electrólito essencial para o equilíbrio de fluidos e função nervosa. Alterações podem afectar a pressão arterial e função cardíaca.",
    sodio: "O sódio é um electrólito essencial para o equilíbrio de fluidos e função nervosa. Alterações podem afectar a pressão arterial e função cardíaca.",
    potassium: "O potássio é crucial para a função cardíaca e muscular. Valores muito altos ou baixos podem ser perigosos para o coração.",
    potassio: "O potássio é crucial para a função cardíaca e muscular. Valores muito altos ou baixos podem ser perigosos para o coração.",
    calcium: "O cálcio é importante para ossos, músculos e coração. Alterações podem indicar problemas na paratiróide, rins ou metabolismo ósseo.",
    calcio: "O cálcio é importante para ossos, músculos e coração. Alterações podem indicar problemas na paratiróide, rins ou metabolismo ósseo.",
    psa: "O PSA (antigénio específico da próstata) é usado no rastreio de doenças da próstata. Valores elevados justificam avaliação médica.",
    insulin: "A insulina regula os níveis de açúcar no sangue. Valores elevados em jejum podem indicar resistência à insulina.",
    insulina: "A insulina regula os níveis de açúcar no sangue. Valores elevados em jejum podem indicar resistência à insulina.",
    mcv: "O VGM (volume globular médio) indica o tamanho dos glóbulos vermelhos. Alterações ajudam a classificar tipos de anemia.",
    vgm: "O VGM (volume globular médio) indica o tamanho dos glóbulos vermelhos. Alterações ajudam a classificar tipos de anemia.",
    mch: "A HGM (hemoglobina globular média) indica a quantidade de hemoglobina por glóbulo vermelho. Alterações ajudam a classificar anemias.",
    hgm: "A HGM (hemoglobina globular média) indica a quantidade de hemoglobina por glóbulo vermelho. Alterações ajudam a classificar anemias.",
    mchc: "A CHGM (concentração de hemoglobina globular média) indica a concentração de hemoglobina nos glóbulos vermelhos.",
    chgm: "A CHGM (concentração de hemoglobina globular média) indica a concentração de hemoglobina nos glóbulos vermelhos.",
    albumin: "A albumina é a principal proteína do sangue, produzida pelo fígado. Valores baixos podem indicar problemas hepáticos ou nutricionais.",
    albumina: "A albumina é a principal proteína do sangue, produzida pelo fígado. Valores baixos podem indicar problemas hepáticos ou nutricionais.",
    total_protein: "As proteínas totais no sangue incluem albumina e globulinas. Alterações podem indicar problemas hepáticos, renais ou imunológicos.",
    proteinas_totais: "As proteínas totais no sangue incluem albumina e globulinas. Alterações podem indicar problemas hepáticos, renais ou imunológicos.",
    bilirubin: "A bilirrubina é um produto da degradação dos glóbulos vermelhos. Valores elevados podem indicar problemas no fígado ou vias biliares.",
    bilirrubina: "A bilirrubina é um produto da degradação dos glóbulos vermelhos. Valores elevados podem indicar problemas no fígado ou vias biliares.",
    magnesium: "O magnésio é essencial para músculos, nervos e coração. Deficiência pode causar cãibras, fadiga e arritmias.",
    magnesio: "O magnésio é essencial para músculos, nervos e coração. Deficiência pode causar cãibras, fadiga e arritmias.",
    phosphorus: "O fósforo trabalha com o cálcio na saúde óssea e é importante para o metabolismo energético.",
    fosforo: "O fósforo trabalha com o cálcio na saúde óssea e é importante para o metabolismo energético.",
    alkaline_phosphatase: "A fosfatase alcalina é uma enzima presente nos ossos e fígado. Valores elevados podem indicar doenças ósseas ou hepáticas.",
    fosfatase_alcalina: "A fosfatase alcalina é uma enzima presente nos ossos e fígado. Valores elevados podem indicar doenças ósseas ou hepáticas.",
    ldh: "A LDH (lactato desidrogenase) é uma enzima presente em vários tecidos. Valores elevados podem indicar dano celular em diversos órgãos.",
    fibrinogen: "O fibrinogénio é uma proteína essencial para a coagulação. Valores elevados podem indicar inflamação e merecem avaliação.",
    fibrinogenio: "O fibrinogénio é uma proteína essencial para a coagulação. Valores elevados podem indicar inflamação e merecem avaliação.",
  };

  if (bioLoading) {
    return (
      <View className="flex-1 bg-[#0A0A0A]">
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 }}>
          <SkeletonDetailCard />
          <Card className="p-5 mb-5">
            <Skeleton width={80} height={16} style={{ marginBottom: 16 }} />
            <Skeleton width="100%" height={140} borderRadius={8} />
          </Card>
          <Card className="p-5 mb-5">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <Skeleton width={32} height={32} borderRadius={16} />
              <Skeleton width={120} height={16} />
            </View>
            <Skeleton width="95%" height={14} style={{ marginBottom: 8 }} />
            <Skeleton width="80%" height={14} style={{ marginBottom: 8 }} />
            <Skeleton width="60%" height={14} />
          </Card>
        </ScrollView>
      </View>
    );
  }

  if (!biomarker) {
    return (
      <View className="flex-1 bg-[#0A0A0A] items-center justify-center px-6">
        <Text className="text-base text-[#888888] mt-3">
          Biomarcador não encontrado
        </Text>
      </View>
    );
  }

  const description = descriptions[biomarker.name_normalized]
    || `${biomarker.name} é um biomarcador analisado nas tuas análises clínicas. O teu médico poderá contextualizar este valor (${biomarker.latestValue} ${biomarker.unit}) no teu perfil de saúde.`;

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      <Stack.Screen options={{ title: biomarker.name }} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 }}>

        {/* Current Value */}
        <Card className="p-6 mb-5">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-base text-[#888888] mb-1">Valor actual</Text>
              <View className="flex-row items-baseline" style={{ gap: 8 }}>
                <Text style={{ fontSize: 40, fontWeight: '700', color: '#F5F5F5' }}>
                  {biomarker.latestValue}
                </Text>
                <Text className="text-lg text-[#555555]">{biomarker.unit}</Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <AttentionBadge level={biomarker.attentionLevel} />
              {attentionReason && (
                <Text className="text-xs text-[#555555] mt-1">{attentionReason}</Text>
              )}
            </View>
          </View>

          <RangeBar value={biomarker.latestValue} refMin={biomarker.ref_min} refMax={biomarker.ref_max} rangeType={biomarker.rangeType} status={biomarker.attentionLevel} />
        </Card>

        {/* Evolution Chart */}
        {biomarker.readings.length >= 2 && (
          <Card className="p-5 mb-5">
            <Text className="text-base font-medium text-[#F5F5F5] mb-4">Evolução</Text>
            <EvolutionChart readings={biomarker.readings} status={biomarker.attentionLevel} />
          </Card>
        )}

        {/* Context Card */}
        <Card className="p-5 mb-5">
          <View className="flex-row items-center mb-3" style={{ gap: 12 }}>
            <View
              className="w-8 h-8 rounded-full items-center justify-center"
              style={{ backgroundColor: 'rgba(74,144,217,0.2)' }}
            >
              <AlertCircle size={16} color="#4A90D9" />
            </View>
            <Text className="text-base font-medium text-[#F5F5F5]">O que significa</Text>
          </View>
          <Text className="text-base text-[#888888] leading-relaxed">
            {description}
          </Text>
        </Card>

        {/* Family History Note */}
        {isFamilyRelevant && (
          <View
            className="rounded-2xl p-5 mb-5"
            style={{ backgroundColor: 'rgba(232,151,58,0.1)', borderWidth: 1, borderColor: 'rgba(232,151,58,0.3)' }}
          >
            <View className="flex-row items-center mb-3" style={{ gap: 12 }}>
              <View
                className="w-8 h-8 rounded-full items-center justify-center"
                style={{ backgroundColor: 'rgba(232,151,58,0.2)' }}
              >
                <Heart size={16} color="#EF9F27" />
              </View>
              <Text className="text-base font-medium text-[#EF9F27]">Nota sobre histórico familiar</Text>
            </View>
            <Text style={{ fontSize: 15, color: 'rgba(232,151,58,0.8)', lineHeight: 22 }}>
              O teu histórico familiar de doença cardiovascular precoce torna este biomarcador especialmente relevante. Valores que seriam aceitáveis para a população geral podem requerer maior atenção no teu caso.
            </Text>
          </View>
        )}

        {/* Doctor Question */}
        {suggestedQuestion && (
          <Card className="p-5 mb-5">
            <View className="flex-row items-center mb-3" style={{ gap: 12 }}>
              <View
                className="w-8 h-8 rounded-full items-center justify-center"
                style={{ backgroundColor: 'rgba(232,93,93,0.2)' }}
              >
                <MessageSquare size={16} color="#1D9E75" />
              </View>
              <Text className="text-base font-medium text-[#F5F5F5]">Pergunta para o médico</Text>
            </View>
            <Text className="text-base text-[#888888] leading-relaxed italic">
              "{suggestedQuestion}"
            </Text>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}
