import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import {
  ChevronDown,
  ChevronRight,
  FolderClosed,
  FolderOpen,
  MessageSquare,
  MoreHorizontal,
  Pin,
} from 'lucide-react-native';
import type { ChatFolder, ChatSummary } from '../../types/api';
import {
  getChatTitle,
  styles,
  type SidebarThemeColors,
  type SidebarUi,
} from './SidebarUtils';
import { useUIScale } from '../../hooks/useUIScale';

export function SidebarChatRow({
  chat,
  selected,
  onPress,
  onOpenMenu,
  colors,
  ui,
  fallbackTitle,
  indent = false,
}: {
  chat: ChatSummary;
  selected: boolean;
  onPress: () => void;
  onOpenMenu: () => void;
  colors: SidebarThemeColors;
  ui: SidebarUi;
  fallbackTitle: string;
  indent?: boolean;
}) {
  const scaled13 = useUIScale(13);
  const scaled14 = useUIScale(14);
  const scaled16 = useUIScale(16);
  const scaled28 = useUIScale(28);
  const scaled10 = useUIScale(10);

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      onLongPress={onOpenMenu}
      style={[
        styles.chatRow,
        indent && styles.chatRowIndented,
        {
          backgroundColor: selected ? ui.rowSelected : ui.rowBg,
          borderColor: selected ? ui.rowSelectedBorder : 'transparent',
        },
      ]}
    >
      <View
        style={[
          styles.chatIcon,
          {
            backgroundColor: selected ? ui.iconSelectedBg : ui.iconBg,
            width: scaled28,
            height: scaled28,
            borderRadius: scaled10,
          },
        ]}
      >
        {chat.pinned ? (
          <Pin size={scaled13} color={ui.warning} />
        ) : (
          <MessageSquare size={scaled14} color={colors.subtext} />
        )}
      </View>
      <Text
        numberOfLines={1}
        style={[styles.chatText, { color: colors.text, fontSize: scaled14 }, selected && styles.chatTextSelected]}
      >
        {getChatTitle(chat, fallbackTitle)}
      </Text>
      <TouchableOpacity onPress={onOpenMenu} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <MoreHorizontal size={scaled16} color={colors.subtext} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export function SidebarFolderRow({
  folder,
  isExpanded,
  onToggle,
  onOpenMenu,
  colors,
  ui,
}: {
  folder: ChatFolder;
  isExpanded: boolean;
  onToggle: () => void;
  onOpenMenu: () => void;
  colors: SidebarThemeColors;
  ui: SidebarUi;
}) {
  const scaled15 = useUIScale(15);
  const scaled16 = useUIScale(16);

  return (
    <View style={styles.folderRow}>
      <TouchableOpacity style={styles.folderMainAction} activeOpacity={0.75} onPress={onToggle}>
        {isExpanded ? (
          <ChevronDown size={scaled16} color={colors.subtext} />
        ) : (
          <ChevronRight size={scaled16} color={colors.subtext} />
        )}
        {isExpanded ? (
          <FolderOpen size={scaled16} color={ui.warning} />
        ) : (
          <FolderClosed size={scaled16} color={ui.folderAccent} />
        )}
        <Text numberOfLines={1} style={[styles.folderName, { color: colors.text, fontSize: scaled15 }]}>
          {folder.name}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onOpenMenu} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <MoreHorizontal size={scaled16} color={colors.subtext} />
      </TouchableOpacity>
    </View>
  );
}
