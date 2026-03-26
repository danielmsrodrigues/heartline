import { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import {
  Sparkles,
  CheckCircle,
  Heart,
  MessageSquare,
  Copy,
  Check,
  ArrowUp,
} from 'lucide-react-native';
import { useGeneratedContent } from '@/hooks/useGeneratedContent';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useBiomarkers, BiomarkerWithScoring } from '@/hooks/useBiomarkers';
import { askQuestion } from '@/lib/ai';
import { Sparkline } from '@/components/sparkline';
import { AttentionBadge } from '@/components/attention-badge';
import { ATTENTION_COLORS } from '@/constants/colors';
import { SkeletonSection, SkeletonCard } from '@/components/ui/Skeleton';

// Common aliases to match AI text to normalized biomarker keys
const BIOMARKER_ALIASES: Record<string, string[]> = {
  ldl: ['ldl', 'colesterol ldl', 'colesterol mau'],
  hdl: ['hdl', 'colesterol hdl', 'colesterol bom'],
  triglycerides: ['triglicéridos', 'trigliceridos', 'triglicéridos'],
  glucose: ['glicose', 'glucose', 'glicemia', 'açúcar'],
  total_cholesterol: ['colesterol total'],
  hba1c: ['hba1c', 'hemoglobina glicada'],
  crp: ['pcr', 'crp', 'proteína c-reactiva', 'proteina c-reactiva'],
  hemoglobin: ['hemoglobina'],
  iron: ['ferro'],
  ferritin: ['ferritina'],
  vitamin_d: ['vitamina d'],
  vitamin_b12: ['vitamina b12'],
  tsh: ['tsh', 'tiróide'],
  uric_acid: ['ácido úrico', 'acido urico'],
  creatinine: ['creatinina'],
  urea: ['ureia'],
};

function findMentionedBiomarkers(
  text: string,
  biomarkers: BiomarkerWithScoring[],
  max: number = 2,
): BiomarkerWithScoring[] {
  if (!text || biomarkers.length === 0) return [];
  const lower = text.toLowerCase();
  const found: BiomarkerWithScoring[] = [];

  for (const bio of biomarkers) {
    if (found.length >= max) break;
    // Check normalized name
    if (lower.includes(bio.name_normalized)) {
      found.push(bio);
      continue;
    }
    // Check display name
    if (lower.includes(bio.name.toLowerCase())) {
      found.push(bio);
      continue;
    }
    // Check aliases
    const aliases = BIOMARKER_ALIASES[bio.name_normalized];
    if (aliases?.some((a) => lower.includes(a))) {
      found.push(bio);
    }
  }

  return found;
}

function MiniBiomarkerCard({
  biomarker,
  onPress,
}: {
  biomarker: BiomarkerWithScoring;
  onPress: () => void;
}) {
  const color = ATTENTION_COLORS[biomarker.attentionLevel]?.text ?? '#EF9F27';
  const sparkData = biomarker.readings.map((r) => r.value);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        backgroundColor: '#111111',
        borderRadius: 12,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.06)',
        marginTop: 12,
        gap: 14,
      }}
    >
      {/* Dot + name + value */}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#FFFFFF' }}>
            {biomarker.name}
          </Text>
        </View>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#F5F5F5', marginTop: 2 }}>
          {biomarker.latestValue}{' '}
          <Text style={{ fontSize: 12, fontWeight: '400', color: '#666666' }}>
            {biomarker.unit}
          </Text>
        </Text>
      </View>

      {/* Sparkline */}
      {sparkData.length >= 2 ? (
        <Sparkline data={sparkData} width={60} height={24} color={color} />
      ) : null}

      {/* Badge */}
      <AttentionBadge level={biomarker.attentionLevel} />
    </TouchableOpacity>
  );
}

const CHAT_SUGGESTIONS = [
  'Explica-me o meu LDL',
  'O que posso melhorar?',
  'O meu HDL é preocupante?',
];

