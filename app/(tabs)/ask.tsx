import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { askQuestion } from '@/lib/ai';
import { getCatalogEntry } from '@/lib/scoring';
import { formatDayMonth } from '@/lib/dates';
import { haptics } from '@/lib/haptics';
import { useProfile } from '@/hooks/useProfile';
import { BiomarkerWithScoring, useBiomarkers } from '@/hooks/useBiomarkers';
import { useKeyboardVisible } from '@/hooks/useKeyboardVisible';
import { overallTone, plainLabel, rankByAttention } from '@/constants/plain-language';
import { MASCOT_NAME, useTheme } from '@/constants/theme';
import { AnswerText, TypingDots } from '@/components/chat-bits';
import { Mascot } from '@/components/mascot';
import { Chip } from '@/components/ui/Chip';
import { Glass, PressableScale } from '@/components/ui/Glass';
import { Icon } from '@/components/ui/Icon';
import { riseIn } from '@/components/ui/enter';
import { Backdrop } from '@/components/ui/Screen';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  /** Resposta de erro: não leva o aviso médico nem atalhos para valores. */
  failed?: boolean;
}

const stripAccents = (text: string) =>
  text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Menção por palavra inteira; termos muito curtos ("na", "k") dariam falsos positivos. */
function mentions(text: string, term: string): boolean {
  const clean = stripAccents(term).replace(/_/g, ' ').trim();
  if (clean.length < 3) return false;
  const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(text);
}

function findMentionedBiomarkers(text: string, biomarkers: BiomarkerWithScoring[], max: number = 2): BiomarkerWithScoring[] {
  if (!text || biomarkers.length === 0) return [];
  const haystack = stripAccents(text);
  const found: BiomarkerWithScoring[] = [];
  for (const bio of biomarkers) {
    if (found.length >= max) break;
    const entry = getCatalogEntry(bio.name_normalized);
    const terms = [bio.name, bio.name_normalized, entry?.name ?? '', ...(entry?.aliases ?? [])];
    if (terms.some((term) => mentions(haystack, term))) found.push(bio);
  }
  return found;
}

/** Altura do menu nativo por cima do indicador de início. */
const TAB_BAR = 58;

