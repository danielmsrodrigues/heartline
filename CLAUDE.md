# Heartline MVP — Prompt de Contexto para Desenvolvimento

## O que é este documento

Este é o briefing completo para construir o MVP do Heartline — uma app nativa iOS de saúde cardiovascular com contexto inteligente. Contém todas as decisões de produto, técnicas e de design já tomadas. Usa-o como fonte de verdade durante o desenvolvimento.

---

## 1. VISÃO DO PRODUTO

### O que é
Uma app nativa iOS (com Android planeado a seguir) que ajuda jovens adultos com histórico familiar cardiovascular a entender os seus exames clínicos de forma integrada, longitudinal e personalizada.

### O que NÃO é
- NÃO é um dispositivo médico
- NÃO faz diagnósticos
- NÃO dá percentagens de risco
- NÃO recomenda medicação ou tratamento

### Posicionamento
"Ferramenta de interpretação e literacia em saúde" — ajuda o utilizador a ter melhores conversas com o seu médico, não a substituí-lo.

### User persona
- Jovem adulto (20-30 anos), aparentemente saudável
- Histórico familiar forte de eventos cardiovasculares (ex: pai com enfarte aos 48)
- Exames clínicos maioritariamente normais, mas alguns valores no limite
- Estilo de vida moderadamente saudável (ginásio 3x/semana, trabalho sedentário)
- Sente ansiedade por falta de uma visão integrada dos seus dados de saúde

### Proposta de valor core
A medicina atual analisa exames isoladamente. O Heartline cruza todos os exames ao longo do tempo, com histórico familiar e estilo de vida, e explica o que o CONJUNTO dos dados sugere — em linguagem clara, com ações concretas.

---

## 2. STACK TÉCNICA

### App (iOS first, Android depois)
- **React Native** com **Expo SDK 52+** (managed workflow)
- **TypeScript**
- **Expo Router** para navegação (file-based routing)
- **NativeWind** (Tailwind CSS para React Native)
- **expo-camera** para captura de fotos de exames
- **expo-image-picker** para upload de PDFs/fotos da galeria
- **expo-secure-store** para tokens de autenticação
- **react-native-svg** para sparklines e gráficos
- **expo-notifications** para lembretes de exames futuros

### Backend / Base de dados
- **Supabase** (PostgreSQL + Auth + Storage + Row Level Security)
  - Auth: email/password (via @supabase/supabase-js — funciona com React Native)
  - Storage: para PDFs/fotos de exames originais
  - RLS: cada utilizador só vê os seus dados
  - Edge Functions (Deno): para chamadas seguras à API de IA (esconde API keys)

### IA
- **Google Gemini API (Gemini 2.0 Flash)** — free tier (15 RPM, sem custos)
  1. Extração de valores de exames a partir de foto/PDF (vision)
  2. Geração de narrativa personalizada
  3. Geração de perguntas para o médico
- API key obtida em https://aistudio.google.com/apikey (grátis, conta Google)
- As chamadas à API de IA DEVEM ser feitas via Supabase Edge Functions — NUNCA incluir API keys no código da app
- A camada de abstração deve permitir trocar de provider (Gemini → Claude → OpenAI) mudando apenas a Edge Function, sem tocar na app

### Nota sobre custos de IA
- O free tier do Gemini cobre todo o MVP e primeiros utilizadores
- Quando o volume justificar, migrar para Gemini Pro ou Anthropic Claude conforme qualidade/preço
- A app NUNCA sabe qual modelo está por trás — chama a Edge Function e recebe JSON

### Build e Deploy
- **Expo EAS (Expo Application Services)** para builds iOS (não precisa de Mac)
- **Apple App Store** (via TestFlight para beta testers, depois App Store)
- **Supabase** hosted (plano free para início)

---

## 3. ESTRUTURA DO PROJECTO

