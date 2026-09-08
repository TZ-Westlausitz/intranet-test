import Link from "next/link"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"
import { GeplanteAktionenMonate, type GeplanteAktionenMonatAnzeige } from "@/components/geplante-aktionen-monate"
import type { GeplanteAktionenEintrag, GeplanteAktionenTagAnzeige } from "@/components/geplante-aktion-tag"
import type { InfoFormularOptionen } from "@/components/info-form-felder"
import { infosGeplantFuerZeitraum } from "@/lib/infos/abfragen"
import { infoAktualisieren, infoAnhangLoeschen, infoLoeschen } from "@/lib/infos/aktionen"
import { istGeschaeftsfuehrung } from "@/lib/infos/sichtbarkeit"
import { aufgabenGeplantFuerZeitraum } from "@/lib/aufgaben/abfragen"
import { aufgabeAktualisieren, aufgabeAnhangLoeschen, aufgabeLoeschen } from "@/lib/aufgaben/aktionen"
import { auftraegeGeplantFuerZeitraum } from "@/lib/auftraege/abfragen"
import { auftragLoeschen } from "@/lib/auftraege/aktionen"
import { MONATSNAMEN, istGleicherTag, monatVerschieben, monatsraster } from "@/lib/kalender"

/**
 * Eigene Kalenderansicht für Infos, Aufgaben und Aufträge mit "Geplant
 * für" (siehe Kommentar an Info.geplantAm/Aufgabe.geplantAm/
 * Auftrag.geplantAm) — Muster: /kalender/page.tsx, aber ohne Feiertage/
 * Schulferien/Suche/Erinnerungen und ohne "+ Termin"-Knopf: Angelegt wird
 * ein geplanter Eintrag weiterhin ausschließlich über das jeweilige
 * "Geplant für"-Feld im Newsfeed-, To-do- bzw. Aufgaben-Formular, nicht
 * hier. Zeigt nur die EIGENEN Einträge, bei denen jemals ein Termin
 * gesetzt wurde — nicht die Termin-Kalender-Termine (siehe Kontext im Plan).
 */
