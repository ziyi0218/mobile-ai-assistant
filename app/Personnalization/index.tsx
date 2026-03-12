import React, { useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  Switch,
  Pressable,
  Alert,
} from "react-native";
import { createStyles } from "./styles";
import type { Memoire } from "./utils";
import { GestionMemoireModal } from "./modals";
import { useI18n } from "../../i18n/useI18n";
import { useSettingsStore } from "../../store/useSettingsStore";
import { useResolvedTheme } from "../../utils/theme";

export default function PersonnalisationMemoire() {
  const [memoireActivee, setMemoireActivee] = useState(true);
  const [showGestion, setShowGestion] = useState(false);
  const [listeMemoires, setListeMemoires] = useState<Memoire[]>([]);

  const { t } = useI18n();
  const { themeMode } = useSettingsStore();
  const { colors } = useResolvedTheme(themeMode);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const gestionDisabled = !memoireActivee;

  return (
    <SafeAreaView style={styles.ecran}>
      <View style={styles.carteMemoire}>
        <View style={styles.ligneEntete}>
          <View style={styles.zoneTitre}>
            <Text style={styles.titre}>
              {t("persoMemoryTitle")} <Text style={styles.experimental}>({t("persoExperimental")})</Text>
            </Text>

            <Text style={styles.description}>{t("persoDescription")}</Text>
          </View>

          <Switch value={memoireActivee} onValueChange={setMemoireActivee} />
        </View>

        <Pressable
          style={[styles.boutonGerer, gestionDisabled && styles.inactif]}
          disabled={gestionDisabled}
          onPress={() => setShowGestion(true)}
        >
          <Text style={styles.texteGerer}>{t("persoManage")}</Text>
        </Pressable>
      </View>

      <View style={styles.zoneEnregistrer}>
        <Pressable
          style={styles.boutonEnregistrer}
          onPress={() =>
            Alert.alert(t("persoSave"), t("persoSaveMessage"))
          }
        >
          <Text style={styles.texteEnregistrer}>{t("persoSave")}</Text>
        </Pressable>
      </View>

      <GestionMemoireModal
        visible={showGestion}
        onClose={() => setShowGestion(false)}
        memoires={listeMemoires}
        setMemoires={setListeMemoires}
      />
    </SafeAreaView>
  );
}
