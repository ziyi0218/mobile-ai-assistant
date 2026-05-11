/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */

import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Pressable, Modal, Alert, Image } from 'react-native';
import {
  Menu,
  ChevronDown,
  Plus,
  User,
  Edit3,
  MoreVertical,
  Map,
  Share2,
  Download,
  Trash2,
  Sliders,
  CopyPlus,
  FileJson,
  FileText,
  FileType2,
  Link2,
  Link2Off,
  ExternalLink,
} from 'lucide-react-native';
import ModelSelector from './ModelSelector';
import Sidebar from './sidebar/Sidebar';
import ChatOverviewModal from './ChatOverviewModal';
import { useFocusEffect, useRouter } from 'expo-router';
import { TranslationKey } from '../i18n';
import { useChatStore } from '../store/chatStore';
import { chatService } from '../services/chatService';
import { compteService } from '../services/compteService';
import { useI18n } from '../i18n/useI18n';
import { useSettingsStore } from '../store/useSettingsStore';
import { useResolvedTheme } from '../utils/theme';
import { useUIScale } from '../hooks/useUIScale';
import { buildSidebarUi, type SidebarAction } from './sidebar/SidebarUtils';
import { SidebarActionSheet } from './sidebar/SidebarModals';
import {
  cloneChat,
  ensureShareLink,
  exportSingleChat,
  openCommunitySharePage,
  removeShareLink,
} from '../utils/chatActions';

interface HeaderProps {
  currentIndex: number;
  onOpenChatControls?: () => void;
  t: (key: TranslationKey) => string;
}

