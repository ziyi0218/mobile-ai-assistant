/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */

import { create } from 'zustand';
import { chatService } from '../services/chatService';
import { generateUUID } from '../utils/uuid';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: any; // Accepte texte ou structure complexe (image, etc.)
}

export interface Attachment {
  id?: string;
  type: 'image' | 'file';
  uri: string;
  name?: string;
  mimeType?: string;
  base64?: string;
}

interface ChatState {
  currentChatId: string | null;
  userMessages: Message[];
  modelResponses: Record<string, Record<string, string>>;
  activeModels: string[];
  isTyping: boolean;
  webSearchEnabled: boolean;
  codeInterpreterEnabled: boolean;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  setSystemPrompt: (v: string) => void;
  setTemperature: (v: number) => void;
  setMaxTokens: (v: number) => void;
  attachments: Attachment[];
  addAttachment: (att: Attachment) => void;
  removeAttachment: (uri: string) => void;
  clearAttachments: () => void;
  setWebSearchEnabled: (v: boolean) => void;
  setCodeInterpreterEnabled: (v: boolean) => void;
  addModel: (name: string) => void;
  switchModel: (index: number, newModel: string) => void;
  startNewChat: () => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  history: any[];
  fetchHistory: () => Promise<void>;
  currentTaskIds: string[];
  currentEventSources: any[];
  stopGeneration: () => Promise<void>;
  setCurrentChatId: (chatId: string) => Promise<void>;
  regenerateResponse: (userMsgId: string) => Promise<void>;
  editAndResend: (userMsgId: string, newContent: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  currentChatId: null,
  userMessages: [],
  modelResponses: {},
  activeModels: ['athene-v2:latest'],
  isTyping: false,
  webSearchEnabled: false,
  codeInterpreterEnabled: false,
  systemPrompt: '',
  temperature: 0.7,
  maxTokens: 2048,
  currentTaskIds: [],
  currentEventSources: [],
  attachments: [],

  setSystemPrompt: (v) => set({ systemPrompt: v }),
  setTemperature: (v) => set({ temperature: v }),
  setMaxTokens: (v) => set({ maxTokens: v }),

  addAttachment: (att) => set(state => ({ attachments: [...state.attachments, att] })),
  removeAttachment: (uri) => set(state => ({
    attachments: state.attachments.filter(a => a.uri !== uri)
  })),
  clearAttachments: () => set({ attachments: [] }),

  setWebSearchEnabled: (value) => set({ webSearchEnabled: value }),
  setCodeInterpreterEnabled: (value) => set({ codeInterpreterEnabled: value }),

  addModel: (modelName) => {
    const { activeModels } = get();
    if (activeModels.length < 4 && !activeModels.includes(modelName)) {
      set({ activeModels: [...activeModels, modelName] });
    }
  },

  switchModel: (index: number, newModel: string) => {
    const { activeModels, modelResponses } = get();
    if (index >= 0 && index < activeModels.length) {
      const oldModel = activeModels[index];
      const updated = [...activeModels];
      updated[index] = newModel;

      const newModelResponses = { ...modelResponses };
      if (oldModel !== newModel) {
        if (newModelResponses[oldModel] && !newModelResponses[newModel]) {
          newModelResponses[newModel] = { ...newModelResponses[oldModel] };
        }
      }

      set({ activeModels: updated, modelResponses: newModelResponses });
    }
  },

  history: [],

  fetchHistory: async () => {
    try {
      const data = await chatService.getHistory(1);
      const list = Array.isArray(data) ? data : [];
      set({ history: list });
    } catch (error) {
      console.error('Erreur historique:', error);
    }
  },

  startNewChat: async () => {
    set({
      currentChatId: null,
      userMessages: [],
      modelResponses: {},
      isTyping: false,
      currentTaskIds: [],
      currentEventSources: [],
      attachments: [],
    });
  },

  sendMessage: async (text: string) => {
    let { isTyping, activeModels, currentChatId, webSearchEnabled, codeInterpreterEnabled, attachments, systemPrompt, temperature, maxTokens } = get();
    if (isTyping || (!text.trim() && attachments.length === 0)) return;

    set({
      isTyping: true,
      currentTaskIds: [],
      currentEventSources: [],
    });

    const userMsgId = generateUUID();
    const timestamp = Math.floor(Date.now() / 1000);

    const uploadedFiles: any[] = [];
    for (const att of attachments) {
      try {
        const result = await chatService.uploadFile(att.uri, att.name, att.mimeType);
        if (result) {
          uploadedFiles.push({ type: att.type === 'image' ? 'image' : 'file', ...result });
        }
      } catch (e) {
        console.error('Upload error:', e);
      }
    }

    let messageContent: string | any[];
    if (uploadedFiles.length > 0) {
      const contentParts: any[] = [];
      for (const file of uploadedFiles) {
        if (file.type === 'image') {
          contentParts.push({ type: 'image_url', image_url: { url: file.url || file.path } });
        } else {
          contentParts.push({ type: 'text', text: `[Fichier joint: ${file.name}]` });
        }
      }
      contentParts.push({ type: 'text', text });
      messageContent = contentParts;
    } else {
      messageContent = text;
    }

    const newUserMsg: Message = { id: userMsgId, role: 'user', content: messageContent };

    set(state => ({
      userMessages: [...state.userMessages, newUserMsg],
      attachments: [],
    }));

    if (!currentChatId) {
      try {
        const contentStr = typeof messageContent === 'string' ? messageContent : text;
        const data = await chatService.createNewChat(activeModels[0], {
          id: userMsgId,
          content: contentStr,
        });
        currentChatId = data.id;
        set({ currentChatId });
      } catch (e) {
        console.error('Auto-create chat failed:', e);
      }
    }

    const baseMessages = get().userMessages.map(m => ({
      role: m.role,
      content: m.content,
    }));
    const apiMessages = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...baseMessages]
      : baseMessages;

    let activeStreamsCount = activeModels.length;

    activeModels.forEach(async (modelName) => {
      let fullContent = '';
      const assistantMsgId = generateUUID();

      const modelItem = {
        id: modelName,
        name: modelName,
        object: 'model',
        connection_type: 'local',
        tags: [],
        info: {
          id: modelName,
          name: modelName,
          meta: {
            capabilities: {
              vision: false,
              file_upload: true,
              web_search: true,
              image_generation: true,
              code_interpreter: true,
              citations: true,
            },
          },
        },
        actions: [],
        filters: [],
      };

      const streamPayload: any = {
        model: modelName,
        messages: apiMessages,
        params: { temperature, max_tokens: maxTokens },
        tool_servers: [],
        features: {
          voice: false,
          image_generation: false,
          code_interpreter: codeInterpreterEnabled,
          web_search: webSearchEnabled,
        },
        variables: {},
        model_item: modelItem,
        chat_id: currentChatId,
        id: assistantMsgId,
        parent_id: userMsgId,
        parent_message: {
          id: userMsgId,
          parentId: get().userMessages.length > 1
            ? get().userMessages[get().userMessages.length - 2]?.id || null
            : null,
          childrenIds: [assistantMsgId],
          role: 'user',
          content: typeof messageContent === 'string' ? messageContent : text,
          timestamp,
          models: activeModels,
        },
        background_tasks: {
          title_generation: true,
          tags_generation: true,
          follow_up_generation: true,
        },
      };

      if (uploadedFiles.length > 0) {
        streamPayload.files = uploadedFiles.map(f => ({
          type: 'file',
          id: f.id,
          filename: f.name,
          meta: f.meta,
        }));
      }

      const es = await chatService.streamCompletion(
        streamPayload,
        (chunk, taskId) => {
          fullContent += chunk;
          if (taskId) {
            set(state => ({
              currentTaskIds: state.currentTaskIds.includes(taskId)
                ? state.currentTaskIds
                : [...state.currentTaskIds, taskId],
            }));
          }
          set(state => ({
            modelResponses: {
              ...state.modelResponses,
              [modelName]: {
                ...(state.modelResponses[modelName] || {}),
                [userMsgId]: fullContent,
              },
            },
          }));
        },
        (err) => {
          console.error(`Stream error (${modelName}):`, err);
          activeStreamsCount--;
          if (activeStreamsCount <= 0) set({ isTyping: false });
        }
      );

      set(state => ({
        currentEventSources: [...state.currentEventSources, es],
      }));

      const originalClose = es.close.bind(es);
      es.close = async () => {
        originalClose();
        activeStreamsCount--;

        if (currentChatId && fullContent) {
          try {
            const allUserMsgs = get().userMessages;
            const allModelResponses = get().modelResponses;
            const historyMessages: Record<string, any> = {};
            const messagesArray: any[] = [];

            let prevMsgId: string | null = null;
            for (const um of allUserMsgs) {
              const umObj: any = {
                id: um.id,
                parentId: prevMsgId,
                childrenIds: [],
                role: 'user',
                content: typeof um.content === 'string' ? um.content : JSON.stringify(um.content),
                timestamp,
                models: activeModels,
              };

              const responseIds: string[] = [];
              for (const mn of activeModels) {
                if (allModelResponses[mn]?.[um.id]) {
                  const aId = um.id === userMsgId && mn === modelName
                    ? assistantMsgId
                    : generateUUID();
                  responseIds.push(aId);

                  const aObj: any = {
                    parentId: um.id,
                    id: aId,
                    childrenIds: [],
                    role: 'assistant',
                    content: allModelResponses[mn][um.id],
                    model: mn,
                    modelName: mn,
                    modelIdx: activeModels.indexOf(mn),
                    timestamp,
                  };
                  historyMessages[aId] = aObj;
                  messagesArray.push(aObj);
                  prevMsgId = aId;
                }
              }

              umObj.childrenIds = responseIds;
              historyMessages[um.id] = umObj;
              messagesArray.splice(messagesArray.length - responseIds.length, 0, umObj);
            }

            const lastMsgId = messagesArray.length > 0
              ? messagesArray[messagesArray.length - 1].id
              : null;

            await chatService.updateChat(currentChatId, {
              chat: {
                models: activeModels,
                history: {
                  messages: historyMessages,
                  currentId: lastMsgId,
                },
                messages: messagesArray,
                params: {},
                files: uploadedFiles.length > 0 ? uploadedFiles : [],
              },
            });

            await chatService.chatCompleted({
              model: modelName,
              messages: [
                {
                  id: userMsgId,
                  role: 'user',
                  content: typeof messageContent === 'string' ? messageContent : text,
                  timestamp,
                },
                {
                  id: assistantMsgId,
                  role: 'assistant',
                  content: fullContent,
                  timestamp,
                },
              ],
              model_item: modelItem,
              chat_id: currentChatId,
              session_id: '',
              id: assistantMsgId,
            });

            if (get().userMessages.length <= 1) {
              const apiMsgs = [
                { role: 'user' as const, content: typeof messageContent === 'string' ? messageContent : text },
                { role: 'assistant' as const, content: fullContent },
              ];
              chatService.generateTitle(currentChatId, modelName, apiMsgs)
                .then(() => get().fetchHistory())
                .catch(e => console.error('Erreur titre:', e));
            }
          } catch (e) {
            console.error('Erreur persistence chat:', e);
          }
        }

        if (activeStreamsCount <= 0) {
          set({
            isTyping: false,
            currentEventSources: [],
            currentTaskIds: [],
          });
          get().fetchHistory();
          setTimeout(() => get().fetchHistory(), 3000);
        }
      };
    });
  },

