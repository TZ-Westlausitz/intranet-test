import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"
import { InfoErstellenDialog } from "@/components/info-erstellen-dialog"
import { InfoEntwuerfeDialog } from "@/components/info-entwuerfe-dialog"
import { NewsfeedListe } from "@/components/newsfeed-liste"
import type { InfoFormularOptionen } from "@/components/info-form-felder"
import { infosFuerPerson, alleInfos, eigeneInfoEntwuerfe, UNTERNEHMENSNAME } from "@/lib/infos/abfragen"
import { istGeschaeftsfuehrung } from "@/lib/infos/sichtbarkeit"
import { infoErstellen, infoAlsEntwurfSpeichern, infoAktualisieren, infoEntwurfLoeschen, infoAnhangLoeschen } from "@/lib/infos/aktionen"
import { richTextZuText } from "@/lib/rich-text"

const FEHLER_TEXTE: Record<string, string> = {
  pflichtfeld: "Bitte einen Titel eintragen.",
  keinEmpfaenger: "Bitte mindestens eine Abteilung, Gruppe oder Person als Empfänger auswählen.",
  zuGross: "Eine Datei ist zu groß (maximal 15 MB je Anhang).",
  typUngueltig: "Nicht unterstützter Dateityp. Erlaubt sind PDF und Fotos (JPG, PNG, WEBP, HEIC).",
  umfrageZuWenigOptionen: "Eine Umfrage braucht mindestens zwei Optionen.",
}

/** Wer eine dieser Berechtigungen hat, kann mindestens eine Info erstellen oder bearbeiten — dann lohnen sich die Optionslisten. */
const RELEVANTE_BERECHTIGUNGEN = ["Infos", "Bearbeiten", "Löschen & Bearbeiten"]

/**
 * Einstieg in den Newsfeed-Baustein — EIN chronologischer Feed, bewusst
 * keine Spalten-Trennung "Infos"/"Infos mit Bestätigung" wie im Altsystem
 * (siehe Chat vom 2026-09-05): die Bestätigungspflicht steht stattdessen
 * direkt auf der jeweiligen Karte (Bestätigen-Button bzw. "✓ Bestätigt"),
 * zusammen mit dem Stand "X von Y". "+ Info" erscheint nur mit der
 * Berechtigung "Infos" (siehe infoErstellen) — ein ausgeblendeter Knopf
 * ist keine Zugriffskontrolle, die eigentliche Prüfung sitzt serverseitig.
 *
 * Eine Karte anklicken öffnet die Info direkt als Pop-up (InfoAnzeigenDialog
 * in NewsfeedListe) statt auf eine eigene Detailseite zu führen — Infos
 * haben seit der Rückmeldung vom 2026-09-06 ("brauchen keine extra Seite")
 * keine eigene Route mehr. `absenderName`/`vorschauText` werden HIER
 * (Server Component) vorberechnet, weil NewsfeedListe eine Client
 * Component ist und UNTERNEHMENSNAME/richTextZuText nicht direkt
 * importieren soll (siehe Kommentar dort).
 */
export default async function NewsfeedSeite({
  searchParams,
}: {
  searchParams: Promise<{ fehler?: string; info?: string }>
}) {
  const kontext = await berechtigung()
  const { fehler, info: initialInfoId } = await searchParams
  const darfErstellen = kontext.berechtigungen.includes("Infos")
  const brauchtOptionen = kontext.berechtigungen.some((b) => RELEVANTE_BERECHTIGUNGEN.includes(b))

  const [infos, entwuerfe, darfAlsUnternehmen, personen, gruppen, abteilungen, kategorien] = await Promise.all([
    kontext.adminModusAktiv ? alleInfos(kontext) : infosFuerPerson(kontext),
    darfErstellen ? eigeneInfoEntwuerfe(kontext.personId) : Promise.resolve([]),
    brauchtOptionen ? istGeschaeftsfuehrung(kontext.personId) : Promise.resolve(false),
    brauchtOptionen
      ? prisma.person.findMany({
          where: { aktiv: true, benutzername: { not: kontext.personId } },
          orderBy: [{ nachname: "asc" }, { vorname: "asc" }],
          select: { benutzername: true, vorname: true, nachname: true },
        })
      : Promise.resolve([]),
    brauchtOptionen
      ? prisma.gruppe.findMany({ where: { aktiv: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
    brauchtOptionen
      ? prisma.abteilung.findMany({ where: { aktiv: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
    brauchtOptionen
      ? prisma.infoKategorie.findMany({ where: { aktiv: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
  ])

  const optionen: InfoFormularOptionen = {
    personen: personen.map((p) => ({ id: p.benutzername, name: `${p.vorname} ${p.nachname}` })),
    gruppen: gruppen.map((g) => ({ id: g.id, name: g.name })),
    abteilungen: abteilungen.map((a) => ({ id: a.id, name: a.name })),
    kategorien: kategorien.map((k) => ({ id: k.id, name: k.name })),
    darfAlsUnternehmen,
  }

  const karten = infos.map((info) => ({
    ...info,
    absenderName: info.alsUnternehmen ? UNTERNEHMENSNAME : `${info.erstelltVon.vorname} ${info.erstelltVon.nachname}`,
    vorschauText: !info.titelbild && info.inhalt ? richTextZuText(info.inhalt) : null,
  }))

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Kopfleiste name={kontext.name} />
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-ueberschrift">Newsfeed</h1>
        <div className="flex shrink-0 items-center gap-2">
          {darfErstellen && entwuerfe.length > 0 && (
            <InfoEntwuerfeDialog
              entwuerfe={entwuerfe}
              optionen={optionen}
              aktualisierenAktion={infoAktualisieren}
              entwurfLoeschenAktion={infoEntwurfLoeschen}
              anhangLoeschenAktion={infoAnhangLoeschen}
            />
          )}
          {darfErstellen && (
            <InfoErstellenDialog optionen={optionen} erstellenAktion={infoErstellen} entwurfSpeichernAktion={infoAlsEntwurfSpeichern} />
          )}
        </div>
      </div>

      {fehler && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-700 md:text-left">
          {FEHLER_TEXTE[fehler] ?? "Das hat nicht geklappt."}
        </p>
      )}

      {karten.length === 0 ? (
        <p className="mt-6 text-sm text-sekundaer">
          {kontext.adminModusAktiv ? "Noch keine veröffentlichten Infos." : "Noch keine Infos für dich."}
        </p>
      ) : (
        <NewsfeedListe infos={karten} optionen={optionen} initialInfoId={initialInfoId} />
      )}

      <ZurueckButton />
    </main>
  )
}