```
heartline/
├── app/                        # Expo Router (file-based routing)
│   ├── _layout.tsx             # Root layout (providers, auth check)
│   ├── index.tsx               # Entry: redirect para auth ou tabs
│   ├── (auth)/                 # Auth screens (não autenticado)
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (onboarding)/           # Onboarding (autenticado, perfil incompleto)
│   │   ├── _layout.tsx
│   │   ├── profile.tsx         # Dados pessoais + hábitos
│   │   └── family.tsx          # Histórico familiar
│   └── (tabs)/                 # App principal (autenticado, perfil completo)
│       ├── _layout.tsx         # Tab navigator
│       ├── index.tsx           # Dashboard principal
│       ├── add-exam.tsx        # Adicionar exame (foto/manual)
│       ├── confirm-values.tsx  # Confirmar valores extraídos
│       ├── biomarker/
│       │   └── [id].tsx        # Detalhe de biomarcador
│       └── settings.tsx        # Definições, RGPD, exportar/apagar dados
├── components/                 # Componentes reutilizáveis
│   ├── ui/                     # Primitivos (Button, Card, Badge, Input)
│   ├── biomarker-row.tsx       # Linha de biomarcador com sparkline
│   ├── sparkline.tsx           # Mini gráfico SVG de tendência
│   ├── attention-badge.tsx     # Badge de nível de atenção
│   ├── narrative-card.tsx      # Card "O que vemos no conjunto"
│   ├── questions-card.tsx      # Card "Para a tua próxima consulta"
│   ├── exam-camera.tsx         # Camera overlay para captura
│   └── confirm-values-list.tsx # Lista de valores extraídos com edição
├── lib/
│   ├── supabase.ts             # Supabase client config
│   ├── scoring.ts              # Lógica determinística de scoring
│   ├── types.ts                # TypeScript types/interfaces
│   └── ai.ts                   # Chamadas às Edge Functions de IA
├── hooks/
│   ├── useAuth.ts              # Auth state
│   ├── useProfile.ts           # Perfil do utilizador
│   ├── useBiomarkers.ts        # Dados dos biomarcadores
│   └── useGeneratedContent.ts  # Narrativa e perguntas (cache)
├── constants/
│   ├── colors.ts               # Palette de cores (attention levels)
│   └── biomarkers.ts           # Templates de biomarcadores comuns
├── supabase/
│   ├── migrations/             # SQL migrations
│   └── functions/              # Edge Functions (Deno)
│       ├── extract-exam/       # IA: extração de valores
│       ├── generate-narrative/ # IA: narrativa personalizada
│       └── generate-questions/ # IA: perguntas para o médico
├── app.json                    # Expo config
├── eas.json                    # EAS Build config
└── tsconfig.json
```

---

## 4. MODELO DE DADOS

```sql
-- Perfil do utilizador
create table profiles (
  id uuid references auth.users primary key,
  name text,
  birth_date date,
  sex text check (sex in ('M', 'F', 'other')),
  smoker boolean default false,
  exercise_minutes_per_week integer,
  sedentary_work boolean default false,
  sleep_hours_avg numeric(3,1),
  onboarding_completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Histórico familiar
create table family_history (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  relationship text, -- 'pai', 'mae', 'irmao', 'irma', 'avo_paterno', etc.
  event_type text,   -- 'enfarte', 'avc', 'trombose', 'morte_subita', 'outro'
  event_age integer, -- idade do familiar no evento
  notes text,
  created_at timestamptz default now()
);

-- Exames (agrupamento)
create table exams (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  lab_name text,           -- nome do laboratório
  exam_date date not null,
  original_file_path text, -- path no Supabase Storage (foto/PDF original)
  extraction_method text check (extraction_method in ('manual', 'ai_extracted')),
  created_at timestamptz default now()
);

-- Valores individuais dos biomarcadores
create table biomarkers (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid references exams(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  name text not null,        -- 'Colesterol LDL', 'HDL', 'Triglicéridos', etc.
  name_normalized text,      -- 'ldl', 'hdl', 'triglycerides' (para agrupar)
  value numeric not null,
  unit text not null,        -- 'mg/dL', 'g/dL', etc.
  ref_min numeric,           -- range do laboratório
  ref_max numeric,
  ai_confidence text check (ai_confidence in ('high', 'medium', 'low')),
  user_confirmed boolean default false,
  created_at timestamptz default now()
);

-- Conteúdo gerado por IA (cache)
create table generated_content (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  content_type text check (content_type in ('narrative', 'questions')),
  content jsonb not null,      -- o texto/perguntas gerados
  based_on_exam_ids uuid[],    -- quais exames foram considerados
  generated_at timestamptz default now()
);

-- Row Level Security
alter table profiles enable row level security;
alter table family_history enable row level security;
alter table exams enable row level security;
alter table biomarkers enable row level security;
alter table generated_content enable row level security;

-- Policies: cada utilizador só acede aos seus dados
create policy "Users see own profile" on profiles for all using (id = auth.uid());
create policy "Users see own family" on family_history for all using (profile_id = auth.uid());
create policy "Users see own exams" on exams for all using (profile_id = auth.uid());
create policy "Users see own biomarkers" on biomarkers for all using (profile_id = auth.uid());
create policy "Users see own content" on generated_content for all using (profile_id = auth.uid());
```

