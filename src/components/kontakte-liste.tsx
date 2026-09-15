"use client"

import { useEffect, useRef, useState } from "react"

import { InfoAvatar } from "@/components/info-avatar"
import { KontaktAnzeigenDialog, type KontaktAnzeigenDialogHandle } from "@/components/kontakt-anzeigen-dialog"
import { personDetailLaden } from "@/lib/kontakte/aktionen"
import { formatiereDatumAusDate, zeitAusDate } from "@/lib/datum"
import type { aktivePersonenUebersicht } from "@/lib/kontakte/abfragen"

// Laufzeit-Import aus @/lib/kontakte/abfragen vermeiden (zieht dessen
// Prisma-Import in den Browser-Bundle, diese Datei ist eine Client
// Component) — nur der Typ wird gebraucht, der ist zur Laufzeit weg.
type Person = Awaited<ReturnType<typeof aktivePersonenUebersicht>>[number]

/**
 * "Heute 10:43" / Datum / "Noch nie aktiv", farblich nach Aktualität
 * (Rückmeldung vom 2026-09-07: nie aktiv → rot, seit gestern oder länger
 * her → orange, heute → grün) — reine Date-Rechnung, kein DB-Zugriff nötig.
 */
function aktivitaetsAnzeige(letzteAktivitaet: Date | null) {
  if (!letzteAktivitaet) return { text: "Noch nie aktiv", farbe: "text-red-500" }
  const tageDiff = (Date.now() - letzteAktivitaet.getTime()) / 86_400_000
  if (tageDiff < 1) return { text: `Heute ${zeitAusDate(letzteAktivitaet)}`, farbe: "text-marke-gruen-dunkel" }
  // Kein text-marke-orange hier: die Marke-Farbe (#f6a841) ist als
  // Hintergrund mit dunklem Text gedacht (siehe Bestätigungs-Badge), als
  // kleine Textfarbe auf Weiß zu kontrastarm — stattdessen ein normales,
  // gut lesbares Tailwind-Orange mit derselben Bedeutung.
  return { text: formatiereDatumAusDate(letzteAktivitaet), farbe: "text-orange-600" }
}

/**
 * Ein Chip pro Abteilung/Gruppe statt eines langen, kommagetrennten
 * Fließtexts (Rückmeldung: sah "wild" aus) — dieselben Farben wie in
 * InfoEmpfaengerAuswahl (Abteilung grau, Gruppe orange-getönt), damit
 * Abteilung/Gruppe app-weit gleich aussehen. Bewusst `inline-block` statt
 * eines flex-wrap-Containers: nur so bleibt der umgebende
 * `line-clamp-3` wirksam (der zählt Textzeilen, keine Flex-Reihen).
 */
function AbteilungenGruppenChips({ person }: { person: Person }) {
  // Reihenfolge ist Absicht (Rückmeldung vom 2026-09-07): Abteilungen
  // zuerst im Array, damit sie beim Umbrechen immer am linken Rand der
  // Zelle beginnen, Gruppen folgen dahinter — nicht alphabetisch oder
  // sonstwie gemischt.
  const eintraege = [
    ...person.zugehoerigkeiten.map((z) => ({ key: `a-${z.id}`, name: z.abteilung.name, farbe: "bg-flaeche-200 text-primaer" })),
    ...person.gruppen.map((g) => ({ key: `g-${g.gruppeId}`, name: g.gruppe.name, farbe: "bg-marke-orange/20 text-ueberschrift" })),
  ]
  if (eintraege.length === 0) return <span className="text-tertiaer">—</span>
  return (
    <>
      {eintraege.map((e) => (
        <span key={e.key} className={"mr-1 mb-1 inline-block rounded-full px-1.5 py-0.5 text-[10px] leading-normal " + e.farbe}>
          {e.name}
        </span>
      ))}
    </>
  )
}

/**
 * Filter-Dropdown für Abteilungen & Gruppen mit eigener Suchleiste ganz
 * oben im aufgeklappten Menü (Rückmeldung: bei ~50 Einträgen ist ein
 * natives `<select>` mühsam zu durchsuchen) — ein natives `<select>`
 * kann keine eigenen Elemente wie ein Suchfeld in sein Dropdown
 * einbetten, deshalb ein selbst gebautes Menü. Klick-außen-schließt
 * analog zu InfoAktionenMenu/BenutzerMenu.
 */
