import { StyleSheet } from "react-native";

export type PersonnalizationColors = {
  bg: string;
  card: string;
  text: string;
  subtext: string;
  border: string;
};

export function createStyles(colors: PersonnalizationColors) {
  return StyleSheet.create({
    ecran: {
      flex: 1,
      backgroundColor: colors.bg,
      paddingHorizontal: 24,
      justifyContent: "space-between",
    },

    carteMemoire: {
      marginTop: 60,
      borderRadius: 20,
      padding: 20,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },

    ligneEntete: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },

    zoneTitre: {
      flex: 1,
      paddingRight: 12,
    },

    titre: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
    },

    experimental: {
      color: colors.subtext,
      fontWeight: "600",
    },

    description: {
      marginTop: 8,
      fontSize: 14,
      color: colors.subtext,
      lineHeight: 20,
    },

    boutonGerer: {
      marginTop: 20,
      alignSelf: "flex-start",
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },

    texteGerer: {
      fontWeight: "700",
      fontSize: 16,
      color: colors.text,
    },

    inactif: {
      opacity: 0.4,
    },

    zoneEnregistrer: {
      paddingBottom: 20,
      alignItems: "center",
    },

    boutonEnregistrer: {
      backgroundColor: colors.text,
      paddingVertical: 14,
      paddingHorizontal: 40,
      borderRadius: 999,
    },

    texteEnregistrer: {
      color: colors.bg,
      fontSize: 16,
      fontWeight: "700",
    },

    superpositionBas: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.35)",
      justifyContent: "flex-end",
    },

    conteneurGestion: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      height: "90%",
      paddingTop: 22,
      borderWidth: 1,
      borderColor: colors.border,
    },

    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: 24,
      paddingBottom: 14,
      alignItems: "center",
    },

    titreGestion: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.text,
    },

    fermer: {
      fontSize: 22,
      color: colors.text,
    },

    ligneColonnes: {
      flexDirection: "row",
      paddingHorizontal: 24,
      paddingTop: 8,
      paddingBottom: 8,
    },

    colonneNomTitre: {
      flex: 1,
      fontSize: 13,
      fontWeight: "800",
      color: colors.text,
      opacity: 0.7,
    },

    colonneDateTitre: {
      flex: 1,
      fontSize: 13,
      fontWeight: "800",
      color: colors.text,
      opacity: 0.7,
      textAlign: "right",
    },

    listeContenu: {
      paddingBottom: 20,
    },

    listeVideContenu: {
      flexGrow: 1,
      justifyContent: "center",
    },

    texteVide: {
      paddingHorizontal: 24,
      color: colors.subtext,
      fontSize: 14,
      lineHeight: 20,
      textAlign: "center",
    },

    ligneMemoire: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 24,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderColor: colors.border,
    },

    colonneNomValeur: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      paddingRight: 12,
    },

    zoneDroite: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
    },

    colonneDateValeur: {
      fontSize: 16,
      color: colors.text,
      opacity: 0.75,
      marginRight: 14,
      maxWidth: 200,
    },

    iconeBtn: {
      paddingHorizontal: 8,
      paddingVertical: 6,
    },

    piedGestionInline: {
      paddingTop: 18,
      paddingBottom: 26,
      paddingHorizontal: 24,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
    },

    boutonAjouterSouvenir: {
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      marginRight: 12,
    },

    texteAjouterSouvenir: {
      fontWeight: "800",
      color: colors.text,
    },

    boutonEffacerMemoire: {
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: "#FCA5A5",
      backgroundColor: colors.card,
      marginLeft: 12,
    },

    texteEffacerMemoire: {
      fontWeight: "800",
      color: "#DC2626",
    },

    superpositionCentre: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.35)",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 18,
    },

    boiteAjouter: {
      width: "100%",
      maxWidth: 720,
      backgroundColor: colors.card,
      borderRadius: 28,
      padding: 22,
    },

    titreAjouter: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.text,
    },

    zoneInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 14,
    },

    inputAjouter: {
      minHeight: 120,
      fontSize: 16,
      color: colors.text,
      textAlignVertical: "top",
    },

    aideLigne: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginTop: 12,
    },

    aideIcone: {
      marginRight: 8,
      fontSize: 14,
      color: colors.subtext,
      marginTop: 2,
    },

    aideTexte: {
      flex: 1,
      fontSize: 13,
      color: colors.subtext,
      lineHeight: 18,
    },

    zoneBoutonAjouter: {
      marginTop: 14,
      flexDirection: "row",
      justifyContent: "flex-end",
    },

    boutonAjouterNoir: {
      backgroundColor: colors.text,
      paddingVertical: 14,
      paddingHorizontal: 26,
      borderRadius: 999,
    },

    texteAjouterNoir: {
      color: colors.bg,
      fontSize: 16,
      fontWeight: "800",
    },

    boiteEffacer: {
      width: "100%",
      maxWidth: 720,
      backgroundColor: colors.card,
      borderRadius: 28,
      padding: 22,
    },

    titreEffacer: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.text,
    },

    texteEffacer: {
      marginTop: 10,
      fontSize: 14,
      color: colors.subtext,
      lineHeight: 20,
    },

    ligneEffacerBoutons: {
      marginTop: 18,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },

    boutonAnnulerEffacer: {
      flex: 1,
      borderRadius: 999,
      paddingVertical: 14,
      alignItems: "center",
      backgroundColor: colors.border,
      marginRight: 10,
    },

    texteAnnulerEffacer: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.text,
    },

    boutonConfirmerEffacer: {
      flex: 1,
      borderRadius: 999,
      paddingVertical: 14,
      alignItems: "center",
      backgroundColor: colors.text,
      marginLeft: 10,
    },

    texteConfirmerEffacer: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.bg,
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
      backgroundColor: colors.card,
      borderRadius: 24,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },

    overlayCardBottom: {
      position: "absolute",
      left: 16,
      right: 16,
      bottom: 16,
      backgroundColor: colors.card,
      borderRadius: 24,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },

    overlayHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
    },

    overlayTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 10,
    },

    overlayLink: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
      opacity: 0.75,
    },

    overlayPrimary: {
      fontSize: 14,
      fontWeight: "900",
      color: colors.text,
    },
  });
}