export default async function GeplanteAktionenSeite({
  searchParams,
}: {
  searchParams: Promise<{ jahr?: string; monat?: string }>
}) {
  const kontext = await berechtigung()
  const { jahr: jahrParam, monat: monatParam } = await searchParams

  const heute = new Date()
  const jahrGeparst = jahrParam ? Number.parseInt(jahrParam, 10) : NaN
  const monatGeparst = monatParam ? Number.parseInt(monatParam, 10) - 1 : NaN

  const jahr = Number.isInteger(jahrGeparst) ? jahrGeparst : heute.getFullYear()
  const monatIndex0 =
    Number.isInteger(monatGeparst) && monatGeparst >= 0 && monatGeparst <= 11 ? monatGeparst : heute.getMonth()

  const rasterProMonat = [0, 1, 2].map((versatz) => {
    const anker = monatVerschieben(jahr, monatIndex0, versatz)
    return { ...anker, wochen: monatsraster(anker.jahr, anker.monatIndex0) }
  })

  const ersterTag = rasterProMonat[0].wochen[0][0].datum
  const letzteWoche = rasterProMonat[2].wochen[rasterProMonat[2].wochen.length - 1]
  const letzterTag = letzteWoche[letzteWoche.length - 1].datum

  const [infos, aufgaben, auftraege, darfAlsUnternehmen, personen, gruppen, abteilungen, kategorien] = await Promise.all([
    infosGeplantFuerZeitraum(kontext, ersterTag, letzterTag),
    aufgabenGeplantFuerZeitraum(kontext.personId, ersterTag, letzterTag),
    auftraegeGeplantFuerZeitraum(kontext.personId, ersterTag, letzterTag),
    istGeschaeftsfuehrung(kontext.personId),
    prisma.person.findMany({
      where: { aktiv: true, benutzername: { not: kontext.personId } },
      orderBy: [{ nachname: "asc" }, { vorname: "asc" }],
      select: { benutzername: true, vorname: true, nachname: true },
    }),
    prisma.gruppe.findMany({ where: { aktiv: true }, orderBy: { name: "asc" } }),
    prisma.abteilung.findMany({ where: { aktiv: true }, orderBy: { name: "asc" } }),
    prisma.infoKategorie.findMany({ where: { aktiv: true }, orderBy: { name: "asc" } }),
  ])

  const optionen: InfoFormularOptionen = {
    personen: personen.map((p) => ({ id: p.benutzername, name: `${p.vorname} ${p.nachname}` })),
    gruppen: gruppen.map((g) => ({ id: g.id, name: g.name })),
    abteilungen: abteilungen.map((a) => ({ id: a.id, name: a.name })),
    kategorien: kategorien.map((k) => ({ id: k.id, name: k.name })),
    darfAlsUnternehmen,
  }

  // Infos, Aufgaben und Aufträge gemeinsam pro Tag bucketen, dann je Tag
  // nach Zeit sortiert (Info nach veroeffentlichtAm, Aufgabe/Auftrag nach
  // geplantAm) — die Tageszelle bekommt so schon eine fertig gemischte,
  // sortierte Liste.
  const eintraegeProTag = new Map<string, GeplanteAktionenEintrag[]>()
  const hinzufuegen = (tagesSchluessel: string, eintrag: GeplanteAktionenEintrag) => {
    const liste = eintraegeProTag.get(tagesSchluessel) ?? []
    liste.push(eintrag)
    eintraegeProTag.set(tagesSchluessel, liste)
  }
  for (const info of infos) {
    hinzufuegen(info.veroeffentlichtAm.toDateString(), { typ: "info", info })
  }
  for (const aufgabe of aufgaben) {
    hinzufuegen(aufgabe.geplantAm!.toDateString(), { typ: "aufgabe", aufgabe })
  }
  for (const auftrag of auftraege) {
    hinzufuegen(auftrag.geplantAm!.toDateString(), { typ: "auftrag", auftrag })
  }
  const zeitVonEintrag = (eintrag: GeplanteAktionenEintrag) =>
    (eintrag.typ === "info"
      ? eintrag.info.veroeffentlichtAm
      : eintrag.typ === "aufgabe"
        ? eintrag.aufgabe.geplantAm!
        : eintrag.auftrag.geplantAm!
    ).getTime()
  for (const liste of eintraegeProTag.values()) {
    liste.sort((a, b) => zeitVonEintrag(a) - zeitVonEintrag(b))
  }

  const angezeigteMonate: GeplanteAktionenMonatAnzeige[] = rasterProMonat.map((monat) => ({
    jahr: monat.jahr,
    monatIndex0: monat.monatIndex0,
    monatsname: MONATSNAMEN[monat.monatIndex0],
    wochen: monat.wochen.map((woche) =>
      woche.map(
        (kalendertag): GeplanteAktionenTagAnzeige => ({
          datumIso: kalendertag.datum.toISOString(),
          tag: kalendertag.tag,
          imAktuellenMonat: kalendertag.imAktuellenMonat,
          istHeute: istGleicherTag(kalendertag.datum, heute),
          eintraege: eintraegeProTag.get(kalendertag.datum.toDateString()) ?? [],
        }),
      ),
    ),
  }))

  const zurueck = monatVerschieben(jahr, monatIndex0, -1)
  const vor = monatVerschieben(jahr, monatIndex0, 1)
  const linkFuer = (ziel: { jahr: number; monatIndex0: number }) =>
    `/geplante-aktionen?jahr=${ziel.jahr}&monat=${ziel.monatIndex0 + 1}`

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <Kopfleiste name={kontext.name} />
      <h1 className="text-center text-2xl font-semibold text-marke-grau md:text-left">Geplante Aktionen</h1>
      <p className="mt-1 text-center text-sm text-neutral-500 md:text-left">
        Neue geplante Infos werden im <Link href="/newsfeed" className="text-marke-gruen-dunkel hover:underline">Newsfeed</Link> über
        &bdquo;Geplant für&ldquo; angelegt, neue geplante Aufgaben in der{" "}
        <Link href="/aufgaben/todos" className="text-marke-gruen-dunkel hover:underline">To-Do-Liste</Link>, neue geplante
        Aufträge unter <Link href="/aufgaben" className="text-marke-gruen-dunkel hover:underline">Aufgaben</Link>.
      </p>

      <div className="mt-6 grid grid-cols-1 items-center gap-4 md:grid-cols-3">
        <div />

        <div className="flex items-center justify-center gap-3">
          <Link
            href={linkFuer(zurueck)}
            aria-label="Vorherige Monate"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 transition hover:border-marke-gruen hover:text-marke-gruen-dunkel focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
          >
            ‹
          </Link>
          <span className="text-lg font-medium text-marke-grau md:hidden">
            {MONATSNAMEN[angezeigteMonate[0].monatIndex0]} {angezeigteMonate[0].jahr}
          </span>
          <span className="hidden text-lg font-medium text-marke-grau md:inline">
            {MONATSNAMEN[angezeigteMonate[0].monatIndex0]} – {MONATSNAMEN[angezeigteMonate[2].monatIndex0]}{" "}
            {angezeigteMonate[2].jahr}
          </span>
          <Link
            href={linkFuer(vor)}
            aria-label="Nächste Monate"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 transition hover:border-marke-gruen hover:text-marke-gruen-dunkel focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
          >
            ›
          </Link>
        </div>

        <form action="/geplante-aktionen" className="flex items-end justify-center gap-2 md:justify-end">
          <div>
            <label htmlFor="monat" className="block text-xs font-medium text-neutral-600">
              Monat
            </label>
            <select
              id="monat"
              name="monat"
              defaultValue={monatIndex0 + 1}
              className="h-9 w-32 rounded-lg border border-neutral-300 px-2 text-sm"
            >
              {MONATSNAMEN.map((name, i) => (
                <option key={name} value={i + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="jahr" className="block text-xs font-medium text-neutral-600">
              Jahr
            </label>
            <input
              id="jahr"
              name="jahr"
              type="number"
              defaultValue={jahr}
              className="h-9 w-24 rounded-lg border border-neutral-300 px-2 text-sm"
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

      <GeplanteAktionenMonate
        monate={angezeigteMonate}
        optionen={optionen}
        aktualisierenAktion={infoAktualisieren}
        anhangLoeschenAktion={infoAnhangLoeschen}
        loeschenAktion={infoLoeschen}
        aufgabeAktualisierenAktion={aufgabeAktualisieren}
        aufgabeAnhangLoeschenAktion={aufgabeAnhangLoeschen}
        aufgabeLoeschenAktion={aufgabeLoeschen}
        auftragLoeschenAktion={auftragLoeschen}
      />

      <ZurueckButton />
    </main>
  )
}
