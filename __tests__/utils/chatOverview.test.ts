import { buildChatOverview, extractOverviewText } from '../../utils/chatOverview';
import type { ChatData } from '../../types/api';

function makeChat(messages: ChatData['chat']['messages']): ChatData {
  return {
    id: 'chat-1',
    title: 'Demo',
    chat: {
      models: ['model-a', 'model-b'],
      history: {
        currentId: messages[messages.length - 1]?.id ?? null,
        messages: Object.fromEntries(messages.map((message) => [message.id, message])),
      },
      messages,
      params: {},
    },
  };
}

describe('extractOverviewText', () => {
  it('joins text content parts', () => {
    expect(
      extractOverviewText([
        { type: 'image_url', image_url: { url: 'file://img.png' } },
        { type: 'text', text: 'hello' },
        { type: 'text', text: 'world' },
      ]),
    ).toBe('hello\nworld');
  });
});

describe('buildChatOverview', () => {
  it('creates nodes and edges for round-based overview', () => {
    const graph = buildChatOverview(
      makeChat([
        {
          id: 'u1',
          parentId: null,
          childrenIds: ['a1', 'a2'],
          role: 'user',
          content: 'Question 1',
          timestamp: 1,
        },
        {
          id: 'a1',
          parentId: 'u1',
          childrenIds: [],
          role: 'assistant',
          content: 'Answer 1A',
          timestamp: 2,
          model: 'model-a',
          modelIdx: 0,
        },
        {
          id: 'a2',
          parentId: 'u1',
          childrenIds: [],
          role: 'assistant',
          content: 'Answer 1B',
          timestamp: 2,
          model: 'model-b',
          modelIdx: 1,
        },
        {
          id: 'u2',
          parentId: 'a2',
          childrenIds: ['a3'],
          role: 'user',
          content: 'Question 2',
          timestamp: 3,
        },
        {
          id: 'a3',
          parentId: 'u2',
          childrenIds: [],
          role: 'assistant',
          content: 'Answer 2',
          timestamp: 4,
          model: 'model-a',
          modelIdx: 0,
        },
      ]),
    );

    expect(graph.nodes).toHaveLength(5);
    expect(graph.edges.filter((edge) => edge.kind === 'response')).toHaveLength(3);
    expect(graph.edges.filter((edge) => edge.kind === 'followUp')).toHaveLength(2);
    expect(graph.nodes.find((node) => node.id === 'a3')?.isLatest).toBe(true);
  });
});