---

## 5. LÓGICA DE SCORING (DETERMINÍSTICA — SEM IA)

O scoring é uma tabela if/else simples. NÃO usa guidelines médicas formais. Usa apenas a posição do valor no range do laboratório + tendência + contexto familiar.

### Quatro níveis de atenção
1. **"Dentro do esperado"** — cor neutra (cinza/verde suave)
2. **"A acompanhar"** — cor âmbar suave
3. **"Merece atenção"** — cor laranja
4. **"Fora do range"** — cor vermelha suave

### Lógica (ficheiro: lib/scoring.ts)

```typescript
type AttentionLevel = 'dentro_do_esperado' | 'a_acompanhar' | 'merece_atencao' | 'fora_do_range';
type Trend = 'a_subir' | 'a_descer' | 'estavel' | 'sem_dados';

function getPosition(value: number, refMin: number | null, refMax: number | null): number {
  if (refMax === null || refMax === refMin) return 0.5;
  const min = refMin ?? 0;
  return (value - min) / (refMax - min);
}

function getTrend(readings: { value: number; date: string }[]): Trend {
  if (readings.length < 2) return 'sem_dados';
  const sorted = [...readings].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const first = sorted[0].value;
  const last = sorted[sorted.length - 1].value;
  const change = ((last - first) / first) * 100;
  if (change > 10) return 'a_subir';
  if (change < -10) return 'a_descer';
  return 'estavel';
}

function getAttentionLevel(
  position: number,
  trend: Trend,
  hasFamilyHistory: boolean
): AttentionLevel {
  if (position > 1.0 || position < 0.0) return 'fora_do_range';
  if (position > 0.66 && trend === 'a_subir') return 'merece_atencao';
  if (position > 0.66 && hasFamilyHistory) return 'merece_atencao';
  if (trend === 'a_subir') return 'a_acompanhar';
  if (position > 0.66) return 'a_acompanhar';
  return 'dentro_do_esperado';
}
```

---

## 6. CAMADA DE IA — TRÊS USOS

Todas as chamadas à API de IA são feitas via Supabase Edge Functions (Deno). A app nunca tem acesso direto às API keys. A Edge Function abstrai o provider — atualmente Gemini, mas pode ser trocado sem alterar a app.

### Uso 1: Extração de exames (foto/PDF → dados)

Edge Function: `supabase/functions/extract-exam/index.ts`

System prompt para extração:

```
Estás a analisar uma imagem/PDF de um exame clínico português.

Extrai TODOS os biomarcadores que encontrares. Para cada um, devolve:
- name: nome do biomarcador tal como aparece no documento
- name_normalized: versão normalizada em lowercase sem acentos (ex: "ldl", "hdl", "triglycerides", "glucose", "hba1c")
- value: valor numérico
- unit: unidade (mg/dL, g/dL, etc.)
- ref_min: limite inferior do range de referência (ou null)
- ref_max: limite superior do range de referência
- confidence: "high", "medium", ou "low"

Também extrai:
- lab_name: nome do laboratório (se visível)
- exam_date: data do exame (se visível), formato YYYY-MM-DD

Responde APENAS em JSON válido. Sem markdown, sem backticks, sem explicações.
Formato: { "lab_name": "...", "exam_date": "...", "markers": [...] }
```

