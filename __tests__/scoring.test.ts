import {
  BiomarkerRow,
  canonicalBiomarkerKey,
  classifyRange,
  effectiveRange,
  getAttentionLevel,
  getProximity,
  getSeverity,
  getTrend,
  isAdverseTrend,
  isCardiovascularKey,
  scoreBiomarkers,
} from '@/lib/scoring';

let nextId = 0;
function row(partial: Partial<BiomarkerRow> & Pick<BiomarkerRow, 'name' | 'value' | 'exam_date'>): BiomarkerRow {
  return {
    id: String(++nextId),
    name_normalized: null,
    unit: 'mg/dL',
    ref_min: null,
    ref_max: null,
    ...partial,
  };
}

describe('canonicalBiomarkerKey', () => {
  it('junta as variantes do mesmo biomarcador na mesma chave', () => {
    expect(canonicalBiomarkerKey('ldl', 'Colesterol LDL')).toBe('ldl');
    expect(canonicalBiomarkerKey('colesterol_ldl', 'Colesterol LDL')).toBe('ldl');
    expect(canonicalBiomarkerKey('ldl_cholesterol', null)).toBe('ldl');
    expect(canonicalBiomarkerKey(null, 'Triglicéridos')).toBe('triglycerides');
    expect(canonicalBiomarkerKey('glicemia_em_jejum', 'Glicemia em jejum')).toBe('glucose');
  });

  it('não confunde marcadores cujo nome contém outro', () => {
    expect(canonicalBiomarkerKey('hemoglobina_glicada', 'Hemoglobina Glicada')).toBe('hba1c');
    expect(canonicalBiomarkerKey('hemoglobina', 'Hemoglobina')).toBe('hemoglobin');
  });

  it('separa as frações livres das hormonas da tiroide das totais', () => {
    expect(canonicalBiomarkerKey('t4_livre', 'T4 Livre')).toBe('ft4');
    expect(canonicalBiomarkerKey(null, 'T4 Total')).toBe('t4');
    expect(canonicalBiomarkerKey('ft3', 'FT3')).toBe('ft3');
    expect(canonicalBiomarkerKey('t3', 'T3')).toBe('t3');
  });

  it('mantém uma chave normalizada para marcadores fora do catálogo', () => {
    expect(canonicalBiomarkerKey(null, 'Zinco Sérico')).toBe('zinco_serico');
    expect(canonicalBiomarkerKey('Homocisteína', null)).toBe('homocisteina');
  });
});

describe('isCardiovascularKey', () => {
  it('usa o catálogo e reconhece variantes desconhecidas de colesterol', () => {
    expect(isCardiovascularKey('ldl')).toBe(true);
    expect(isCardiovascularKey('hemoglobin')).toBe(false);
    expect(isCardiovascularKey('colesterol_vldl')).toBe(true);
    expect(isCardiovascularKey('zinco_serico')).toBe(false);
  });
});

describe('range, severidade e proximidade', () => {
  it('classifica o tipo de range', () => {
    expect(classifyRange(70, 100)).toBe('bounded');
    expect(classifyRange(0, 130)).toBe('max_only');
    expect(classifyRange(null, 130)).toBe('max_only');
    expect(classifyRange(40, null)).toBe('min_only');
    expect(classifyRange(null, null)).toBe('none');
  });

  it('a severidade é zero dentro do range e cresce fora dele', () => {
    expect(getSeverity(90, 70, 100, 'bounded')).toBe(0);
    expect(getSeverity(115, 70, 100, 'bounded')).toBeCloseTo(0.5);
    expect(getSeverity(143, null, 130, 'max_only')).toBeCloseTo(0.1);
    expect(getSeverity(30, 40, null, 'min_only')).toBeCloseTo(0.25);
  });

  it('a proximidade sobe perto do limite', () => {
    expect(getProximity(85, 70, 100, 'bounded')).toBe(0);
    expect(getProximity(98, 70, 100, 'bounded')).toBeGreaterThan(0.66);
    expect(getProximity(60, null, 130, 'max_only')).toBe(0);
    expect(getProximity(125, null, 130, 'max_only')).toBeGreaterThan(0.66);
  });

  it('ignora o máximo do laboratório em marcadores em que mais alto é melhor', () => {
    expect(effectiveRange('hdl', 40, 60)).toEqual({ refMin: 40, refMax: null });
    expect(effectiveRange('ldl', 0, 130)).toEqual({ refMin: 0, refMax: 130 });
  });
});

describe('getTrend', () => {
  it('precisa de pelo menos duas leituras', () => {
    expect(getTrend([{ value: 100, date: '2026-01-01' }])).toBe('sem_dados');
  });

  it('compara a primeira com a última leitura, pela data', () => {
    expect(getTrend([
      { value: 142, date: '2026-01-01' },
      { value: 120, date: '2025-01-01' },
    ])).toBe('a_subir');
    expect(getTrend([
      { value: 100, date: '2025-01-01' },
      { value: 80, date: '2026-01-01' },
    ])).toBe('a_descer');
    expect(getTrend([
      { value: 100, date: '2025-01-01' },
      { value: 105, date: '2026-01-01' },
    ])).toBe('estavel');
  });

  it('não divide por zero', () => {
    expect(getTrend([
      { value: 0, date: '2025-01-01' },
      { value: 2, date: '2026-01-01' },
    ])).toBe('a_subir');
  });
});

