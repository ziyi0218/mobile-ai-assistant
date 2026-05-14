import type { ChatData, HistoryMessage } from '../types/api';

const CARD_WIDTH = 184;
const USER_CARD_HEIGHT = 78;
const ASSISTANT_CARD_HEIGHT = 86;
const HORIZONTAL_GAP = 20;
const USER_TO_ASSISTANTS_GAP = 44;
const ROUND_GAP = 72;
const CANVAS_PADDING_X = 18;
const CANVAS_PADDING_Y = 28;

export interface OverviewNode {
  id: string;
  role: 'user' | 'assistant';
  modelName?: string;
  title: string;
  preview: string;
  fullText: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isLatest: boolean;
}

export interface OverviewEdge {
  id: string;
  from: string;
  to: string;
  kind: 'response' | 'followUp';
}

export interface OverviewGraph {
  nodes: OverviewNode[];
  edges: OverviewEdge[];
  width: number;
  height: number;
}

interface OverviewRound {
  user: HistoryMessage;
  assistants: HistoryMessage[];
}

export const overviewLayout = {
  cardWidth: CARD_WIDTH,
  userCardHeight: USER_CARD_HEIGHT,
  assistantCardHeight: ASSISTANT_CARD_HEIGHT,
};

export function extractOverviewText(content: unknown): string {
  if (typeof content === 'string') {
    return content.trim();
  }

  if (Array.isArray(content)) {
    const text = content
      .filter((part) => part && typeof part === 'object' && 'type' in part && (part as any).type === 'text')
      .map((part) => String((part as any).text ?? '').trim())
      .filter(Boolean)
      .join('\n');

    return text.trim();
  }

  if (content && typeof content === 'object') {
    try {
      return JSON.stringify(content, null, 2);
    } catch {
      return String(content);
    }
  }

  return '';
}

function buildRounds(messages: HistoryMessage[]): OverviewRound[] {
  const rounds: OverviewRound[] = [];

  messages.forEach((message) => {
    if (message.role === 'user') {
      rounds.push({ user: message, assistants: [] });
      return;
    }

    const currentRound = rounds[rounds.length - 1];
    if (currentRound) {
      currentRound.assistants.push(message);
    }
  });

  return rounds;
}

function getOrderedMessages(chat: ChatData): HistoryMessage[] {
  if (Array.isArray(chat.chat?.messages) && chat.chat.messages.length > 0) {
    return chat.chat.messages;
  }

  const record = chat.chat?.history?.messages ?? {};
  return Object.values(record).sort((a, b) => {
    if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
    if ((a.modelIdx ?? 0) !== (b.modelIdx ?? 0)) return (a.modelIdx ?? 0) - (b.modelIdx ?? 0);
    return a.id.localeCompare(b.id);
  });
}

function buildPreview(fullText: string): string {
  const compact = fullText.replace(/\s+/g, ' ').trim();
  if (!compact) return '';
  return compact.length > 120 ? `${compact.slice(0, 117)}...` : compact;
}

export function buildChatOverview(chat: ChatData | null | undefined): OverviewGraph {
  if (!chat) {
    return { nodes: [], edges: [], width: 0, height: 0 };
  }

  const orderedMessages = getOrderedMessages(chat);
  const rounds = buildRounds(orderedMessages);

  if (rounds.length === 0) {
    return { nodes: [], edges: [], width: 0, height: 0 };
  }

  const maxRowWidth = rounds.reduce((max, round) => {
    const assistantCount = Math.max(round.assistants.length, 1);
    const rowWidth = assistantCount * CARD_WIDTH + Math.max(assistantCount - 1, 0) * HORIZONTAL_GAP;
    return Math.max(max, rowWidth);
  }, CARD_WIDTH);

  const nodes: OverviewNode[] = [];
  const edges: OverviewEdge[] = [];
  const currentId = chat.chat?.history?.currentId;
  let y = CANVAS_PADDING_Y;
  let previousAssistants: HistoryMessage[] = [];
  let previousUser: HistoryMessage | null = null;

  rounds.forEach((round, roundIndex) => {
    const assistantCount = Math.max(round.assistants.length, 1);
    const assistantsRowWidth =
      assistantCount * CARD_WIDTH + Math.max(assistantCount - 1, 0) * HORIZONTAL_GAP;
    const assistantsStartX = CANVAS_PADDING_X + (maxRowWidth - assistantsRowWidth) / 2;
    const userX = CANVAS_PADDING_X + (maxRowWidth - CARD_WIDTH) / 2;
    const userY = y;
    const assistantsY = y + USER_CARD_HEIGHT + USER_TO_ASSISTANTS_GAP;

    const userText = extractOverviewText(round.user.content);
    nodes.push({
      id: round.user.id,
      role: 'user',
      title: `user-${roundIndex + 1}`,
      preview: buildPreview(userText),
      fullText: userText,
      x: userX,
      y: userY,
      width: CARD_WIDTH,
      height: USER_CARD_HEIGHT,
      isLatest: currentId === round.user.id,
    });

    if (previousAssistants.length > 0) {
      previousAssistants.forEach((assistant) => {
        edges.push({
          id: `${assistant.id}->${round.user.id}`,
          from: assistant.id,
          to: round.user.id,
          kind: 'followUp',
        });
      });
    } else if (previousUser) {
      edges.push({
        id: `${previousUser.id}->${round.user.id}`,
        from: previousUser.id,
        to: round.user.id,
        kind: 'followUp',
      });
    }

    round.assistants.forEach((assistant, assistantIndex) => {
      const assistantText = extractOverviewText(assistant.content);
      const assistantX = assistantsStartX + assistantIndex * (CARD_WIDTH + HORIZONTAL_GAP);
      nodes.push({
        id: assistant.id,
        role: 'assistant',
        modelName: assistant.modelName || assistant.model,
        title: assistant.modelName || assistant.model || `assistant-${assistantIndex + 1}`,
        preview: buildPreview(assistantText),
        fullText: assistantText,
        x: assistantX,
        y: assistantsY,
        width: CARD_WIDTH,
        height: ASSISTANT_CARD_HEIGHT,
        isLatest: currentId === assistant.id,
      });

      edges.push({
        id: `${round.user.id}->${assistant.id}`,
        from: round.user.id,
        to: assistant.id,
        kind: 'response',
      });
    });

    previousAssistants = round.assistants;
    previousUser = round.user;
    y =
      assistantsY +
      (round.assistants.length > 0 ? ASSISTANT_CARD_HEIGHT : 0) +
      ROUND_GAP;
  });

  const lastNode = nodes[nodes.length - 1];
  if (lastNode && !nodes.some((node) => node.isLatest)) {
    lastNode.isLatest = true;
  }

  return {
    nodes,
    edges,
    width: maxRowWidth + CANVAS_PADDING_X * 2,
    height: (lastNode?.y ?? 0) + (lastNode?.height ?? USER_CARD_HEIGHT) + CANVAS_PADDING_Y,
  };
}
