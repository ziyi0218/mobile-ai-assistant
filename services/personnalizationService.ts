import { z } from "zod";

import apiClient, { invalidateCache } from "./apiClient";
import { validate, ValidationError } from "../utils/validation";

export interface PersonalizationMemory {
  id: string;
  userId: string | null;
  userName: string;
  detail: string;
  updatedAt: string;
  createdAt: string;
}

export interface PersonalizationData {
  memoryEnabled: boolean;
  memories: PersonalizationMemory[];
}

export interface UpdatePersonalizationInput {
  memoryEnabled: boolean;
  memories: PersonalizationMemory[];
  previousMemories?: PersonalizationMemory[];
}

const SETTINGS_ROUTE =
  process.env.EXPO_PUBLIC_ACCOUNT_SETTINGS_ROUTE || "/users/user/settings";
const SETTINGS_UPDATE_ROUTE =
  process.env.EXPO_PUBLIC_ACCOUNT_SETTINGS_UPDATE_ROUTE || "/users/user/settings/update";
const MEMORIES_ROUTE =
  process.env.EXPO_PUBLIC_PERSONALIZATION_MEMORIES_ROUTE || "/memories/";
const MEMORIES_ADD_ROUTE =
  process.env.EXPO_PUBLIC_PERSONALIZATION_MEMORIES_ADD_ROUTE || "/memories/add";
const MEMORIES_DELETE_ALL_ROUTE =
  process.env.EXPO_PUBLIC_PERSONALIZATION_MEMORIES_DELETE_ALL_ROUTE || "/memories/delete/user";

const memoryContentSchema = z.string().trim().min(1, "persoInputPlaceholder");

function extractData<T = any>(payload: any): T {
  if (payload && typeof payload === "object" && "data" in payload) {
    return payload.data as T;
  }

  return payload as T;
}

function normalizeTimestamp(value: unknown) {
  if (typeof value === "number") {
    return value * 1000;
  }

  if (typeof value === "string") {
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) {
      return numeric * 1000;
    }

    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return Date.now();
}

