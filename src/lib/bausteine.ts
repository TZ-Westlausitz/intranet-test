export type BausteinUnterpunkt = { name: string; href: string }

export type BausteinEintrag = {
  name: string
  /** Fehlt, solange der Baustein noch nicht existiert — dann nur Platzhaltertext. */
  href?: string
  /**
   * Für einen Sammelpunkt ohne eigenes Ziel, der stattdessen ein
   * Untermenü öffnet (z. B. "Weiteres") — schließt sich mit `href`
   * gegenseitig aus.
   */
  unterpunkte?: BausteinUnterpunkt[]
}

/**
 * Die komplette Kopfzeilen-Navigation in fester Reihenfolge, geteilt
 * zwischen der Desktop-Navigation (src/app/layout.tsx) und dem
 * ausklappbaren Menü auf dem Handy (src/components/mobiles-menu.tsx),
 * damit beide nie auseinanderlaufen. Bausteine ohne `href` sind noch nicht
 * gebaut (siehe Memory kuenftige-bausteine-aus-altsystem) und erscheinen
 * nur als ausgegrauter Platzhalter.
 */
export const BAUSTEINE: BausteinEintrag[] = [
  { name: "Home", href: "/" },
  { name: "Newsfeed", href: "/newsfeed" },
  { name: "Aufgaben", href: "/aufgaben" },
  { name: "Formulare", href: "/formulare" },
  { name: "Wissen", href: "/wissen" },
  { name: "Kalender", href: "/kalender" },
  { name: "Kontakte", href: "/kontakte" },
  { name: "Chat" },
  // Sammelpunkt für kleinere/seltener gebrauchte Bausteine, statt jeden
  // einzeln in die Zeile zu packen — die soll mit den Hauptpunkten gefüllt
  // bleiben, nicht mit einem Dutzend Funktionen auf einen Blick. Weitere
  // Bausteine landen hier erstmal mit, bis sie einen eigenen Platz
  // verdienen (siehe BausteinMehrMenu für die Desktop-Umsetzung).
  {
    name: "Weiteres",
    unterpunkte: [
      { name: "Fahrzeuge", href: "/fahrzeug-mieten" },
      { name: "To-Do-Liste", href: "/aufgaben/todos" },
      { name: "Geplante Aktionen", href: "/geplante-aktionen" },
    ],
  },
]
