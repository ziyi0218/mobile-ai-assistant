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
      <View style={[styles.chatIcon, { backgroundColor: selected ? ui.iconSelectedBg : ui.iconBg }]}>
        {chat.pinned ? <Pin size={13} color={ui.warning} /> : <MessageSquare size={14} color={colors.subtext} />}
      </View>
      <Text
        numberOfLines={1}
        style={[styles.chatText, { color: colors.text }, selected && styles.chatTextSelected]}
      >
        {getChatTitle(chat, fallbackTitle)}
      </Text>
      <TouchableOpacity onPress={onOpenMenu} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <MoreHorizontal size={16} color={colors.subtext} />
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
  return (
    <View style={styles.folderRow}>
      <TouchableOpacity style={styles.folderMainAction} activeOpacity={0.75} onPress={onToggle}>
        {isExpanded ? <ChevronDown size={16} color={colors.subtext} /> : <ChevronRight size={16} color={colors.subtext} />}
        {isExpanded ? <FolderOpen size={16} color={ui.warning} /> : <FolderClosed size={16} color={ui.folderAccent} />}
        <Text numberOfLines={1} style={[styles.folderName, { color: colors.text }]}>
          {folder.name}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onOpenMenu} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <MoreHorizontal size={16} color={colors.subtext} />
      </TouchableOpacity>
    </View>
  );
}
