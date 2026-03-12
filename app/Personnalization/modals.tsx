import React, { useCallback, useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { Pencil, Trash2 } from "lucide-react-native";
import { createStyles } from "./styles";
import type { Memoire } from "./utils";
import { extraireNomUtilisateur, formatNowFR } from "./utils";
import { useI18n } from "../../i18n/useI18n";
import { useSettingsStore } from "../../store/useSettingsStore";
import { useResolvedTheme } from "../../utils/theme";

type Mode = "list" | "edit" | "confirmClear";

export function GestionMemoireModal({
  visible,
  onClose,
  memoires,
  setMemoires,
}: {
  visible: boolean;
  onClose: () => void;
  memoires: Memoire[];
  setMemoires: React.Dispatch<React.SetStateAction<Memoire[]>>;
}) {
  const [mode, setMode] = useState<Mode>("list");
  const [idEdition, setIdEdition] = useState<string | null>(null);
  const [texteDetail, setTexteDetail] = useState("");

  const { t } = useI18n();
  const { themeMode } = useSettingsStore();
  const { colors } = useResolvedTheme(themeMode);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const isEditing = idEdition !== null;

  const resetPanels = useCallback(() => {
    setMode("list");
    setIdEdition(null);
    setTexteDetail("");
    Keyboard.dismiss();
  }, []);

  const closeAll = useCallback(() => {
    resetPanels();
    onClose();
  }, [resetPanels, onClose]);

  const openAdd = useCallback(() => {
    setIdEdition(null);
    setTexteDetail("");
    setMode("edit");
  }, []);

  const openEdit = useCallback((m: Memoire) => {
    setIdEdition(m.id);
    setTexteDetail(m.detail);
    setMode("edit");
  }, []);

  const deleteOne = useCallback(
    (id: string) => {
      setMemoires((prev) => prev.filter((m) => m.id !== id));
    },
    [setMemoires]
  );

  const askClearAll = useCallback(() => {
    setMode("confirmClear");
  }, []);

  const clearAll = useCallback(() => {
    setMemoires([]);
    resetPanels();
  }, [setMemoires, resetPanels]);

  const upsert = useCallback(() => {
    const v = texteDetail.trim();
    if (!v) return;

    const payload = {
      nomUtilisateur: extraireNomUtilisateur(v),
      detail: v,
      derniereModification: formatNowFR(),
    };

    setMemoires((prev) => {
      if (idEdition) {
        return prev.map((m) => (m.id === idEdition ? { ...m, ...payload } : m));
      }
      return [...prev, { id: Date.now().toString(), ...payload }];
    });

    resetPanels();
  }, [texteDetail, idEdition, setMemoires, resetPanels]);

  const footer = useMemo(
    () => (
      <View style={styles.piedGestionInline}>
        <Pressable style={styles.boutonAjouterSouvenir} onPress={openAdd}>
          <Text style={styles.texteAjouterSouvenir}>{t("persoAddMemory")}</Text>
        </Pressable>

        <Pressable style={styles.boutonEffacerMemoire} onPress={askClearAll}>
          <Text style={styles.texteEffacerMemoire}>{t("persoClearMemory")}</Text>
        </Pressable>
      </View>
    ),
    [openAdd, askClearAll, styles, t]
  );

  const renderItem = useCallback(
    ({ item }: { item: Memoire }) => (
      <View style={styles.ligneMemoire}>
        <Text style={styles.colonneNomValeur} numberOfLines={2}>
          {item.nomUtilisateur}
        </Text>

        <View style={styles.zoneDroite}>
          <Text style={styles.colonneDateValeur} numberOfLines={1}>
            {item.derniereModification}
          </Text>

          <Pressable onPress={() => openEdit(item)} style={styles.iconeBtn} hitSlop={8}>
            <Pencil size={18} color={colors.text} />
          </Pressable>

          <Pressable onPress={() => deleteOne(item.id)} style={styles.iconeBtn} hitSlop={8}>
            <Trash2 size={18} color={colors.text} />
          </Pressable>
        </View>
      </View>
    ),
    [openEdit, deleteOne, styles, colors]
  );

  const showOverlay = mode !== "list";

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={closeAll}>
      <View style={styles.superpositionBas}>
        <KeyboardAvoidingView
          style={styles.conteneurGestion}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.titreGestion}>{t("persoMemoryTitle")}</Text>
            <Pressable onPress={closeAll} hitSlop={10}>
              <Text style={styles.fermer}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.ligneColonnes}>
            <Text style={styles.colonneNomTitre}>{t("persoUsernameColumn")}</Text>
            <Text style={styles.colonneDateTitre}>{t("persoUpdatedColumn")}</Text>
          </View>

          <FlatList
            data={memoires}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={[
              styles.listeContenu,
              memoires.length === 0 && styles.listeVideContenu,
            ]}
            ListEmptyComponent={
              <Text style={styles.texteVide}>{t("persoEmptyState")}</Text>
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
              <View style={styles.overlayCardCenter}>
                <View style={styles.overlayHeaderRow}>
                  <Pressable onPress={resetPanels} hitSlop={10}>
                    <Text style={styles.overlayLink}>{t("cancel")}</Text>
                  </Pressable>

                  <Pressable onPress={Keyboard.dismiss} hitSlop={10}>
                    <View />
                  </Pressable>

                  <Pressable onPress={upsert} hitSlop={10}>
                    <Text style={styles.overlayPrimary}>
                      {isEditing ? t("persoSave") : t("persoAdd")}
                    </Text>
                  </Pressable>
                </View>

                <Text style={styles.overlayTitle}>
                  {isEditing ? t("persoEditMemory") : t("persoAddMemory")}
                </Text>

                <View style={styles.zoneInput}>
                  <TextInput
                    value={texteDetail}
                    onChangeText={setTexteDetail}
                    placeholder={t("persoInputPlaceholder")}
                    placeholderTextColor={colors.subtext}
                    style={styles.inputAjouter}
                    multiline
                    autoFocus
                  />
                </View>

                <View style={styles.aideLigne}>
                  <Text style={styles.aideIcone}>ⓘ</Text>
                  <Text style={styles.aideTexte}>{t("persoInputHint")}</Text>
                </View>
              </View>
            </KeyboardAvoidingView>
          )}

          {mode === "confirmClear" && (
            <View style={styles.overlayCardBottom}>
              <Text style={styles.overlayTitle}>{t("persoClearMemory")}</Text>

              <Text style={styles.texteEffacer}>{t("persoClearConfirmText")}</Text>

              <View style={styles.ligneEffacerBoutons}>
                <Pressable style={styles.boutonAnnulerEffacer} onPress={resetPanels}>
                  <Text style={styles.texteAnnulerEffacer}>{t("cancel")}</Text>
                </Pressable>

                <Pressable style={styles.boutonConfirmerEffacer} onPress={clearAll}>
                  <Text style={styles.texteConfirmerEffacer}>{t("persoConfirm")}</Text>
                </Pressable>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
