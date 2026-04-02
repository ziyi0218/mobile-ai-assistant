/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createSettingsSlice, SettingsSlice } from './slices/settingsSlice';
import { createChatHistorySlice, ChatHistorySlice } from './slices/chatHistorySlice';
import { createStreamingSlice, StreamingSlice } from './slices/streamingSlice';
import { createPersonaSlice, PersonaSlice } from './slices/personaSlice';

// Re-export types so existing imports keep working
export type { Message, Attachment } from '../utils/messageHelpers';

interface ChatState extends SettingsSlice, ChatHistorySlice, StreamingSlice, PersonaSlice {}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      ...createSettingsSlice(set, get),
      ...createChatHistorySlice(set, get),
      ...createStreamingSlice(set, get),
      ...createPersonaSlice(set, get),
    }),
    {
      name: 'l3t1-chat-params-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
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
        streamResponse: state.streamResponse,
        systemPrompt: state.systemPrompt,
        personas: state.personas,
        activePersonaId: state.activePersonaId,
        autoPersona: state.autoPersona,
      }),
    }
  )
);
