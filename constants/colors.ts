export const ATTENTION_COLORS = {
  dentro_do_esperado: { bg: "#F0F7EC", text: "#4A7C28", border: "#8CB369" },
  a_acompanhar: { bg: "#FFF8F0", text: "#B8860B", border: "#F4A259" },
  merece_atencao: { bg: "#FFF0EC", text: "#C1440E", border: "#E07A5F" },
  fora_do_range: { bg: "#FDE8E8", text: "#B91C1C", border: "#D64545" },
} as const;

export const TREND_LABELS = {
  a_subir: "A subir",
  a_descer: "A descer",
  estavel: "Estável",
  sem_dados: "Sem dados anteriores",
} as const;

export const ATTENTION_LABELS = {
  dentro_do_esperado: "Dentro do esperado",
  a_acompanhar: "A acompanhar",
  merece_atencao: "Merece atenção",
  fora_do_range: "Fora do range",
} as const;
