import Link from "next/link"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"
import { KalenderMonate, type MonatAnzeige } from "@/components/kalender-monate"
import { TerminDialog } from "@/components/termin-dialog"
import { TerminUebersicht, type TerminUebersichtEintrag } from "@/components/termin-uebersicht"
import type { TerminListenEintrag } from "@/components/termin-liste"
import type { TerminAnzeige } from "@/lib/termine/typen"
import {
  terminErstellen,
  terminAktualisieren,
  terminLoeschen,
  terminSerieLoeschen,
  terminSerieAbHierLoeschen,
  terminTeilnahmeAntworten,
  terminKommentarErstellen,
} from "@/lib/termine/aktionen"
import { termineFuerZeitraum, termineSuchen } from "@/lib/termine/abfragen"
import { MONATSNAMEN, istGleicherTag, monatVerschieben, monatsraster } from "@/lib/kalender"
import { feiertagFuer } from "@/lib/feiertage-sachsen"
import { schulferienFuer } from "@/lib/schulferien-sachsen"
import { datumIsoAusDate, zeitAusDate, formatiereDatumAusDate } from "@/lib/datum"
import { richTextZuText } from "@/lib/rich-text"
import type { Prisma } from "@/generated/prisma/client"

type TerminMitBeziehungen = Prisma.TerminGetPayload<{
  include: {
    erinnerungen: true
    erstelltVon: { select: { vorname: true; nachname: true } }
    teilnehmer: { include: { person: { select: { vorname: true; nachname: true } } } }
    anhaenge: { select: { id: true; dateiname: true; groesseBytes: true; mimetyp: true } }
    kommentare: {
      include: {
        person: { select: { vorname: true; nachname: true } }
        anhaenge: { select: { id: true; dateiname: true; groesseBytes: true; mimetyp: true } }
      }
    }
  }
}>

/**
 * Baut die für die Anzeige aufbereitete Form eines Termins — geteilt
 * zwischen den Kalenderblättern und der "Nächste Termine"-Liste.
 *
 * "Teilnehmer" zeigt bewusst ALLE Beteiligten außer der anzeigenden Person
 * selbst — also auch die erstellende Person (die sonst nirgends in
 * TerminTeilnehmer auftaucht). Sonst sieht z. B. ein Eingeladener bei nur
 * einem weiteren Teilnehmer seinen eigenen Namen und nicht, wer überhaupt
 * eingeladen hat.
 */
function zuTerminAnzeige(termin: TerminMitBeziehungen, eigenePersonId: string): TerminAnzeige {
  const eigeneTeilnahme = termin.teilnehmer.find((t) => t.personId === eigenePersonId)

  const alleBeteiligten = [
    {
      personId: termin.erstelltVonId,
      name: `${termin.erstelltVon.vorname} ${termin.erstelltVon.nachname}`,
      status: "ERSTELLER" as const,
    },
    ...termin.teilnehmer.map((t) => ({
      personId: t.personId,
      name: `${t.person.vorname} ${t.person.nachname}`,
      status: t.status,
    })),
  ]

  const datumAnzeigeLang = (datum: Date) =>
    datum.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })

  return {
    id: termin.id,
    titel: termin.titel,
    beschreibung: termin.beschreibung,
    beschreibungVorschau: termin.beschreibung ? richTextZuText(termin.beschreibung) : null,
    ort: termin.ort,
    farbe: termin.farbe,
    ganztaegig: termin.ganztaegig,
    datum: datumIsoAusDate(termin.beginn),
    von: zeitAusDate(termin.beginn),
    bis: zeitAusDate(termin.ende),
    vonDatum: datumIsoAusDate(termin.beginn),
    bisDatum: datumIsoAusDate(termin.ende),
    zeitraumAnzeige: termin.ganztaegig
      ? "ganztägig"
      : `${zeitAusDate(termin.beginn)}–${zeitAusDate(termin.ende)}`,
    datumAnzeige: termin.ganztaegig
      ? datumIsoAusDate(termin.beginn) === datumIsoAusDate(termin.ende)
        ? datumAnzeigeLang(termin.beginn)
        : `${formatiereDatumAusDate(termin.beginn)} – ${formatiereDatumAusDate(termin.ende)}`
      : datumAnzeigeLang(termin.beginn),
    istErsteller: termin.erstelltVonId === eigenePersonId,
    serieId: termin.serieId,
    teilnehmer: alleBeteiligten.filter((t) => t.personId !== eigenePersonId),
    eigenerTeilnahmeStatus: eigeneTeilnahme?.status ?? null,
    erinnerungenMinuten: termin.erinnerungen.map((e) => e.minutenVorher),
    anhaenge: termin.anhaenge,
    kommentareErlaubt: termin.kommentareErlaubt,
    kommentare: termin.kommentare.map((k) => ({
      id: k.id,
      autorName: `${k.person.vorname} ${k.person.nachname}`,
      text: k.text,
      erstelltAmAnzeige: k.erstelltAm.toLocaleString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
      anhaenge: k.anhaenge,
    })),
  }
}

