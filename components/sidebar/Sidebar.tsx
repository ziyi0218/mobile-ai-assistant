import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Archive,
  ChevronDown,
  ChevronRight,
  FileText,
  FolderClosed,
  FolderOpen,
  FolderPlus,
  Pin,
  PinOff,
  Search,
  Settings,
  SquarePen,
  Trash2,
  User,
} from 'lucide-react-native';
import { compteService } from '../../services/compteService';
import { chatService } from '../../services/chatService';
import { useChatStore } from '../../store/chatStore';
import type { ChatFolder, ChatSummary } from '../../types/api';
import { TranslationKey } from '../../i18n';
import { useI18n } from '../../i18n/useI18n';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useResolvedTheme } from '../../utils/theme';
import {
  buildSidebarUi,
  emptyPromptState,
  filterChats,
  getChatFolderId,
  getChatTitle,
  groupChatsByUpdatedAt,
  getSortedFolders,
  getVisibleFolders,
  styles,
  type ChatMenuState,
  type FolderMenuState,
  type PromptState,
} from './SidebarUtils';
import {
  SidebarActionSheet,
  SidebarFolderPickerModal,
  SidebarPromptModal,
} from './SidebarModals';
import { SidebarChatRow, SidebarFolderRow } from './SidebarRow';

const SIDEBAR_WIDTH = Dimensions.get('window').width * 0.82;