  stopGeneration: async () => {
    const { currentEventSources, currentTaskIds } = get();
    currentEventSources.forEach(es => {
      if (es && typeof es.close === 'function') {
        es.close();
      }
    });
    try {
      await Promise.all(currentTaskIds.map(id => chatService.stopTask(id)));
    } catch (error) {
      console.warn("Erreur lors de l'arrêt des tâches serveur:", error);
    }
    set({
      isTyping: false,
      currentTaskIds: [],
      currentEventSources: [],
    });
  },

  setCurrentChatId: async (chatId: string) => {
    set({
      currentChatId: chatId,
      userMessages: [],
      modelResponses: {},
      isTyping: true,
    });
    try {
      const data = await chatService.getChatDetails(chatId);
      const serverMessages = data.chat?.messages || [];
      const newUserMessages: Message[] = [];
      const newModelResponses: Record<string, Record<string, string>> = {};
      const modelsInChat = new Set<string>();

      serverMessages.forEach((msg: any) => {
        if (msg.role === 'user') {
          newUserMessages.push({ id: msg.id, role: 'user', content: msg.content });
        } else if (msg.role === 'assistant') {
          const lastUser = newUserMessages[newUserMessages.length - 1];
          if (lastUser) {
            const mName = msg.model || 'athene-v2:latest';
            modelsInChat.add(mName);
            if (!newModelResponses[mName]) newModelResponses[mName] = {};
            newModelResponses[mName][lastUser.id] = typeof msg.content === 'string'
              ? msg.content
              : JSON.stringify(msg.content);
          }
        }
      });

      set({
        userMessages: newUserMessages,
        modelResponses: newModelResponses,
        activeModels: modelsInChat.size > 0 ? Array.from(modelsInChat) : get().activeModels,
        isTyping: false,
      });
    } catch (error) {
      console.error('Erreur chargement détails chat:', error);
      set({ isTyping: false });
    }
  },

