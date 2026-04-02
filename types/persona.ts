/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */

import type { LLMParams } from '../store/slices/settingsSlice';

export interface Persona {
  id: string;
  name: string;
  description: string;
  icon: string;
  systemPrompt: string;
  params: Partial<LLMParams>;
  modelId?: string;
  isBuiltIn: boolean;
  createdAt: number;
  updatedAt: number;
}

export type PersonaCreateInput = Omit<Persona, 'id' | 'isBuiltIn' | 'createdAt' | 'updatedAt'>;