export default function Sidebar({
  visible,
  onClose,
  t = (k: string) => k,
}: {
  visible: boolean;
  onClose: () => void;
  t?: (key: TranslationKey) => string;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const searchInputRef = useRef<TextInput>(null);
  const animValue = useRef(new Animated.Value(0)).current;
  const themeMode = useSettingsStore((state) => state.themeMode);
  const { i18n } = useI18n();
  const { colors, resolved } = useResolvedTheme(themeMode);
  const ui = useMemo(() => buildSidebarUi(colors, resolved === 'dark'), [colors, resolved]);

  const history = useChatStore((state) => state.history);
  const folders = useChatStore((state) => state.folders);
  const refreshSidebarData = useChatStore((state) => state.refreshSidebarData);
  const startNewChat = useChatStore((state) => state.startNewChat);
  const currentChatId = useChatStore((state) => state.currentChatId);
  const setCurrentChatId = useChatStore((state) => state.setCurrentChatId);
  const toggleArchiveChat = useChatStore((state) => state.toggleArchiveChat);
  const renameChat = useChatStore((state) => state.renameChat);
  const moveChatToFolder = useChatStore((state) => state.moveChatToFolder);
  const togglePinChat = useChatStore((state) => state.togglePinChat);
  const deleteChat = useChatStore((state) => state.deleteChat);
  const createFolder = useChatStore((state) => state.createFolder);
  const renameFolder = useChatStore((state) => state.renameFolder);
  const deleteFolder = useChatStore((state) => state.deleteFolder);

  const [loading, setLoading] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [foldersSectionExpanded, setFoldersSectionExpanded] = useState(true);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set());
  const [folderChatsById, setFolderChatsById] = useState<Record<string, ChatSummary[]>>({});
  const [folderChatsLoading, setFolderChatsLoading] = useState<Record<string, boolean>>({});
  const [folderOverrideByChatId, setFolderOverrideByChatId] = useState<Record<string, string | null>>({});
  const [promptState, setPromptState] = useState<PromptState>(emptyPromptState);
  const [chatMenu, setChatMenu] = useState<ChatMenuState>({ visible: false, chat: null });
  const [folderMenu, setFolderMenu] = useState<FolderMenuState>({ visible: false, folder: null });
  const [folderPickerChat, setFolderPickerChat] = useState<ChatSummary | null>(null);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      Animated.spring(animValue, {
        toValue: 1,
        damping: 22,
        stiffness: 200,
        mass: 0.8,
        useNativeDriver: true,
      }).start();
    } else if (shouldRender) {
      Animated.timing(animValue, {
        toValue: 0,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setShouldRender(false);
      });
    }
  }, [animValue, shouldRender, visible]);

  useEffect(() => {
    if (!visible) return;

    const load = async () => {
      setLoading(true);
      try {
        await refreshSidebarData();
        setFolderChatsById({});
        setFolderChatsLoading({});
        setFolderOverrideByChatId({});
        const profile = await compteService.getProfile();
        setAvatarUrl(profile.avatarUrl);
        setDisplayName(profile.username || '');
      } catch {
        setAvatarUrl(null);
        setDisplayName('');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [visible, refreshSidebarData]);

  useEffect(() => {
    setExpandedFolderIds((prev) => {
      if (prev.size > 0) return prev;
      const next = new Set<string>();
      folders.forEach((folder) => {
        if (folder.expanded !== false) next.add(folder.id);
      });
      return next;
    });
  }, [folders]);

  const noTitle = t('noTitle');
  const cancelLabel = t('cancel');
  const query = searchQuery.trim().toLowerCase();
  const sortedFolders = useMemo(() => getSortedFolders(folders), [folders]);
  const folderChatMap = useMemo(() => {
    const map = new Map<string | null, ChatSummary[]>();
    Object.entries(folderChatsById).forEach(([folderId, chats]) => {
      map.set(folderId, chats);
    });
    return map;
  }, [folderChatsById]);
  const visibleFolders = useMemo(
    () => getVisibleFolders(sortedFolders, folderChatMap, query, noTitle),
    [sortedFolders, folderChatMap, query, noTitle]
  );
  const knownFolderChatIds = useMemo(
    () => new Set(Object.values(folderChatsById).flat().map((chat) => chat.id)),
    [folderChatsById]
  );
  const getEffectiveChatFolderId = useCallback(
    (chat: ChatSummary) =>
      Object.prototype.hasOwnProperty.call(folderOverrideByChatId, chat.id)
        ? folderOverrideByChatId[chat.id] ?? null
        : getChatFolderId(chat),
    [folderOverrideByChatId]
  );
  const pinnedChats = useMemo(
    () => history.filter((chat) => chat.pinned && filterChats(chat, query, noTitle)),
    [history, query, noTitle]
  );
  const rootChats = useMemo(
    () =>
      history.filter(
        (chat) =>
          !chat.pinned &&
          filterChats(chat, query, noTitle) &&
          getEffectiveChatFolderId(chat) === null &&
          !knownFolderChatIds.has(chat.id)
      ),
    [history, query, noTitle, getEffectiveChatFolderId, knownFolderChatIds]
  );
  const recentChatGroups = useMemo(
    () => groupChatsByUpdatedAt(rootChats, i18n.language, t),
    [rootChats, i18n.language, t]
  );

  const loadFolderChats = useCallback(async (folderId: string, force = false) => {
    if (!force && folderChatsById[folderId] !== undefined) return;

    setFolderChatsLoading((prev) => ({ ...prev, [folderId]: true }));
    try {
      const list = await chatService.getChatsByFolder(folderId, 1);
      const folder = folders.find((item) => item.id === folderId) ?? null;
      const normalized = (Array.isArray(list) ? list : []).map((chat) => ({
        ...chat,
        folder_id: folderId,
        folder,
      }));
      setFolderChatsById((prev) => ({ ...prev, [folderId]: normalized }));
    } catch (error) {
      console.error('Erreur chats folder:', error);
      setFolderChatsById((prev) => ({ ...prev, [folderId]: [] }));
    } finally {
      setFolderChatsLoading((prev) => ({ ...prev, [folderId]: false }));
    }
  }, [folderChatsById, folders]);

  useEffect(() => {
    if (!visible) return;

    const expandedFolders = sortedFolders.filter((folder) => expandedFolderIds.has(folder.id));
    expandedFolders.forEach((folder) => {
      if (folderChatsById[folder.id] === undefined && !folderChatsLoading[folder.id]) {
        loadFolderChats(folder.id);
      }
    });
  }, [visible, sortedFolders, expandedFolderIds, folderChatsById, folderChatsLoading, loadFolderChats]);

  const openPrompt = (config: Omit<PromptState, 'visible'>) => {
    setPromptState({ ...config, visible: true });
  };

  const handleSelectChat = (chatId: string) => {
    setCurrentChatId(chatId);
    onClose();
  };

  const handleToggleFolder = async (folder: ChatFolder) => {
    const nextExpanded = !expandedFolderIds.has(folder.id);
    setExpandedFolderIds((prev) => {
      const next = new Set(prev);
      if (nextExpanded) next.add(folder.id);
      else next.delete(folder.id);
      return next;
    });

    if (nextExpanded) {
      await loadFolderChats(folder.id, true);
    }
  };

  const syncLocalChatFolderMove = useCallback(
    (chat: ChatSummary, folderId: string | null) => {
      setFolderOverrideByChatId((prev) => ({ ...prev, [chat.id]: folderId }));

      setFolderChatsById((prev) => {
        const next: Record<string, ChatSummary[]> = {};
        let movedChat: ChatSummary | null = null;

        Object.entries(prev).forEach(([existingFolderId, chats]) => {
          const remaining = chats.filter((item) => {
            const keep = item.id !== chat.id;
            if (!keep && !movedChat) movedChat = item;
            return keep;
          });
          next[existingFolderId] = remaining;
        });

        if (folderId && next[folderId] !== undefined) {
          const folder = folders.find((item) => item.id === folderId) ?? null;
          const updatedChat: ChatSummary = {
            ...(movedChat ?? chat),
            folder_id: folderId,
            folder,
          };
          next[folderId] = [updatedChat, ...next[folderId].filter((item) => item.id !== chat.id)];
        }

        return next;
      });
    },
    [folders]
  );

  const chatMenuActions = chatMenu.chat
    ? [
        {
          key: 'rename',
          label: t('sidebarRename'),
          icon: <SquarePen size={18} color={colors.text} />,
          onPress: () =>
            openPrompt({
              title: t('sidebarRenameChat'),
              placeholder: noTitle,
              confirmLabel: t('sidebarSave'),
              value: chatMenu.chat?.title ?? '',
              onSubmit: async (value) => {
                await renameChat(chatMenu.chat!.id, value);
              },
            }),
        },
        {
          key: 'move',
          label: t('sidebarMoveToFolder'),
          icon: <FolderOpen size={18} color={ui.warning} />,
          onPress: () => setFolderPickerChat(chatMenu.chat),
        },
        ...(getEffectiveChatFolderId(chatMenu.chat)
          ? [
              {
                key: 'remove-from-folder',
                label: t('sidebarRemoveFromFolder'),
                icon: <FolderClosed size={18} color={colors.text} />,
                onPress: async () => {
                  await moveChatToFolder(chatMenu.chat!.id, null);
                  syncLocalChatFolderMove(chatMenu.chat!, null);
                },
              },
            ]
          : []),
        {
          key: 'archive',
          label: t('sidebarArchive'),
          icon: <Archive size={18} color={colors.text} />,
          onPress: async () => {
            await toggleArchiveChat(chatMenu.chat!.id);
          },
        },
        {
          key: 'pin',
          label: chatMenu.chat.pinned ? t('sidebarUnpin') : t('sidebarPinToTop'),
          icon: chatMenu.chat.pinned ? <PinOff size={18} color={colors.text} /> : <Pin size={18} color={ui.warning} />,
          onPress: async () => {
            await togglePinChat(chatMenu.chat!.id);
          },
        },
        {
          key: 'delete',
          label: t('sidebarDelete'),
          danger: true,
          icon: <Trash2 size={18} color={ui.danger} />,
          onPress: async () => {
            await deleteChat(chatMenu.chat!.id);
          },
        },
      ]
    : [];

  const folderMenuActions = folderMenu.folder
    ? [
        {
          key: 'rename',
          label: t('sidebarRenameFolder'),
          icon: <SquarePen size={18} color={colors.text} />,
          onPress: () =>
            openPrompt({
              title: t('sidebarRenameFolder'),
              placeholder: t('sidebarFolderName'),
              confirmLabel: t('sidebarSave'),
              value: folderMenu.folder?.name ?? '',
              onSubmit: async (value) => {
                await renameFolder(folderMenu.folder!.id, value);
              },
            }),
        },
        {
          key: 'delete',
          label: t('sidebarDeleteFolder'),
          danger: true,
          icon: <Trash2 size={18} color={ui.danger} />,
          onPress: async () => {
            await deleteFolder(folderMenu.folder!.id);
          },
        },
      ]
    : [];

  const handleOpenSettings = useCallback(() => {
    onClose();
    setTimeout(() => {
      router.push('/accountScreen');
    }, 300);
  }, [onClose, router]);

  const overlayOpacity = animValue;
  const drawerTranslateX = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-SIDEBAR_WIDTH, 0],
  });

  if (!shouldRender && !visible) return null;

  return (
    <Modal visible={shouldRender || visible} transparent animationType="none" statusBarTranslucent>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View
            style={[
              styles.backdrop,
              {
                backgroundColor: ui.overlay,
                opacity: overlayOpacity,
              },
            ]}
          />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.container,
            {
              top: insets.top,
              width: SIDEBAR_WIDTH,
              paddingBottom: Math.max(insets.bottom, 14),
              backgroundColor: ui.sidebarBg,
              transform: [{ translateX: drawerTranslateX }],
            },
          ]}
        >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={async () => {
              await startNewChat();
              onClose();
            }}
            activeOpacity={0.85}
            style={[styles.newChatButton, { backgroundColor: ui.newChatBg, borderColor: 'transparent' }]}
          >
            <SquarePen size={17} color={ui.newChatText} />
            <Text style={[styles.newChatText, { color: ui.newChatText }]}>{t('newChatSidebar')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchWrap}>
          <View style={[styles.searchBox, { backgroundColor: ui.softBg, borderColor: colors.border }]}>
            <Search size={17} color={colors.subtext} />
            <TextInput
              ref={searchInputRef}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('searchConversations')}
              placeholderTextColor={colors.subtext}
              style={[styles.searchInput, { color: colors.text }]}
              autoCapitalize="none"
            />
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity activeOpacity={0.6} style={styles.notesRow}>
            <View style={[styles.notesIconShell, { backgroundColor: ui.iconBg }]}>
              <FileText size={16} color={colors.subtext} />
            </View>
            <Text style={[styles.notesText, { color: colors.text }]}>{t('notes')}</Text>
          </TouchableOpacity>

          <View style={[styles.separator, { backgroundColor: ui.separator }]} />

          <View style={styles.sectionHeader}>
            <TouchableOpacity
              activeOpacity={0.75}
              style={styles.sectionHeaderMain}
              onPress={() => setFoldersSectionExpanded((prev) => !prev)}
            >
              {foldersSectionExpanded ? (
                <ChevronDown size={14} color={colors.subtext} style={styles.sectionChevron} />
              ) : (
                <ChevronRight size={14} color={colors.subtext} style={styles.sectionChevron} />
              )}
              <Text style={[styles.sectionTitle, { color: colors.subtext }]}>{t('folders')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.75}
              style={[styles.addFolderButton, { backgroundColor: ui.softBg, borderColor: colors.border }]}
              onPress={() =>
                openPrompt({
                  title: t('sidebarCreateFolder'),
                  placeholder: t('sidebarFolderName'),
                  confirmLabel: t('sidebarCreate'),
                  value: '',
                  onSubmit: async (value) => {
                    await createFolder(value);
                  },
                })
              }
            >
              <FolderPlus size={12} color={colors.subtext} />
              <Text style={[styles.addFolderText, { color: colors.subtext }]}>{t('addFolder')}</Text>
            </TouchableOpacity>
          </View>

          {foldersSectionExpanded && (
            visibleFolders.length > 0 ? (
              visibleFolders.map((folder) => (
                <View key={folder.id}>
                  <SidebarFolderRow
                    folder={folder}
                    isExpanded={expandedFolderIds.has(folder.id)}
                    onToggle={() => handleToggleFolder(folder)}
                    onOpenMenu={() => setFolderMenu({ visible: true, folder })}
                    colors={colors}
                    ui={ui}
                  />

                  {expandedFolderIds.has(folder.id) && (
                    <>
                      {(folderChatMap.get(folder.id) ?? [])
                        .filter((chat) => filterChats(chat, query, noTitle))
                        .map((chat) => (
                        <SidebarChatRow
                          key={chat.id}
                          chat={chat}
                          selected={currentChatId === chat.id}
                          onPress={() => handleSelectChat(chat.id)}
                          onOpenMenu={() => setChatMenu({ visible: true, chat })}
                          colors={colors}
                          ui={ui}
                          fallbackTitle={noTitle}
                          indent
                        />
                      ))}
                      {folderChatsLoading[folder.id] && (
                        <ActivityIndicator
                          size="small"
                          color={colors.subtext}
                          style={{ marginLeft: 24, marginVertical: 8 }}
                        />
                      )}
                    </>
                  )}
                </View>
              ))
            ) : (
              <Text style={[styles.emptyText, { color: colors.subtext }]}>{t('sidebarNoFoldersYet')}</Text>
            )
          )}

          <View style={[styles.separator, { backgroundColor: ui.separator }]} />

          {pinnedChats.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.subtext }]}>{t('sidebarPinned')}</Text>
              </View>
              {pinnedChats.map((chat) => (
                <SidebarChatRow
                  key={chat.id}
                  chat={chat}
                  selected={currentChatId === chat.id}
                  onPress={() => handleSelectChat(chat.id)}
                  onOpenMenu={() => setChatMenu({ visible: true, chat })}
                  colors={colors}
                  ui={ui}
                  fallbackTitle={noTitle}
                />
              ))}
              <View style={[styles.separator, { backgroundColor: ui.separator }]} />
            </>
          )}

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.subtext }]}>{t('recentChats')}</Text>
            {loading && <ActivityIndicator size="small" color={colors.subtext} />}
          </View>

          {recentChatGroups.length > 0 ? (
            recentChatGroups.map((group) => (
              <View key={group.label}>
                <View style={styles.groupHeader}>
                  <Text style={[styles.groupTitle, { color: colors.subtext }]}>{group.label}</Text>
                </View>
                {group.items.map((chat) => (
                  <SidebarChatRow
                    key={chat.id}
                    chat={chat}
                    selected={currentChatId === chat.id}
                    onPress={() => handleSelectChat(chat.id)}
                    onOpenMenu={() => setChatMenu({ visible: true, chat })}
                    colors={colors}
                    ui={ui}
                    fallbackTitle={noTitle}
                  />
                ))}
              </View>
            ))
          ) : (
            <Text style={[styles.emptyText, { color: colors.subtext }]}>
              {query ? t('sidebarNoMatchingChats') : t('sidebarNoChatsYet')}
            </Text>
          )}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: ui.separator, backgroundColor: ui.sidebarBg }]}>
          <View style={styles.profileRow}>
            <View style={[styles.avatarShell, { backgroundColor: ui.iconBg }]}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} resizeMode="cover" />
              ) : (
                <User size={17} color={colors.subtext} />
              )}
            </View>
            <Text style={[styles.profileName, { color: colors.text }]}>{displayName || 'User'}</Text>
          </View>
          <TouchableOpacity
            onPress={handleOpenSettings}
            activeOpacity={0.6}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Settings size={19} color={colors.subtext} />
          </TouchableOpacity>
        </View>
        </Animated.View>
      </View>

      <SidebarPromptModal
        state={promptState}
        onClose={() => setPromptState(emptyPromptState)}
        colors={colors}
        ui={ui}
        cancelLabel={cancelLabel}
      />

      <SidebarActionSheet
        visible={chatMenu.visible}
        title={chatMenu.chat ? getChatTitle(chatMenu.chat, noTitle) : undefined}
        actions={chatMenuActions}
        onClose={() => setChatMenu({ visible: false, chat: null })}
        colors={colors}
        ui={ui}
      />

      <SidebarActionSheet
        visible={folderMenu.visible}
        title={folderMenu.folder?.name}
        actions={folderMenuActions}
        onClose={() => setFolderMenu({ visible: false, folder: null })}
        colors={colors}
        ui={ui}
      />

      <SidebarFolderPickerModal
        visible={folderPickerChat !== null}
        folders={sortedFolders}
        colors={colors}
        ui={ui}
        title={t('sidebarMoveToFolder')}
        nullOptionLabel={folderPickerChat && getEffectiveChatFolderId(folderPickerChat) ? t('sidebarRemoveFromFolder') : undefined}
        onClose={() => setFolderPickerChat(null)}
        onSelect={async (folderId) => {
          if (!folderPickerChat) return;
          await moveChatToFolder(folderPickerChat.id, folderId);
          syncLocalChatFolderMove(folderPickerChat, folderId);
          if (folderId && expandedFolderIds.has(folderId)) {
            await loadFolderChats(folderId, true);
          }
          setFolderPickerChat(null);
        }}
      />
    </Modal>
  );
}