Modelo: gemini-2.0-flash via Google AI Studio API (free tier).
A imagem é enviada como base64 da app para a Edge Function.

Exemplo de chamada Gemini na Edge Function (Deno):
```typescript
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inline_data: { mime_type: "image/jpeg", data: imageBase64 } },
          { text: EXTRACTION_PROMPT }
        ]
      }],
      generationConfig: {
        temperature: 0.1,  // baixa para extração precisa
        responseMimeType: "application/json"
      }
    })
  }
);
const data = await response.json();
const extracted = JSON.parse(data.candidates[0].content.parts[0].text);
```

NOTA: O `responseMimeType: "application/json"` força o Gemini a devolver JSON válido — elimina problemas de parsing com backticks e markdown.

O utilizador SEMPRE confirma os valores antes de guardar. Valores com confidence "medium" ou "low" ficam destacados a amarelo.

### Uso 2: Narrativa personalizada

Edge Function: `supabase/functions/generate-narrative/index.ts`

System prompt:

```
És um comunicador de saúde. O teu trabalho é ajudar pessoas a entender os seus dados de saúde de forma clara e calma.

DADOS DO UTILIZADOR:
{dados_serializados}

INSTRUÇÕES:
1. Escreve 2-3 parágrafos curtos que expliquem o que o CONJUNTO dos dados sugere.
2. NÃO repitas cada valor individualmente — fala sobre padrões e relações entre biomarcadores.
3. Se há histórico familiar, integra-o naturalmente no texto.
4. Menciona factores positivos do estilo de vida (exercício, não fumar, etc.).
5. Usa linguagem acessível. Sem jargão médico desnecessário.
6. Quando explicares termos técnicos, fá-lo de forma natural ("o LDL, que transporta gordura para as artérias").

REGRAS ABSOLUTAS — VIOLAÇÃO DE QUALQUER UMA INVALIDA O OUTPUT:
- NUNCA uses a palavra "risco" ou "diagnóstico"
- NUNCA dês percentagens de probabilidade
- NUNCA recomends medicação ou tratamento
- NUNCA digas "está tudo bem", "não te preocupes", ou "não há problema"
- NUNCA uses "deves" ou "precisas" — usa "vale a pena", "faz sentido", "é boa prática"
- Quando mencionares práticas médicas, diz "alguns profissionais consideram" ou "é prática comum"
- O nível de atenção mais positivo que podes dar é: "Não identificámos tendências de alerta nos dados que nos forneceste — mas isto não substitui avaliação médica."

TOM:
- Caloroso mas honesto
- O objetivo é clareza e sensação de controlo, não conforto falso
- Valida o que o utilizador está a fazer bem (exercício, atenção à saúde)
- Transforma preocupação vaga em informação concreta

FORMATO: Texto corrido em parágrafos, sem bullets, sem headers, sem bold. Máximo 150 palavras. Escreve em português de Portugal.
```

### Uso 3: Perguntas para o médico

Edge Function: `supabase/functions/generate-questions/index.ts`

System prompt:

```
Com base neste perfil de saúde, gera 2-3 perguntas que esta pessoa poderia fazer ao médico na próxima consulta.

DADOS: {dados_serializados}

INSTRUÇÕES:
- Cada pergunta deve referenciar dados concretos do utilizador (valores, tendências, datas)
- Formuladas na 1ª pessoa, prontas a usar pelo utilizador
- Inclui uma frase curta de contexto (porquê esta pergunta)
- Ordena da mais urgente para a menos urgente

REGRAS:
- NUNCA sugiras medicação ou tratamento específico
- As perguntas pedem AVALIAÇÃO ao médico, não confirmação
- Usa "faz sentido", "seria útil", "vale a pena" — nunca "preciso" ou "devo"
- Máximo 3 perguntas

FORMATO: JSON array. Sem markdown, sem backticks.
[{ "question": "...", "context": "..." }]
Escreve em português de Portugal.
```