  regenerateResponse: async (userMsgId: string) => {
    const { isTyping, activeModels, currentChatId, webSearchEnabled, codeInterpreterEnabled, systemPrompt, temperature, maxTokens } = get();
    if (isTyping) return;

    const newModelResponses = { ...get().modelResponses };
    for (const mn of activeModels) {
      if (newModelResponses[mn]?.[userMsgId]) {
        newModelResponses[mn] = { ...newModelResponses[mn] };
        delete newModelResponses[mn][userMsgId];
      }
    }

    set({
      isTyping: true,
      modelResponses: newModelResponses,
      currentTaskIds: [],
      currentEventSources: [],
    });

    const allUserMsgs = get().userMessages;
    const msgIndex = allUserMsgs.findIndex(m => m.id === userMsgId);
    if (msgIndex === -1) { set({ isTyping: false }); return; }

    const relevantMsgs = allUserMsgs.slice(0, msgIndex + 1);
    const baseMsgs = relevantMsgs.map(m => ({ role: m.role, content: m.content }));
    const apiMessages = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...baseMsgs]
      : baseMsgs;
    const userMsg = allUserMsgs[msgIndex];
    const userContent = typeof userMsg.content === 'string' ? userMsg.content : JSON.stringify(userMsg.content);
    const timestamp = Math.floor(Date.now() / 1000);