export default function AskScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const keyboardVisible = useKeyboardVisible();
  const { q } = useLocalSearchParams<{ q?: string }>();
  const { familyHistory } = useProfile();
  const { biomarkers, exams } = useBiomarkers(familyHistory.length > 0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const tone = overallTone(biomarkers);
  const ranked = useMemo(() => rankByAttention(biomarkers), [biomarkers]);

  // Sugestões sobre os valores que o utilizador realmente tem.
  const suggestions = useMemo(() => {
    const top = ranked.slice(0, 2).map((b) => `Explica-me o meu ${plainLabel(b).toLowerCase()}`);
    return biomarkers.length > 0
      ? ['O que pergunto ao médico?', ...top, 'O que posso melhorar?']
      : ['O que consegues fazer?', 'Que análises faz sentido ter?'];
  }, [ranked, biomarkers.length]);

  const ask = useCallback(async (text: string) => {
    const question = text.trim();
    if (!question || thinking) return;
    haptics.press();
    setDraft('');
    setMessages((current) => [...current, { role: 'user', text: question }]);
    setThinking(true);
    try {
      const result = await askQuestion(question);
      setMessages((current) => [...current, { role: 'assistant', text: result.answer }]);
    } catch (e: any) {
      setMessages((current) => [...current, { role: 'assistant', failed: true, text: e?.message || 'Não consegui responder. Tenta outra vez.' }]);
    } finally {
      setThinking(false);
    }
  }, [thinking]);

  // Pergunta trazida de outro ecrã (detalhe de um valor): envia-se uma vez.
  const handled = useRef<string | null>(null);
  useEffect(() => {
    if (!q || handled.current === q) return;
    handled.current = q;
    router.setParams({ q: '' });
    ask(q);
  }, [q, ask, router]);

  useEffect(() => {
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
    return () => clearTimeout(timer);
  }, [messages.length, thinking]);

  const latest = exams[0];
  const empty = messages.length === 0 && !thinking;
  // Com o teclado aberto a barra encosta-se a ele; fechado, fica por cima do menu.
  const inputBottom = keyboardVisible ? 10 : insets.bottom + TAB_BAR + 10;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <Backdrop tone={tone} />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: insets.top + 12, paddingBottom: inputBottom + 76, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Mascot size={48} tone={tone} active={isFocused} reading={thinking} interactive />
          <View style={{ flex: 1 }}>
            <Text accessibilityRole="header" style={{ fontSize: 20, lineHeight: 26, fontWeight: '600', color: t.ink }}>{MASCOT_NAME}</Text>
            <Text style={{ fontSize: 14, lineHeight: 19, color: t.sub }}>
              {latest ? `Com os teus valores de ${formatDayMonth(latest.exam_date)}` : 'Ainda sem exames teus'}
            </Text>
          </View>
        </View>

        {empty ? (
          <View style={{ flex: 1, justifyContent: 'center', paddingVertical: 32 }}>
            <Text style={{ fontSize: 30, lineHeight: 34, fontWeight: '600', letterSpacing: -0.6, color: t.ink }}>Pergunta-me o que quiseres</Text>
            <View style={{ marginTop: 18, gap: 8, alignItems: 'flex-start' }}>
              {suggestions.map((s) => <Chip key={s} label={s} onPress={() => ask(s)} />)}
            </View>
          </View>
        ) : (
          <View style={{ marginTop: 22, gap: 12 }}>
            {messages.map((message, i) => {
              if (message.role === 'user') {
                return (
                  <Animated.View key={i} entering={riseIn()} style={{ alignSelf: 'flex-end', maxWidth: '82%', paddingVertical: 13, paddingHorizontal: 18, borderRadius: 22, borderBottomRightRadius: 6, backgroundColor: t.primaryBg }}>
                    <Text style={{ fontSize: 16, lineHeight: 23, color: t.primaryFg }}>{message.text}</Text>
                  </Animated.View>
                );
              }
              const mentioned = message.failed ? [] : findMentionedBiomarkers(message.text, biomarkers);
              return (
                <Animated.View key={i} entering={riseIn()} style={{ alignSelf: 'flex-start', maxWidth: '92%' }}>
                  <Glass radius={22} contentStyle={{ paddingVertical: 16, paddingHorizontal: 18 }}>
                    <AnswerText answer={message.text} tone={tone} />
                    {!message.failed && <Text style={{ marginTop: 12, fontSize: 13, lineHeight: 18, color: t.sub }}>Não substitui avaliação médica.</Text>}
                  </Glass>
                  {mentioned.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                      {mentioned.map((b) => (
                        <Chip key={b.name_normalized} label={`Ver ${b.name}`} height={38} onPress={() => router.push(`/biomarker/${b.name_normalized}` as any)} />
                      ))}
                    </View>
                  )}
                </Animated.View>
              );
            })}
            {thinking && (
              <Animated.View entering={riseIn()} style={{ alignSelf: 'flex-start' }}>
                <Glass radius={22} contentStyle={{ paddingVertical: 14, paddingHorizontal: 18 }}>
                  <TypingDots />
                </Glass>
              </Animated.View>
            )}
          </View>
        )}
      </ScrollView>

      <View style={{ position: 'absolute', left: 16, right: 16, bottom: inputBottom }}>
        <Glass radius={26} contentStyle={{ minHeight: 52, paddingLeft: 20, paddingRight: 6, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Pergunta-me o que quiseres"
            placeholderTextColor={t.sub}
            accessibilityLabel={`Pergunta ao ${MASCOT_NAME}`}
            selectionColor={t.link}
            multiline
            returnKeyType="send"
            submitBehavior="submit"
            onSubmitEditing={() => ask(draft)}
            style={{ flex: 1, maxHeight: 110, paddingVertical: 14, fontSize: 16, color: t.ink }}
          />
          <PressableScale
            onPress={() => ask(draft)}
            disabled={!draft.trim() || thinking}
            accessibilityLabel="Enviar pergunta"
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.primaryBg, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="send" size={18} color={t.primaryFg} weight="bold" />
          </PressableScale>
        </Glass>
      </View>
    </KeyboardAvoidingView>
  );
}