function formatTimestamp(value: unknown) {
  return new Date(normalizeTimestamp(value)).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function extractUserName(detail: string) {
  const value = detail.trim();
  if (!value) return "Utilisateur";
  return value.length <= 28 ? value : `${value.slice(0, 28)}…`;
}

function normalizeMemory(payload: any): PersonalizationMemory {
  const data = extractData(payload) ?? {};
  const detail = data.content || data.detail || data.memory || "";

  return {
    id: data.id || "",
    userId: data.user_id || data.userId || null,
    userName: extractUserName(detail),
    detail,
    updatedAt: formatTimestamp(data.updated_at || data.updatedAt || data.created_at || data.createdAt),
    createdAt: formatTimestamp(data.created_at || data.createdAt || data.updated_at || data.updatedAt),
  };
}

function normalizeMemories(payload: any): PersonalizationMemory[] {
  const data = extractData(payload);
  const source = Array.isArray(data) ? data : Array.isArray(data?.memories) ? data.memories : [];
  return source.map(normalizeMemory);
}

function extractMemoryEnabled(payload: any): boolean {
  const data = extractData(payload) ?? {};
  return Boolean(data?.ui?.memory ?? data?.memory ?? false);
}

function buildSettingsPayload(payload: any, memoryEnabled: boolean) {
  const data = extractData(payload) ?? {};
  const ui =
    data.ui && typeof data.ui === "object" && !Array.isArray(data.ui) ? data.ui : {};
  const notifications =
    ui.notifications &&
    typeof ui.notifications === "object" &&
    !Array.isArray(ui.notifications)
      ? ui.notifications
      : {};

  return {
    ...data,
    ui: {
      ...ui,
      params: ui.params ?? {},
      memory: memoryEnabled,
      notifications: {
        ...notifications,
      },
    },
  };
}

function buildMemoryUpdateRoute(id: string) {
  return `${MEMORIES_ROUTE}${id}/update`;
}

function buildMemoryDeleteRoute(id: string) {
  return `${MEMORIES_ROUTE}${id}`;
}

function serializeMemoryDiff(memories: PersonalizationMemory[]) {
  return JSON.stringify(
    memories.map((memory) => ({
      id: memory.id,
      detail: memory.detail.trim(),
    }))
  );
}

async function fetchPersonalization(): Promise<PersonalizationData> {
  const [settingsResult, memoriesResult] = await Promise.allSettled([
    apiClient.get(SETTINGS_ROUTE, { headers: { "x-no-cache": "1" } }),
    apiClient.get(MEMORIES_ROUTE, { headers: { "x-no-cache": "1" } }),
  ]);

  if (settingsResult.status !== "fulfilled") {
    throw settingsResult.reason;
  }

  if (memoriesResult.status !== "fulfilled") {
    throw memoriesResult.reason;
  }

  return {
    memoryEnabled: extractMemoryEnabled(settingsResult.value.data),
    memories: normalizeMemories(memoriesResult.value.data),
  };
}

async function syncMemories(
  previousMemories: PersonalizationMemory[],
  nextMemories: PersonalizationMemory[]
) {
  const previousById = new Map(previousMemories.map((memory) => [memory.id, memory]));
  const nextById = new Map(nextMemories.filter((memory) => memory.id).map((memory) => [memory.id, memory]));

  if (previousMemories.length > 0 && nextMemories.length === 0) {
    await apiClient.delete(MEMORIES_DELETE_ALL_ROUTE);
    return;
  }

  const deletedIds = previousMemories
    .filter((memory) => !nextById.has(memory.id))
    .map((memory) => memory.id);

  await Promise.all(
    deletedIds.map((id) => apiClient.delete(buildMemoryDeleteRoute(id)))
  );

  const newMemories = nextMemories.filter((memory) => !previousById.has(memory.id));
  for (const memory of newMemories) {
    const validation = validate(memoryContentSchema, memory.detail);
    if (!validation.success) {
      throw new ValidationError(validation.errors!.unknown || "persoInputPlaceholder", "detail");
    }
    await apiClient.post(MEMORIES_ADD_ROUTE, {
      content: validation.data!,
    });
  }

  const updatedMemories = nextMemories.filter((memory) => {
    const previous = previousById.get(memory.id);
    return previous && previous.detail.trim() !== memory.detail.trim();
  });

  for (const memory of updatedMemories) {
    const validation = validate(memoryContentSchema, memory.detail);
    if (!validation.success) {
      throw new ValidationError(validation.errors!.unknown || "persoInputPlaceholder", "detail");
    }
    await apiClient.post(buildMemoryUpdateRoute(memory.id), {
      content: validation.data!,
    });
  }
}

export const personnalizationService = {
  getPersonalization: async (): Promise<PersonalizationData> => {
    return fetchPersonalization();
  },

  areMemoriesEqual: (
    previousMemories: PersonalizationMemory[],
    nextMemories: PersonalizationMemory[]
  ) => serializeMemoryDiff(previousMemories) === serializeMemoryDiff(nextMemories),

  updatePersonalization: async (
    input: UpdatePersonalizationInput
  ): Promise<PersonalizationData> => {
    const nextMemories = input.memories.map((memory) => ({
      ...memory,
      detail: memory.detail.trim(),
      userName: extractUserName(memory.detail),
    }));

    const invalidMemory = nextMemories.find((memory) => !memory.detail);
    if (invalidMemory) {
      throw new ValidationError("persoInputPlaceholder", "detail");
    }

    invalidateCache(SETTINGS_ROUTE);
    invalidateCache(MEMORIES_ROUTE);

    const settingsResponse = await apiClient.get(SETTINGS_ROUTE, {
      headers: { "x-no-cache": "1" },
    });
    const settingsPayload = buildSettingsPayload(settingsResponse.data, input.memoryEnabled);
    await apiClient.post(SETTINGS_UPDATE_ROUTE, settingsPayload);

    const previousMemories = input.previousMemories ?? [];
    await syncMemories(previousMemories, nextMemories);

    invalidateCache(SETTINGS_ROUTE);
    invalidateCache(MEMORIES_ROUTE);

    return fetchPersonalization();
  },
};

