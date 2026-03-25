export const ATTENTION_COLORS = {
  dentro_do_esperado: { bg: "rgba(29,158,117,0.15)", text: "#1D9E75", border: "#1D9E75" },
  a_acompanhar: { bg: "rgba(239,159,39,0.15)", text: "#EF9F27", border: "#EF9F27" },
  merece_atencao: { bg: "rgba(239,159,39,0.15)", text: "#EF9F27", border: "#EF9F27" },
  fora_do_range: { bg: "rgba(226,75,74,0.15)", text: "#E24B4A", border: "#E24B4A" },
} as const;

export const TREND_LABELS = {
  a_subir: "A subir",
  a_descer: "A descer",
  estavel: "Estável",
  sem_dados: "Sem dados anteriores",
} as const;

export const ATTENTION_LABELS = {
  dentro_do_esperado: "Esperado",
  a_acompanhar: "A acompanhar",
  merece_atencao: "Merece atenção",
  fora_do_range: "Fora do range",
} as const;