describe('isAdverseTrend', () => {
  it('subir só pesa quando há um máximo; descer só quando há um mínimo', () => {
    expect(isAdverseTrend('a_subir', 120, null, 130, 'max_only')).toBe(true);
    expect(isAdverseTrend('a_descer', 120, null, 130, 'max_only')).toBe(false);
    expect(isAdverseTrend('a_subir', 50, 40, null, 'min_only')).toBe(false);
    expect(isAdverseTrend('a_descer', 50, 40, null, 'min_only')).toBe(true);
    expect(isAdverseTrend('a_subir', 50, null, null, 'none')).toBe(false);
  });

  it('num range fechado conta o sentido que aproxima do limite mais perto', () => {
    expect(isAdverseTrend('a_subir', 95, 70, 100, 'bounded')).toBe(true);
    expect(isAdverseTrend('a_descer', 95, 70, 100, 'bounded')).toBe(false);
    expect(isAdverseTrend('a_descer', 74, 70, 100, 'bounded')).toBe(true);
  });
});

describe('getAttentionLevel', () => {
  it('segue a tabela de decisão', () => {
    expect(getAttentionLevel(0.3, 1, false, false)).toBe('fora_do_range');
    expect(getAttentionLevel(0.15, 1, false, false)).toBe('merece_atencao');
    expect(getAttentionLevel(0.05, 1, false, false)).toBe('a_acompanhar');
    expect(getAttentionLevel(0.05, 1, false, true)).toBe('merece_atencao');
    expect(getAttentionLevel(0, 0.8, false, false)).toBe('a_acompanhar');
    expect(getAttentionLevel(0, 0.8, true, false)).toBe('merece_atencao');
    expect(getAttentionLevel(0, 0.8, false, true)).toBe('merece_atencao');
    expect(getAttentionLevel(0, 0.2, true, true)).toBe('a_acompanhar');
    expect(getAttentionLevel(0, 0.2, false, true)).toBe('dentro_do_esperado');
  });
});

describe('scoreBiomarkers', () => {
  it('reproduz o cenário de referência: LDL 142 a subir com histórico familiar', () => {
    const [ldl] = scoreBiomarkers(
      [
        row({ name: 'Colesterol LDL', name_normalized: 'ldl', value: 124, ref_min: 0, ref_max: 130, exam_date: '2025-03-01' }),
        row({ name: 'LDL', name_normalized: 'colesterol_ldl', value: 142, ref_min: 0, ref_max: 130, exam_date: '2026-03-01' }),
      ],
      true
    );
    expect(ldl.name_normalized).toBe('ldl');
    expect(ldl.latestValue).toBe(142);
    expect(ldl.readings.map((r) => r.value)).toEqual([124, 142]);
    expect(ldl.trend).toBe('a_subir');
    expect(ldl.adverseTrend).toBe(true);
    expect(ldl.familyRelevant).toBe(true);
    expect(ldl.attentionLevel).toBe('merece_atencao');
  });

  it('um HDL alto e a subir nunca é motivo de alerta', () => {
    const [hdl] = scoreBiomarkers(
      [
        row({ name: 'Colesterol HDL', value: 55, ref_min: 40, ref_max: 60, exam_date: '2025-03-01' }),
        row({ name: 'Colesterol HDL', value: 72, ref_min: 40, ref_max: 60, exam_date: '2026-03-01' }),
      ],
      true
    );
    expect(hdl.rangeType).toBe('min_only');
    expect(hdl.trend).toBe('a_subir');
    expect(hdl.adverseTrend).toBe(false);
    expect(hdl.attentionLevel).toBe('dentro_do_esperado');
  });

  it('um HDL a descer para perto do mínimo merece atenção', () => {
    const [hdl] = scoreBiomarkers(
      [
        row({ name: 'Colesterol HDL', value: 52, ref_min: 40, ref_max: 60, exam_date: '2025-03-01' }),
        row({ name: 'Colesterol HDL', value: 42, ref_min: 40, ref_max: 60, exam_date: '2026-03-01' }),
      ],
      false
    );
    expect(hdl.adverseTrend).toBe(true);
    expect(hdl.attentionLevel).toBe('merece_atencao');
  });

  it('não mistura leituras em unidades diferentes na evolução', () => {
    const [glucose] = scoreBiomarkers(
      [
        row({ name: 'Glicose', value: 5.1, unit: 'mmol/L', ref_min: 3.9, ref_max: 5.6, exam_date: '2025-03-01' }),
        row({ name: 'Glicose', value: 92, unit: 'mg/dL', ref_min: 70, ref_max: 100, exam_date: '2026-03-01' }),
      ],
      false
    );
    expect(glucose.readings).toHaveLength(1);
    expect(glucose.excludedReadings).toBe(1);
    expect(glucose.trend).toBe('sem_dados');
  });

  it('o histórico familiar só pesa em marcadores cardiovasculares', () => {
    const scored = scoreBiomarkers(
      [
        row({ name: 'Ferritina', value: 240, ref_min: 20, ref_max: 250, exam_date: '2026-03-01' }),
        row({ name: 'Triglicéridos', value: 145, ref_min: 0, ref_max: 150, exam_date: '2026-03-01' }),
      ],
      true
    );
    const byKey = Object.fromEntries(scored.map((b) => [b.name_normalized, b]));
    expect(byKey.ferritin.attentionLevel).toBe('a_acompanhar');
    expect(byKey.triglycerides.attentionLevel).toBe('merece_atencao');
    // Ordenado do que precisa de mais atenção para o que precisa de menos
    expect(scored[0].name_normalized).toBe('triglycerides');
  });

  it('ignora linhas sem data ou sem valor numérico', () => {
    const scored = scoreBiomarkers(
      [
        row({ name: 'Glicose', value: NaN, exam_date: '2026-03-01' }),
        row({ name: 'Glicose', value: 90, exam_date: '' }),
      ],
      false
    );
    expect(scored).toEqual([]);
  });
});
