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
  // "Aufgaben" — deshalb ersatzlos entfernt statt umgebogen. Sie bleibt
  // aber als Startseiten-Kachel wählbar, siehe STARTSEITE_WEITERES_MODULE
  // unten — zwei unterschiedliche Zwecke, die zufällig an derselben Liste
  // hingen (Bug, siehe dort).
  {
    name: "Weiteres",
    unterpunkte: [
      { name: "Fahrzeuge", href: "/fahrzeug-mieten" },
      { name: "Geplante Aktionen", href: "/geplante-aktionen" },
    ],
  },
]

export type StartseiteWeiteresModul = { name: string; href: string }

/**
 * Auswählbare Module für die "Weiteres"-Kachel auf der Startseite
 * (Einstellungen → Nutzeroberfläche, `Person.startseiteWeiteresModul`,
 * ausgewertet in src/app/page.tsx). Bewusst eine EIGENE, von `BAUSTEINE`
 * entkoppelte Liste: Die Kopfzeilen-Navigation zeigt nur Ziele, die dort
 * noch keinen anderen Zugang haben — "To-Do-Liste" fiel deshalb am
 * 2026-09-23 aus dem "Weiteres"-Menü raus (redundant zu "Aufgaben"). Als
 * Startseiten-Widget ist sie aber etwas anderes als ein bloßer Link: eine
 * Live-Vorschau mit Direkt-Abhaken, die es nur hier gibt — deshalb bleibt
 * sie hier wählbar, obwohl sie im Nav-Menü nicht mehr auftaucht. Ursprünglich
 * teilten sich beide Listen `BAUSTEINE`, das brach diese Auswahl beim
 * Entfernen aus dem Nav versehentlich mit (Rückmeldung 2026-09-23).
 */
export const STARTSEITE_WEITERES_MODULE: StartseiteWeiteresModul[] = [
  { name: "Fahrzeuge", href: "/fahrzeug-mieten" },
  { name: "To-Do-Liste", href: "/aufgaben" },
  { name: "Geplante Aktionen", href: "/geplante-aktionen" },
]