function AbteilungGruppeFilter({
  abteilungen,
  gruppen,
  wert,
  onChange,
}: {
  abteilungen: { id: string; name: string }[]
  gruppen: { id: string; name: string }[]
  wert: string
  onChange: (wert: string) => void
}) {
  const [offen, setOffen] = useState(false)
  const [suchtext, setSuchtext] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)
  const sucheRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!offen) return

    function beiKlickAussen(ereignis: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(ereignis.target as Node)) {
        setOffen(false)
      }
    }

    document.addEventListener("mousedown", beiKlickAussen)
    return () => document.removeEventListener("mousedown", beiKlickAussen)
  }, [offen])

  // Beim Öffnen direkt ins Suchfeld springen, damit man sofort tippen kann.
  useEffect(() => {
    if (offen) sucheRef.current?.focus()
  }, [offen])

  const [typ, id] = wert.split(":")
  const ausgewaehlterName =
    (typ === "abteilung" ? abteilungen.find((a) => a.id === id)?.name : undefined) ??
    (typ === "gruppe" ? gruppen.find((g) => g.id === id)?.name : undefined)

  const abteilungenGefiltert = abteilungen.filter((a) => a.name.toLowerCase().includes(suchtext.toLowerCase()))
  const gruppenGefiltert = gruppen.filter((g) => g.name.toLowerCase().includes(suchtext.toLowerCase()))

  function auswaehlen(neuerWert: string) {
    onChange(neuerWert)
    setOffen(false)
    setSuchtext("")
  }

  return (
    <div ref={containerRef} className="relative sm:w-56">
      <button
        type="button"
        onClick={() => setOffen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={offen}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-flaeche-300 px-2 text-left text-sm"
      >
        <span className={"truncate " + (ausgewaehlterName ? "text-ueberschrift" : "text-sekundaer")}>
          {ausgewaehlterName ?? "Abteilungen & Gruppen"}
        </span>
        <span aria-hidden className="shrink-0 text-tertiaer">
          ▾
        </span>
      </button>

      {offen && (
        <div
          role="listbox"
          className="absolute right-0 z-20 mt-1 w-72 rounded-lg border border-rand bg-flaeche shadow-lg sm:right-auto sm:left-0"
        >
          <input
            ref={sucheRef}
            type="text"
            value={suchtext}
            onChange={(ereignis) => setSuchtext(ereignis.target.value)}
            placeholder="Suchen …"
            className="w-full border-b border-rand px-3 py-2 text-sm focus:outline-none"
          />
          <div className="max-h-64 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => auswaehlen("")}
              className="block w-full px-3 py-1.5 text-left text-sm text-primaer hover:bg-flaeche-schwach"
            >
              Alle
            </button>

            {abteilungenGefiltert.length > 0 && (
              <>
                <p className="px-3 pt-2 pb-1 text-[11px] font-medium text-tertiaer">Abteilungen</p>
                {abteilungenGefiltert.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => auswaehlen(`abteilung:${a.id}`)}
                    className="block w-full px-3 py-1.5 text-left text-sm text-primaer hover:bg-flaeche-schwach"
                  >
                    {a.name}
                  </button>
                ))}
              </>
            )}

            {gruppenGefiltert.length > 0 && (
              <>
                <p className="px-3 pt-2 pb-1 text-[11px] font-medium text-tertiaer">Gruppen</p>
                {gruppenGefiltert.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => auswaehlen(`gruppe:${g.id}`)}
                    className="block w-full px-3 py-1.5 text-left text-sm text-primaer hover:bg-flaeche-schwach"
                  >
                    {g.name}
                  </button>
                ))}
              </>
            )}

            {abteilungenGefiltert.length === 0 && gruppenGefiltert.length === 0 && (
              <p className="px-3 py-2 text-sm text-tertiaer">Keine Treffer</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Suche + Filter sind echte Interaktivität, deshalb Client Component mit
 * vorab geladenen, serialisierbaren Props (analog zu NewsfeedListe) — kein
 * Server-Roundtrip pro Tastenanschlag, dieselbe Begründung wie bei
 * PersonenAuswahl/InfoEmpfaengerAuswahl.
 */
export function KontakteListe({
  personen,
  abteilungen,
  gruppen,
}: {
  personen: Person[]
  abteilungen: { id: string; name: string }[]
  gruppen: { id: string; name: string }[]
}) {
  const [suchtext, setSuchtext] = useState("")
  const [filter, setFilter] = useState("")
  const dialogRef = useRef<KontaktAnzeigenDialogHandle>(null)

  const gefiltert = personen.filter((person) => {
    const nameTreffer = `${person.vorname} ${person.nachname}`.toLowerCase().includes(suchtext.toLowerCase())
    if (!nameTreffer) return false
    if (!filter) return true
    const [typ, id] = filter.split(":")
    if (typ === "abteilung") return person.zugehoerigkeiten.some((z) => z.abteilung.id === id)
    if (typ === "gruppe") return person.gruppen.some((g) => g.gruppe.id === id)
    return true
  })

  return (
    <>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={suchtext}
          onChange={(ereignis) => setSuchtext(ereignis.target.value)}
          placeholder="Name suchen …"
          className="h-9 flex-1 rounded-lg border border-flaeche-300 px-2 text-sm"
        />
        <AbteilungGruppeFilter abteilungen={abteilungen} gruppen={gruppen} wert={filter} onChange={setFilter} />
      </div>

      {gefiltert.length === 0 ? (
        <p className="mt-6 text-sm text-sekundaer">Keine Treffer.</p>
      ) : (
        <div className="mt-4 rounded-xl border border-rand bg-flaeche">
          {/* sticky + top-0 reicht hier ohne weiteren Offset: die Seite
              scrollt ab `md:` nicht über den ganzen Bildschirm, sondern
              nur innerhalb des eigenen Bereichs unter der festen
              Kopfzeile/Navigation (siehe src/app/layout.tsx,
              "md:overflow-y-auto") — "top-0" ist damit schon relativ zu
              genau diesem Bereich, kein zusätzlicher Kopfzeilen-Abstand
              nötig. KEIN overflow-hidden am äußeren Rahmen (würde sticky
              hier wirkungslos machen, weil dieser Rahmen sonst selbst
              zum "scrollenden Vorfahren" würde) — die passende Rundung
              oben liegt deshalb direkt an der Kopfzeile selbst, nicht am
              Zuschneiden durch den Rahmen. */}
          <div className="sticky top-0 z-10 flex items-center gap-3 rounded-t-xl border-b border-rand bg-flaeche-schwach px-4 py-2 text-xs font-medium text-sekundaer">
            <span aria-hidden className="w-9 shrink-0" />
            <span className="min-w-0 flex-1">Name</span>
            <span className="hidden w-56 shrink-0 md:block">Abteilungen & Gruppen</span>
            <span className="hidden w-32 shrink-0 lg:block">Telefon</span>
            <span className="hidden w-44 shrink-0 lg:block">E-Mail</span>
          </div>

          <ul className="flex flex-col divide-y divide-flaeche-100">
            {gefiltert.map((person) => {
              const aktivitaet = aktivitaetsAnzeige(person.letzteAktivitaet)
              return (
                // block/min-h-0/shrink-0 gegen denselben Safari-Fehler wie
                // in NewsfeedHomeKachel (Rückmeldung vom 2026-09-14): <li>
                // als Flex-Kind von <ul> bekommt sonst seine automatische
                // Mindesthöhe aus dem ungekürzten Text der line-clamp-Box
                // weiter unten statt aus deren sichtbar gekürzter Höhe;
                // shrink-0 verhindert, dass min-h-0 die Zeilen stattdessen
                // zusammendrückt/überlappen lässt. Kein Aufzählungspunkt
                // ohnehin sichtbar, daher block statt list-item
                // unbedenklich.
                <li key={person.benutzername} className="block min-h-0 shrink-0">
                  <button
                    type="button"
                    onClick={() => dialogRef.current?.oeffnen(person.benutzername)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-flaeche-schwach"
                  >
                    <InfoAvatar
                      alsUnternehmen={false}
                      vorname={person.vorname}
                      nachname={person.nachname}
                      personId={person.benutzername}
                      profilbildPfad={person.profilbildPfad}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ueberschrift">
                        {person.vorname} {person.nachname}
                      </p>
                      <p className={"text-xs " + aktivitaet.farbe}>{aktivitaet.text}</p>
                    </div>
                    {/* Ab 4 Zeilen wird gekürzt (line-clamp-3) statt beliebig
                        hoch umzubrechen (Rückmeldung dazu) — bei wenig Inhalt
                        bleibt die Spalte dank items-center der Zeile
                        linksbündig, aber vertikal mittig statt oben zu kleben.
                        Feste Breite (w-56) statt nur max-w: mit bloßem
                        max-w schrumpft die Spalte bei wenig Inhalt auf ihre
                        Inhaltsbreite, und die benachbarte flex-1-Namensspalte
                        saugt sich den frei werdenden Platz auf — das verschob
                        die Chips zeilenweise unterschiedlich weit nach rechts
                        (Rückmeldung dazu). Mit fester Breite bleibt der
                        linke Rand in jeder Zeile gleich. */}
                    <div className="hidden w-56 shrink-0 md:line-clamp-3">
                      <AbteilungenGruppenChips person={person} />
                    </div>
                    <div className="hidden w-32 shrink-0 truncate text-xs text-sekundaer lg:block">
                      {person.telefon ?? "—"}
                    </div>
                    <div className="hidden w-44 shrink-0 truncate text-xs text-sekundaer lg:block">
                      {person.email ?? "—"}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <KontaktAnzeigenDialog ref={dialogRef} personDetailLadenAktion={personDetailLaden} />
    </>
  )
}