### Custos e cache
- Custo com Gemini free tier: **$0** (15 requests/minuto, mais do que suficiente)
- Limite a ter em conta: se passares 1500 requests/dia no free tier, precisas de upgrade (~$0 para volumes MVP)
- A narrativa e perguntas são guardadas na tabela `generated_content`
- Só são regeneradas quando o utilizador adiciona novos dados
- NÃO chamar a API em cada abertura de ecrã — servir do cache

---

## 7. ECRÃS E NAVEGAÇÃO

### Estrutura de navegação (Expo Router)

```
(auth)          → Stack Navigator (login, register)
(onboarding)    → Stack Navigator (profile, family)
(tabs)          → Tab Navigator
  ├── Dashboard (tab: index)
  ├── Adicionar exame (tab: add-exam → confirm-values)
  └── Definições (tab: settings)
  └── [Push] Detalhe biomarcador (biomarker/[id])
```

### Fluxo principal

```
1. Splash → Check auth
   ├── Não autenticado → (auth)/login
   └── Autenticado → Check onboarding_completed
       ├── false → (onboarding)/profile → family → marca completed
       └── true → (tabs)/index (Dashboard)

2. Dashboard vazio → CTA: "Adiciona o teu primeiro exame"

3. Adicionar exame (tab: add-exam):
   a. Opção 1: Câmara (expo-camera) — tira foto ao exame
   b. Opção 2: Galeria (expo-image-picker) — escolhe foto/PDF
   c. Opção 3: Input manual (formulário)
   → Foto/PDF: upload para Supabase Storage → Edge Function extrai valores
   → Ecrã confirm-values: lista de valores extraídos + imagem original
   → Utilizador confirma/edita → guarda na DB
   → Scoring calculado → Edge Functions geram narrativa + perguntas
   → Redirect para Dashboard

4. Dashboard com dados:
   a. Lista de biomarcadores com sparkline + nível de atenção
   b. Secção "O que vemos no conjunto" (narrativa IA)
   c. Secção "O que está a teu favor" (factores positivos)
   d. Secção "Para a tua próxima consulta" (perguntas IA)
   e. Disclaimer permanente

5. Detalhe de biomarcador (push screen, biomarker/[id]):
   a. Valor atual + posição no range (barra visual)
   b. Gráfico de evolução temporal (react-native-svg)
   c. Contexto personalizado
   d. Contexto familiar (se aplicável)
   e. Pergunta sugerida para o médico
```

### Design e UX

#### Princípios visuais
- Clean, flat, whitespace generoso
- Cores dos níveis de atenção:
  - "Dentro do esperado": verde suave / cinza
  - "A acompanhar": âmbar
  - "Merece atenção": laranja
  - "Fora do range": vermelho suave
- Sparklines em cada biomarcador (mini gráfico SVG de tendência)
- Cards com border-radius generoso (16px)
- Tipografia: SF Pro (iOS system font) — não usar fontes custom
- Respeitar safe areas (notch, home indicator) com SafeAreaView
- Haptic feedback em acções importantes (confirmar valores, mudar tab)

#### Princípios emocionais (CRÍTICOS para o produto)
1. **Controlo através da clareza**: mostrar dados organizados reduz ansiedade
2. **Acção concreta substitui preocupação vaga**: transformar medo difuso em "pergunta X ao médico"
3. **Validação do que está bem**: reconhecer explicitamente o que o utilizador faz certo
4. **Cautela assimétrica**: para baixar o alerta, qualifica ("com os dados que temos..."); para subir o alerta, não qualifica

#### Padrões de segurança (UX, não só disclaimers)
1. **Nunca dizer "está tudo bem"**: o nível mais positivo é "dentro do esperado — com base nos dados que nos deste"
2. **Incompleteness badge**: mostrar sempre o que falta no perfil (ex: "Sem dados de sono")
3. **"O médico sabe mais"**: elemento visual permanente, não disclaimer escondido no fundo
4. **Confirmação obrigatória**: após extração IA, mostrar imagem original ao lado dos valores extraídos

---

