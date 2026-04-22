import apiClient from './apiClient';

export type NoteSearchItem = {
  id: string;
  user_id: string;
  title: string;
  created_at?: number | string;
  updated_at?: number | string;
  user?: {
    id?: string;
    name?: string;
  };
  data?: {
    content?: {
      md?: string;
      html?: string;
      json?: unknown;
    };
  };
};

export type NoteSearchResponse = {
  items: NoteSearchItem[];
  total: number;
};

export type NoteCreatePayload = {
  title: string;
  data: {
    content: {
      json: unknown;
      html: string;
      md: string;
    };
  };
  meta: unknown;
  access_control: Record<string, unknown>;
};

export type NoteUpdatePayload = {
  title: string;
  data: {
    files: unknown[];
  };
  access_control: Record<string, unknown>;
};

export const noteService = {
  searchNotes: async (query: string = '', page: number = 1): Promise<NoteSearchResponse> => {
    const response = await apiClient.get('/notes/search', {
      params: {
        query,
        page,
      },
    });

    const payload = response.data ?? {};
    return {
      items: Array.isArray(payload.items) ? payload.items : [],
      total: typeof payload.total === 'number' ? payload.total : 0,
    };
  },

  createNote: async (title: string): Promise<NoteSearchItem> => {
    const payload: NoteCreatePayload = {
      title,
      data: {
        content: {
          json: null,
          html: '',
          md: '',
        },
      },
      meta: null,
      access_control: {},
    };

    const response = await apiClient.post('/notes/create', payload);
    return response.data;
  },

  updateNoteTitle: async (noteId: string, title: string): Promise<NoteSearchItem> => {
    const payload: NoteUpdatePayload = {
      title,
      data: {
        files: [],
      },
      access_control: {},
    };

    const response = await apiClient.post(`/notes/${noteId}/update`, payload);
    return response.data;
  },

  deleteNote: async (noteId: string): Promise<boolean> => {
    const response = await apiClient.delete(`/notes/${noteId}/delete`);
    return Boolean(response.data);
  },
};
