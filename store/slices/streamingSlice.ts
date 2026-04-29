/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */

import * as FileSystem from 'expo-file-system';
import { chatService } from '../../services/chatService';
import apiClient from '../../services/apiClient';
import { personnalizationService } from '../../services/personnalizationService';
import { generateUUID } from '../../utils/uuid';
import { Message, buildModelItem, buildHistoryPayload, getDisplayText } from '../../utils/messageHelpers';
import { ADE_SYSTEM_PROMPT, ADE_MAX_ITERATIONS, processADECalls } from './adeSlice';
import { parseMemoryBlock } from '../../utils/memoryParser';

const CLARIFICATION_INSTRUCTION = `When you are unsure about the user's intent, output your clarification request followed by a \`\`\`clarification block containing a JSON object with "mode" and "options".

- Use "mode": "single" when only one answer makes sense (radio buttons).
- Use "mode": "multi" when multiple answers could apply (checkboxes).

Each option must have an "id" (short string) and a "label" (button text). Maximum 4 options.

Example (single choice):

Could you clarify what you mean?

\`\`\`clarification
{ "mode": "single", "options": [{ "id": "a", "label": "Option A" }, { "id": "b", "label": "Option B" }] }
\`\`\`

Example (multiple choices):

Which topics interest you?

\`\`\`clarification
{ "mode": "multi", "options": [{ "id": "a", "label": "Math" }, { "id": "b", "label": "Physics" }, { "id": "c", "label": "CS" }] }
\`\`\`

Only use this format when genuinely unsure. Do not use it for every message.`;

const EXPORT_INSTRUCTION = `IMPORTANT — Code block naming rule:
Every time you write a code block, you MUST use the format \`\`\`download:filename.ext instead of \`\`\`language.
NEVER use \`\`\`python, \`\`\`javascript, \`\`\`java etc. ALWAYS use \`\`\`download:filename.ext.
The interface will display a download button on each block so the user can save the file.

- Do NOT say you cannot create files.
- Choose a descriptive filename with the correct extension (.py, .md, .txt, .java, .js, .ts, .html, .css, .json, .sql, .sh, .c, .cpp, .go, .rs, .rb, .php, .swift, .kt, etc.)

Examples:
\`\`\`download:fibonacci.py
def fibonacci(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a
\`\`\`

\`\`\`download:style.css
body { margin: 0; font-family: sans-serif; }
\`\`\`

You can include multiple blocks in a single response. Add explanations outside the blocks.`;

const MEMORY_INSTRUCTION = `When the user explicitly asks you to remember, memorize, or retain information (e.g. "retiens que...", "memorise ca", "remember that..."), extract the key facts and output them in a \`\`\`memory block:

\`\`\`memory
["fact 1", "fact 2"]
\`\`\`

Or for a single fact:

\`\`\`memory
The user prefers dark mode
\`\`\`

Write a brief confirmation before the block (e.g. "Compris, je memorise."). Only use this when the user explicitly asks to memorize. Do NOT memorize information from normal conversation.`;
import type { LLMParams } from './settingsSlice';
import useInterfaceSettingsStore from '../interfaceSettingsStore';
import * as Clipboard from 'expo-clipboard';
/** Build API params object from store, omitting null values */
function buildApiParams(state: LLMParams): Record<string, any> {
  const p: Record<string, any> = {
    temperature: state.temperature,
    max_tokens: state.maxTokens,
    top_k: state.topK,
    top_p: state.topP,
  };
  if (state.minP != null) p.min_p = state.minP;
  if (state.frequencyPenalty != null) p.frequency_penalty = state.frequencyPenalty;
  if (state.presencePenalty != null) p.presence_penalty = state.presencePenalty;
  if (state.repeatPenalty != null) p.repeat_penalty = state.repeatPenalty;
  if (state.repeatLastN != null) p.repeat_last_n = state.repeatLastN;
  if (state.mirostat != null) p.mirostat = state.mirostat;
  if (state.mirostatEta != null) p.mirostat_eta = state.mirostatEta;
  if (state.mirostatTau != null) p.mirostat_tau = state.mirostatTau;
  if (state.tfsZ != null) p.tfs_z = state.tfsZ;
  if (state.seed != null) p.seed = state.seed;
  if (state.stop) p.stop = state.stop.split(',').map((s: string) => s.trim()).filter(Boolean);
  if (state.numCtx != null) p.num_ctx = state.numCtx;
  if (state.numBatch != null) p.num_batch = state.numBatch;
  if (state.numKeep != null) p.num_keep = state.numKeep;
  if (state.think) p.think = true;
  return p;
}

