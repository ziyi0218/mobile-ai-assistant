import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MessageCircle, Send, Square, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';
import MessageBubble from '../MessageBubble';
import { chatService } from '../../services/chatService';
import { useI18n } from '../../i18n/useI18n';
import { useChatStore } from '../../store/chatStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useResolvedTheme } from '../../utils/theme';
import { buildModelItem } from '../../utils/messageHelpers';
import { generateUUID } from '../../utils/uuid';
import { useUIScale } from '../../hooks/useUIScale';

type NoteChatModalProps = {
  visible: boolean;
  noteTitle: string;
  noteContent: string;
  onClose: () => void;
};

type LocalChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

type LlmParams = {
  temperature: number;
  maxTokens: number;
  topK: number;
  topP: number;
  minP: number | null;
  frequencyPenalty: number | null;
  presencePenalty: number | null;
  repeatPenalty: number | null;
  repeatLastN: number | null;
  mirostat: number | null;
  mirostatEta: number | null;
  mirostatTau: number | null;
  tfsZ: number | null;
  seed: number | null;
  stop: string | null;
  numCtx: number | null;
  numBatch: number | null;
  numKeep: number | null;
  think: boolean;
};

function buildApiParams(state: LlmParams): Record<string, unknown> {
  const params: Record<string, unknown> = {
    temperature: state.temperature,
    max_tokens: state.maxTokens,
    top_k: state.topK,
    top_p: state.topP,
  };

  if (state.minP != null) params.min_p = state.minP;
  if (state.frequencyPenalty != null) params.frequency_penalty = state.frequencyPenalty;
  if (state.presencePenalty != null) params.presence_penalty = state.presencePenalty;
  if (state.repeatPenalty != null) params.repeat_penalty = state.repeatPenalty;
  if (state.repeatLastN != null) params.repeat_last_n = state.repeatLastN;
  if (state.mirostat != null) params.mirostat = state.mirostat;
  if (state.mirostatEta != null) params.mirostat_eta = state.mirostatEta;
  if (state.mirostatTau != null) params.mirostat_tau = state.mirostatTau;
  if (state.tfsZ != null) params.tfs_z = state.tfsZ;
  if (state.seed != null) params.seed = state.seed;
  if (state.stop) {
    params.stop = state.stop
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (state.numCtx != null) params.num_ctx = state.numCtx;
  if (state.numBatch != null) params.num_batch = state.numBatch;
  if (state.numKeep != null) params.num_keep = state.numKeep;
  if (state.think) params.think = true;

  return params;
}

function buildNoteSystemPrompt(noteTitle: string, noteContent: string) {
  const normalizedTitle = noteTitle.trim() || 'Untitled note';
  const normalizedContent = noteContent.trim();

  return [
    'You are an assistant answering questions about a note.',
    'Base every answer on the note content provided below.',
    'If the answer is not supported by the note, say that clearly instead of inventing details.',
    'You may summarize, explain, reorganize, translate, rewrite, or extract action items from the note when asked.',
    'Use concise markdown when it helps readability.',
    '',
    `[Note title]`,
    normalizedTitle,
    '',
    `[Note content]`,
    normalizedContent || '(This note is currently empty.)',
  ].join('\n');
}

export default function NoteChatModal({
  visible,
  noteTitle,
  noteContent,
  onClose,
}: NoteChatModalProps) {
  const autoScrollResumeDistance = 24;
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const themeMode = useSettingsStore((state) => state.themeMode);
  const { colors } = useResolvedTheme(themeMode);
  const s2 = useUIScale(2);
  const s4 = useUIScale(4);
  const s8 = useUIScale(8);
  const s10 = useUIScale(10);
  const s12 = useUIScale(12);
  const s13 = useUIScale(13);
  const s14 = useUIScale(14);
  const s15 = useUIScale(15);
  const s16 = useUIScale(16);
  const s18 = useUIScale(18);
  const s20 = useUIScale(20);
  const s22 = useUIScale(22);
  const s24 = useUIScale(24);
  const s26 = useUIScale(26);
  const s28 = useUIScale(28);
  const s34 = useUIScale(34);
  const s40 = useUIScale(40);
  const s42 = useUIScale(42);
  const s96 = useUIScale(96);
  const s140 = useUIScale(140);
  const scrollRef = useRef<ScrollView>(null);
  const activeModel = useChatStore((state) => state.activeModels[0] || 'athene-v2:latest');
  const modelVision = useChatStore((state) => state.modelVision);
  const systemPrompt = useChatStore((state) => state.systemPrompt);
  const llmParams = useChatStore(
    useShallow((state) => ({
      temperature: state.temperature,
      maxTokens: state.maxTokens,
      topK: state.topK,
      topP: state.topP,
      minP: state.minP,
      frequencyPenalty: state.frequencyPenalty,
      presencePenalty: state.presencePenalty,
      repeatPenalty: state.repeatPenalty,
      repeatLastN: state.repeatLastN,
      mirostat: state.mirostat,
      mirostatEta: state.mirostatEta,
      mirostatTau: state.mirostatTau,
      tfsZ: state.tfsZ,
      seed: state.seed,
      stop: state.stop,
      numCtx: state.numCtx,
      numBatch: state.numBatch,
      numKeep: state.numKeep,
      think: state.think,
    }))
  );

  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<LocalChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const eventSourceRef = useRef<any>(null);
  const taskIdsRef = useRef<string[]>([]);
  const finalizedRef = useRef(false);
  const activeRequestIdRef = useRef(0);
  const messagesRef = useRef<LocalChatMessage[]>([]);
  const shouldAutoScrollRef = useRef(true);
  const isDraggingRef = useRef(false);

  const noteSystemPrompt = useMemo(
    () => buildNoteSystemPrompt(noteTitle, noteContent),
    [noteContent, noteTitle]
  );

  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated });
    });
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const getDistanceFromBottom = useCallback((event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    return Math.max(contentSize.height - (contentOffset.y + layoutMeasurement.height), 0);
  }, []);

  const resetLocalState = useCallback(() => {
    eventSourceRef.current = null;
    taskIdsRef.current = [];
    finalizedRef.current = false;
    activeRequestIdRef.current = 0;
    shouldAutoScrollRef.current = true;
    setInputText('');
    setMessages([]);
    setIsTyping(false);
    setErrorText(null);
  }, []);

  const stopGeneration = useCallback(async () => {
    const currentEventSource = eventSourceRef.current;
    const taskIds = [...taskIdsRef.current];
    finalizedRef.current = true;
    activeRequestIdRef.current += 1;
    eventSourceRef.current = null;
    taskIdsRef.current = [];
    setIsTyping(false);

    if (currentEventSource && typeof currentEventSource.close === 'function') {
      currentEventSource.close();
    }

    if (taskIds.length > 0) {
      try {
        await Promise.all(taskIds.map((taskId) => chatService.stopTask(taskId)));
      } catch (error) {
        console.warn('Erreur stop note chat:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (visible) return;
    void stopGeneration();
    resetLocalState();
  }, [resetLocalState, stopGeneration, visible]);

  useEffect(() => {
    return () => {
      void stopGeneration();
    };
  }, [stopGeneration]);

  const finalizeStream = useCallback((requestId: number) => {
    if (requestId !== activeRequestIdRef.current) return;
    if (finalizedRef.current) return;
    finalizedRef.current = true;
    eventSourceRef.current = null;
    taskIdsRef.current = [];
    setIsTyping(false);
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = inputText.trim();
    if (!trimmed || isTyping) return;

    const userMessageId = generateUUID();
    const assistantMessageId = generateUUID();
    const requestId = activeRequestIdRef.current + 1;
    const currentMessages = messagesRef.current;
    const nextMessages: LocalChatMessage[] = [
      ...currentMessages,
      { id: userMessageId, role: 'user', content: trimmed },
      { id: assistantMessageId, role: 'assistant', content: '' },
    ];

    activeRequestIdRef.current = requestId;
    setInputText('');
    setErrorText(null);
    setMessages(nextMessages);
    setIsTyping(true);
    shouldAutoScrollRef.current = true;
    isDraggingRef.current = false;
    finalizedRef.current = false;
    taskIdsRef.current = [];
    Keyboard.dismiss();
    scrollToBottom(false);

    const composedSystemPrompt = systemPrompt
      ? `${noteSystemPrompt}\n\n[Additional instructions]\n${systemPrompt}`
      : noteSystemPrompt;

    const apiMessages = [
      { role: 'system', content: composedSystemPrompt },
      ...nextMessages
        .filter((message) => message.role === 'user' || (message.role === 'assistant' && message.content))
        .map((message) => ({
          role: message.role,
          content: message.content,
        })),
    ];

    try {
      const eventSource = await chatService.streamCompletion(
        {
          model: activeModel,
          messages: apiMessages,
          params: buildApiParams(llmParams),
          tool_servers: [],
          features: {
            voice: false,
            image_generation: false,
            code_interpreter: false,
            web_search: false,
          },
          variables: {},
          model_item: buildModelItem(activeModel, modelVision[activeModel] ?? false),
        },
        (chunk: string, taskId?: string) => {
          if (requestId !== activeRequestIdRef.current) return;

          if (taskId && !taskIdsRef.current.includes(taskId)) {
            taskIdsRef.current = [...taskIdsRef.current, taskId];
          }

          if (!chunk) return;

          setMessages((currentMessages) =>
            currentMessages.map((message) =>
              message.id === assistantMessageId
                ? { ...message, content: `${message.content}${chunk}` }
                : message
            )
          );
        },
        (error) => {
          if (requestId !== activeRequestIdRef.current) return;
          console.error('Erreur note chat stream:', error);
          setErrorText(t('notesChatError'));
          finalizeStream(requestId);
        }
      );

      const originalClose = eventSource.close.bind(eventSource);
      eventSource.close = () => {
        originalClose();
        finalizeStream(requestId);
      };
      eventSourceRef.current = eventSource;
    } catch (error) {
      if (requestId !== activeRequestIdRef.current) return;
      console.error('Erreur note chat send:', error);
      setErrorText(t('notesChatError'));
      finalizeStream(requestId);
    }
  }, [activeModel, finalizeStream, inputText, isTyping, llmParams, modelVision, noteSystemPrompt, scrollToBottom, systemPrompt, t]);

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.screen, { backgroundColor: colors.bg }]}
      >
        <View
          style={[
            styles.header,
            {
              borderBottomColor: colors.border,
              paddingTop: insets.top + s8,
              backgroundColor: colors.bg,
              paddingHorizontal: s18,
              paddingBottom: s14,
            },
          ]}
        >
          <Pressable
            onPress={onClose}
            style={[styles.closeButton, { width: s34, height: s34, marginRight: s10 }]}
            hitSlop={10}
          >
            <X size={s24} color={colors.text} strokeWidth={2.2} />
          </Pressable>

          <View style={styles.headerTextWrap}>
            <Text style={[styles.headerTitle, { color: colors.text, fontSize: s18 }]}>{t('notesChatTitle')}</Text>
            <Text style={[styles.headerSubtitle, { color: colors.subtext, fontSize: s13, marginTop: s2 }]} numberOfLines={1}>
              {t('notesChatSubtitle')}
            </Text>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: s18,
              paddingTop: s20,
              paddingBottom: s20,
            },
            messages.length === 0 ? styles.emptyContent : null,
          ]}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={() => {
            isDraggingRef.current = true;
            shouldAutoScrollRef.current = false;
          }}
          onScrollEndDrag={(event) => {
            isDraggingRef.current = false;
            shouldAutoScrollRef.current = getDistanceFromBottom(event) < autoScrollResumeDistance;
          }}
          onMomentumScrollEnd={(event) => {
            isDraggingRef.current = false;
            shouldAutoScrollRef.current = getDistanceFromBottom(event) < autoScrollResumeDistance;
          }}
          onScroll={(event) => {
            const distanceFromBottom = getDistanceFromBottom(event);
            if (!isDraggingRef.current && distanceFromBottom < autoScrollResumeDistance) {
              shouldAutoScrollRef.current = true;
            }
          }}
          onContentSizeChange={() => {
            if (shouldAutoScrollRef.current && !isDraggingRef.current) {
              scrollToBottom(false);
            }
          }}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            <View style={[styles.emptyWrap, { paddingTop: s96, paddingHorizontal: s20 }]}>
              <MessageCircle size={s42} color={colors.subtext} strokeWidth={1.8} />
              <Text
                style={[
                  styles.emptyTitle,
                  {
                    color: colors.text,
                    fontSize: s20,
                    lineHeight: s26,
                    marginTop: s16,
                    marginBottom: s8,
                  },
                ]}
              >
                {t('notesChatEmpty')}
              </Text>
              <Text style={[styles.emptyText, { color: colors.subtext, fontSize: s14, lineHeight: s20 }]}>
                {noteContent.trim() ? noteTitle.trim() || t('notesUntitled') : t('notesEmptyPreview')}
              </Text>
            </View>
          ) : (
            messages.map((message) => {
              const isUser = message.role === 'user';
              return (
                <View key={message.id} style={[styles.messageBlock, { marginBottom: s24 }]}>
                  <Text style={[styles.roleLabel, { color: colors.subtext, fontSize: s12, marginBottom: s10 }]}>
                    {isUser ? 'USER' : 'ASSISTANT'}
                  </Text>
                  <View
                    style={{
                      alignItems: isUser ? 'flex-end' : 'flex-start',
                      width: '100%',
                    }}
                  >
                    <View
                      style={[
                      isUser ? styles.userBubble : styles.assistantBubble,
                      isUser
                        ? { backgroundColor: colors.accent, paddingHorizontal: s14, paddingVertical: s12, borderRadius: s22 }
                        : { backgroundColor: 'transparent', paddingRight: s4 },
                    ]}
                    >
                      <MessageBubble content={message.content || (isTyping && !isUser ? '...' : '')} isUser={isUser} />
                    </View>
                  </View>
                </View>
              );
            })
          )}

          {errorText ? (
            <Text style={[styles.errorText, { color: colors.subtext, fontSize: s13, lineHeight: s18, marginTop: s4 }]}>{errorText}</Text>
          ) : null}
        </ScrollView>

        <View
          style={[
            styles.inputDock,
            {
              paddingBottom: Math.max(insets.bottom, s12),
              backgroundColor: colors.bg,
              borderTopColor: colors.border,
              paddingHorizontal: s16,
              paddingTop: s10,
            },
          ]}
        >
          <View
            style={[
              styles.inputCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: s28,
                paddingHorizontal: s16,
                paddingTop: s12,
                paddingBottom: s12,
              },
            ]}
          >
            <TextInput
              multiline
              onChangeText={setInputText}
              onSubmitEditing={() => {
                if (!isTyping) {
                  void handleSend();
                }
              }}
              placeholder={t('placeholder')}
              placeholderTextColor={colors.subtext}
              style={[styles.input, { color: colors.text, minHeight: s42, maxHeight: s140, fontSize: s16 }]}
              submitBehavior="newline"
              value={inputText}
            />

            <View style={[styles.inputFooter, { marginTop: s10 }]}>
              <Text style={[styles.modelText, { color: colors.text, fontSize: s15, marginRight: s12 }]} numberOfLines={1}>
                {activeModel}
              </Text>

              <Pressable
                disabled={!isTyping && !inputText.trim()}
                onPress={() => {
                  if (isTyping) {
                    void stopGeneration();
                    return;
                  }
                  void handleSend();
                }}
                style={[
                  styles.sendButton,
                  {
                    backgroundColor: isTyping || inputText.trim() ? colors.text : colors.border,
                    width: s40,
                    height: s40,
                    borderRadius: s20,
                  },
                ]}
              >
                {isTyping ? (
                  <Square size={s16} color={colors.bg} fill={colors.bg} />
                ) : (
                  <Send size={s18} color={colors.bg} strokeWidth={2.2} />
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  closeButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontWeight: '700',
  },
  headerSubtitle: {
  },
  content: {
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontWeight: '700',
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  emptyText: {
    textAlign: 'center',
  },
  messageBlock: {
  },
  roleLabel: {
    fontWeight: '700',
  },
  userBubble: {
    maxWidth: '88%',
  },
  assistantBubble: {
    width: '100%',
    maxWidth: '100%',
  },
  errorText: {
  },
  inputDock: {
    borderTopWidth: 1,
  },
  inputCard: {
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  input: {
    textAlignVertical: 'top',
  },
  inputFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modelText: {
    flex: 1,
    fontWeight: '500',
  },
  sendButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
