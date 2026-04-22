import { Editor, Extension } from '@tiptap/core';
import { keymap } from '@tiptap/pm/keymap';
import StarterKit from '@tiptap/starter-kit';
import { io, type Socket } from 'socket.io-client';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import * as Y from 'yjs';
import { redo, undo, yCursorPlugin, ySyncPlugin, yUndoPlugin } from 'y-prosemirror';

type RuntimeConfig = {
  noteId: string;
  noteTitle?: string;
  initialHtml?: string;
  token?: string;
  userId?: string;
  userName?: string;
  webBaseUrl?: string;
  socketPath?: string;
};

type RuntimeCommand =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'bullet'
  | 'numbered'
  | 'check'
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'code'
  | 'focus'
  | 'focus-end'
  | 'blur'
  | 'undo'
  | 'redo';

declare global {
  interface Window {
    __RN_NOTE_LAB_CONFIG?: RuntimeConfig;
    __RN_NOTE_LAB_EDITOR?: Editor | null;
    __RN_NOTE_LAB_DESTROY?: (() => void) | null;
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
  }
}

function post(payload: Record<string, unknown>) {
  try {
    window.ReactNativeWebView?.postMessage(JSON.stringify(payload));
  } catch {}
}

function parseSerializedDoc(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const candidates = [trimmed];

  if (trimmed.includes('<')) {
    const container = document.createElement('div');
    container.innerHTML = trimmed;
    const text = (container.textContent ?? '').trim();
    if (text) {
      candidates.push(text);
    }
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as Record<string, unknown>;
      if (parsed && parsed.type === 'doc') {
        return parsed;
      }
    } catch {}
  }

  return null;
}

const USER_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#98D8C8',
  '#F7DC6F',
  '#BB8FCE',
  '#85C1E9',
];

function generateUserColor() {
  return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)] ?? '#98D8C8';
}

class SimpleAwareness {
  public readonly clientID: number;
  private readonly states = new Map<number, Record<string, unknown>>();
  private readonly handlers: Array<
    (
      change: { added: number[]; updated: number[]; removed: number[] },
      origin: string
    ) => void
  > = [];

  constructor(public readonly doc: Y.Doc) {
    this.clientID = doc.clientID ? doc.clientID : Math.floor(Math.random() * 0xffffffff);
    this.states.set(this.clientID, {});
  }

  on(
    event: string,
    handler: (change: { added: number[]; updated: number[]; removed: number[] }, origin: string) => void
  ) {
    if (event === 'change') {
      this.handlers.push(handler);
    }
  }

  off(
    event: string,
    handler: (change: { added: number[]; updated: number[]; removed: number[] }, origin: string) => void
  ) {
    if (event !== 'change') return;

    const index = this.handlers.indexOf(handler);
    if (index !== -1) {
      this.handlers.splice(index, 1);
    }
  }

  getLocalState() {
    return this.states.get(this.clientID) ?? null;
  }

  getStates() {
    return this.states;
  }

  setLocalStateField(field: string, value: unknown) {
    const localState = this.states.get(this.clientID) ?? {};
    localState[field] = value;
    this.states.set(this.clientID, localState);

    this.handlers.forEach((handler) => {
      handler({ added: [], updated: [this.clientID], removed: [] }, 'local');
    });
  }

  applyUpdate(update: Uint8Array, origin: string) {
    try {
      const text = new TextDecoder().decode(update);
      const parsed = JSON.parse(text) as Record<string, Record<string, unknown>>;

      Object.entries(parsed).forEach(([clientId, state]) => {
        this.states.set(Number(clientId), state);
      });

      const changedIds = Object.keys(parsed).map(Number);
      this.handlers.forEach((handler) => {
        handler({ added: [], updated: changedIds, removed: [] }, origin);
      });
    } catch (error) {
      console.warn('SimpleAwareness decode failed', error);
    }
  }

  encodeUpdate(clients: number[]) {
    const payload: Record<number, Record<string, unknown>> = {};
    const ids = clients.length ? clients : Array.from(this.states.keys());

    ids.forEach((id) => {
      const state = this.states.get(id);
      if (state) {
        payload[id] = state;
      }
    });

    return new TextEncoder().encode(JSON.stringify(payload));
  }
}