## 8. CONSENTIMENTO RGPD (PROGRESSIVO)

### No registo
Apenas termos de uso + política de privacidade (link). Uma frase: "Os teus dados de saúde são encriptados e guardados na União Europeia. Nunca os vendemos ou partilhamos."

### No primeiro upload/inserção de exame
Consentimento explícito para processamento de dados de saúde:
"Para analisar os teus exames, processamos dados de saúde. Extraímos valores usando IA, guardamos tudo encriptado na UE, e tu decides o que partilhar e podes apagar tudo a qualquer momento. [checkbox] Autorizo o processamento dos meus dados de saúde."

### Nos settings
- Botão "Exportar os meus dados" (direito de portabilidade)
- Botão "Apagar a minha conta e todos os dados" (direito ao apagamento)

---

## 9. LINGUAGEM — REGRAS ABSOLUTAS

### Palavras/frases PROIBIDAS em toda a app
- "diagnóstico", "diagnosticar"
- "risco" (em qualquer contexto de saúde)
- percentagens de probabilidade clínica ("23% de probabilidade de...")
- "normal" / "anormal" como categorias da app
- "recomendamos", "deves", "precisas"
- "paciente"
- "plano de tratamento", "prescrição"
- "está tudo bem", "não te preocupes"

### Linguagem aprovada
- "contexto" em vez de "diagnóstico"
- "merece atenção" em vez de "risco elevado"
- "dentro do range de referência" em vez de "normal"
- "fora do range indicado pelo laboratório" em vez de "anormal"
- "alguns profissionais de saúde consideram que..." em vez de "recomendamos"
- "vale a pena", "faz sentido", "é boa prática" em vez de "deves"

---

## 10. APP STORE — PREPARAÇÃO PARA REVIEW

### Apple App Store Guidelines (secção 5.1.3: Health, Fitness, and Medical)
A app NÃO faz diagnósticos, NÃO calcula risco clínico, NÃO recomenda tratamento. É uma ferramenta de literacia e organização de dados de saúde. Para a review:

- A App Store description deve dizer explicitamente: "Esta app não fornece diagnósticos médicos nem substitui aconselhamento médico profissional."
- Em "App Review Information" (notas para o reviewer), explicar: "Heartline é uma ferramenta de literacia em saúde que ajuda utilizadores a organizar os seus exames clínicos e entender tendências nos seus dados. Não faz diagnósticos, não calcula scores de risco clínico, e não recomenda tratamento. Todos os outputs sugerem ao utilizador que consulte o seu médico."
- Privacy nutrition labels: marcar que recolhemos dados de saúde, linked to identity, para funcionalidade da app
- Categorizar como "Health & Fitness" (não "Medical")

### TestFlight
- Usar TestFlight para os 5-10 beta testers antes de submeter para review
- Ciclo de beta: 1-2 semanas de testes antes de submeter para App Store

---

## 11. TIMELINE DE DESENVOLVIMENTO (5 SEMANAS)

### Semana 1: Fundação
- Setup Expo + TypeScript + NativeWind
- Configurar Supabase (projecto, schema SQL, RLS policies)
- Configurar EAS Build para iOS
- Auth screens (login, register) com Supabase Auth
- Root layout com auth flow (redirect para login ou onboarding ou tabs)

### Semana 2: Onboarding + Input de dados
- Ecrãs de onboarding (perfil + histórico familiar)
- Formulário de input manual de exame (para testar sem IA)
- Câmara / image picker para captura de exame
- Upload de imagem para Supabase Storage
- Tab navigator shell (Dashboard vazio, Add Exam, Settings)

### Semana 3: IA + Scoring
- Supabase Edge Functions (extract-exam, generate-narrative, generate-questions)
- Ecrã de confirmação de valores extraídos (com imagem original + lista editável)
- Lógica de scoring (lib/scoring.ts)
- Guardar biomarkers na DB após confirmação
- Trigger de geração de narrativa + perguntas após guardar

