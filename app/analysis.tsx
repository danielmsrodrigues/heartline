import { useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import {
  ChevronLeft,
  Sparkles,
  CheckCircle,
  Heart,
  MessageSquare,
  Copy,
  Check,
  Send,
  ArrowUp,
} from 'lucide-react-native';
import { useGeneratedContent } from '@/hooks/useGeneratedContent';
import { useAuth } from '@/hooks/useAuth';
import { askQuestion } from '@/lib/ai';
import { SkeletonSection, SkeletonCard } from '@/components/ui/Skeleton';

export default function AnalysisScreen() {
  const router = useRouter();
  const { cards, fullAnalysis, questions, loading } = useGeneratedContent();
  const { user } = useAuth();
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatAnswer, setChatAnswer] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

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
    } catch (e) {
      setChatAnswer('Não foi possível obter resposta. Tenta novamente.');
    } finally {
      setChatLoading(false);
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    setChatQuestion(question);
    setChatAnswer('');
  };

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header space for stack header */}
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
            {!loading && (fullAnalysis?.full_insight || cards?.insight) ? (
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
                  {fullAnalysis?.full_insight || cards?.insight}
                </Text>
              </View>
            ) : null}

            {/* Positive Section */}
            {!loading && (fullAnalysis?.full_positive || cards?.positive) ? (
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
                  {fullAnalysis?.full_positive || cards?.positive}
                </Text>
              </View>
            ) : null}

            {/* Family History Section */}
            {!loading && (fullAnalysis?.full_family || cards?.family_note) ? (
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
                  {fullAnalysis?.full_family || cards?.family_note}
                </Text>
              </View>
            ) : null}

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: '#151515', marginBottom: 32 }} />

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

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: '#151515', marginBottom: 32 }} />

            {/* Ask AI Section */}
            {!loading ? <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 6 }}>
                Perguntar sobre os meus dados
              </Text>
              <Text style={{ fontSize: 13, color: '#666666', marginBottom: 20 }}>
                Faz perguntas sobre os teus biomarcadores e a IA responde com base nos teus dados.
              </Text>

              {/* Suggested questions */}
              {questions.length > 0 && !chatAnswer && !chatLoading ? (
                <View style={{ gap: 8, marginBottom: 20 }}>
                  {questions.map((q, i) => (
                    <TouchableOpacity
                      key={i}
                      onPress={() => handleSuggestedQuestion(q.question)}
                      style={{
                        backgroundColor: '#111111',
                        borderRadius: 12,
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        borderWidth: 0.5,
                        borderColor: 'rgba(255,255,255,0.06)',
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={{ fontSize: 14, color: '#C0C0C0' }}>
                        {q.question}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              {/* Chat answer */}
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

              {/* Input */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#111111',
                borderRadius: 16,
                borderWidth: 0.5,
                borderColor: 'rgba(255,255,255,0.06)',
                paddingLeft: 16,
                paddingRight: 6,
                paddingVertical: 6,
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
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: chatQuestion.trim() ? '#1D9E75' : '#1A1A1A',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  activeOpacity={0.7}
                >
                  <ArrowUp size={20} color={chatQuestion.trim() ? '#FFFFFF' : '#555555'} />
                </TouchableOpacity>
              </View>
            </View> : null}

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