type ContentSnapshot = {
  html: string;
  text: string;
  md: string;
  json: Record<string, unknown>;
};

class SocketIOCollaborationProvider {
  private readonly doc = new Y.Doc();
  private readonly awareness = new SimpleAwareness(this.doc);
  private isConnected = false;
  private editor: Editor | null = null;
  private getSnapshot: (() => ContentSnapshot) | null = null;
  private readonly userColor = generateUserColor();

  constructor(
    private readonly documentId: string,
    private readonly noteId: string,
    private readonly socket: Socket,
    private readonly user: { id: string; name: string },
    private readonly initialHtml: string,
    private readonly setStatus: (status: string, detail?: string) => void
  ) {
    this.onConnect = this.onConnect.bind(this);
    this.onDisconnect = this.onDisconnect.bind(this);
    this.setupEventListeners();
  }

  getEditorExtension() {
    const provider = this;

    return Extension.create({
      name: 'rnYjsCollaboration',
      addProseMirrorPlugins() {
        const fragment = provider.doc.getXmlFragment('prosemirror');

        return [
          ySyncPlugin(fragment),
          yUndoPlugin(),
          keymap({
            'Mod-z': undo,
            'Mod-y': redo,
            'Mod-Shift-z': redo,
          }),
          yCursorPlugin(provider.awareness as never),
        ];
      },
    });
  }

  setEditor(editor: Editor, getSnapshot: () => ContentSnapshot) {
    this.editor = editor;
    this.getSnapshot = getSnapshot;
  }

  destroy() {
    this.socket.off('connect', this.onConnect);
    this.socket.off('disconnect', this.onDisconnect);
    this.socket.off('ydoc:document:update');
    this.socket.off('ydoc:document:state');
    this.socket.off('ydoc:awareness:update');

    if (this.isConnected) {
      this.socket.emit('ydoc:document:leave', {
        document_id: this.documentId,
        user_id: this.user.id,
      });
    }
  }

  private setupEventListeners() {
    this.socket.on('connect', this.onConnect);
    this.socket.on('disconnect', this.onDisconnect);

    this.socket.on('ydoc:document:update', (data: any) => {
      if (!data || data.document_id !== this.documentId || data.socket_id === this.socket.id) {
        return;
      }

      try {
        Y.applyUpdate(this.doc, new Uint8Array(data.update), 'server');
        this.setStatus('Applied remote update');
      } catch (error) {
        this.setStatus('Remote update failed', error instanceof Error ? error.message : String(error));
      }
    });

    this.socket.on('ydoc:document:state', (data: any) => {
      if (!data || data.document_id !== this.documentId) return;

      try {
        if (data.state) {
          const state = new Uint8Array(data.state);
          const isEmptyState = state.length === 2 && state[0] === 0 && state[1] === 0;

          if (isEmptyState) {
            if (this.editor && this.editor.isEmpty && this.initialHtml && (data.sessions ?? []).length <= 1) {
              this.editor.commands.setContent(this.initialHtml);
              this.setStatus('Initialized empty document');
            }
          } else {
            Y.applyUpdate(this.doc, state, 'server');
            this.setStatus('Synced remote state');
          }
        }

        post({
          type: 'ready',
          runtime: 'bundled-tiptap-yjs',
          noteId: this.noteId,
        });
      } catch (error) {
        this.setStatus('State sync failed', error instanceof Error ? error.message : String(error));
      }
    });

    this.socket.on('ydoc:awareness:update', (data: any) => {
      if (!data || data.document_id !== this.documentId) return;

      try {
        this.awareness.applyUpdate(new Uint8Array(data.update), 'server');
      } catch (error) {
        console.warn('Awareness update failed', error);
      }
    });

    this.doc.on('update', (update, origin) => {
      if (!this.isConnected || origin === 'server' || !this.getSnapshot) return;

      const snapshot = this.getSnapshot();
      this.socket.emit('ydoc:document:update', {
        document_id: this.documentId,
        user_id: this.user.id,
        socket_id: this.socket.id,
        update: Array.from(update),
        data: {
          content: {
            html: snapshot.html,
            md: snapshot.md,
            json: snapshot.json,
          },
        },
      });
    });

    this.awareness.on('change', (change, origin) => {
      if (!this.isConnected || origin === 'server') return;

      const changedClients = change.added.concat(change.updated).concat(change.removed);
      const awarenessUpdate = this.awareness.encodeUpdate(changedClients);

      this.socket.emit('ydoc:awareness:update', {
        document_id: this.documentId,
        user_id: this.socket.id,
        update: Array.from(awarenessUpdate),
      });
    });

    if (this.socket.connected) {
      this.onConnect();
    }
  }

