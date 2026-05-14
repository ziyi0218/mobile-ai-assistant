import type { ComponentProps } from "react";
import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  Switch,
  StyleSheet,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useSettingsStore } from "../store/useSettingsStore";
import { useResolvedTheme } from "../utils/theme";
import { useI18n } from "../i18n/useI18n";
import { useUIScale } from "../hooks/useUIScale";
import { useHaptics } from "../hooks/useHaptics";
import { logout } from "../services/authService";
import { adeService } from "../services/adeService";
import { useBiometric } from "../hooks/useBiometric";
import { useCommonDesign } from "../hooks/useCommonDesign";
import { ChevronLeft, ChevronRight } from "lucide-react-native";

type AccountOption = {
  id: string;
  textKey: string;
  icon: string;
  color: string;
  route: string | null;
  action: "logout" | null;
  lib?: "MaterialCommunityIcons";
};

const optionsList: AccountOption[] = [
  {
    id: "0",
    textKey: "general",
    icon: "settings-outline",
    color: "#000",
    route: "/general",
    action: null,
  },
  {
    id: "1",
    textKey: "interface",
    icon: "apps-outline",
    color: "#000",
    route: "/interfaceScreen",
    action: null,
  },
  {
    id: "2",
    textKey: "personalization",
    icon: "color-palette-outline",
    color: "#000",
    route: "/personnalization",
    action: null,
  },
  {
    id: "2b",
    textKey: "personas",
    icon: "people-outline",
    color: "#000",
    route: "/personas",
    action: null,
  },
  {
    id: "3",
    textKey: "account",
    icon: "person-circle-outline",
    color: "#000",
    route: "/compte",
    action: null,
  },
  {
    id: "4",
    textKey: "dataControls",
    icon: "database-cog-outline",
    lib: "MaterialCommunityIcons",
    color: "#000",
    route: "/data_controls",
    action: null,
  },
  {
    id: "5",
    textKey: "about",
    icon: "information-circle-outline",
    color: "#000",
    route: "/about",
    action: null,
  },
  {
    id: "6",
    textKey: "logOut",
    icon: "log-out-outline",
    color: "#FF0000",
    route: "/sign-in",
    action: "logout",
  },
];

