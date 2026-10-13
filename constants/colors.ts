// As cores dos níveis vivem em constants/theme.ts (variam com claro/escuro).

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
  fora_do_range: "Fora do intervalo",
} as const;
