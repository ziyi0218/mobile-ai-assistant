import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import type { ChatFolder, ChatSummary } from '../../types/api';

export type SidebarThemeColors = {
  bg: string;
  text: string;
  subtext: string;
  border: string;
  card: string;
  accent: string;
};

export type SidebarUi = {
  overlay: string;
  sidebarBg: string;
  rowBg: string;
  rowSelected: string;
  rowSelectedBorder: string;
  softBg: string;
  iconBg: string;
  iconSelectedBg: string;
  folderAccent: string;
  warning: string;
  primary: string;
  dialogBg: string;
  dialogInputBg: string;
  danger: string;
  newChatBg: string;
  newChatText: string;
  separator: string;
};

export type PromptState = {
  visible: boolean;
  title: string;
  placeholder: string;
  confirmLabel: string;
  value: string;
  onSubmit: (value: string) => Promise<void> | void;
};

export type ChatMenuState = {
  visible: boolean;
  chat: ChatSummary | null;
};

export type FolderMenuState = {
  visible: boolean;
  folder: ChatFolder | null;
};

export type SidebarAction = {
  key: string;
  label: string;
  danger?: boolean;
  icon: ReactNode;
  onPress: () => Promise<void> | void;
};

export type SidebarChatGroup = {
  label: string;
  items: ChatSummary[];
};

export const emptyPromptState: PromptState = {
  visible: false,
  title: '',
  placeholder: '',
  confirmLabel: '',
  value: '',
  onSubmit: () => {},
};

export function buildSidebarUi(colors: SidebarThemeColors, isDark: boolean): SidebarUi {
  return {
    overlay: isDark ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.20)',
    sidebarBg: colors.card,
    rowBg: 'transparent',
    rowSelected: colors.bg,
    rowSelectedBorder: 'transparent',
    softBg: colors.bg,
    iconBg: colors.bg,
    iconSelectedBg: colors.card,
    folderAccent: colors.text,
    warning: colors.accent,
    primary: colors.accent,
    dialogBg: colors.card,
    dialogInputBg: colors.bg,
    danger: '#F87171',
    newChatBg: colors.text,
    newChatText: colors.bg,
    separator: colors.border,
  };
}

export function getChatTitle(chat: ChatSummary, fallback: string) {
  return chat.title?.trim() || fallback;
}

export function getChatFolderId(chat: ChatSummary) {
  return chat.folder_id ?? chat.folder?.id ?? null;
}

export function filterChats(chat: ChatSummary, query: string, fallback: string) {
  if (!query) return true;
  return getChatTitle(chat, fallback).toLowerCase().includes(query);
}

export function buildFolderChatMap(history: ChatSummary[]) {
  const map = new Map<string | null, ChatSummary[]>();

  history.forEach((chat) => {
    const key = getChatFolderId(chat);
    const items = map.get(key) ?? [];
    items.push(chat);
    map.set(key, items);
  });

  map.forEach((items) => items.sort((a, b) => b.updated_at - a.updated_at));

  return map;
}

export function getSortedFolders(folders: ChatFolder[]) {
  return [...folders].sort((a, b) => a.name.localeCompare(b.name));
}

