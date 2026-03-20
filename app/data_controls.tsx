import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Ionicons,
  Feather,
  Fontisto
} from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useSettingsStore } from "../store/useSettingsStore";
import { useResolvedTheme } from "../utils/theme";
import { useI18n } from "../i18n/useI18n";

export default function DataControlsScreen() {
  const router = useRouter();
  const { themeMode } = useSettingsStore();
  const { colors } = useResolvedTheme(themeMode);
  const { t } = useI18n();

  const dataControlOptions = [
      {
        id: "0",
        text: t("importChats"),
        icon: "import",
        lib: "Fontisto",
        route: null,
        danger: false,
      },
      {
        id: "1",
        text: t("exportChats"),
        icon: "export",
        lib: "Fontisto",
        route: null,
        danger: false,
      },
      {
        id: "2",
        text: t("archivedChats"),
        icon: "archive",
        lib: "Feather",
        route: "/archivedChats",
        danger: false,
      },
      {
        id: "3",
        text: t("archiveAllChats"),
        icon: "archive-outline",
        lib: "Ionicons",
        route: null,
        danger: false,
      },
      {
        id: "4",
        text: t("deleteAllChats"),
        icon: "trash-outline",
        lib: "Ionicons",
        route: null,
        danger: true,
      },
    ] as const;



  const renderIcon = (item: typeof dataControlOptions[number]) => {
    const iconColor = item.danger ? "#DC2626" : colors.text;

    switch (item.lib) {
      case "Feather":
        return <Feather name={item.icon} size={22} color={iconColor} />;
      case "Ionicons":
        return <Ionicons name={item.icon} size={22} color={iconColor} />;
      case "Fontisto":
        return <Fontisto name={item.icon} size={20} color={iconColor} />;
      default:
        return null;
    }
  };

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
          {t("dataControls")}
        </Text>

        <View style={styles.content}>
          {dataControlOptions.map((item) => (
            <Pressable
              key={item.id}
              style={[styles.item, { backgroundColor: colors.card }]}
              onPress={() => {
                if (item.route) {
                  router.push(item.route);
                }
              }}
            >
              <View style={styles.left}>
                <View style={styles.iconWrapper}>{renderIcon(item)}</View>
                <Text
                  style={[
                    styles.label,
                    { color: item.danger ? "#DC2626" : colors.text },
                  ]}
                >
                  {item.text}
                </Text>
              </View>

              <ChevronRight size={18} color={colors.subtext} />
            </Pressable>
          ))}
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
    marginBottom: 24,
  },
  content: {
    flex: 1,
  },
  item: {
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
  },
  iconWrapper: {
    width: 28,
    marginRight: 14,
    alignItems: "center",
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
  },
});