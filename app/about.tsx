import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
  ActivityIndicator,
  Modal,
} from "react-native";
import { ChevronLeft, X } from "lucide-react-native";
import { useRouter } from "expo-router";

import { useSettingsStore } from "../store/useSettingsStore";
import { useResolvedTheme } from "../utils/theme";
import { useI18n } from "../i18n/useI18n";
import {
  aboutService,
  type AboutReleaseNotesVersion,
} from "../services/aboutService";

const APP_VERSION = "v0.7.2";
const OLLAMA_VERSION = "0.14.3";

const LINKS = {
  community: "https://discord.com/invite/5rJgQTnV4s",
  company: "https://openwebui.com",
  releaseNotes: "https://github.com/open-webui/open-webui/releases",
  github: "https://github.com/open-webui/open-webui",
  social: "https://x.com/OpenWebUI",
  creator: "https://github.com/tjbck",
};

function SectionCard({
  children,
  colors,
}: {
  children: React.ReactNode;
  colors: { card: string; border: string };
}) {
  return (
    <View
      style={[
        styles.sectionCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      {children}
    </View>
  );
}

function AboutChip({
  label,
  colors,
  compact = false,
  onPress,
}: {
  label: string;
  colors: { card: string; border: string; text: string };
  compact?: boolean;
  onPress?: () => void;
}) {
  const Container = onPress ? Pressable : View;

  return (
    <Container
      style={[
        styles.chip,
        compact ? styles.chipCompact : styles.chipPrimary,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
      {...(onPress ? { onPress } : {})}
    >
      <Text style={[styles.chipText, { color: colors.text }]}>{label}</Text>
    </Container>
  );
}

export default function AboutScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { themeMode } = useSettingsStore();
  const { colors } = useResolvedTheme(themeMode);
  const [currentVersion, setCurrentVersion] = useState(APP_VERSION);
  const [latestVersion, setLatestVersion] = useState(APP_VERSION);
  const [isLoadingVersion, setIsLoadingVersion] = useState(true);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [releaseNotes, setReleaseNotes] = useState<Record<string, AboutReleaseNotesVersion>>({});
  const [isReleaseNotesVisible, setIsReleaseNotesVisible] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadVersionUpdates = async () => {
      try {
        const [updates, notes] = await Promise.all([
          aboutService.getVersionUpdates(),
          aboutService.getReleaseNotes(),
        ]);

        if (!isActive) return;

        setCurrentVersion(updates.current || APP_VERSION);
        setLatestVersion(updates.latest || updates.current || APP_VERSION);
        setReleaseNotes(notes);
      } catch {
        if (!isActive) return;

        setCurrentVersion(APP_VERSION);
        setLatestVersion(APP_VERSION);
      } finally {
        if (isActive) {
          setIsLoadingVersion(false);
        }
      }
    };

    loadVersionUpdates();

    return () => {
      isActive = false;
    };
  }, []);

  const versionStatus = useMemo(() => {
    if (latestVersion && latestVersion !== currentVersion) {
      return t("aboutVersionLatestAvailable", {
        current: currentVersion,
        latest: latestVersion,
      });
    }

    return t("aboutVersionCurrent", { version: currentVersion });
  }, [currentVersion, latestVersion, t]);

  const orderedReleaseNotes = useMemo(
    () =>
      Object.entries(releaseNotes).sort(([versionA], [versionB]) =>
        versionB.localeCompare(versionA, undefined, { numeric: true, sensitivity: "base" })
      ),
    [releaseNotes]
  );

  const handleCheckUpdates = async () => {
    setIsCheckingUpdates(true);

    try {
      const updates = await aboutService.getVersionUpdates();
      const nextCurrent = updates.current || APP_VERSION;
      const nextLatest = updates.latest || updates.current || APP_VERSION;

      setCurrentVersion(nextCurrent);
      setLatestVersion(nextLatest);

      if (nextLatest !== nextCurrent) {
        Alert.alert(
          t("aboutCheckUpdates"),
          t("aboutUpdateAvailableMessage", {
            current: nextCurrent,
            latest: nextLatest,
          })
        );
        return;
      }

      Alert.alert(
        t("aboutCheckUpdates"),
        t("aboutNoUpdatesMessage", { version: nextCurrent })
      );
    } catch {
      Alert.alert(t("error"), t("aboutVersionLoadError"));
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  const handleOpenReleaseNotes = () => {
    setIsReleaseNotesVisible(true);
  };

  const handleOpenCommunity = async () => {
    await Linking.openURL(LINKS.community);
  };

  const handleOpenCompany = async () => {
    await Linking.openURL(LINKS.company);
  };

  const handleOpenGithub = async () => {
    await Linking.openURL(LINKS.github);
  };

  const handleOpenSocial = async () => {
    await Linking.openURL(LINKS.social);
  };

  const handleOpenCreator = async () => {
    await Linking.openURL(LINKS.creator);
  };

  const chips = [
    { key: "community", label: t("aboutDiscordOpenWebUI"), onPress: handleOpenCommunity },
    { key: "follow", label: t("aboutFollowOpenWebUI"), onPress: handleOpenSocial },
    { key: "github", label: t("aboutStarGithub"), onPress: handleOpenGithub },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
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

        <Text style={[styles.pageTitle, { color: colors.text }]}>{t("about")}</Text>

        <SectionCard colors={colors}>
          <View style={styles.versionRow}>
            <View style={styles.versionContent}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t("aboutProductVersionLabel")}
              </Text>

              <Text style={[styles.versionValue, { color: colors.text }]}>
                {isLoadingVersion ? t("loading") : versionStatus}
              </Text>

              <Pressable onPress={handleOpenReleaseNotes} hitSlop={6}>
                <Text style={[styles.inlineLink, { color: colors.subtext }]}>
                  {t("aboutReleaseNotes")}
                </Text>
              </Pressable>
            </View>

            <Pressable
              style={[
                styles.updateButton,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={handleCheckUpdates}
              disabled={isCheckingUpdates}
            >
              {isCheckingUpdates ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <Text style={[styles.updateButtonText, { color: colors.text }]}>
                  {t("aboutCheckUpdates")}
                </Text>
              )}
            </Pressable>
          </View>
        </SectionCard>

        <SectionCard colors={colors}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t("aboutOllamaVersion")}
          </Text>
          <Text style={[styles.versionValue, { color: colors.text }]}>{OLLAMA_VERSION}</Text>
        </SectionCard>

        <SectionCard colors={colors}>
          <View style={styles.chipsRow}>
            {chips.map((chip) => (
              <AboutChip
                key={chip.key}
                label={chip.label}
                colors={colors}
                onPress={chip.onPress}
              />
            ))}
          </View>

          <Text style={[styles.metaText, { color: colors.subtext }]}>
            {t("aboutEmojiCredit")}
          </Text>
          <Text style={[styles.metaText, { color: colors.subtext }]}>
            {t("aboutCopyrightPrefix")}
            <Text
              style={[styles.metaLink, { color: colors.subtext }]}
              onPress={handleOpenCompany}
            >
              {t("aboutCopyrightName")}
            </Text>
            {t("aboutCopyrightSuffix")}
          </Text>
          <Text style={[styles.metaText, { color: colors.subtext }]}>
            {t("aboutCreatedByPrefix")}
            <Text
              style={[styles.metaLink, { color: colors.subtext }]}
              onPress={handleOpenCreator}
            >
              {t("aboutCreatedByName")}
            </Text>
            {t("aboutCreatedBySuffix")}
          </Text>
        </SectionCard>

      </ScrollView>

      <Modal
        visible={isReleaseNotesVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsReleaseNotesVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t("aboutReleaseNotes")}
              </Text>
              <Pressable
                onPress={() => setIsReleaseNotesVisible(false)}
                style={styles.modalCloseButton}
              >
                <X size={22} color={colors.text} strokeWidth={2.2} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              {orderedReleaseNotes.map(([version, note]) => (
                <View key={version} style={styles.releaseVersionBlock}>
                  <Text style={[styles.releaseVersionTitle, { color: colors.text }]}>
                    {version}
                  </Text>
                  <Text style={[styles.releaseDate, { color: colors.subtext }]}>
                    {note.date}
                  </Text>

                  {(["added", "fixed", "changed"] as const).map((sectionKey) => {
                    const items = note[sectionKey];

                    if (!items || items.length === 0) return null;

                    return (
                      <View key={sectionKey} style={styles.releaseSection}>
                        <Text style={[styles.releaseSectionTitle, { color: colors.text }]}>
                          {t(
                            sectionKey === "added"
                              ? "aboutReleaseNotesAdded"
                              : sectionKey === "fixed"
                                ? "aboutReleaseNotesFixed"
                                : "aboutReleaseNotesChanged"
                          )}
                        </Text>
                        {items.map((item, index) => (
                          <Text
                            key={`${sectionKey}-${index}`}
                            style={[styles.releaseItem, { color: colors.subtext }]}
                          >
                            • {item.content}
                          </Text>
                        ))}
                      </View>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 32,
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
  pageTitle: {
    fontSize: 22,
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 24,
  },
  sectionCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    marginBottom: 14,
  },
  versionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    flexWrap: "wrap",
  },
  versionContent: {
    flex: 1,
    minWidth: 220,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 26,
  },
  versionValue: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 18,
  },
  inlineLink: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    textDecorationLine: "underline",
  },
  updateButton: {
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignSelf: "flex-start",
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 14,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginRight: 10,
    marginBottom: 10,
  },
  chipPrimary: {
    minHeight: 42,
    justifyContent: "center",
  },
  chipCompact: {
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  chipText: {
    fontSize: 16,
    fontWeight: "600",
  },
  metaText: {
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  metaLink: {
    textDecorationLine: "underline",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  modalCard: {
    maxHeight: "88%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  modalTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: "700",
    paddingRight: 12,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    alignSelf: "flex-start",
  },
  modalContent: {
    paddingBottom: 20,
  },
  releaseVersionBlock: {
    marginBottom: 24,
  },
  releaseVersionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  releaseDate: {
    fontSize: 13,
    marginTop: 4,
  },
  releaseSection: {
    marginTop: 14,
  },
  releaseSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
  },
  releaseItem: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 8,
  },
});