    let activeStreamsCount = activeModels.length;

    activeModels.forEach(async (modelName) => {
      let fullContent = '';
      const assistantMsgId = generateUUID();

      const modelItem = {
        id: modelName, name: modelName, object: 'model',
        connection_type: 'local', tags: [],
        info: { id: modelName, name: modelName, meta: { capabilities: { vision: false, file_upload: true, web_search: true, image_generation: true, code_interpreter: true, citations: true } } },
        actions: [], filters: [],
      };

      const streamPayload: any = {
        model: modelName,
        messages: apiMessages,
        params: { temperature, max_tokens: maxTokens },
        tool_servers: [],
        features: { voice: false, image_generation: false, code_interpreter: codeInterpreterEnabled, web_search: webSearchEnabled },
        variables: {},
        model_item: modelItem,
        chat_id: currentChatId,
        id: assistantMsgId,
        parent_id: userMsgId,
      };

      const es = await chatService.streamCompletion(
        streamPayload,
        (chunk, taskId) => {
          fullContent += chunk;
          if (taskId) {
            set(state => ({ currentTaskIds: state.currentTaskIds.includes(taskId) ? state.currentTaskIds : [...state.currentTaskIds, taskId] }));
          }
          set(state => ({
            modelResponses: {
              ...state.modelResponses,
              [modelName]: { ...(state.modelResponses[modelName] || {}), [userMsgId]: fullContent },
            },
          }));
        },
        (err) => {
          console.error(`Regenerate stream error (${modelName}):`, err);
          activeStreamsCount--;
          if (activeStreamsCount <= 0) set({ isTyping: false });
        }
      );

      set(state => ({ currentEventSources: [...state.currentEventSources, es] }));

      const originalClose = es.close.bind(es);
      es.close = async () => {
        originalClose();
        activeStreamsCount--;

        if (currentChatId && fullContent) {
          try {
            const allMsgs = get().userMessages;
            const allResp = get().modelResponses;
            const historyMessages: Record<string, any> = {};
            const messagesArray: any[] = [];
            let prevMsgId: string | null = null;

            for (const um of allMsgs) {
              const umObj: any = { id: um.id, parentId: prevMsgId, childrenIds: [], role: 'user', content: typeof um.content === 'string' ? um.content : JSON.stringify(um.content), timestamp, models: activeModels };
              const responseIds: string[] = [];
              for (const mn of activeModels) {
                if (allResp[mn]?.[um.id]) {
                  const aId = um.id === userMsgId && mn === modelName ? assistantMsgId : generateUUID();
                  responseIds.push(aId);
                  const aObj: any = { parentId: um.id, id: aId, childrenIds: [], role: 'assistant', content: allResp[mn][um.id], model: mn, modelName: mn, modelIdx: activeModels.indexOf(mn), timestamp };
                  historyMessages[aId] = aObj;
                  messagesArray.push(aObj);
                  prevMsgId = aId;
                }
              }
              umObj.childrenIds = responseIds;
              historyMessages[um.id] = umObj;
              messagesArray.splice(messagesArray.length - responseIds.length, 0, umObj);
            }

            const lastMsgId = messagesArray.length > 0 ? messagesArray[messagesArray.length - 1].id : null;
            await chatService.updateChat(currentChatId, {
              chat: { models: activeModels, history: { messages: historyMessages, currentId: lastMsgId }, messages: messagesArray, params: {}, files: [] },
            });

            await chatService.chatCompleted({
              model: modelName,
              messages: [
                { id: userMsgId, role: 'user', content: userContent, timestamp },
                { id: assistantMsgId, role: 'assistant', content: fullContent, timestamp },
              ],
              model_item: modelItem,
              chat_id: currentChatId,
              session_id: '',
              id: assistantMsgId,
            });
          } catch (e) {
            console.error('Erreur persistence regenerate:', e);
          }
        }

        if (activeStreamsCount <= 0) {
          set({ isTyping: false, currentEventSources: [], currentTaskIds: [] });
          get().fetchHistory();
        }
      };
    });
  },

  editAndResend: async (userMsgId: string, newContent: string) => {
    const { userMessages, modelResponses, activeModels } = get();
    const msgIndex = userMessages.findIndex(m => m.id === userMsgId);
    if (msgIndex === -1) return;

    const truncatedMsgs = userMessages.slice(0, msgIndex + 1).map(m =>
      m.id === userMsgId ? { ...m, content: newContent } : m
    );

    const truncatedIds = new Set(truncatedMsgs.map(m => m.id));
    const newModelResponses: Record<string, Record<string, string>> = {};
    for (const mn of activeModels) {
      if (modelResponses[mn]) {
        newModelResponses[mn] = {};
        for (const [key, val] of Object.entries(modelResponses[mn])) {
          if (truncatedIds.has(key) && key !== userMsgId) {
            newModelResponses[mn][key] = val;
          }
        }
      }
    }

    set({
      userMessages: truncatedMsgs,
      modelResponses: newModelResponses,
    });

    await get().regenerateResponse(userMsgId);
  },
}));