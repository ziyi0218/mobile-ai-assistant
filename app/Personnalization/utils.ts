export type Memoire = {
  id: string;
  nomUtilisateur: string;
  derniereModification: string;
  detail: string;
};

export function formatNowFR() {
  const d = new Date();
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function extraireNomUtilisateur(detail: string) {
  const v = detail.trim();
  if (!v) return "Utilisateur";
  return v.length <= 28 ? v : v.slice(0, 28) + "…";
}