export default function AnalysisScreen() {
  const router = useRouter();
  const { cards, fullAnalysis, questions, loading } = useGeneratedContent();
  const { user } = useAuth();
  const { familyHistory } = useProfile();
  const { biomarkers } = useBiomarkers(familyHistory.length > 0);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatAnswer, setChatAnswer] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const handleCopy = async (text: string, idx: number) => {
    await Clipboard.setStringAsync(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleAsk = async () => {
    if (!chatQuestion.trim() || !user || chatLoading) return;
    setChatLoading(true);
    setChatAnswer('');
    try {
      const result = await askQuestion(user.id, chatQuestion.trim());
      setChatAnswer(result.answer);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // Scroll to bottom to show answer
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
    } catch (e) {
      setChatAnswer('Não foi possível obter resposta. Tenta novamente.');
    } finally {
      setChatLoading(false);
    }
  };

  const handleSuggestion = (text: string) => {
    setChatQuestion(text);
    setChatAnswer('');
  };

  // Find mentioned biomarkers for each section
  const insightText = fullAnalysis?.full_insight || cards?.insight || '';
  const positiveText = fullAnalysis?.full_positive || cards?.positive || '';
  const familyText = fullAnalysis?.full_family || cards?.family_note || '';

  const insightBiomarkers = useMemo(
    () => findMentionedBiomarkers(insightText, biomarkers, 2),
    [insightText, biomarkers],
  );
  const positiveBiomarkers = useMemo(
    () => findMentionedBiomarkers(positiveText, biomarkers, 2),
    [positiveText, biomarkers],
  );
  const familyBiomarkers = useMemo(
    () => findMentionedBiomarkers(familyText, biomarkers, 2),
    [familyText, biomarkers],
  );

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={88}
      >
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>

            {/* Skeleton loading state */}
            {loading && !cards ? (
              <View>
                <SkeletonSection titleWidth={200} />
                <SkeletonSection titleWidth={160} />
                <SkeletonSection titleWidth={140} />
                <View style={{ height: 1, backgroundColor: '#151515', marginBottom: 32 }} />
                <SkeletonSection titleWidth={190} />
                <View style={{ gap: 12 }}>
                  <SkeletonCard lines={2} />
                  <SkeletonCard lines={2} />
                </View>
              </View>
            ) : null}

            {/* Main Insight Section */}
            {!loading && insightText ? (
              <View style={{ marginBottom: 32 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(29,158,117,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                    <Sparkles size={20} color="#1D9E75" />
                  </View>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>
                    O que vemos no conjunto
                  </Text>
                </View>
                <Text style={{ fontSize: 15, lineHeight: 24, color: '#C0C0C0' }}>
                  {insightText}
                </Text>
                {insightBiomarkers.map((b) => (
                  <MiniBiomarkerCard
                    key={b.name_normalized}
                    biomarker={b}
                    onPress={() => router.push(`/biomarker/${b.name_normalized}` as any)}
                  />
                ))}
              </View>
            ) : null}

            {/* Positive Section */}
            {!loading && positiveText ? (
              <View style={{ marginBottom: 32 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(29,158,117,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle size={20} color="#1D9E75" />
                  </View>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>
                    O que está a teu favor
                  </Text>
                </View>
                <Text style={{ fontSize: 15, lineHeight: 24, color: '#C0C0C0' }}>
                  {positiveText}
                </Text>
                {positiveBiomarkers.map((b) => (
                  <MiniBiomarkerCard
                    key={b.name_normalized}
                    biomarker={b}
                    onPress={() => router.push(`/biomarker/${b.name_normalized}` as any)}
                  />
                ))}
              </View>
            ) : null}

            {/* Family History Section */}
            {!loading && familyText ? (
              <View style={{ marginBottom: 32 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(239,159,39,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                    <Heart size={20} color="#EF9F27" />
                  </View>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>
                    Contexto familiar
                  </Text>
                </View>
                <Text style={{ fontSize: 15, lineHeight: 24, color: '#C0C0C0' }}>
                  {familyText}
                </Text>
                {familyBiomarkers.map((b) => (
                  <MiniBiomarkerCard
                    key={b.name_normalized}
                    biomarker={b}
                    onPress={() => router.push(`/biomarker/${b.name_normalized}` as any)}
                  />
                ))}
              </View>
            ) : null}

            {/* Divider */}
            {!loading ? <View style={{ height: 1, backgroundColor: '#151515', marginBottom: 32 }} /> : null}

            {/* Questions for your doctor */}
            {!loading && questions.length > 0 ? (
              <View style={{ marginBottom: 32 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(29,158,117,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                    <MessageSquare size={20} color="#1D9E75" />
                  </View>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>
                    Para a tua próxima consulta
                  </Text>
                </View>

                <View style={{ gap: 12 }}>
                  {questions.map((q, i) => (
                    <View
                      key={i}
                      style={{
                        backgroundColor: '#111111',
                        borderRadius: 16,
                        padding: 18,
                        borderWidth: 0.5,
                        borderColor: 'rgba(255,255,255,0.06)',
                      }}
                    >
                      <Text style={{ fontSize: 15, lineHeight: 22, color: '#D4D4D4', fontStyle: 'italic', marginBottom: 8 }}>
                        "{q.question}"
                      </Text>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, color: '#666666', flex: 1, marginRight: 12 }}>
                          {q.context}
                        </Text>
                        <TouchableOpacity
                          onPress={() => handleCopy(q.question, i)}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: 'rgba(255,255,255,0.06)',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          activeOpacity={0.7}
                        >
                          {copiedIdx === i ? (
                            <Check size={16} color="#1D9E75" />
                          ) : (
                            <Copy size={16} color="#888888" />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Chat answer + loading */}
            {chatAnswer ? (
              <View style={{
                backgroundColor: '#111111',
                borderRadius: 16,
                padding: 18,
                marginBottom: 16,
                borderWidth: 0.5,
                borderColor: 'rgba(29,158,117,0.15)',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Sparkles size={14} color="#1D9E75" />
                  <Text style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: '#1D9E75' }}>
                    Resposta
                  </Text>
                </View>
                <Text style={{ fontSize: 15, lineHeight: 24, color: '#C0C0C0' }}>
                  {chatAnswer}
                </Text>
              </View>
            ) : null}

            {chatLoading ? (
              <View style={{
                backgroundColor: '#111111',
                borderRadius: 16,
                padding: 18,
                marginBottom: 16,
                borderWidth: 0.5,
                borderColor: 'rgba(29,158,117,0.15)',
                alignItems: 'center',
                flexDirection: 'row',
                gap: 12,
              }}>
                <ActivityIndicator size="small" color="#1D9E75" />
                <Text style={{ fontSize: 14, color: '#666666' }}>
                  A analisar os teus dados...
                </Text>
              </View>
            ) : null}

          </View>
        </ScrollView>

        {/* Sticky bottom chat area */}
        {!loading ? (
          <View style={{
            borderTopWidth: 0.5,
            borderTopColor: '#1A1A1A',
            backgroundColor: '#0A0A0A',
            paddingHorizontal: 20,
            paddingTop: 10,
            paddingBottom: Platform.OS === 'ios' ? 28 : 16,
          }}>
            {/* Suggestion chips */}
            {!chatAnswer && !chatLoading ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingBottom: 10 }}
              >
                {CHAT_SUGGESTIONS.map((s, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => handleSuggestion(s)}
                    activeOpacity={0.7}
                    style={{
                      backgroundColor: '#111111',
                      borderRadius: 20,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderWidth: 0.5,
                      borderColor: 'rgba(255,255,255,0.06)',
                    }}
                  >
                    <Text style={{ fontSize: 13, color: '#999999' }}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : null}

            {/* Input row */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#111111',
              borderRadius: 24,
              borderWidth: 0.5,
              borderColor: 'rgba(255,255,255,0.06)',
              paddingLeft: 16,
              paddingRight: 6,
              paddingVertical: 4,
            }}>
              <TextInput
                value={chatQuestion}
                onChangeText={setChatQuestion}
                placeholder="Escreve a tua pergunta..."
                placeholderTextColor="#555555"
                style={{
                  flex: 1,
                  fontSize: 15,
                  color: '#FFFFFF',
                  paddingVertical: 8,
                  maxHeight: 80,
                }}
                multiline
                maxLength={300}
                returnKeyType="send"
                onSubmitEditing={handleAsk}
                blurOnSubmit
              />
              <TouchableOpacity
                onPress={handleAsk}
                disabled={!chatQuestion.trim() || chatLoading}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: chatQuestion.trim() ? '#1D9E75' : '#1A1A1A',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                activeOpacity={0.7}
              >
                <ArrowUp size={18} color={chatQuestion.trim() ? '#FFFFFF' : '#555555'} />
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}