async function buildMemorySystemPrompt() {
  try {
    const personalization = await personnalizationService.getPersonalization();
    const activeMemories = personalization.memories
      .map((memory) => memory.detail.trim())
      .filter(Boolean);

    if (!personalization.memoryEnabled || activeMemories.length === 0) {
      return '';
    }

    return [
      '[Persistent user memories]',
      'Use the following saved user preferences and facts when they are relevant to the reply.',
      'If a memory defines a preferred response language, follow it by default unless the user explicitly asks otherwise in the current conversation.',
      ...activeMemories.map((memory) => `- ${memory}`),
    ].join('\n');
  } catch (error) {
    console.warn('[Memory] Failed to load personalization memories:', error);
    return '';
  }
}

export interface StreamingSlice {
  currentChatId: string | null;
  userMessages: Message[];
  modelResponses: Record<string, Record<string, string>>;
  activeModels: string[];
  isTyping: boolean;
  streamingModels: string[];
  currentTaskIds: string[];
  currentEventSources: any[];
  _stopRequested: boolean;
  _historyTimeoutId: ReturnType<typeof setTimeout> | null;
  startNewChat: () => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  stopGeneration: () => Promise<void>;
  setCurrentChatId: (chatId: string) => Promise<void>;
  regenerateResponse: (userMsgId: string) => Promise<void>;
  editAndResend: (userMsgId: string, newContent: string) => Promise<void>;
}

