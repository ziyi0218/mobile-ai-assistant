import { useMemo } from "react";
import { SafeAreaView, View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";

import { useSettingsStore } from "../store/useSettingsStore";
import { useResolvedTheme } from "../utils/theme";
import { useI18n } from "../i18n/useI18n";
import { useUIScale } from "../hooks/useUIScale";

export default function Pending() {
  const { themeMode } = useSettingsStore();
  const { colors } = useResolvedTheme(themeMode);
  const { t } = useI18n();

  const scaled30 = useUIScale(30);
  const scaled16 = useUIScale(16);
  const scaled15 = useUIScale(15);

  const styles = useMemo(
    () => makeStyles(colors, { scaled30, scaled16, scaled15 }),
    [colors, scaled30, scaled16, scaled15]
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <Text style={styles.title}>
          {t("pleaseWait")}
          {"\n"}
          {t("forConfirmation")}
        </Text>

        <Text style={styles.desc}>
          {t("thankYou")}
          {"\n"}
          {t("registrationSoon")}
        </Text>

        <Pressable
          style={styles.btn}
          onPress={() => router.replace("/sign-in")}
        >
          <Text style={styles.btnText}>{t("backToSignIn")}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(colors: {
  bg: string;
  card: string;
  text: string;
  subtext: string;
  border: string;
}, scale: { scaled30: number; scaled16: number; scaled15: number }) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },

    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 28,
    },

    title: {
      fontSize: scale.scaled30,
      fontWeight: "600",
      textAlign: "center",
      marginBottom: 14,
      color: colors.text,
    },

    desc: {
      fontSize: scale.scaled15,
      textAlign: "center",
      color: colors.subtext,
    },

    btn: {
      marginTop: 26,
      height: 46,
      paddingHorizontal: 20,
      borderRadius: 23,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      justifyContent: "center",
    },

    btnText: {
      fontSize: scale.scaled16,
      fontWeight: "600",
      color: colors.text,
      textAlign: "center",
    },
  });
}
