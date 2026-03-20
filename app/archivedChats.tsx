import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Search, ArchiveRestore, Share2 } from "lucide-react-native";
import { useRouter } from "expo-router";

import { useSettingsStore } from "../store/useSettingsStore";
import { useResolvedTheme } from "../utils/theme";
import { useI18n } from "../i18n/useI18n";
import { useChatStore } from "../store/chatStore";

export default function ArchivedChatsScreen() {
  const router = useRouter();
  const { themeMode } = useSettingsStore();
  const { colors } = useResolvedTheme(themeMode);
  const { t } = useI18n();

  const { archivedChats, fetchArchivedChats, toggleArchiveChat } = useChatStore();

  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchArchivedChats();
  }, [fetchArchivedChats]);

  const filteredChats = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return archivedChats;

    return archivedChats.filter((item: any) =>
      String(item?.title || "").toLowerCase().includes(q)
    );
  }, [archivedChats, search]);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={[
              styles.backButton,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <ChevronLeft size={22} color={colors.text} strokeWidth={2.5} />
          </Pressable>
        </View>

        <Text style={[styles.title, { color: colors.text }]}>
          {t("archivedChats")}
        </Text>

        <View style={[styles.panel, { backgroundColor: colors.card }]}>

          <View
            style={[
              styles.searchBox,
              { backgroundColor: colors.bg, borderColor: colors.border },
            ]}
          >
            <Search size={18} color={colors.subtext} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t("searchChats")}
              placeholderTextColor={colors.subtext}
              style={[styles.searchInput, { color: colors.text }]}
            />
          </View>

          <Text style={[styles.sectionLabel, { color: colors.text }]}>
            {t("title")}
          </Text>

          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {filteredChats.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.subtext }]}>
                {t("adeNoResults")}
              </Text>
            ) : (
              filteredChats.map((item: any) => (
                <View key={item.id} style={styles.row}>
                  <View style={styles.rowLeft}>
                    <Text
                      numberOfLines={1}
                      style={[styles.chatTitle, { color: colors.text }]}
                    >
                      {item.title || "Untitled chat"}
                    </Text>
                  </View>

                  <View style={styles.rowActions}>
                    <Pressable
                      style={styles.iconButton}
                      onPress={() => {
                        // placeholder export/share action
                      }}
                    >
                      <Share2 size={18} color={colors.subtext} />
                    </Pressable>

                    <Pressable
                      style={styles.iconButton}
                      onPress={() => toggleArchiveChat(item.id)}
                    >
                      <ArchiveRestore size={18} color={colors.subtext} />
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={[
                styles.secondaryActionButton,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.secondaryActionText, { color: colors.text }]}>
                {t("unarchiveAllArchivedChats")}
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.secondaryActionButton,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.secondaryActionText, { color: colors.text }]}>
                {t("exportAllArchivedChats")}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 20,
  },
  panel: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 20,
  },
  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  closeButton: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  closeText: {
    fontSize: 28,
    lineHeight: 28,
  },
  searchBox: {
    marginTop: 16,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
  },
  sectionLabel: {
    marginTop: 18,
    fontSize: 16,
    fontWeight: "500",
  },
  list: {
    flex: 1,
    marginTop: 12,
  },
  listContent: {
    paddingBottom: 16,
  },
  row: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  rowLeft: {
    flex: 1,
    paddingRight: 12,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  rowActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginLeft: 4,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 15,
  },
  footer: {
    paddingTop: 8,
    alignItems: "center",
  },
  secondaryActionButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 250,
    alignItems: "center",
  },
  secondaryActionText: {
    fontSize: 16,
    fontWeight: "500",
  },
});