export type BausteinEintrag = {
  name: string
  /** Fehlt, solange der Baustein noch nicht existiert — dann nur Platzhaltertext. */
  href?: string
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
  { name: "Newsfeed" },
  { name: "Aufgaben", href: "/aufgaben" },
  { name: "Formulare" },
  { name: "Wissen" },
  { name: "Kalender", href: "/kalender" },
  { name: "Kontakte" },
  { name: "Chat" },
  // Ganz hinten: künftig ausklappbar mit weiteren Fahrzeug-Funktionen
  // (Fahrzeug mieten, Meine Anfragen, Fahrzeug Reservierungen, Abrechnung).
  // Bis dahin ein einfacher Link auf die Anfrage-Seite.
  { name: "Fahrzeuge", href: "/fahrzeug-mieten" },
]
