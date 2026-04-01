import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { FolderClosed, FolderOpen } from 'lucide-react-native';
import type { ChatFolder } from '../../types/api';
import {
  styles,
  type PromptState,
  type SidebarAction,
  type SidebarThemeColors,
  type SidebarUi,
} from './SidebarUtils';

export function SidebarPromptModal({
  state,
  onClose,
  colors,
  ui,
  cancelLabel,
}: {
  state: PromptState;
  onClose: () => void;
  colors: SidebarThemeColors;
  ui: SidebarUi;
  cancelLabel: string;
}) {
  const [value, setValue] = useState(state.value);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(state.value);
  }, [state.value, state.visible]);

  return (
    <Modal transparent visible={state.visible} animationType="fade">
      <View style={[styles.overlay, { backgroundColor: ui.overlay }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.dialog, { backgroundColor: ui.dialogBg, borderColor: colors.border }]}>
          <Text style={[styles.dialogTitle, { color: colors.text }]}>{state.title}</Text>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder={state.placeholder}
            placeholderTextColor={colors.subtext}
            style={[
              styles.dialogInput,
              { color: colors.text, backgroundColor: ui.dialogInputBg, borderColor: colors.border },
            ]}
            autoFocus
          />
          <View style={styles.dialogActions}>
            <TouchableOpacity onPress={onClose} style={styles.dialogGhostButton} activeOpacity={0.7}>
              <Text style={[styles.dialogGhostText, { color: colors.subtext }]}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.dialogPrimaryButton,
                { backgroundColor: ui.primary },
                !value.trim() && styles.disabledButton,
              ]}
              disabled={!value.trim() || saving}
              activeOpacity={0.8}
              onPress={async () => {
                if (!value.trim()) return;
                setSaving(true);
                try {
                  await state.onSubmit(value.trim());
                  onClose();
                } finally {
                  setSaving(false);
                }
              }}
            >
              <Text style={styles.dialogPrimaryText}>{saving ? '...' : state.confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function SidebarActionSheet({
  visible,
  title,
  actions,
  onClose,
  colors,
  ui,
}: {
  visible: boolean;
  title?: string;
  actions: SidebarAction[];
  onClose: () => void;
  colors: SidebarThemeColors;
  ui: SidebarUi;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={[styles.overlay, { backgroundColor: ui.overlay }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: ui.dialogBg, borderColor: colors.border }]}>
          {!!title && <Text style={[styles.sheetTitle, { color: colors.text }]}>{title}</Text>}
          {actions.map((action) => (
            <TouchableOpacity
              key={action.key}
              style={styles.sheetItem}
              activeOpacity={0.75}
              onPress={() => {
                onClose();
                setTimeout(action.onPress, 120);
              }}
            >
              <View style={styles.sheetItemLeft}>
                {action.icon}
                <Text
                  style={[
                    styles.sheetItemText,
                    { color: action.danger ? ui.danger : colors.text },
                    action.danger && styles.sheetItemDanger,
                  ]}
                >
                  {action.label}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
}

export function SidebarFolderPickerModal({
  visible,
  folders,
  onSelect,
  onClose,
  colors,
  ui,
  title,
  nullOptionLabel,
}: {
  visible: boolean;
  folders: ChatFolder[];
  onSelect: (folderId: string | null) => Promise<void> | void;
  onClose: () => void;
  colors: SidebarThemeColors;
  ui: SidebarUi;
  title: string;
  nullOptionLabel?: string;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: ui.overlay }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { maxHeight: 480, backgroundColor: ui.dialogBg, borderColor: colors.border }]}>
          <Text style={[styles.sheetTitle, { color: colors.text }]}>{title}</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {nullOptionLabel ? (
              <TouchableOpacity
                style={styles.sheetItem}
                activeOpacity={0.75}
                onPress={async () => {
                  await onSelect(null);
                }}
              >
                <View style={styles.sheetItemLeft}>
                  <FolderClosed size={18} color={ui.folderAccent} />
                  <Text style={[styles.sheetItemText, { color: colors.text }]}>{nullOptionLabel}</Text>
                </View>
              </TouchableOpacity>
            ) : null}

            {folders.map((folder) => (
              <TouchableOpacity
                key={folder.id}
                style={styles.sheetItem}
                activeOpacity={0.75}
                onPress={async () => {
                  await onSelect(folder.id);
                }}
              >
                <View style={styles.sheetItemLeft}>
                  <FolderOpen size={18} color={ui.warning} />
                  <Text style={[styles.sheetItemText, { color: colors.text }]}>{folder.name}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
