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
import { useUIScale } from '../../hooks/useUIScale';
import { useHaptics } from '../../hooks/useHaptics';

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
  const scaled14 = useUIScale(14);
  const scaled15 = useUIScale(15);
  const scaled17 = useUIScale(17);
  const { haptics } = useHaptics();

  useEffect(() => {
    setValue(state.value);
  }, [state.value, state.visible]);

  return (
    <Modal transparent visible={state.visible} animationType="fade">
      <View style={[styles.overlay, { backgroundColor: ui.overlay }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => { haptics('light'); onClose(); }} />
        <View style={[styles.dialog, { backgroundColor: ui.dialogBg, borderColor: colors.border }]}>
          <Text style={[styles.dialogTitle, { color: colors.text, fontSize: scaled17 }]}>{state.title}</Text>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder={state.placeholder}
            placeholderTextColor={colors.subtext}
            style={[
              styles.dialogInput,
              {
                color: colors.text,
                backgroundColor: ui.dialogInputBg,
                borderColor: colors.border,
                fontSize: scaled15,
              },
            ]}
            autoFocus
          />
          <View style={styles.dialogActions}>
            <TouchableOpacity onPress={() => { haptics('light'); onClose(); }} style={styles.dialogGhostButton} activeOpacity={0.7}>
              <Text style={[styles.dialogGhostText, { color: colors.subtext, fontSize: scaled14 }]}>
                {cancelLabel}
              </Text>
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
                  haptics('success');
                  onClose();
                } finally {
                  setSaving(false);
                }
              }}
            >
              <Text style={[styles.dialogPrimaryText, { color: colors.bg, fontSize: scaled14 }]}>
                {saving ? '...' : state.confirmLabel}
              </Text>
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
  const scaled15 = useUIScale(15);
  const scaled16 = useUIScale(16);
  const { haptics } = useHaptics();

  return (
    <Modal transparent visible={visible} animationType="none">
      <View style={[styles.overlay, { backgroundColor: ui.overlay }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => { haptics('light'); onClose(); }} />
        <View style={[styles.sheet, { backgroundColor: ui.dialogBg, borderColor: colors.border }]}>
          {!!title && <Text style={[styles.sheetTitle, { color: colors.text, fontSize: scaled16 }]}>{title}</Text>}
          {actions.map((action) => (
            <TouchableOpacity
              key={action.key}
              style={styles.sheetItem}
              activeOpacity={0.75}
              onPress={() => {
                haptics(action.danger ? 'warning' : 'light');
                onClose();
                requestAnimationFrame(() => {
                  requestAnimationFrame(() => {
                    void action.onPress();
                  });
                });
              }}
            >
              <View style={styles.sheetItemLeft}>
                {action.icon}
                <Text
                  style={[
                    styles.sheetItemText,
                    { color: action.danger ? ui.danger : colors.text, fontSize: scaled15 },
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
  const scaled15 = useUIScale(15);
  const scaled16 = useUIScale(16);
  const scaled18 = useUIScale(18);
  const { haptics } = useHaptics();

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: ui.overlay }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => { haptics('light'); onClose(); }} />
        <View style={[styles.sheet, { maxHeight: 480, backgroundColor: ui.dialogBg, borderColor: colors.border }]}>
          <Text style={[styles.sheetTitle, { color: colors.text, fontSize: scaled16 }]}>{title}</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {nullOptionLabel ? (
              <TouchableOpacity
                style={styles.sheetItem}
                activeOpacity={0.75}
                onPress={async () => {
                  haptics('light');
                  await onSelect(null);
                }}
              >
                <View style={styles.sheetItemLeft}>
                  <FolderClosed size={scaled18} color={ui.folderAccent} />
                  <Text style={[styles.sheetItemText, { color: colors.text, fontSize: scaled15 }]}>
                    {nullOptionLabel}
                  </Text>
                </View>
              </TouchableOpacity>
            ) : null}

            {folders.map((folder) => (
              <TouchableOpacity
                key={folder.id}
                style={styles.sheetItem}
                activeOpacity={0.75}
                onPress={async () => {
                  haptics('light');
                  await onSelect(folder.id);
                }}
              >
                <View style={styles.sheetItemLeft}>
                  <FolderOpen size={scaled18} color={ui.warning} />
                  <Text style={[styles.sheetItemText, { color: colors.text, fontSize: scaled15 }]}>{folder.name}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