export default function AccountScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { themeMode } = useSettingsStore();
  const { colors } = useResolvedTheme(themeMode);
  const scaledFontSize = useUIScale(24);
  const scaled22 = useUIScale(22);
  const scaledChevronSize = useUIScale(18);
  const scaled16 = useUIScale(16);
  const scaled14 = useUIScale(14);
  const scaled13 = useUIScale(13);
  const scaleFactor = useUIScale(1);
  const { haptics } = useHaptics();
  const styles = useCommonDesign();
  const {
    isAvailable: biometricAvailable,
    isEnabled: biometricEnabled,
    toggle: toggleBiometric,
  } = useBiometric();

  const [adeUser, setAdeUser] = useState("");
  const [adePass, setAdePass] = useState("");
  const [adeLoading, setAdeLoading] = useState(false);
  const [adeConnected, setAdeConnected] = useState(false);

  const renderOptionIcon = (item: AccountOption) => {
    if (item.lib === "MaterialCommunityIcons") {
      return (
        <MaterialCommunityIcons
          name={item.icon as ComponentProps<typeof MaterialCommunityIcons>["name"]}
          size={scaled22}
          color={item.color === "#FF0000" ? item.color : colors.text}
          style={accountStyles.rowIcon}
        />
      );
    }

    return (
      <Ionicons
        name={item.icon as ComponentProps<typeof Ionicons>["name"]}
        size={scaled22}
        color={item.color === "#FF0000" ? item.color : colors.text}
        style={accountStyles.rowIcon}
      />
    );
  };

  const handleAdeLogin = async () => {
    const user = adeUser.trim();
    const pass = adePass.trim();

    if (!user || !pass) {
      haptics("warning");
      Alert.alert(t("error"), t("adeFillCredentials"));
      return;
    }

    haptics("light");
    setAdeLoading(true);
    try {
      await adeService.login(user, pass);
      setAdeConnected(true);
      haptics("success");
      Alert.alert(t("adeConsult"), t("adeConnected"));
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || "Erreur inconnue";
      Alert.alert(t("adeError"), msg);
    } finally {
      setAdeLoading(false);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.bg }}>
      <View style={[layoutStyles.screen, { backgroundColor: colors.bg }]}>
        <View style={layoutStyles.container}>
          <View style={layoutStyles.header}>
            <Pressable
              onPress={() => {
                haptics("light");
                router.back();
              }}
              style={styles.backButton}
            >
              <ChevronLeft size={scaled22} color={colors.text} strokeWidth={2.5} />
            </Pressable>
          </View>

          <View style={layoutStyles.content}>
            <FlatList
              style={layoutStyles.list}
              contentContainerStyle={layoutStyles.listContent}
              data={optionsList}
              keyExtractor={(item) => item.id}
              ListHeaderComponent={
                <View>
                  <Pressable
                    style={styles.item}
                    onPress={() => {
                      haptics("light");
                      router.push({ pathname: "/archivedChats" });
                    }}
                  >
                    <View style={accountStyles.rowStart}>
                      <Ionicons
                        name="archive-outline"
                        size={scaled22}
                        color={colors.text}
                        style={accountStyles.rowIcon}
                      />
                      <Text
                        minimumFontScale={0.8}
                        ellipsizeMode="tail"
                        style={[styles.label, accountStyles.rowLabel, { color: colors.text }]}
                      >
                        {t("archivedChats")}
                      </Text>
                    </View>
                    <ChevronRight size={scaledChevronSize} color={colors.subtext} />
                  </Pressable>

                  <View className="items-center mt-2.5 mb-2.5">
                    <Text
                      minimumFontScale={0.8}
                      ellipsizeMode="tail"
                      className="font-bold text-center"
                      style={styles.title}
                    >
                      — {t("settings")} —
                    </Text>
                  </View>
                </View>
              }
              renderItem={({ item }) => {
                const handlePress = async () => {
                  haptics("light");

                  if (item.action === "logout") {
                    try {
                      await logout();
                    } catch (e) {
                      console.warn("[AccountScreen] Logout error:", e);
                    }
                    router.replace("/sign-in");
                  } else if (item.route) {
                    router.push({ pathname: item.route });
                  }
                };

                return (
                  <Pressable style={styles.item} onPress={handlePress}>
                    <View style={accountStyles.rowStart}>
                      {renderOptionIcon(item)}
                      <Text
                        minimumFontScale={0.8}
                        ellipsizeMode="tail"
                        style={[
                          styles.label,
                          accountStyles.rowLabel,
                          {
                            color: item.color === "#FF0000" ? item.color : colors.text,
                          },
                        ]}
                      >
                        {t(item.textKey)}
                      </Text>
                    </View>
                    <ChevronRight
                      size={scaledChevronSize}
                      color={item.color === "#FF0000" ? item.color : colors.subtext}
                    />
                  </Pressable>
                );
              }}
              ListFooterComponent={
                <View style={{ marginTop: 20, paddingHorizontal: 5 }}>
                  {biometricAvailable && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingVertical: 12,
                        marginBottom: 10,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontSize: scaled16, fontWeight: "600" }}>
                          {t("biometricLock")}
                        </Text>
                        <Text style={{ color: colors.subtext, fontSize: scaled13, marginTop: 2 }}>
                          {t("biometricLockDescription")}
                        </Text>
                      </View>
                      <Switch
                        value={biometricEnabled}
                        onValueChange={(value) => {
                          haptics("light");
                          toggleBiometric(value);
                        }}
                        trackColor={{ false: "#767577", true: "#4A90D9" }}
                        thumbColor={biometricEnabled ? "#fff" : "#f4f3f4"}
                        style={{ transform: [{ scale: scaleFactor }] }}
                      />
                    </View>
                  )}

                  <View className="items-center mb-2.5">
                    <Text
                      className="font-bold text-center"
                      style={{ color: colors.text, fontSize: scaledFontSize }}
                    >
                      — {t("adeConsult")} —
                    </Text>
                  </View>

                  {adeConnected ? (
                    <Text
                      style={{
                        color: "#4CAF50",
                        fontSize: scaled16,
                        textAlign: "center",
                        marginBottom: 10,
                      }}
                    >
                      {t("adeConnected")}
                    </Text>
                  ) : (
                    <View>
                      <Text style={{ color: colors.subtext, fontSize: scaled13, marginBottom: 8 }}>
                        {t("adeCasDescription")}
                      </Text>
                      <TextInput
                        placeholder={t("adeCasPlaceholder")}
                        placeholderTextColor={colors.subtext}
                        value={adeUser}
                        onChangeText={setAdeUser}
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={{
                          borderWidth: 1,
                          borderColor: colors.border,
                          borderRadius: 8,
                          padding: 12,
                          color: colors.text,
                          marginBottom: 10,
                          fontSize: scaled14,
                        }}
                      />
                      <TextInput
                        placeholder={t("adeCasPassword")}
                        placeholderTextColor={colors.subtext}
                        value={adePass}
                        onChangeText={setAdePass}
                        autoCapitalize="none"
                        autoCorrect={false}
                        secureTextEntry
                        style={{
                          borderWidth: 1,
                          borderColor: colors.border,
                          borderRadius: 8,
                          padding: 12,
                          color: colors.text,
                          marginBottom: 10,
                          fontSize: scaled14,
                        }}
                      />
                      <Pressable
                        onPress={handleAdeLogin}
                        disabled={adeLoading}
                        style={{
                          backgroundColor: adeLoading ? "#666" : "#4A90D9",
                          borderRadius: 8,
                          padding: 14,
                          alignItems: "center",
                        }}
                      >
                        {adeLoading ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text style={{ color: "#fff", fontWeight: "bold", fontSize: scaled16 }}>
                            {t("adeConnect")}
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  )}
                </View>
              }
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const layoutStyles = StyleSheet.create({
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
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingTop: 20,
    paddingBottom: 20,
  },
});

const accountStyles = StyleSheet.create({
  rowStart: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  rowIcon: {
    marginRight: 14,
  },
  rowLabel: {
    flex: 1,
  },
});
