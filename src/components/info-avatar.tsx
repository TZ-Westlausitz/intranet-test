/**
 * Avatar für Newsfeed-Karten/-Pop-ups, Kontakte-Übersicht und Profilseiten
 * — zeigt das echte Profilbild, wenn `profilbildPfad` gesetzt ist (siehe
 * Model Person, profilbildAktualisieren), sonst weiterhin den
 * Initialen-Kreis (Rückmeldung vom 2026-09-07: "Kreis mit Initialien wie
 * bisher, wenn kein Bild hinzugefügt"). Bei `alsUnternehmen` IMMER "TPZ"
 * statt eines Fotos, auch wenn die erstellende Person selbst ein
 * Profilbild hat — ein "im Namen des Unternehmens"-Post soll optisch
 * konsistent bleiben, nicht die Person dahinter zeigen.
 *
 * Bewusst KEIN Import aus src/lib/infos/abfragen.ts (auch nicht für die
 * triviale Initialen-Berechnung): diese Komponente wird auch aus echten
 * Client Components heraus gerendert (InfoAnzeigenDialog, NewsfeedListe,
 * KontakteListe) — ein Laufzeit-Import aus abfragen.ts würde darüber auch
 * dessen Prisma-Import mit in den Browser-Bundle ziehen.
 */
export function InfoAvatar({
  alsUnternehmen,
  vorname,
  nachname,
  personId,
  profilbildPfad,
  groesse = "klein",
}: {
  alsUnternehmen: boolean
  vorname: string
  nachname: string
  /** Benutzername — zusammen mit `profilbildPfad` nötig, um die Bild-URL zu bilden. */
  personId?: string
  profilbildPfad?: string | null
  /** "gross" für die prominente Anzeige im eigenen Profil, sonst überall "klein" (Default). */
  groesse?: "klein" | "gross"
}) {
  const groessenKlasse = groesse === "gross" ? "h-20 w-20 text-xl" : "h-9 w-9 text-xs"

  if (!alsUnternehmen && profilbildPfad && personId) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- interne Datei aus der Ablage, kein optimierbares Next-Image-Ziel
      <img
        src={`/api/personen/${personId}/profilbild`}
        alt=""
        className={`${groessenKlasse} shrink-0 rounded-full object-cover`}
      />
    )
  }

  const initialen = `${vorname.charAt(0)}${nachname.charAt(0)}`.toUpperCase()
  return (
    <span
      className={`flex ${groessenKlasse} shrink-0 items-center justify-center rounded-full bg-marke-gruen font-semibold text-white`}
    >
      {alsUnternehmen ? "TPZ" : initialen}
    </span>
  )
}
