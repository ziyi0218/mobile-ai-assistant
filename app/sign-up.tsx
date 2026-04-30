import { useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { signup } from "../services/authService";

import { useSettingsStore } from "../store/useSettingsStore";
import { useResolvedTheme } from "../utils/theme";
import { useI18n } from "../i18n/useI18n";
import { useUIScale } from "../hooks/useUIScale";

export default function SignUp() {
  const { themeMode } = useSettingsStore();
  const { colors } = useResolvedTheme(themeMode);
  const { t } = useI18n();

  const scaled34 = useUIScale(34);
  const scaled17 = useUIScale(17);
  const scaled16 = useUIScale(16);

  const styles = useMemo(
    () => makeStyles(colors, { scaled34, scaled17, scaled16 }),
    [colors, scaled34, scaled17, scaled16]
  );

  const [nameValue, setNameValue] = useState("");
  const [emailValue, setEmailValue] = useState("");
  const [passwordValue, setPasswordValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = async () => {
    if (!nameValue || !emailValue || !passwordValue) {
      Alert.alert(t("error"), t("fillAllFields"));
      return;
    }
    setIsLoading(true);
    try {
      await signup(nameValue, emailValue, passwordValue);
      router.replace("/pending");
    } catch (e: any) {
      Alert.alert(t("error"), e.message || t("signUpFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.content}>
          <Text style={styles.title}>
            {t("signUpFor")} <Text style={styles.brand}>PLEIADE</Text>
          </Text>

          <Text style={styles.label}>{t("name")}</Text>
          <TextInput
            style={styles.input}
            placeholder={t("enterFullName")}
            placeholderTextColor={colors.subtext}
            value={nameValue}
            onChangeText={setNameValue}
          />

          <Text style={[styles.label, styles.space]}>{t("email")}</Text>
          <TextInput
            style={styles.input}
            placeholder="prenom.nom@etu.u-paris.fr"
            placeholderTextColor={colors.subtext}
            keyboardType="email-address"
            autoCapitalize="none"
            value={emailValue}
            onChangeText={setEmailValue}
          />

          <Text style={[styles.label, styles.space]}>{t("password")}</Text>
          <TextInput
            style={styles.input}
            placeholder={t("enterPassword")}
            placeholderTextColor={colors.subtext}
            value={passwordValue}
            onChangeText={setPasswordValue}
            secureTextEntry
          />

          <Pressable
            style={[styles.primaryBtn, isLoading && { opacity: 0.7 }]}
            onPress={handleSignUp}
            disabled={isLoading}
          >
            <Text style={styles.primaryText}>
              {isLoading ? t("connecting") : t("signUp")}
            </Text>
          </Pressable>

          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>{t("back")}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(colors: {
  bg: string;
  card: string;
  text: string;
  subtext: string;
  border: string;
}, scale: { scaled34: number; scaled17: number; scaled16: number }) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    container: { flex: 1 },
    content: { paddingHorizontal: 28, paddingTop: 150 },

    title: {
      fontSize: scale.scaled34,
      fontWeight: "500",
      textAlign: "center",
      marginBottom: 40,
      color: colors.text,
    },
    brand: {
      color: colors.text,
      fontWeight: "700",
    },

    label: {
      fontSize: scale.scaled16,
      fontWeight: "700",
      marginBottom: 8,
      color: colors.text,
    },
    space: { marginTop: 20 },

    input: {
      height: 56,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      fontSize: scale.scaled16,
      color: colors.text,
      backgroundColor: colors.card,
    },

    primaryBtn: {
      marginTop: 26,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
    },
    primaryText: { fontSize: scale.scaled17, fontWeight: "700", color: colors.text },

    back: { marginTop: 20, textAlign: "center", color: colors.text, fontSize: scale.scaled16 },
  });
}