### Semana 4: Dashboard + Detalhe
- Dashboard principal: lista de biomarcadores com sparklines + attention badges
- Secção narrativa IA ("O que vemos no conjunto")
- Secção factores positivos ("O que está a teu favor")
- Secção perguntas ("Para a tua próxima consulta")
- Ecrã de detalhe de biomarcador (gráfico evolução + contexto + range bar)
- Disclaimer permanente
- Settings screen (exportar dados, apagar conta)

### Semana 5: Polish + TestFlight + Submissão
- Consentimento RGPD progressivo
- Loading states e error handling em todas as operações IA
- Haptic feedback e micro-interações
- App icon + splash screen
- TestFlight build → testes com 5-10 pessoas reais
- Correcção de bugs
- Preparar App Store listing (screenshots, description, privacy labels)
- Submeter para App Store review

NOTA: A Apple pode demorar 1-7 dias a fazer review e pode pedir alterações. Planear 1-2 semanas extra de buffer após a semana 5.

---

## 12. DECISÕES JÁ TOMADAS (NÃO REABRIR)

1. App nativa iOS (React Native/Expo), não PWA — confiança do utilizador + câmara nativa + notificações
2. iOS primeiro, Android depois — foco num mercado, iterar rápido
3. Expo managed workflow — evitar ejectar, manter simplicidade
4. Supabase, não Azure — velocidade de lançamento > escalabilidade prematura
5. Scoring determinístico (if/else), IA para narrativa — previsibilidade onde importa, inteligência onde diferencia
6. Input via foto com fallback manual — momento "wow" mas com safety net
7. Sem referências a guidelines médicas formais (ESC, SCORE2, etc.) — posicionamento como literacia, não ferramenta clínica
8. 4 níveis descritivos de atenção, nunca "risco" — segurança regulatória
9. Cache de conteúdo IA — regenerar só quando há dados novos, não em cada abertura de ecrã
10. Disclaimer como elemento de UX, não como texto legal escondido no fundo
11. SF Pro (system font), não fontes custom — native feel no iOS

---

## 13. NOTAS PARA O DESENVOLVIMENTO

### Sobre Expo e React Native
- Usar Expo SDK 52+ com managed workflow — NÃO ejectar
- expo-camera precisa de permissão explícita (Info.plist: NSCameraUsageDescription)
- expo-image-picker precisa de NSPhotoLibraryUsageDescription
- NativeWind para styling — equivalente a Tailwind mas para React Native
- Para gráficos e sparklines, usar react-native-svg directamente (não Recharts — não funciona bem em RN)
- SafeAreaView obrigatório em todos os ecrãs (notch, Dynamic Island)
- Testar em iPhone SE (ecrã pequeno) e iPhone 15 Pro Max (ecrã grande)

### Sobre a extração IA
- A imagem capturada pela câmara é convertida para base64 antes de enviar para a Edge Function
- Comprimir a imagem antes do upload (expo-image-manipulator) — max 1500px de largura
- Testar com PDFs reais de laboratórios portugueses (Germano de Sousa, Joaquim Chaves, Unilabs, hospitais públicos)
- Valores com confidence < "high" devem ser visualmente distintos no ecrã de confirmação
- SEMPRE mostrar a imagem/PDF original ao lado dos valores extraídos
- Se a extração falhar completamente, fallback gracioso para input manual

### Sobre os prompts
- Os prompts acima são v1 — vão precisar de iteração com base em outputs reais
- A regra mais importante: se o output contiver a palavra "risco" ou uma percentagem, a validação falha
- Implementar validação server-side do output da IA antes de guardar no cache

### Sobre performance
- As chamadas IA são as operações mais lentas (3-8s cada). Mostrar skeleton loading ou shimmer
- Paralelizar narrativa + perguntas (não dependem uma da outra)
- Usar React Query (@tanstack/react-query) para caching de dados client-side

### Sobre testes
- O cenário de teste principal é: homem 28 anos, pai com enfarte aos 48, LDL 142 (subindo), HDL 44, triglicéridos 165, glicose 98, PA 128/82
- Verificar que nenhum ecrã usa linguagem proibida
- Verificar que o ecrã de confirmação permite editar valores individuais
- Testar em dispositivos com e sem notch/Dynamic Island