export const createStreamingSlice = (set: any, get: any): StreamingSlice => ({
  currentChatId: null,
  userMessages: [],
  modelResponses: {},
  activeModels: ['athene-v2:latest'],
  isTyping: false,
  streamingModels: [],
  currentTaskIds: [],
  currentEventSources: [],
  _stopRequested: false,
  _historyTimeoutId: null,

  startNewChat: async () => {
    const { _historyTimeoutId } = get();
    if (_historyTimeoutId !== null) clearTimeout(_historyTimeoutId);
    set({
      currentChatId: null,
      userMessages: [],
      modelResponses: {},
      isTyping: false,
      streamingModels: [],
      currentTaskIds: [],
      currentEventSources: [],
      attachments: [],
      _stopRequested: false,
      _historyTimeoutId: null,
      webSearchEnabled: useInterfaceSettingsStore.getState().optionsList['25'].value, //iface_web_search_always
      codeInterpreterEnabled: false,
    });
  },

  sendMessage: async (text: string, location?: any) => {
    let { isTyping, activeModels, currentChatId, webSearchEnabled, codeInterpreterEnabled, attachments, systemPrompt } = get();
    if (isTyping || (!text.trim() && attachments.length === 0)) return;

    // Auto-detect persona if auto mode is enabled
    let shouldIncludeADE = false; // default: no ADE unless explicitly detected
    const { autoPersona, personas: allPersonas, activePersonaId } = get();
    if (autoPersona && text.trim()) {
      try {
        const personaList = allPersonas.map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description,
        }));
        const result = await chatService.classifyPersona(text, activeModels[0], personaList);
        shouldIncludeADE = result.includeADE;
        if (result.personaId && result.personaId !== activePersonaId) {
          get().selectPersona(result.personaId);
        }
      } catch (e) {
        console.warn('[Auto-persona] Classification failed, keeping current:', e);
      }
    } else if (activePersonaId) {
      // Manual persona selected → no ADE by default
      shouldIncludeADE = false;
    }

    const memorySystemPrompt = await buildMemorySystemPrompt();

    set({
      isTyping: true,
      streamingModels: [...activeModels],
      currentTaskIds: [],
      currentEventSources: [],
    });

    const userMsgId = generateUUID();
    const timestamp = Math.floor(Date.now() / 1000);

    // Upload ALL attachments to server (images + files)
    const uploadedFiles: any[] = [];
    for (const att of attachments) {
      try {
        const shouldProcess = att.type !== 'image';
        console.log('[UPLOAD] Uploading:', att.type, att.name, att.mimeType, 'process:', shouldProcess);
        const result = await chatService.uploadFile(att.uri, att.name, att.mimeType, shouldProcess);
        console.log('[UPLOAD] Result:', JSON.stringify(result));
        if (result) {
          uploadedFiles.push({
            type: att.type === 'image' ? 'image' : 'file',
            localUri: att.uri,
            base64: att.base64,
            ...result,
          });
        }
      } catch (e) {
        console.error('Upload error:', e);
      }
    }

    const hasImages = uploadedFiles.some((f: any) => f.type === 'image');
    console.log('[PAYLOAD] uploadedFiles:', uploadedFiles.length, 'hasImages:', hasImages,
      'files:', uploadedFiles.map((f: any) => ({ type: f.type, id: f.id, name: f.name })));

    // Build display content with local URIs for images
    let messageContent: string | any[];
    if (uploadedFiles.length > 0) {
      const displayParts: any[] = [];
      for (const file of uploadedFiles) {
        if (file.type === 'image') {
          displayParts.push({ type: 'image_url', image_url: { url: file.localUri } });
        } else {
          displayParts.push({ type: 'text', text: `[Fichier joint: ${file.name}]` });
        }
      }
      displayParts.push({ type: 'text', text });
      messageContent = displayParts;
    } else {
      messageContent = text;
    }

    const newUserMsg: Message = { id: userMsgId, role: 'user', content: messageContent };

    set((state: any) => ({
      userMessages: [...state.userMessages, newUserMsg],
      attachments: [],
    }));

    if (!currentChatId) {
      try {
        const data = await chatService.createNewChat(activeModels[0], {
          id: userMsgId,
          content: typeof messageContent === 'string' ? messageContent : text,
        });
        currentChatId = data.id;
        set({ currentChatId });
      } catch (e) {
        console.error('Auto-create chat failed:', e);
      }
    }

    // Build API messages — for images, embed base64 directly in content (OpenAI vision format)
    const allUserMsgsNow = get().userMessages;

    // Build file refs for persistence (Open WebUI web format)
    const fileRefs = uploadedFiles.length > 0
      ? uploadedFiles.map((f: any) => ({
          type: 'file',
          file: f._raw,
          id: f.id,
          url: f.id,
          name: f.name,
          status: 'uploaded',
          size: f._raw?.meta?.size ?? 0,
          error: '',
          itemId: generateUUID(),
          content_type: f.mimeType || 'application/octet-stream',
        }))
      : undefined;

    // Prepare base64 data URIs for image attachments
    const imageDataUrls: string[] = [];
    for (const f of uploadedFiles) {
      if (f.type === 'image') {
        if (f.base64) {
          imageDataUrls.push(`data:${f.mimeType || 'image/jpeg'};base64,${f.base64}`);
        } else {
          // Fallback: read from filesystem if base64 wasn't captured
          try {
            const b64 = await FileSystem.readAsStringAsync(f.localUri, { encoding: FileSystem.EncodingType.Base64 });
            imageDataUrls.push(`data:${f.mimeType || 'image/jpeg'};base64,${b64}`);
          } catch (e) {
            console.error('[IMAGE] Failed to read base64 from file:', e);
          }
        }
      }
    }

    const baseMessages = allUserMsgsNow.map((m: Message, idx: number) => {
      const plainText = typeof m.content === 'string' ? m.content : getDisplayText(m.content);
      // For the LAST user message: inject images as base64 content parts
      if (idx === allUserMsgsNow.length - 1 && imageDataUrls.length > 0) {
        const contentParts: any[] = imageDataUrls.map((dataUrl) => ({
          type: 'image_url',
          image_url: { url: dataUrl },
        }));
        contentParts.push({ type: 'text', text: plainText });
        return { role: m.role, content: contentParts };
      }
      return { role: m.role, content: plainText };
    });
    // Build effective system prompt from 3 layers:
    // 1. Persona context (name + description + persona prompt) — if persona active
    // 2. User's system prompt — always present
    // 3. ADE system prompt — only if shouldIncludeADE (auto-persona decides, or no persona)
    // 4. Location - if allowed in settings
    const { activePersonaId: currentPersonaId, personas: currentPersonas } = get();
    const activePersona = currentPersonaId ? currentPersonas.find((p: any) => p.id === currentPersonaId) : null;

    const parts: string[] = [];
    if (activePersona) {
      parts.push(`[Role: ${activePersona.name}]\n[Description: ${activePersona.description}]\n\n${activePersona.systemPrompt}`);
    }
    if (memorySystemPrompt) {
      parts.push(memorySystemPrompt);
    }
    if (systemPrompt) {
      parts.push(systemPrompt);
    }
    if (shouldIncludeADE && !hasImages) {
      parts.push(ADE_SYSTEM_PROMPT);
    }
    if (location) {
      parts.push('Location: ' + JSON.stringify(location));
    }
    parts.push(CLARIFICATION_INSTRUCTION);
    parts.push(EXPORT_INSTRUCTION);
    parts.push(MEMORY_INSTRUCTION);
    const effectiveSystemPrompt = parts.length > 0 ? parts.join('\n\n') : '';
    const apiMessages = effectiveSystemPrompt
      ? [{ role: 'system', content: effectiveSystemPrompt }, ...baseMessages]
      : baseMessages;

    // Pre-generate stable assistant IDs for all (model x userMsg) combos
    // so concurrent stream callbacks all reference the same IDs
    const stableAssistantIds = new Map<string, string>();
    for (const um of get().userMessages) {
      for (const mn of activeModels) {
        stableAssistantIds.set(`${mn}::${um.id}`, generateUUID());
      }
    }

    // Shared stream state — plain object avoids race on primitive closure var
    const streamState = { count: activeModels.length, finalized: false };
    set({ _stopRequested: false });

    activeModels.forEach(async (modelName: string) => {
      let fullContent = '';
      const assistantMsgId = stableAssistantIds.get(`${modelName}::${userMsgId}`)!;

      // Force vision=true when images are attached so the server processes them
      const visionEnabled = hasImages || (get().modelVision[modelName] ?? false);
      const modelItem = buildModelItem(modelName, visionEnabled);

      const streamPayload: any = {
        model: modelName,
        messages: apiMessages,
        params: buildApiParams(get()),
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
          content: messageContent,
          timestamp,
          models: activeModels,
        },
        background_tasks: {
          title_generation: true,
          tags_generation: true,
          follow_up_generation: true,
        },
      };

      // Also keep files at top-level for compatibility
      if (fileRefs) {
        streamPayload.files = fileRefs;
      }

      const es = await chatService.streamCompletion(
        streamPayload,
        (chunk: string, taskId?: string) => {
          fullContent += chunk;
          if (taskId) {
            set((state: any) => ({
              currentTaskIds: state.currentTaskIds.includes(taskId)
                ? state.currentTaskIds
                : [...state.currentTaskIds, taskId],
            }));
          }
          set((state: any) => ({
            modelResponses: {
              ...state.modelResponses,
              [modelName]: {
                ...(state.modelResponses[modelName] || {}),
                [userMsgId]: fullContent,
              },
            },
          }));
        },
        (err: any) => {
          console.error(`Stream error (${modelName}):`, err);
          streamState.count--;
          set((state: any) => ({
            streamingModels: state.streamingModels.filter((m: string) => m !== modelName),
          }));
          if (streamState.count <= 0 && !streamState.finalized) {
            streamState.finalized = true;
            set({ isTyping: false });
          }
        }
      );

      set((state: any) => ({
        currentEventSources: [...state.currentEventSources, es],
      }));

      const originalClose = es.close.bind(es);
      es.close = async () => {
        originalClose();

        // --- ADE loop: execute actions, re-stream, repeat if LLM emits more actions ---
        let adeIteration = 0;
        const adeConversation: { role: string; content: string }[] = effectiveSystemPrompt
          ? [{ role: 'system', content: effectiveSystemPrompt }, ...baseMessages]
          : [...baseMessages];

        while (adeIteration < ADE_MAX_ITERATIONS && fullContent) {
          if (get()._stopRequested) break;
          const adeRegex = /<<ADE:(\w+)\(([^)]*)\)>>/g;
          if (!adeRegex.test(fullContent)) break;

          adeIteration++;
          try {
            const { hasADE, processed: adeData } = await processADECalls(fullContent);
            if (!hasADE) break;

            // Show loading indicator
            set((state: any) => ({
              modelResponses: {
                ...state.modelResponses,
                [modelName]: {
                  ...(state.modelResponses[modelName] || {}),
                  [userMsgId]: '...',
                },
              },
            }));

            // Build conversation with ADE results
            adeConversation.push({ role: 'assistant', content: fullContent });
            adeConversation.push({
              role: 'user',
              content: `Résultats des actions ADE (iteration ${adeIteration}) :\n\n${adeData}\n\nAnalyse ces résultats. Si tu as besoin de plus d'info, utilise d'autres actions <<ADE:...>>. Sinon, reformule les données clairement en markdown sans mentionner les balises ADE.`,
            });

            let reformulated = '';
            const reformulatePayload = {
              model: modelName,
              messages: adeConversation,
              params: { temperature: 0.3, max_tokens: get().maxTokens },
              stream: true,
            };

            await new Promise<void>((resolve) => {
              chatService.streamCompletion(
                reformulatePayload,
                (chunk: string) => {
                  reformulated += chunk;
                  set((state: any) => ({
                    modelResponses: {
                      ...state.modelResponses,
                      [modelName]: {
                        ...(state.modelResponses[modelName] || {}),
                        [userMsgId]: reformulated,
                      },
                    },
                  }));
                },
                (err: any) => {
                  console.error('ADE reformulate error:', err);
                  reformulated = adeData;
                  set((state: any) => ({
                    modelResponses: {
                      ...state.modelResponses,
                      [modelName]: {
                        ...(state.modelResponses[modelName] || {}),
                        [userMsgId]: reformulated,
                      },
                    },
                  }));
                  resolve();
                },
              ).then((es2: any) => {
                const origClose2 = es2.close.bind(es2);
                es2.close = () => {
                  origClose2();
                  resolve();
                };
              });
            });

            fullContent = reformulated;
            // Loop continues — if reformulated contains more <<ADE:...>> tags, we process them
          } catch (adeErr) {
            console.error(`ADE loop error (iteration ${adeIteration}):`, adeErr);
            break;
          }
        }
        // --- Fin ADE loop ---

        streamState.count--;
        set((state: any) => ({
          streamingModels: state.streamingModels.filter((m: string) => m !== modelName),
        }));

        // Skip persistence if user pressed Stop
        if (!get()._stopRequested && currentChatId && fullContent) {
          try {
            const allUserMsgs = get().userMessages;
            const allModelResponses = get().modelResponses;
            const { historyMessages, messagesArray, lastMsgId } = buildHistoryPayload(
              allUserMsgs, allModelResponses, activeModels, stableAssistantIds, timestamp,
            );

            // Attach file refs to user messages in history (matching web format)
            if (fileRefs) {
              const lastUserMsg = messagesArray.find((m: any) => m.id === userMsgId);
              if (lastUserMsg) lastUserMsg.files = fileRefs;
              if (historyMessages[userMsgId]) historyMessages[userMsgId].files = fileRefs;
            }

            await chatService.updateChat(currentChatId, {
              chat: {
                models: activeModels,
                history: { messages: historyMessages, currentId: lastMsgId },
                messages: messagesArray,
                params: {},
                files: [],
              },
            });

            await chatService.chatCompleted({
              model: modelName,
              messages: [
                {
                  id: userMsgId,
                  role: 'user',
                  content: messageContent,
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
                { role: 'user' as const, content: messageContent },
                { role: 'assistant' as const, content: fullContent },
              ];
              if (useInterfaceSettingsStore.getState().optionsList['12'].value == true) { //iface_title_gen
                chatService.generateTitle(currentChatId, modelName, apiMsgs)
                  .then(() => get().fetchHistory())
                  .catch((e: any) => console.error('Erreur titre:', e));
              }            }
          } catch (e) {
            console.error('Erreur persistence chat:', e);
          }
        }

        // finalized flag prevents double-execution if two streams close simultaneously
        if (streamState.count <= 0 && !streamState.finalized) {
          streamState.finalized = true;
          set({
            isTyping: false,
            currentEventSources: [],
            currentTaskIds: [],
          });
          if (useInterfaceSettingsStore.getState().optionsList['15'].value == true){ //iface_autocopy_response
            await Clipboard.setStringAsync(fullContent);
          }
          if (useInterfaceSettingsStore.getState().optionsList['40'].value == true) {//iface_auto_tts
              useReadAloud(currentId, fullContent)
          }
          // Auto-save memories if LLM emitted a ```memory block
          const memoryFacts = parseMemoryBlock(fullContent);
          if (memoryFacts) {
            for (const fact of memoryFacts) {
              try {
                await apiClient.post('/memories/add', { content: fact });
              } catch (e) {
                console.warn('[Memory] Failed to save:', fact, e);
              }
            }
          }
          get().fetchHistory();
          const tid = setTimeout(() => get().fetchHistory(), 3000);
          set({ _historyTimeoutId: tid });
        }
      };
    });
  },

  stopGeneration: async () => {
    const { currentEventSources, currentTaskIds } = get();
    // Set flag BEFORE closing so es.close callbacks skip persistence
    set({ _stopRequested: true, isTyping: false, streamingModels: [], currentTaskIds: [], currentEventSources: [] });
    currentEventSources.forEach((es: any) => {
      if (es && typeof es.close === 'function') {
        es.close();
      }
    });
    try {
      await Promise.all(currentTaskIds.map((id: string) => chatService.stopTask(id)));
    } catch (error) {
      console.warn("Erreur lors de l'arrêt des tâches serveur:", error);
    }
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
    const { isTyping, activeModels, currentChatId, webSearchEnabled, codeInterpreterEnabled, systemPrompt, maxTokens } = get();
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
    const msgIndex = allUserMsgs.findIndex((m: Message) => m.id === userMsgId);
    if (msgIndex === -1) { set({ isTyping: false }); return; }

    const relevantMsgs = allUserMsgs.slice(0, msgIndex + 1);
    const baseMsgs = relevantMsgs.map((m: Message) => ({ role: m.role, content: m.content }));
    const memorySystemPrompt = await buildMemorySystemPrompt();
    const regenSystemParts = [memorySystemPrompt, systemPrompt].filter(Boolean);
    const regenSystemPrompt = regenSystemParts.length > 0 ? regenSystemParts.join('\n\n') : '';
    const apiMessages = regenSystemPrompt
      ? [{ role: 'system', content: regenSystemPrompt }, ...baseMsgs]
      : baseMsgs;
    const userMsg = allUserMsgs[msgIndex];
    const userContent = typeof userMsg.content === 'string' ? userMsg.content : JSON.stringify(userMsg.content);
    const timestamp = Math.floor(Date.now() / 1000);

    // Pre-generate stable IDs for all (model x userMsg) combos
    const regenStableIds = new Map<string, string>();
    for (const um of allUserMsgs) {
      for (const mn of activeModels) {
        regenStableIds.set(`${mn}::${um.id}`, generateUUID());
      }
    }

    const regenStreamState = { count: activeModels.length, finalized: false };

    activeModels.forEach(async (modelName: string) => {
      let fullContent = '';
      const assistantMsgId = regenStableIds.get(`${modelName}::${userMsgId}`)!;

      const modelItem = buildModelItem(modelName, get().modelVision[modelName] ?? false);

      const streamPayload: any = {
        model: modelName,
        messages: apiMessages,
        params: buildApiParams(get()),
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
        (chunk: string, taskId?: string) => {
          fullContent += chunk;
          if (taskId) {
            set((state: any) => ({ currentTaskIds: state.currentTaskIds.includes(taskId) ? state.currentTaskIds : [...state.currentTaskIds, taskId] }));
          }
          set((state: any) => ({
            modelResponses: {
              ...state.modelResponses,
              [modelName]: { ...(state.modelResponses[modelName] || {}), [userMsgId]: fullContent },
            },
          }));
        },
        (err: any) => {
          console.error(`Regenerate stream error (${modelName}):`, err);
          regenStreamState.count--;
          if (regenStreamState.count <= 0 && !regenStreamState.finalized) {
            regenStreamState.finalized = true;
            set({ isTyping: false });
          }
        }
      );

      set((state: any) => ({ currentEventSources: [...state.currentEventSources, es] }));

      const originalClose = es.close.bind(es);
      es.close = async () => {
        originalClose();
        regenStreamState.count--;

        if (!get()._stopRequested && currentChatId && fullContent) {
          try {
            const allMsgs = get().userMessages;
            const allResp = get().modelResponses;
            const { historyMessages, messagesArray, lastMsgId } = buildHistoryPayload(
              allMsgs, allResp, activeModels, regenStableIds, timestamp,
            );

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

        if (regenStreamState.count <= 0 && !regenStreamState.finalized) {
          regenStreamState.finalized = true;
          set({ isTyping: false, currentEventSources: [], currentTaskIds: [] });
          get().fetchHistory();
        }
      };
    });
  },

  editAndResend: async (userMsgId: string, newContent: string) => {
    const { userMessages, modelResponses, activeModels } = get();
    const msgIndex = userMessages.findIndex((m: Message) => m.id === userMsgId);
    if (msgIndex === -1) return;

    const truncatedMsgs = userMessages.slice(0, msgIndex + 1).map((m: Message) =>
      m.id === userMsgId ? { ...m, content: newContent } : m
    );

    const truncatedIds = new Set(truncatedMsgs.map((m: Message) => m.id));
    const newModelResponses: Record<string, Record<string, string>> = {};
    for (const mn of activeModels) {
      if (modelResponses[mn]) {
        newModelResponses[mn] = {};
        for (const [key, val] of Object.entries(modelResponses[mn])) {
          if (truncatedIds.has(key) && key !== userMsgId) {
            newModelResponses[mn][key] = val as string;
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
});