export function getVisibleFolders(
  folders: ChatFolder[],
  folderChatMap: Map<string | null, ChatSummary[]>,
  query: string,
  fallback: string
) {
  if (!query) return folders;

  return folders.filter((folder) => {
    if (folder.name.toLowerCase().includes(query)) return true;
    return (folderChatMap.get(folder.id) ?? []).some((chat) =>
      filterChats(chat, query, fallback)
    );
  });
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getDayDiffFromNow(date: Date) {
  const now = startOfDay(new Date());
  const target = startOfDay(date);
  return Math.floor((now.getTime() - target.getTime()) / 86400000);
}

function parseChatDate(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return null;

  if (typeof value === 'number') {
    const normalized = value < 1e12 ? value * 1000 : value;
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const trimmed = String(value).trim();
  if (!trimmed) return null;

  if (/^\d+$/.test(trimmed)) {
    const numeric = Number(trimmed);
    const normalized = numeric < 1e12 ? numeric * 1000 : numeric;
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getLocale(language: string) {
  if (language.startsWith('fr')) return 'fr-FR';
  if (language.startsWith('zh')) return 'zh-CN';
  return 'en-US';
}

export function groupChatsByUpdatedAt(
  chats: ChatSummary[],
  language: string,
  t: (key: string) => string
) {
  const locale = getLocale(language);
  const monthFormatter = new Intl.DateTimeFormat(locale, {
    month: 'long',
    ...(locale === 'zh-CN' ? { year: 'numeric' as const } : {}),
  });

  const groups: SidebarChatGroup[] = [];
  const map = new Map<string, ChatSummary[]>();

  chats.forEach((chat) => {
    const parsed = parseChatDate(chat.updated_at);
    let label = t('sidebarLast30Days');

    if (parsed) {
      const diff = getDayDiffFromNow(parsed);
      if (diff === 0) {
        label = t('sidebarToday');
      } else if (diff === 1) {
        label = t('sidebarYesterday');
      } else if (diff <= 7) {
        label = t('sidebarLast7Days');
      } else if (diff <= 30) {
        label = t('sidebarLast30Days');
      } else {
        label = monthFormatter.format(parsed);
      }
    }

    if (!map.has(label)) {
      const items: ChatSummary[] = [];
      map.set(label, items);
      groups.push({ label, items });
    }

    map.get(label)!.push(chat);
  });

  return groups;
}

export const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  container: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: '84%',
    borderTopRightRadius: 30,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 20,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderRadius: 20,
    borderWidth: 1,
  },
  newChatText: {
    marginLeft: 10,
    fontSize: 15,
    fontWeight: '700',
  },
  searchWrap: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
  },
  searchInput: {
    marginLeft: 10,
    fontSize: 14,
    flex: 1,
    padding: 0,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  notesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 2,
  },
  notesIconShell: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesText: {
    marginLeft: 14,
    fontSize: 15.5,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 10,
  },
  sectionHeaderMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  sectionChevron: {
    marginRight: 6,
  },
  addFolderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  addFolderText: {
    marginLeft: 5,
    fontSize: 11,
    fontWeight: '700',
  },
  folderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
  },
  folderMainAction: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  folderName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRadius: 14,
    marginBottom: 4,
    borderWidth: 1,
  },
  chatRowIndented: {
    marginLeft: 23,
  },
  chatIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatText: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
    fontSize: 14,
  },
  chatTextSelected: {
    fontWeight: '700',
  },
  separator: {
    height: 1,
    marginVertical: 12,
  },
  dashedSeparator: {
    height: 1,
    flexDirection: 'row',
    gap: 8,
    marginVertical: 12,
    overflow: 'hidden',
  },
  dashedSeparatorSegment: {
    width: 12,
    height: 1,
  },
  emptyText: {
    fontSize: 13,
    paddingVertical: 8,
  },
  groupHeader: {
    marginTop: 8,
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  pinnedSectionWrap: {
    marginTop: 4,
    marginBottom: 12,
  },
  pinnedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pinnedToggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  pinnedContent: {
    paddingTop: 10,
    paddingLeft: 12,
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarShell: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  profileName: {
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '700',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  dialog: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
  },
  dialogTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },
  dialogInput: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 14,
    gap: 10,
  },
  dialogGhostButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dialogGhostText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dialogPrimaryButton: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  disabledButton: {
    opacity: 0.5,
  },
  dialogPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
  },
  sheet: {
    alignSelf: 'center',
    width: '90%',
    borderRadius: 28,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderWidth: 1,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
  },
  sheetItem: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 13,
  },
  sheetItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sheetItemText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
