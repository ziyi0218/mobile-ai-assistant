import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Switch,
  Pressable,
  Alert,
  StyleSheet,
  Modal,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import { ChevronLeft, Pencil, Trash2 } from "lucide-react-native";
import { useRouter } from "expo-router";

import { useI18n } from "../i18n/useI18n";
import { useSettingsStore } from "../store/useSettingsStore";
import { useResolvedTheme } from "../utils/theme";
import { useUIScale } from "../hooks/useUIScale";
import { useHaptics } from "../hooks/useHaptics";
import {
  personnalizationService,
  type PersonalizationMemory,
} from "../services/personnalizationService";

type MemoryItem = PersonalizationMemory;

type ViewMode = "list" | "edit" | "confirmClear";

function formatCurrentDateTime() {
  const d = new Date();
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function extractUserName(detail: string) {
  const v = detail.trim();
  if (!v) return "Utilisateur";
  return v.length <= 28 ? v : v.slice(0, 28) + "…";
}

function ManageMemoryModal({
  visible,
  onClose,
  memories,
  setMemories,
}: {
  visible: boolean;
  onClose: () => void;
  memories: MemoryItem[];
  setMemories: React.Dispatch<React.SetStateAction<MemoryItem[]>>;
}) {
  const [mode, setMode] = useState<ViewMode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailText, setDetailText] = useState("");

  const { t } = useI18n();
  const { themeMode } = useSettingsStore();
  const { colors } = useResolvedTheme(themeMode);
  const scaled13 = useUIScale(13);
  const scaled14 = useUIScale(14);
  const scaled16 = useUIScale(16);
  const scaled18 = useUIScale(18);
  const scaled22 = useUIScale(22);
  const { haptics } = useHaptics();

  const isEditing = editingId !== null;

  const resetPanels = useCallback(() => {
    setMode("list");
    setEditingId(null);
    setDetailText("");
    Keyboard.dismiss();
  }, []);

  const closeAll = useCallback(() => {
    haptics("light");
    resetPanels();
    onClose();
  }, [haptics, onClose, resetPanels]);

  const openAdd = useCallback(() => {
    haptics("light");
    setEditingId(null);
    setDetailText("");
    setMode("edit");
  }, [haptics]);

  const openEdit = useCallback((memory: MemoryItem) => {
    haptics("light");
    setEditingId(memory.id);
    setDetailText(memory.detail);
    setMode("edit");
  }, [haptics]);

  const deleteOne = useCallback(
    (id: string) => {
      haptics("warning");
      setMemories((prev) => prev.filter((memory) => memory.id !== id));
    },
    [haptics, setMemories]
  );

  const askClearAll = useCallback(() => {
    haptics("warning");
    setMode("confirmClear");
  }, [haptics]);

  const clearAll = useCallback(() => {
    haptics("success");
    setMemories([]);
    resetPanels();
  }, [haptics, resetPanels, setMemories]);

  const upsertMemory = useCallback(() => {
    const trimmedValue = detailText.trim();
    if (!trimmedValue) return;
    haptics("success");

    setMemories((prev) => {
      if (editingId) {
        return prev.map((memory) =>
          memory.id === editingId
            ? {
                ...memory,
                userName: extractUserName(trimmedValue),
                detail: trimmedValue,
                updatedAt: formatCurrentDateTime(),
              }
            : memory
        );
      }

      return [
        ...prev,
        {
          id: `draft-${Date.now()}`,
          userId: null,
          userName: extractUserName(trimmedValue),
          detail: trimmedValue,
          updatedAt: formatCurrentDateTime(),
          createdAt: formatCurrentDateTime(),
        },
      ];
    });

    resetPanels();
  }, [detailText, editingId, haptics, resetPanels, setMemories]);

  const footer = useMemo(
    () => (
      <View style={styles.footerRow}>
        <Pressable
          style={[
            styles.secondaryActionButton,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={openAdd}
        >
          <Text style={[styles.secondaryActionText, { color: colors.text, fontSize: scaled16 }]}>
            {t("persoAddMemory")}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.dangerActionButton, { backgroundColor: colors.card }]}
          onPress={askClearAll}
        >
          <Text style={[styles.dangerActionText, { fontSize: scaled16 }]}>
            {t("persoClearMemory")}
          </Text>
        </Pressable>
      </View>
    ),
    [askClearAll, colors, openAdd, scaled16, t]
  );

  const renderItem = useCallback(
    ({ item }: { item: MemoryItem }) => (
      <View style={[styles.memoryRow, { borderColor: colors.border }]}>
        <View style={styles.nameColumnWrap}>
          <Text
            style={[styles.nameColumn, { color: colors.text, fontSize: scaled16 }]}
            numberOfLines={2}
          >
            {item.userName}
          </Text>
        </View>

        <View style={styles.rightZone}>
          <Text
            style={[styles.dateColumn, { color: colors.text, fontSize: scaled16 }]}
            numberOfLines={1}
          >
            {item.updatedAt}
          </Text>

          <Pressable onPress={() => openEdit(item)} style={styles.iconButton} hitSlop={8}>
            <Pencil size={scaled18} color={colors.text} />
          </Pressable>

          <Pressable onPress={() => deleteOne(item.id)} style={styles.iconButton} hitSlop={8}>
            <Trash2 size={scaled18} color={colors.text} />
          </Pressable>
        </View>
      </View>
    ),
    [colors, deleteOne, openEdit, scaled16, scaled18]
  );

  const showOverlay = mode !== "list";

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={closeAll}>
      <View style={styles.bottomOverlay}>
        <KeyboardAvoidingView
          style={[
            styles.sheet,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text, fontSize: scaled22 }]}>
              {t("persoMemoryTitle")}
            </Text>
            <Pressable onPress={closeAll} hitSlop={10}>
              <Text style={[styles.closeText, { color: colors.text, fontSize: scaled22 }]}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.columnHeaderRow}>
            <Text style={[styles.columnHeaderText, { color: colors.text, fontSize: scaled13 }]}>
              {t("persoUsernameColumn")}
            </Text>
            <Text style={[styles.columnHeaderDate, { color: colors.text, fontSize: scaled13 }]}>
              {t("persoUpdatedColumn")}
            </Text>
          </View>

          <FlatList
            data={memories}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={[
              styles.listContent,
              memories.length === 0 && styles.emptyListContent,
            ]}
            ListEmptyComponent={
              <Text
                style={[
                  styles.emptyText,
                  { color: colors.subtext, fontSize: scaled14, lineHeight: scaled14 * 1.43 },
                ]}
              >
                {t("persoEmptyState")}
              </Text>
            }
            ListFooterComponent={footer}
            keyboardShouldPersistTaps="handled"
          />

          {showOverlay && (
            <Pressable style={styles.overlayMask} onPress={Keyboard.dismiss}>
              <View />
            </Pressable>
          )}

          {mode === "edit" && (
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={styles.overlayCenterContainer}
            >
              <View
                style={[
                  styles.overlayCardCenter,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={styles.overlayHeaderRow}>
                  <Pressable onPress={() => { haptics("light"); resetPanels(); }} hitSlop={10}>
                    <Text style={[styles.overlayLink, { color: colors.text, fontSize: scaled14 }]}>
                      {t("cancel")}
                    </Text>
                  </Pressable>

                  <Pressable onPress={Keyboard.dismiss} hitSlop={10}>
                    <View />
                  </Pressable>

                  <Pressable onPress={upsertMemory} hitSlop={10}>
                    <Text
                      style={[styles.overlayPrimary, { color: colors.text, fontSize: scaled14 }]}
                    >
                      {isEditing ? t("persoSave") : t("persoAdd")}
                    </Text>
                  </Pressable>
                </View>

                <Text style={[styles.overlayTitle, { color: colors.text, fontSize: scaled18 }]}>
                  {isEditing ? t("persoEditMemory") : t("persoAddMemory")}
                </Text>

                <View style={[styles.inputZone, { borderColor: colors.border }]}>
                  <TextInput
                    value={detailText}
                    onChangeText={setDetailText}
                    placeholder={t("persoInputPlaceholder")}
                    placeholderTextColor={colors.subtext}
                    style={[styles.input, { color: colors.text, fontSize: scaled16 }]}
                    multiline
                    autoFocus
                  />
                </View>

                <View style={styles.hintRow}>
                  <Text style={[styles.hintIcon, { color: colors.subtext, fontSize: scaled14 }]}>
                    ⓘ
                  </Text>
                  <Text
                    style={[
                      styles.hintText,
                      { color: colors.subtext, fontSize: scaled13, lineHeight: scaled13 * 1.38 },
                    ]}
                  >
                    {t("persoInputHint")}
                  </Text>
                </View>
              </View>
            </KeyboardAvoidingView>
          )}

          {mode === "confirmClear" && (
            <View
              style={[
                styles.overlayCardBottom,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.overlayTitle, { color: colors.text, fontSize: scaled18 }]}>
                {t("persoClearMemory")}
              </Text>

              <Text
                style={[
                  styles.clearDescription,
                  { color: colors.subtext, fontSize: scaled14, lineHeight: scaled14 * 1.43 },
                ]}
              >
                {t("persoClearConfirmText")}
              </Text>

              <View style={styles.clearButtonsRow}>
                <Pressable
                  style={[styles.cancelClearButton, { backgroundColor: colors.border }]}
                  onPress={() => { haptics("light"); resetPanels(); }}
                >
                  <Text
                    style={[styles.cancelClearText, { color: colors.text, fontSize: scaled16 }]}
                  >
                    {t("cancel")}
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.confirmClearButton, { backgroundColor: colors.text }]}
                  onPress={clearAll}
                >
                  <Text
                    style={[styles.confirmClearText, { color: colors.bg, fontSize: scaled16 }]}
                  >
                    {t("persoConfirm")}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export default function PersonnalizationScreen() {
  const router = useRouter();
  const [savedMemoryEnabled, setSavedMemoryEnabled] = useState(false);
  const [draftMemoryEnabled, setDraftMemoryEnabled] = useState(false);
  const [isManageModalVisible, setIsManageModalVisible] = useState(false);
  const [savedMemories, setSavedMemories] = useState<MemoryItem[]>([]);
  const [draftMemories, setDraftMemories] = useState<MemoryItem[]>([]);
  const [isLoadingPersonalization, setIsLoadingPersonalization] = useState(true);
  const [isSavingPersonalization, setIsSavingPersonalization] = useState(false);

  const { t } = useI18n();
  const { themeMode } = useSettingsStore();
  const { colors } = useResolvedTheme(themeMode);
  const scaled14 = useUIScale(14);
  const scaled16 = useUIScale(16);
  const scaled20 = useUIScale(20);
  const scaled22 = useUIScale(22);
  const scaleFactor = useUIScale(1);
  const { haptics } = useHaptics();

  useEffect(() => {
    let isActive = true;

    const loadPersonalization = async () => {
      setIsLoadingPersonalization(true);

      try {
        const personalization = await personnalizationService.getPersonalization();

        if (!isActive) {
          return;
        }

        setSavedMemoryEnabled(personalization.memoryEnabled);
        setDraftMemoryEnabled(personalization.memoryEnabled);
        setSavedMemories(personalization.memories);
        setDraftMemories(personalization.memories);
      } catch {
        if (isActive) {
          Alert.alert(t("errorTitle"), t("persoLoadError"));
        }
      } finally {
        if (isActive) {
          setIsLoadingPersonalization(false);
        }
      }
    };

    loadPersonalization();

    return () => {
      isActive = false;
    };
  }, [t]);

  const isManageDisabled = !draftMemoryEnabled || isLoadingPersonalization || isSavingPersonalization;

  const handleSave = useCallback(async () => {
    setIsSavingPersonalization(true);

    try {
      const latest = await personnalizationService.updatePersonalization({
        memoryEnabled: draftMemoryEnabled,
        memories: draftMemories,
        previousMemories: savedMemories,
      });

      setSavedMemoryEnabled(latest.memoryEnabled);
      setDraftMemoryEnabled(latest.memoryEnabled);
      setSavedMemories(latest.memories);
      setDraftMemories(latest.memories);

      haptics("success");
      Alert.alert(t("persoSave"), t("persoSaveMessage"));
    } catch (error) {
      const message =
        error instanceof Error && error.message ? error.message : t("persoSaveError");
      Alert.alert(t("errorTitle"), t(message));
    } finally {
      setIsSavingPersonalization(false);
    }
  }, [draftMemories, draftMemoryEnabled, haptics, savedMemories, t]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              haptics("light");
              router.back();
            }}
            style={[
              styles.backButton,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                width: 40 * scaleFactor,
                height: 40 * scaleFactor,
                borderRadius: 20 * scaleFactor,
              },
            ]}
          >
            <ChevronLeft size={scaled22} color={colors.text} strokeWidth={2.5} />
          </Pressable>
        </View>

        <Text style={[styles.pageTitle, { color: colors.text, fontSize: scaled22 }]}>
          — {t("personalization")} —
        </Text>

        <View style={styles.content}>
          <View
            style={[
              styles.memoryCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={styles.titleGroup}>
                <Text style={[styles.title, { color: colors.text, fontSize: scaled20 }]}>
                  {t("persoMemoryTitle")}{" "}
                  <Text style={[styles.experimental, { color: colors.subtext }]}>
                    ({t("persoExperimental")})
                  </Text>
                </Text>

                <Text
                  style={[
                    styles.description,
                    { color: colors.subtext, fontSize: scaled14, lineHeight: scaled14 * 1.43 },
                  ]}
                >
                  {t("persoDescription")}
                </Text>
              </View>

              <Switch
                value={draftMemoryEnabled}
                onValueChange={(value) => {
                  haptics("light");
                  setDraftMemoryEnabled(value);
                }}
                disabled={isLoadingPersonalization || isSavingPersonalization}
                trackColor={{
                  false: colors.subtext,
                  true: colors.subaccent,
                }}
                thumbColor={draftMemoryEnabled ? colors.accent : colors.text}
                ios_backgroundColor={colors.subtext}
                style={{ transform: [{ scale: scaleFactor }] }}
              />
            </View>

            <Pressable
              style={[
                styles.manageButton,
                isManageDisabled && styles.disabledButton,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              disabled={isManageDisabled}
              onPress={() => {
                haptics("light");
                setIsManageModalVisible(true);
              }}
            >
              {isLoadingPersonalization ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <Text style={[styles.manageButtonText, { color: colors.text, fontSize: scaled16 }]}>
                  {t("persoManage")}
                </Text>
              )}
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Pressable
              style={[
                styles.saveButton,
                isSavingPersonalization && styles.disabledButton,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              disabled={isSavingPersonalization}
              onPress={handleSave}
            >
              {isSavingPersonalization ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <Text style={[styles.saveButtonText, { color: colors.text, fontSize: scaled16 }]}>
                  {t("persoSave")}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>

      <ManageMemoryModal
        visible={isManageModalVisible}
        onClose={() => setIsManageModalVisible(false)}
        memories={draftMemories}
        setMemories={setDraftMemories}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: 60,
  },
  header: {
    alignItems: "flex-start",
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
  },
  backButton: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  pageTitle: {
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 24,
    textAlign: "center",
  },
  memoryCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  titleGroup: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontWeight: "700",
  },
  experimental: {
    fontWeight: "600",
  },
  description: {
    marginTop: 8,
  },
  manageButton: {
    marginTop: 20,
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 1,
  },
  manageButtonText: {
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.4,
  },
  footer: {
    paddingBottom: 20,
    alignItems: "center",
  },
  saveButton: {
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 999,
    borderWidth: 1,
  },
  saveButtonText: {
    fontWeight: "700",
  },
  bottomOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    height: "90%",
    paddingTop: 22,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 14,
  },
  modalTitle: {
    fontWeight: "800",
  },
  closeText: {
  },
  columnHeaderRow: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 8,
  },
  columnHeaderText: {
    width: "38%",
    fontWeight: "800",
    opacity: 0.7,
  },
  columnHeaderDate: {
    flex: 1,
    fontWeight: "800",
    opacity: 0.7,
    textAlign: "right",
    paddingRight: 56,
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  emptyText: {
    paddingHorizontal: 24,
    textAlign: "center",
  },
  memoryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  nameColumnWrap: {
    width: "38%",
    paddingRight: 12,
  },
  nameColumn: {
  },
  rightZone: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  dateColumn: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
    opacity: 0.75,
    textAlign: "right",
  },
  iconButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 18,
    paddingBottom: 26,
    paddingHorizontal: 24,
  },
  secondaryActionButton: {
    marginRight: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 1,
  },
  secondaryActionText: {
    fontWeight: "800",
  },
  dangerActionButton: {
    marginLeft: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  dangerActionText: {
    fontWeight: "800",
    color: "#DC2626",
  },
  overlayMask: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.10)",
  },
  overlayCenterContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  overlayCardCenter: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
  },
  overlayCardBottom: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
  },
  overlayHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  overlayTitle: {
    marginBottom: 10,
    fontWeight: "800",
  },
  overlayLink: {
    fontWeight: "700",
    opacity: 0.75,
  },
  overlayPrimary: {
    fontWeight: "900",
  },
  inputZone: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  input: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 12,
  },
  hintIcon: {
    marginTop: 2,
    marginRight: 8,
  },
  hintText: {
    flex: 1,
  },
  clearDescription: {
    marginTop: 10,
  },
  clearButtonsRow: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cancelClearButton: {
    flex: 1,
    marginRight: 10,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelClearText: {
    fontWeight: "800",
  },
  confirmClearButton: {
    flex: 1,
    marginLeft: 10,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  confirmClearText: {
    fontWeight: "800",
  },
});