  private onConnect() {
    this.isConnected = true;

    this.socket.emit('user-join', {
      auth: {
        token: this.socket.auth?.token,
      },
    });

    this.socket.emit('join-note', {
      note_id: this.noteId,
      auth: {
        token: this.socket.auth?.token,
      },
    });

    this.socket.emit('ydoc:document:join', {
      document_id: this.documentId,
      user_id: this.user.id,
      user_name: this.user.name,
      user_color: this.userColor,
    });

    this.awareness.setLocalStateField('user', {
      id: this.socket.id,
      name: this.user.name,
      color: this.userColor,
    });

    this.setStatus('Socket connected', this.noteId);
  }

  private onDisconnect(reason?: string) {
    this.isConnected = false;
    this.setStatus('Socket disconnected', reason ?? '');
  }
}

function main() {
  const config = window.__RN_NOTE_LAB_CONFIG ?? { noteId: '', initialHtml: '<p><br></p>' };
  const mount = document.getElementById('editor');
  const statusEl = document.getElementById('status');

  if (!mount) {
    post({
      type: 'error',
      message: 'Bundled lab runtime could not find #editor mount node.',
    });
    return;
  }

  const setStatus = (status: string, detail = '') => {
    if (statusEl) {
      statusEl.textContent = detail ? `${status} - ${detail}` : status;
    }

    post({
      type: 'status',
      status,
      detail,
    });
  };

  const turndown = new TurndownService({
    codeBlockStyle: 'fenced',
    headingStyle: 'atx',
  });
  turndown.use(gfm);

  let heartbeatTimer: ReturnType<typeof window.setInterval> | null = null;
  let socket: Socket | null = null;
  let provider: SocketIOCollaborationProvider | null = null;

  const getSnapshot = (editor: Editor): ContentSnapshot => {
    const html = editor.getHTML();
    const text = editor.getText({ blockSeparator: '\n\n' });

    let md = text;
    try {
      md = turndown.turndown(html);
    } catch (error) {
      console.warn('Markdown conversion failed', error);
    }

    return {
      html,
      text,
      md,
      json: editor.getJSON() as Record<string, unknown>,
    };
  };

  const collabEnabled = Boolean(config.webBaseUrl && config.token && config.noteId);
  const normalizedInitialContent =
    typeof config.initialHtml === 'string'
      ? parseSerializedDoc(config.initialHtml) ?? (config.initialHtml.trim() ? config.initialHtml : '<p><br></p>')
      : '<p><br></p>';

  if (collabEnabled) {
    socket = io(config.webBaseUrl as string, {
      path: config.socketPath ?? '/ws/socket.io',
      transports: ['websocket'],
      auth: {
        token: config.token,
      },
      reconnection: true,
    });

    provider = new SocketIOCollaborationProvider(
      `note:${config.noteId}`,
      config.noteId,
      socket,
      {
        id: config.userId ?? '',
        name: config.userName ?? 'Mobile User',
      },
      normalizedInitialContent,
      setStatus
    );

    heartbeatTimer = window.setInterval(() => {
      if (socket?.connected) {
        socket.emit('heartbeat', {});
      }
    }, 30000);

    socket.on('connect_error', (error) => {
      setStatus('Socket connect error', error.message);
    });
  }

  const editor = new Editor({
    element: mount,
    extensions: [
      StarterKit.configure({
        undoRedo: !collabEnabled,
        link: false,
        underline: false,
      }),
      ...(provider ? [provider.getEditorExtension()] : []),
    ],
    content: normalizedInitialContent,
    autofocus: true,
    editorProps: {
      attributes: {
        class: 'tiptap bundled-lab-editor',
      },
    },
    onCreate: ({ editor }) => {
      if (!provider) {
        setStatus('Bundled runtime ready', config.noteId || 'no-note-id');
        post({
          type: 'ready',
          runtime: 'bundled-tiptap-shell',
          noteId: config.noteId,
        });
      } else if (typeof normalizedInitialContent !== 'string') {
        setStatus('Recovered serialized document', config.noteId || '');
      } else {
        setStatus('Editor booted', config.noteId || '');
      }

      provider?.setEditor(editor, () => getSnapshot(editor));

      const snapshot = getSnapshot(editor);
      post({
        type: 'change',
        reason: 'create',
        html: snapshot.html,
        text: snapshot.text,
      });
    },
    onFocus: () => {
      post({
        type: 'focus',
        focused: true,
      });
    },
    onBlur: () => {
      post({
        type: 'focus',
        focused: false,
      });
    },
    onUpdate: ({ editor }) => {
      const snapshot = getSnapshot(editor);
      post({
        type: 'change',
        reason: 'update',
        html: snapshot.html,
        text: snapshot.text,
      });
    },
  });

  const runUndo = () => {
    if (collabEnabled) {
      return undo(editor.view.state, editor.view.dispatch);
    }

    return editor.commands.undo();
  };

  const runRedo = () => {
    if (collabEnabled) {
      return redo(editor.view.state, editor.view.dispatch);
    }

    return editor.commands.redo();
  };

  const runCommand = (command: RuntimeCommand) => {
    switch (command) {
      case 'focus':
        return editor.commands.focus();
      case 'focus-end':
        return editor.commands.focus('end');
      case 'blur':
        return editor.commands.blur();
      case 'undo':
        return runUndo();
      case 'redo':
        return runRedo();
      case 'h1':
        return editor.chain().focus().toggleHeading({ level: 1 }).run();
      case 'h2':
        return editor.chain().focus().toggleHeading({ level: 2 }).run();
      case 'h3':
        return editor.chain().focus().toggleHeading({ level: 3 }).run();
      case 'bullet':
        return editor.chain().focus().toggleBulletList().run();
      case 'numbered':
        return editor.chain().focus().toggleOrderedList().run();
      case 'bold':
        return editor.chain().focus().toggleBold().run();
      case 'italic':
        return editor.chain().focus().toggleItalic().run();
      case 'strike':
        return editor.chain().focus().toggleStrike().run();
      case 'code':
        return editor.chain().focus().toggleCode().run();
      case 'check':
      case 'underline':
        setStatus('Command unavailable', command);
        return false;
      default:
        return false;
    }
  };

  window.__RN_NOTE_LAB_EDITOR = editor;
  window.__RN_NOTE_LAB_DESTROY = () => {
    window.__RN_NOTE_LAB_EDITOR = null;
    if (heartbeatTimer) {
      window.clearInterval(heartbeatTimer);
    }
    provider?.destroy();
    socket?.close();
    editor.destroy();
  };

  const handleIncomingMessage = (event: MessageEvent | Event) => {
    try {
      const rawData =
        event instanceof MessageEvent
          ? event.data
          : (event as Event & { data?: unknown }).data;
      const payload = JSON.parse(String(rawData ?? '{}')) as {
        type?: string;
        command?: RuntimeCommand;
      };
      if (!payload || payload.type !== 'command') return;

      if (!payload.command) return;

      const applied = runCommand(payload.command);
      post({
        type: 'command',
        command: payload.command,
        applied,
      });
    } catch (error) {
      post({
        type: 'error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  document.addEventListener('message', handleIncomingMessage as EventListener);
  window.addEventListener('message', handleIncomingMessage as EventListener);

  const destroy = window.__RN_NOTE_LAB_DESTROY;
  window.__RN_NOTE_LAB_DESTROY = () => {
    document.removeEventListener('message', handleIncomingMessage as EventListener);
    window.removeEventListener('message', handleIncomingMessage as EventListener);
    destroy?.();
  };
}

try {
  main();
} catch (error) {
  post({
    type: 'error',
    message: error instanceof Error ? error.message : String(error),
  });
}