/** Alle Kalendertage von `von` bis `bis`, jeweils auf Mitternacht genormt. */
function tageZwischen(von: Date, bis: Date): Date[] {
  const tage: Date[] = []
  const cursor = new Date(von.getFullYear(), von.getMonth(), von.getDate())
  const letzterTag = new Date(bis.getFullYear(), bis.getMonth(), bis.getDate())
  while (cursor <= letzterTag) {
    tage.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return tage
}

/**
 * Reine Anzeige: aktueller Monat + die zwei folgenden als aufgeklappte
 * Kalenderblätter, mit Vor-/Zurück-Navigation und Sprung zu einem
 * bestimmten Monat/Jahr — alles über die URL (`?jahr=&monat=`), damit
 * Navigation ohne eigenen Client-State und ohne JavaScript funktioniert.
 * Feiertags-/Schulferien-Zuordnung passiert hier (Server), das Ein-/
 * Ausblenden per Checkbox in der Client-Komponente KalenderMonate.
 *
 * Eigene Termine: sichtbar nur für die erstellende Person und eingeladene
 * Teilnehmende (siehe Kommentar am Model Termin), angelegt über das
 * Pop-Up hinter "+ Termin hinzufügen".
 */
const FEHLER_TEXTE: Record<string, string> = {
  pflichtfeld: "Bitte alle Pflichtfelder ausfüllen.",
  zeitraum: "Das Ende darf nicht vor dem Anfang liegen.",
  zuLang: "Ein einzelner Termin darf höchstens ein Jahr umfassen.",
  zuGross: "Eine Datei ist zu groß (maximal 15 MB je Anhang).",
  typUngueltig: "Nicht unterstützter Dateityp. Erlaubt sind PDF und Fotos (JPG, PNG, WEBP, HEIC).",
  vergangenheit: "Ein neuer Termin darf nicht in der Vergangenheit liegen.",
}

export default async function KalenderSeite({
  searchParams,
}: {
  searchParams: Promise<{ jahr?: string; monat?: string; fehler?: string; suche?: string }>
}) {
  const kontext = await berechtigung()
  const { jahr: jahrParam, monat: monatParam, fehler, suche } = await searchParams
  const suchtext = (suche ?? "").trim()

  const heute = new Date()
  const jahrGeparst = jahrParam ? Number.parseInt(jahrParam, 10) : NaN
  const monatGeparst = monatParam ? Number.parseInt(monatParam, 10) - 1 : NaN

  const jahr = Number.isInteger(jahrGeparst) ? jahrGeparst : heute.getFullYear()
  const monatIndex0 =
    Number.isInteger(monatGeparst) && monatGeparst >= 0 && monatGeparst <= 11
      ? monatGeparst
      : heute.getMonth()

  const rasterProMonat = [0, 1, 2].map((versatz) => {
    const anker = monatVerschieben(jahr, monatIndex0, versatz)
    return { ...anker, wochen: monatsraster(anker.jahr, anker.monatIndex0) }
  })

  const ersterTag = rasterProMonat[0].wochen[0][0].datum
  const letzteWoche = rasterProMonat[2].wochen[rasterProMonat[2].wochen.length - 1]
  const letzterTag = letzteWoche[letzteWoche.length - 1].datum

  // Für "Nächste Termine" unter den Einstellungen — unabhängig vom gerade
  // durchblätterten Monat, deshalb eine eigene Zeitspanne ab dem echten
  // "heute" statt der drei angezeigten Kalenderblätter. Obere Grenze ist
  // das Monatsende, außer die aktuelle Woche reicht darüber hinaus (dann
  // hätte der "Diese Woche"-Filter sonst unvollständige Daten).
  const heuteEnde = new Date(heute.getFullYear(), heute.getMonth(), heute.getDate(), 23, 59, 59, 999)
  const wochentagHeute = (heute.getDay() + 6) % 7 // Montag = 0
  const wocheEnde = new Date(
    heute.getFullYear(),
    heute.getMonth(),
    heute.getDate() + (6 - wochentagHeute),
    23, 59, 59, 999,
  )
  const monatEnde = new Date(heute.getFullYear(), heute.getMonth() + 1, 0, 23, 59, 59, 999)
  const uebersichtBis = wocheEnde > monatEnde ? wocheEnde : monatEnde

  const [termine, personen, kommendeTermineRoh, sucheErgebnisRoh] = await Promise.all([
    termineFuerZeitraum(kontext.personId, ersterTag, letzterTag),
    prisma.person.findMany({
      where: { aktiv: true, benutzername: { not: kontext.personId } },
      orderBy: [{ nachname: "asc" }, { vorname: "asc" }],
      select: { benutzername: true, vorname: true, nachname: true },
    }),
    termineFuerZeitraum(kontext.personId, heute, uebersichtBis),
    suchtext ? termineSuchen(kontext.personId, suchtext) : Promise.resolve([]),
  ])

  // Kompakteres Datum als im Info-Pop-Up — die Zeile hat nur begrenzt Platz.
  const kurzesDatum = (datum: Date) =>
    datum.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" })

  function zuListenEintrag(termin: TerminMitBeziehungen): TerminListenEintrag {
    return {
      ...zuTerminAnzeige(termin, kontext.personId),
      beginnIso: termin.beginn.toISOString(),
      datumAnzeige:
        termin.ganztaegig && datumIsoAusDate(termin.beginn) !== datumIsoAusDate(termin.ende)
          ? `${kurzesDatum(termin.beginn)}–${kurzesDatum(termin.ende)}`
          : kurzesDatum(termin.beginn),
    }
  }

  const kommendeTermine: TerminUebersichtEintrag[] = kommendeTermineRoh.map(zuListenEintrag)
  const sucheErgebnis: TerminListenEintrag[] = sucheErgebnisRoh.map(zuListenEintrag)

  const terminePerTag = new Map<string, TerminAnzeige[]>()
  for (const termin of termine) {
    const anzeige = zuTerminAnzeige(termin, kontext.personId)
    for (const tag of tageZwischen(termin.beginn, termin.ende)) {
      const tagesSchluessel = tag.toDateString()
      const liste = terminePerTag.get(tagesSchluessel) ?? []
      liste.push(anzeige)
      terminePerTag.set(tagesSchluessel, liste)
    }
  }

  const angezeigteMonate: MonatAnzeige[] = rasterProMonat.map((monat) => ({
    jahr: monat.jahr,
    monatIndex0: monat.monatIndex0,
    monatsname: MONATSNAMEN[monat.monatIndex0],
    wochen: monat.wochen.map((woche) =>
      woche.map((kalendertag) => ({
        datumIso: kalendertag.datum.toISOString(),
        tag: kalendertag.tag,
        imAktuellenMonat: kalendertag.imAktuellenMonat,
        istHeute: istGleicherTag(kalendertag.datum, heute),
        feiertag: feiertagFuer(kalendertag.datum),
        ferien: schulferienFuer(kalendertag.datum),
        termine: terminePerTag.get(kalendertag.datum.toDateString()) ?? [],
      })),
    ),
  }))

  const zurueck = monatVerschieben(jahr, monatIndex0, -1)
  const vor = monatVerschieben(jahr, monatIndex0, 1)

  const linkFuer = (ziel: { jahr: number; monatIndex0: number }) =>
    `/kalender?jahr=${ziel.jahr}&monat=${ziel.monatIndex0 + 1}`

  const personenAnzeige = personen.map((p) => ({ id: p.benutzername, name: `${p.vorname} ${p.nachname}` }))
  const listenAktionen = {
    personen: personenAnzeige,
    aktualisierenAktion: terminAktualisieren,
    loeschenAktion: terminLoeschen,
    serieLoeschenAktion: terminSerieLoeschen,
    serieAbHierLoeschenAktion: terminSerieAbHierLoeschen,
    teilnahmeAktion: terminTeilnahmeAntworten,
    kommentarAktion: terminKommentarErstellen,
    rueckkehrJahr: jahr,
    rueckkehrMonat: monatIndex0 + 1,
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <Kopfleiste name={kontext.name} />
      <h1 className="text-center text-2xl font-semibold text-ueberschrift md:text-left">Kalender</h1>

      {fehler && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-700 md:text-left">
          {FEHLER_TEXTE[fehler] ?? "Der Termin konnte nicht gespeichert werden."}
        </p>
      )}

      {/* Drei Spalten wie die drei Kalenderblätter darunter (KalenderMonate),
          damit jeder Bereich optisch zu "seinem" Blatt ausgerichtet ist:
          Termin anlegen zum ersten, Monatsnavigation zum mittleren,
          Monat/Jahr-Sprung zum dritten. Auf dem Handy einfach gestapelt. */}
      <div className="mt-6 grid grid-cols-1 items-center gap-4 md:grid-cols-3">
        <div className="flex justify-center md:justify-start">
          <TerminDialog
            personen={personenAnzeige}
            aktion={terminErstellen}
            rueckkehrJahr={jahr}
            rueckkehrMonat={monatIndex0 + 1}
          />
        </div>

        <div className="flex items-center justify-center gap-3">
          <Link
            href={linkFuer(zurueck)}
            aria-label="Vorherige Monate"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-rand text-primaer transition hover:border-marke-gruen hover:text-marke-gruen-dunkel focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
          >
            ‹
          </Link>
          <span className="text-lg font-medium text-ueberschrift md:hidden">
            {MONATSNAMEN[angezeigteMonate[0].monatIndex0]} {angezeigteMonate[0].jahr}
          </span>
          <span className="hidden text-lg font-medium text-ueberschrift md:inline">
            {MONATSNAMEN[angezeigteMonate[0].monatIndex0]} – {MONATSNAMEN[angezeigteMonate[2].monatIndex0]}{" "}
            {angezeigteMonate[2].jahr}
          </span>
          <Link
            href={linkFuer(vor)}
            aria-label="Nächste Monate"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-rand text-primaer transition hover:border-marke-gruen hover:text-marke-gruen-dunkel focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
          >
            ›
          </Link>
        </div>

        <form action="/kalender" className="flex items-end justify-center gap-2 md:justify-end">
          <div>
            <label htmlFor="monat" className="block text-xs font-medium text-primaer">
              Monat
            </label>
            <select
              id="monat"
              name="monat"
              defaultValue={monatIndex0 + 1}
              className="h-9 w-32 rounded-lg border border-flaeche-300 px-2 text-sm"
            >
              {MONATSNAMEN.map((name, i) => (
                <option key={name} value={i + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="jahr" className="block text-xs font-medium text-primaer">
              Jahr
            </label>
            <input
              id="jahr"
              name="jahr"
              type="number"
              defaultValue={jahr}
              className="h-9 w-24 rounded-lg border border-flaeche-300 px-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="h-9 rounded-lg bg-marke-gruen px-3 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
          >
            Anzeigen
          </button>
        </form>
      </div>

      <KalenderMonate
        monate={angezeigteMonate}
        personen={personenAnzeige}
        aktualisierenAktion={terminAktualisieren}
        loeschenAktion={terminLoeschen}
        serieLoeschenAktion={terminSerieLoeschen}
        serieAbHierLoeschenAktion={terminSerieAbHierLoeschen}
        teilnahmeAktion={terminTeilnahmeAntworten}
        kommentarAktion={terminKommentarErstellen}
        rueckkehrJahr={jahr}
        rueckkehrMonat={monatIndex0 + 1}
      />

      <TerminUebersicht
        eintraege={kommendeTermine}
        heuteEndeIso={heuteEnde.toISOString()}
        wocheEndeIso={wocheEnde.toISOString()}
        suchtext={suchtext}
        sucheErgebnis={sucheErgebnis}
        {...listenAktionen}
      />

      <ZurueckButton />
    </main>
  )
}
