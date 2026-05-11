/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */

import type { Persona, PersonaCreateInput } from '../../types/persona';
import type { LLMParams } from './settingsSlice';

// ─── Built-in personas ────────────────────────────────────────
const BUILT_IN_PERSONAS: Persona[] = [
  {
    id: 'builtin-assistant',
    name: 'personaAssistant',
    description: 'personaAssistantDesc',
    icon: '\u{1F916}',
    systemPrompt: 'personaAssistantPrompt',
    params: {},
    isBuiltIn: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'builtin-creative',
    name: 'personaCreative',
    description: 'personaCreativeDesc',
    icon: '\u{270D}\u{FE0F}',
    systemPrompt: 'personaCreativePrompt',
    params: { temperature: 1.2, topP: 0.95 },
    isBuiltIn: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'builtin-code',
    name: 'personaCode',
    description: 'personaCodeDesc',
    icon: '\u{1F4BB}',
    systemPrompt: 'personaCodePrompt',
    params: { temperature: 0.3, topK: 20 },
    isBuiltIn: true,
    createdAt: 0,
    updatedAt: 0,
  },
];

// ─── Slice interface ──────────────────────────────────────────
export interface PersonaSlice {
  personas: Persona[];
  activePersonaId: string | null;
  autoPersona: boolean;
  setAutoPersona: (value: boolean) => void;
  addPersona: (input: PersonaCreateInput) => void;
  updatePersona: (id: string, updates: Partial<PersonaCreateInput>) => void;
  deletePersona: (id: string) => void;
  setPersonas: (personas: Persona[]) => void;
  selectPersona: (id: string | null) => void;
  initBuiltInPersonas: () => void;
}

// ─── Simple UUID (no crypto dependency) ───────────────────────
function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ─── Slice creator ────────────────────────────────────────────
export const createPersonaSlice = (set: any, get: any): PersonaSlice => ({
  personas: [...BUILT_IN_PERSONAS],
  activePersonaId: null,
  autoPersona: false,

  setAutoPersona: (value) => {
    if (!value) {
      set({ autoPersona: false, activePersonaId: null });
    } else {
      set({ autoPersona: true });
    }
  },

  initBuiltInPersonas: () => {
    const { personas } = get();
    const existing = new Set(personas.map((p: Persona) => p.id));
    const missing = BUILT_IN_PERSONAS.filter((b) => !existing.has(b.id));
    if (missing.length > 0) {
      set({ personas: [...missing, ...personas] });
    }
  },

  addPersona: (input) => {
    const now = Date.now();
    const persona: Persona = {
      ...input,
      id: uuid(),
      isBuiltIn: false,
      createdAt: now,
      updatedAt: now,
    };
    set((state: any) => ({ personas: [...state.personas, persona] }));
  },

  updatePersona: (id, updates) => {
    set((state: any) => ({
      personas: state.personas.map((p: Persona) => {
        if (p.id !== id) return p;
        if (p.isBuiltIn) return p;
        return { ...p, ...updates, updatedAt: Date.now() };
      }),
    }));
  },

  deletePersona: (id) => {
    const { personas, activePersonaId } = get();
    const target = personas.find((p: Persona) => p.id === id);
    if (!target || target.isBuiltIn) return;
    set({
      personas: personas.filter((p: Persona) => p.id !== id),
      ...(activePersonaId === id ? { activePersonaId: null } : {}),
    });
  },

  setPersonas: (personas) => {
    const { activePersonaId } = get();
    const activeStillExists =
      activePersonaId === null || personas.some((p: Persona) => p.id === activePersonaId);

    set({
      personas,
      ...(activeStillExists ? {} : { activePersonaId: null }),
    });
  },

  selectPersona: (id) => {
    set({ activePersonaId: id });
    if (id === null) return;

    const { personas, setParam, switchModel } = get();
    const persona = personas.find((p: Persona) => p.id === id);
    if (!persona) return;

    // Don't overwrite user's systemPrompt — persona prompt is layered in sendMessage()

    const paramKeys = Object.keys(persona.params) as (keyof LLMParams)[];
    for (const key of paramKeys) {
      setParam(key, persona.params[key]);
    }

    if (persona.modelId) {
      switchModel(0, persona.modelId);
    }
  },
});