export default function Header({
  currentIndex,
  onOpenChatControls = () => { },
  t,
}: HeaderProps) {
  const [isSelectorVisible, setIsSelectorVisible] = useState(false);
  const [isSwitchSelectorVisible, setIsSwitchSelectorVisible] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [isMoreMenuVisible, setIsMoreMenuVisible] = useState(false);
  const [isExportMenuVisible, setIsExportMenuVisible] = useState(false);
  const [isOverviewVisible, setIsOverviewVisible] = useState(false);
  const [shareMenuState, setShareMenuState] = useState<{ visible: boolean; hasShareLink: boolean }>({
    visible: false,
    hasShareLink: false,
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const router = useRouter();
  const { i18n } = useI18n();
  const overviewLabel = i18n.language.startsWith('zh') ? '聊天总览' : t('chatOverview');
  const overviewOpenFirst = i18n.language.startsWith('zh')
    ? '请先打开一个对话。'
    : t('overviewOpenChatFirst');

  const activeModels = useChatStore((state) => state.activeModels);
  const addModel = useChatStore((state) => state.addModel);
  const switchModel = useChatStore((state) => state.switchModel);
  const startNewChat = useChatStore((state) => state.startNewChat);
  const deleteChat = useChatStore((state) => state.deleteChat);
  const currentChatId = useChatStore((state) => state.currentChatId);
  const history = useChatStore((state) => state.history);
  const pinnedChats = useChatStore((state) => state.pinnedChats);
  const fetchHistory = useChatStore((state) => state.fetchHistory);
  const setCurrentChatId = useChatStore((state) => state.setCurrentChatId);

  const handleDeleteChat = () => {
    Alert.alert(
      t('deleteChat'),
      t('deleteChatConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('deleteChat'),
          style: 'destructive',
          onPress: async () => {
            const currentChatId = useChatStore.getState().currentChatId;
            if (currentChatId) {
              await deleteChat(currentChatId);
            }
            startNewChat();
          },
        },
      ]
    );
  };

  const themeMode = useSettingsStore(state => state.themeMode);
  const { colors, resolved } = useResolvedTheme(themeMode);
  const ui = useMemo(() => buildSidebarUi(colors, resolved === 'dark'), [colors, resolved]);
  const scaled14 = useUIScale(14);
  const scaled17 = useUIScale(17);
  const scaled18 = useUIScale(18);
  const scaled19 = useUIScale(19);
  const scaled20 = useUIScale(20);
  const scaled24 = useUIScale(24);
  const scaled32 = useUIScale(32);
  const scaled36 = useUIScale(36);
  const scaledModelText = useUIScale(18);
  const scaledAvatarRadius = useUIScale(18);

  const handleMenuAction = (action: () => void) => {
    setIsMoreMenuVisible(false);
    setTimeout(() => action(), 600);
  };

  const handleSwitchModel = (newModel: string, vision?: boolean) => {
    switchModel(currentIndex, newModel);
    useChatStore.getState().setModelVision(newModel, vision ?? false);
  };

  const requireCurrentChat = useCallback(() => {
    if (currentChatId) return currentChatId;
    Alert.alert(t('chatActions'), t('overviewOpenChatFirst'));
    return null;
  }, [currentChatId, t]);

  const handleCloneChat = useCallback(async () => {
    const chatId = requireCurrentChat();
    if (!chatId) return;

    try {
      const cloned = await cloneChat(chatId, i18n.language);
      await fetchHistory();
      await setCurrentChatId(cloned.id);
    } catch (error) {
      console.error('Error cloning chat:', error);
      Alert.alert(t('cloneChat'), t('cloneChatFailed'));
    }
  }, [fetchHistory, i18n.language, requireCurrentChat, setCurrentChatId, t]);

  const handleExportChat = useCallback(
    async (format: 'json' | 'txt' | 'pdf') => {
      const chatId = requireCurrentChat();
      if (!chatId) return;

      try {
        await exportSingleChat(chatId, format);
      } catch (error) {
        console.error(`Error exporting chat as ${format}:`, error);
        Alert.alert(t('exportChat'), t('exportChatFailed').replace('{{format}}', format.toUpperCase()));
      }
    },
    [requireCurrentChat, t]
  );

  const handleOpenShareMenu = useCallback(async () => {
    const chatId = requireCurrentChat();
    if (!chatId) return;

    try {
      const details = await chatService.getChatDetails(chatId);
      setShareMenuState({ visible: true, hasShareLink: Boolean(details.share_id) });
    } catch (error) {
      console.error('Error loading share state:', error);
      setShareMenuState({ visible: true, hasShareLink: false });
    }
  }, [requireCurrentChat]);

  const handleCopyLink = useCallback(async () => {
    const chatId = requireCurrentChat();
    if (!chatId) return;

    try {
      const result = await ensureShareLink(chatId);
      setShareMenuState({ visible: false, hasShareLink: true });
      Alert.alert(t('shareChat'), result.reused ? t('shareLinkCopied') : t('shareLinkCreatedAndCopied'));
    } catch (error) {
      console.error('Error copying share link:', error);
      Alert.alert(t('shareChat'), t('shareLinkCopyFailed'));
    }
  }, [requireCurrentChat, t]);

  const handleDeleteShare = useCallback(async () => {
    const chatId = requireCurrentChat();
    if (!chatId) return;

    try {
      await removeShareLink(chatId);
      setShareMenuState({ visible: false, hasShareLink: false });
      Alert.alert(t('shareChat'), t('shareLinkDeleted'));
    } catch (error) {
      console.error('Error deleting share link:', error);
      Alert.alert(t('shareChat'), t('shareLinkDeleteFailed'));
    }
  }, [requireCurrentChat, t]);

  const handleOpenCommunity = useCallback(async () => {
    try {
      await openCommunitySharePage();
      setShareMenuState((prev) => ({ ...prev, visible: false }));
    } catch (error) {
      console.error('Error opening Open WebUI community:', error);
      Alert.alert(t('shareChat'), t('openWebUICommunityFailed'));
    }
  }, [t]);

  const handleOpenOverview = useCallback(() => {
    if (!currentChatId) {
      Alert.alert(overviewLabel, overviewOpenFirst);
      return;
    }

    setIsOverviewVisible(true);
  }, [currentChatId, overviewLabel, overviewOpenFirst]);

  const exportActions: SidebarAction[] = [
    {
      key: 'json',
      label: t('downloadJson'),
      icon: <FileJson size={scaled18} color={colors.text} />,
      onPress: () => handleExportChat('json'),
    },
    {
      key: 'txt',
      label: t('downloadTxt'),
      icon: <FileText size={scaled18} color={colors.text} />,
      onPress: () => handleExportChat('txt'),
    },
    {
      key: 'pdf',
      label: t('downloadPdf'),
      icon: <FileType2 size={scaled18} color={colors.text} />,
      onPress: () => handleExportChat('pdf'),
    },
  ];

  const shareActions: SidebarAction[] = [
    {
      key: 'copy-link',
      label: t('copyLink'),
      icon: <Link2 size={scaled18} color={colors.text} />,
      onPress: handleCopyLink,
    },
    {
      key: 'open-community',
      label: t('openWebUICommunity'),
      icon: <ExternalLink size={scaled18} color={colors.text} />,
      onPress: handleOpenCommunity,
    },
    ...(shareMenuState.hasShareLink
      ? [
          {
            key: 'delete-link',
            label: t('deleteLink'),
            danger: true,
            icon: <Link2Off size={scaled18} color={ui.danger} />,
            onPress: handleDeleteShare,
          },
        ]
      : []),
  ];

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadAvatar = async () => {
        try {
          const profile = await compteService.getProfile();

          if (isActive) {
            setAvatarUrl(profile.avatarUrl);
          }
        } catch {
          if (isActive) {
            setAvatarUrl(null);
          }
        }
      };

      loadAvatar();

      return () => {
        isActive = false;
      };
    }, [])
  );

  return (
    <View style={{ backgroundColor: colors.bg, borderBottomColor: colors.border, borderBottomWidth: 1 }} className="mt-2 pt-12 pb-2">
      <Sidebar
        visible={isSidebarVisible}
        onClose={() => setIsSidebarVisible(false)}
        t={t}
      />

      <ModelSelector
        visible={isSelectorVisible}
        onClose={() => setIsSelectorVisible(false)}
        onSelect={(name, vision) => {
          addModel(name);
          useChatStore.getState().setModelVision(name, vision ?? false);
        }}
        mode="add"
        t={t}
      />

      <ModelSelector
        visible={isSwitchSelectorVisible}
        onClose={() => setIsSwitchSelectorVisible(false)}
        onSelect={handleSwitchModel}
        mode="switch"
        t={t}
      />

      <Modal visible={isMoreMenuVisible} transparent animationType="fade">
        <View className="flex-1">
          <Pressable
            className="absolute top-0 left-0 right-0 bottom-0 bg-black/10"
            onPress={() => setIsMoreMenuVisible(false)}
          />

          <View
            className="absolute top-[100px] right-4 rounded-2xl py-1.5 px-1 w-[200px] shadow-lg shadow-black/10 border"
            style={{ elevation: 8, backgroundColor: colors.card, borderColor: colors.border }}
          >
            <TouchableOpacity
              onPress={() => handleMenuAction(onOpenChatControls)}
              activeOpacity={0.6}
              className="flex-row items-center py-3 px-[14px] rounded-[10px]"
            >
              <Sliders color={colors.subtext} size={scaled17} />
              <Text className="ml-3 font-medium" style={{ color: colors.text, fontSize: scaled14 }}>
                {t('chatControls')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleMenuAction(handleOpenOverview)}
              activeOpacity={0.6}
              className="flex-row items-center py-3 px-[14px] rounded-[10px]"
            >
              <Map color={colors.subtext} size={scaled17} />
              <Text className="ml-3 font-medium" style={{ color: colors.text, fontSize: scaled14 }}>
                {overviewLabel}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                handleMenuAction(() => {
                  void handleOpenShareMenu();
                })
              }
              activeOpacity={0.6}
              className="flex-row items-center py-3 px-[14px] rounded-[10px]"
            >
              <Share2 color={colors.subtext} size={scaled17} />
              <Text className="ml-3 font-medium" style={{ color: colors.text, fontSize: scaled14 }}>
                {t('share')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                handleMenuAction(() => {
                  setIsExportMenuVisible(true);
                })
              }
              activeOpacity={0.6}
              className="flex-row items-center py-3 px-[14px] rounded-[10px]"
            >
              <Download color={colors.subtext} size={scaled17} />
              <Text className="ml-3 font-medium" style={{ color: colors.text, fontSize: scaled14 }}>
                {t('download')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleMenuAction(() => { void handleCloneChat(); })}
              activeOpacity={0.6}
              className="flex-row items-center py-3 px-[14px] rounded-[10px]"
            >
              <CopyPlus color={colors.subtext} size={scaled17} />
              <Text className="ml-3 font-medium" style={{ color: colors.text, fontSize: scaled14 }}>
                {t('copy')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleMenuAction(handleDeleteChat)}
              activeOpacity={0.6}
              className="flex-row items-center py-3 px-[14px] rounded-[10px]"
            >
              <Trash2 color={ui.danger} size={scaled17} />
              <Text className="ml-3 font-medium" style={{ color: ui.danger, fontSize: scaled14 }}>
                {t('deleteChat')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <SidebarActionSheet
        visible={isExportMenuVisible}
        title={t('exportChat')}
        actions={exportActions}
        onClose={() => setIsExportMenuVisible(false)}
        colors={colors}
        ui={ui}
      />

      <SidebarActionSheet
        visible={shareMenuState.visible}
        title={t('shareChat')}
        actions={shareActions}
        onClose={() => setShareMenuState((prev) => ({ ...prev, visible: false }))}
        colors={colors}
        ui={ui}
      />

      <ChatOverviewModal
        visible={isOverviewVisible}
        chatId={currentChatId}
        onClose={() => setIsOverviewVisible(false)}
        t={t}
      />

      <View className="flex-row items-center justify-between px-4 overflow-hidden">
        <View className="flex-1 flex-row items-center min-w-0 mr-3">
          <TouchableOpacity onPress={() => setIsSidebarVisible(true)}>
            <Menu color={colors.text} size={scaled24} />
          </TouchableOpacity>

          <View className="ml-4 flex-1 min-w-0">
            <TouchableOpacity
              onPress={() => setIsSwitchSelectorVisible(true)}
              activeOpacity={0.6}
              className="flex-row items-center"
            >
              <Text className="font-bold" style={{ color: colors.text, flexShrink: 1, fontSize: scaledModelText }} numberOfLines={1}>
                {activeModels[currentIndex] || t('model')}
              </Text>
              <ChevronDown color={colors.subtext} size={scaled18} style={{ marginLeft: 4, flexShrink: 0 }} />
            </TouchableOpacity>
          </View>
        </View>

        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => setIsSelectorVisible(true)}
            disabled={activeModels.length >= 4}
            style={{ opacity: activeModels.length >= 4 ? 0.3 : 1 }}
          >
            <Plus color={colors.text} size={scaled24} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={startNewChat}
            activeOpacity={0.6}
            className="rounded-[10px] items-center justify-center"
            style={{ width: scaled32, height: scaled32 }}
          >
            <Edit3 color={colors.subtext} size={scaled19} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setIsMoreMenuVisible(true)}
            activeOpacity={0.6}
            className="rounded-[10px] items-center justify-center"
            style={{ width: scaled32, height: scaled32 }}
          >
            <MoreVertical color={colors.subtext} size={scaled19} />
          </TouchableOpacity>

          <Pressable
            onPress={() => router.push('/accountScreen')}
            className="items-center justify-center overflow-hidden"
            style={{
              width: scaled36,
              height: scaled36,
              borderRadius: scaledAvatarRadius,
              backgroundColor: colors.border,
            }}
          >
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : (
              <User color={colors.subtext} size={scaled20} />
            )}
          </Pressable>
        </View>
      </View>

      {activeModels.length > 1 && (
        <View className="flex-row justify-center gap-1 mt-2">
          {activeModels.map((_, i) => (
            <View
              key={i}
              className={`h-1 rounded-sm ${i === currentIndex ? 'w-4' : 'w-1'}`}
              style={{ backgroundColor: i === currentIndex ? colors.text : colors.border }}
            />
          ))}
        </View>
      )}
    </View>
  );
}
