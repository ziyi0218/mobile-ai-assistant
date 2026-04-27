import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { noteService } from '../services/noteService';

export type NoteItem = {
  id: string;
  userId: string;
  title: string;
  content: string;
  contentHtml: string;
  author: string;
  createdAt: number;
  updatedAt: number;
};

type NoteState = {
  notes: NoteItem[];
  total: number;
  isLoading: boolean;
  lastQuery: string;
  fetchNotes: (query?: string, page?: number) => Promise<void>;
  createNote: (seedTitle?: string) => Promise<NoteItem>;
  updateNoteLocal: (id: string, patch: Partial<Pick<NoteItem, 'title' | 'content' | 'contentHtml' | 'author'>>) => void;
  updateNoteTitle: (id: string, title: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
};

const toValidTimestamp = (value: unknown, fallback: number) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value >= 1e17) return Math.floor(value / 1e6);
    if (value >= 1e14) return Math.floor(value / 1e3);
    if (value < 1e12) return value * 1000;
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      if (numeric >= 1e17) return Math.floor(numeric / 1e6);
      if (numeric >= 1e14) return Math.floor(numeric / 1e3);
      if (numeric < 1e12) return numeric * 1000;
      return numeric;
    }

    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.getTime();
    }
  }

  return fallback;
};

const sanitizeNote = (note: Partial<NoteItem>): NoteItem => {
  const createdAt = toValidTimestamp(note.createdAt, Date.now());
  const updatedAt = toValidTimestamp(note.updatedAt, createdAt);

  return {
    id: typeof note.id === 'string' && note.id.trim() ? note.id : `note-${Date.now()}`,
    userId: typeof note.userId === 'string' ? note.userId : '',
    title: typeof note.title === 'string' && note.title.trim() ? note.title : 'Untitled note',
    content: typeof note.content === 'string' ? note.content : '',
    contentHtml: typeof note.contentHtml === 'string' ? note.contentHtml : '',
    author: typeof note.author === 'string' ? note.author.trim() : '',
    createdAt,
    updatedAt,
  };
};

const sortNotes = (notes: NoteItem[]) =>
  [...notes]
    .map((note) => sanitizeNote(note))
    .sort((a, b) => b.updatedAt - a.updatedAt);

const formatDefaultNoteTitle = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const useNoteStore = create<NoteState>()(
  persist(
    (set, get) => ({
      notes: [],
      total: 0,
      isLoading: false,
      lastQuery: '',
      fetchNotes: async (query = '', page = 1) => {
        set({ isLoading: true, lastQuery: query });

        try {
          const result = await noteService.searchNotes(query, page);
          const mapped: NoteItem[] = result.items.map((item) => {
            return sanitizeNote({
              id: item.id,
              userId: item.user_id,
              title: item.title?.trim() || 'Untitled note',
              content: item.data?.content?.md ?? '',
              contentHtml: item.data?.content?.html ?? '',
              author: item.user?.name ?? '',
              createdAt: item.created_at as number | undefined,
              updatedAt: item.updated_at as number | undefined,
            });
          });

          set({
            notes: sortNotes(mapped),
            total: result.total,
            isLoading: false,
          });
        } catch (error) {
          console.error('Erreur notes search:', error);
          set({ isLoading: false });
        }
      },
      createNote: async (seedTitle) => {
        const created = await noteService.createNote(seedTitle?.trim() || formatDefaultNoteTitle());
        const note = sanitizeNote({
          id: created.id,
          userId: created.user_id,
          title: created.title,
          content: created.data?.content?.md ?? '',
          contentHtml: created.data?.content?.html ?? '',
          author: created.user?.name ?? '',
          createdAt: created.created_at as number | undefined,
          updatedAt: created.updated_at as number | undefined,
        });

        set((state) => ({
          notes: sortNotes([note, ...state.notes.filter((item) => item.id !== note.id)]),
          total: Math.max(state.total, state.total + 1),
        }));

        return note;
      },
      updateNoteLocal: (id, patch) =>
        set((state) => ({
          notes: sortNotes(
            state.notes.map((note) =>
              note.id === id
                ? {
                    ...sanitizeNote(note),
                    ...patch,
                    updatedAt: toValidTimestamp(Date.now(), Date.now()),
                  }
                : note
            )
          ),
        })),
      updateNoteTitle: async (id, title) => {
        const updated = await noteService.updateNoteTitle(id, title);
        const updatedNote = sanitizeNote({
          id: updated.id,
          userId: updated.user_id,
          title: updated.title,
          content: updated.data?.content?.md,
          contentHtml: updated.data?.content?.html,
          author: updated.user?.name ?? '',
          createdAt: updated.created_at as number | undefined,
          updatedAt: updated.updated_at as number | undefined,
        });

        set((state) => ({
          notes: sortNotes(
            state.notes.map((note) =>
              note.id === id
                ? {
                    ...note,
                    ...updatedNote,
                    author: updatedNote.author || note.author,
                    content: updated.data?.content?.md ?? note.content,
                    contentHtml: updated.data?.content?.html ?? note.contentHtml,
                  }
                : note
            )
          ),
        }));
      },
      deleteNote: async (id) => {
        await noteService.deleteNote(id);

        set((state) => ({
          notes: state.notes.filter((note) => note.id !== id),
          total: Math.max(0, state.total - 1),
        }));

        await get().fetchNotes(get().lastQuery || '', 1);
      },
    }),
    {
      name: 'l3t1-notes-v1',
      storage: createJSONStorage(() => AsyncStorage),
      merge: (persistedState, currentState) => {
        const typed = (persistedState as Partial<NoteState>) ?? {};
        const persistedNotes = Array.isArray(typed.notes) ? typed.notes.map((note) => sanitizeNote(note)) : [];

        return {
          ...currentState,
          ...typed,
          notes: sortNotes(persistedNotes),
          total: typeof typed.total === 'number' ? typed.total : persistedNotes.length,
          isLoading: false,
          lastQuery: typeof typed.lastQuery === 'string' ? typed.lastQuery : '',
        };
      },
    }
  )
);
