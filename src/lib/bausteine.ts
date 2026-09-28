export type BausteinUnterpunkt = {
  name: string
  href: string
  /**
   * Dieser Eintrag ist der Fuhrpark-Punkt: Name, Ziel und Zähler kommen zur
   * Laufzeit aus fuhrparkNavigation() statt aus dieser festen Liste — je
   * nach Berechtigung heißt er "Fuhrpark" (alle Fahrzeuge) oder "Mein
   * Fahrzeug" (nur der eigene Halter-Bezug), und fehlt ganz, wenn die
   * Person nichts von beidem hat.
   */
  istFuhrparkPunkt?: boolean
  /** Laufzeitwert für einen kleinen Zähler (z. B. fällige Fristen) — kommt nicht aus BAUSTEINE selbst. */
  badge?: number
}

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
  { name: "Chat", href: "/chat" },
  // Sammelpunkt für kleinere/seltener gebrauchte Bausteine, statt jeden
  // einzeln in die Zeile zu packen — die soll mit den Hauptpunkten gefüllt
  // bleiben, nicht mit einem Dutzend Funktionen auf einen Blick. Weitere
  // Bausteine landen hier erstmal mit, bis sie einen eigenen Platz
  // verdienen (siehe BausteinMehrMenu für die Desktop-Umsetzung).
  // "To-Do-Liste" stand hier bis 2026-09-23 als eigener Unterpunkt — seit
  // die persönliche To-Do-Liste Teil von /aufgaben ist (siehe Kommentar
  // in src/app/(mitarbeiter)/aufgaben/page.tsx), wäre das ein zweiter
  // Menüpunkt zum selben Ziel wie der schon vorhandene Hauptpunkt
  // "Aufgaben" — deshalb ersatzlos entfernt statt umgebogen. Als
  // Startseiten-Kachel bleibt sie trotzdem wählbar, siehe
  // src/lib/startseite/raster.ts (STARTSEITE_MODUL_KATALOG) — seit
  // 2026-09-28 eine vollständig eigene, vom "Weiteres"-Menü unabhängige
  // Modulliste fürs Startseiten-Raster, kein gemeinsamer Datensatz mehr.
  {
    name: "Weiteres",
    unterpunkte: [
      { name: "Fahrzeuge", href: "/fahrzeug-mieten" },
      { name: "Fuhrpark", href: "/fuhrpark", istFuhrparkPunkt: true },
      { name: "Geplante Aktionen", href: "/geplante-aktionen" },
    ],
  },
]
