"use client"

import { useMemo, useState } from "react"

import { PersonBearbeitenDialog, type ZugehoerigkeitAnzeige } from "@/components/admin/person-bearbeiten-dialog"

type Option = { id: string; name: string }

export type PersonZeile = {
  benutzername: string
  vorname: string
  nachname: string
  aktiv: boolean
  zugehoerigkeiten: ZugehoerigkeitAnzeige[]
  abteilungIds: string[]
  gruppenIds: string[]
  berechtigungIds: string[]
}

/**
 * Such- und Filterleiste über der Benutzerliste (Rückmeldung 2026-09-23:
 * bei wachsender Belegschaft braucht es einen Weg, gezielt jemanden zu
 * finden statt die ganze Liste durchzuscrollen). Rein clientseitiges
 * Filtern statt Server-Rundreise pro Tastendruck — die Personenliste ist
 * im Adminbereich ohnehin komplett geladen (keine tausend Einträge),
 * Tippen/Auswählen soll sofort wirken, kein Absenden/Neuladen nötig.
 *
 * Suche greift auf Name UND Benutzername (Altkonten haben teils
 * Personalnummern statt vorname.nachname@kuerzel, siehe Kommentar am
 * Model Person). Abteilung/Gruppe sind einfache Einzelauswahl-Filter,
 * kombinierbar mit der Suche (UND-Verknüpfung) — kein
 * Mehrfachauswahl-Widget, das wäre für diese Belegschaftsgröße
 * übertrieben.
 */
export function BenutzerListe({
  personen,
  abteilungen,
  gruppen,
  standorte,
  berechtigungenListe,
  benutzernameAktualisierenAktion,
  zugehoerigkeitHinzufuegenAktion,
  zugehoerigkeitBeendenAktion,
  personGruppenAktualisierenAktion,
  personBerechtigungenAktualisierenAktion,
  personPasswortZuruecksetzenAktion,
  personAktivSetzenAktion,
}: {
  personen: PersonZeile[]
  abteilungen: Option[]
  gruppen: Option[]
  standorte: Option[]
  berechtigungenListe: Option[]
  benutzernameAktualisierenAktion: (personId: string, formData: FormData) => void
  zugehoerigkeitHinzufuegenAktion: (personId: string, formData: FormData) => void
  zugehoerigkeitBeendenAktion: (zugehoerigkeitId: string) => void
  personGruppenAktualisierenAktion: (personId: string, formData: FormData) => void
  personBerechtigungenAktualisierenAktion: (personId: string, formData: FormData) => void
  personPasswortZuruecksetzenAktion: (personId: string) => Promise<string>
  personAktivSetzenAktion: (personId: string, aktiv: boolean) => void
}) {
  const [suchtext, setSuchtext] = useState("")
  const [abteilungFilter, setAbteilungFilter] = useState("")
  const [gruppeFilter, setGruppeFilter] = useState("")

  // Deaktivierte Mitarbeitende stecken seit Rückmeldung 2026-09-24 in einer
  // eigenen, eingeklappten Box unten statt grau markiert zwischen den
  // aktiven zu stehen — Suche/Filter oben wirken deshalb nur noch auf die
  // aktive Liste.
  const aktive = useMemo(() => personen.filter((person) => person.aktiv), [personen])
  const inaktive = useMemo(() => personen.filter((person) => !person.aktiv), [personen])

  const gefiltert = useMemo(() => {
    const text = suchtext.trim().toLowerCase()
    return aktive.filter((person) => {
      if (text) {
        const name = `${person.vorname} ${person.nachname}`.toLowerCase()
        if (!name.includes(text) && !person.benutzername.toLowerCase().includes(text)) return false
      }
      if (abteilungFilter && !person.abteilungIds.includes(abteilungFilter)) return false
      if (gruppeFilter && !person.gruppenIds.includes(gruppeFilter)) return false
      return true
    })
  }, [aktive, suchtext, abteilungFilter, gruppeFilter])

  const filterAktiv = suchtext.trim() !== "" || abteilungFilter !== "" || gruppeFilter !== ""

  const zeilenProps = {
    standorte,
    abteilungen,
    gruppen,
    berechtigungenListe,
    benutzernameAktualisierenAktion,
    zugehoerigkeitHinzufuegenAktion,
    zugehoerigkeitBeendenAktion,
    personGruppenAktualisierenAktion,
    personBerechtigungenAktualisierenAktion,
    personPasswortZuruecksetzenAktion,
    personAktivSetzenAktion,
  }

  return (
    <>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={suchtext}
          onChange={(ereignis) => setSuchtext(ereignis.target.value)}
          placeholder="Name oder Benutzername suchen …"
          className="h-9 flex-1 rounded-lg border border-flaeche-300 px-2 text-sm"
        />
        <select
          value={abteilungFilter}
          onChange={(ereignis) => setAbteilungFilter(ereignis.target.value)}
          className="h-9 rounded-lg border border-flaeche-300 px-2 text-sm sm:w-44"
        >
          <option value="">Alle Abteilungen</option>
          {abteilungen.map((abteilung) => (
            <option key={abteilung.id} value={abteilung.id}>
              {abteilung.name}
            </option>
          ))}
        </select>
        <select
          value={gruppeFilter}
          onChange={(ereignis) => setGruppeFilter(ereignis.target.value)}
          className="h-9 rounded-lg border border-flaeche-300 px-2 text-sm sm:w-44"
        >
          <option value="">Alle Gruppen</option>
          {gruppen.map((gruppe) => (
            <option key={gruppe.id} value={gruppe.id}>
              {gruppe.name}
            </option>
          ))}
        </select>
      </div>

      {filterAktiv && (
        <p className="mt-2 text-xs text-tertiaer">
          {gefiltert.length} von {aktive.length} Benutzern
        </p>
      )}

      <ul className="mt-3 flex flex-col divide-y divide-flaeche-100 rounded-xl border border-rand bg-flaeche">
        {gefiltert.length === 0 ? (
          <li className="px-4 py-6 text-center text-sm text-sekundaer">Keine Treffer.</li>
        ) : (
          gefiltert.map((person) => <BenutzerZeile key={person.benutzername} person={person} {...zeilenProps} />)
        )}
      </ul>

      {inaktive.length > 0 && (
        <details className="mt-6 rounded-xl border border-rand bg-flaeche">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-sekundaer">
            Deaktivierte Mitarbeiter ({inaktive.length})
          </summary>
          <ul className="flex flex-col divide-y divide-flaeche-100 border-t border-rand">
            {inaktive.map((person) => (
              <BenutzerZeile key={person.benutzername} person={person} {...zeilenProps} />
            ))}
          </ul>
        </details>
      )}
    </>
  )
}

/**
 * Eine Zeile — ausgelagert, damit dieselbe Zeile unverändert in der
 * aktiven Liste UND in der eingeklappten "Deaktivierte Mitarbeiter"-Box
 * verwendet werden kann.
 */
function BenutzerZeile({
  person,
  standorte,
  abteilungen,
  gruppen,
  berechtigungenListe,
  benutzernameAktualisierenAktion,
  zugehoerigkeitHinzufuegenAktion,
  zugehoerigkeitBeendenAktion,
  personGruppenAktualisierenAktion,
  personBerechtigungenAktualisierenAktion,
  personPasswortZuruecksetzenAktion,
  personAktivSetzenAktion,
}: {
  person: PersonZeile
  standorte: Option[]
  abteilungen: Option[]
  gruppen: Option[]
  berechtigungenListe: Option[]
  benutzernameAktualisierenAktion: (personId: string, formData: FormData) => void
  zugehoerigkeitHinzufuegenAktion: (personId: string, formData: FormData) => void
  zugehoerigkeitBeendenAktion: (zugehoerigkeitId: string) => void
  personGruppenAktualisierenAktion: (personId: string, formData: FormData) => void
  personBerechtigungenAktualisierenAktion: (personId: string, formData: FormData) => void
  personPasswortZuruecksetzenAktion: (personId: string) => Promise<string>
  personAktivSetzenAktion: (personId: string, aktiv: boolean) => void
}) {
  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <span className={"font-medium " + (person.aktiv ? "text-ueberschrift" : "text-tertiaer")}>
            {person.vorname} {person.nachname}
          </span>
          <span className="ml-2 text-xs text-tertiaer">{person.benutzername}</span>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <PersonBearbeitenDialog
            personId={person.benutzername}
            name={`${person.vorname} ${person.nachname}`}
            benutzername={person.benutzername}
            zugehoerigkeiten={person.zugehoerigkeiten}
            standorte={standorte}
            abteilungen={abteilungen}
            gruppen={gruppen}
            ausgewaehlteGruppenIds={person.gruppenIds}
            berechtigungenListe={berechtigungenListe}
            ausgewaehlteBerechtigungIds={person.berechtigungIds}
            benutzernameAktualisierenAktion={benutzernameAktualisierenAktion}
            zugehoerigkeitHinzufuegenAktion={zugehoerigkeitHinzufuegenAktion}
            zugehoerigkeitBeendenAktion={zugehoerigkeitBeendenAktion}
            personGruppenAktualisierenAktion={personGruppenAktualisierenAktion}
            personBerechtigungenAktualisierenAktion={personBerechtigungenAktualisierenAktion}
            personPasswortZuruecksetzenAktion={personPasswortZuruecksetzenAktion}
          />
          <form action={personAktivSetzenAktion.bind(null, person.benutzername, !person.aktiv)}>
            <button
              type="submit"
              className={
                "h-9 shrink-0 rounded-lg px-2.5 text-xs font-medium transition " +
                (person.aktiv
                  ? "text-sekundaer hover:bg-red-50 hover:text-red-600"
                  : "bg-marke-gruen/15 text-marke-gruen-dunkel hover:bg-marke-gruen/25")
              }
            >
              {person.aktiv ? "Deaktivieren" : "Aktivieren"}
            </button>
          </form>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 text-xs text-sekundaer">
        {person.zugehoerigkeiten.length === 0 ? (
          <span className="text-tertiaer">Keine Zugehörigkeit</span>
        ) : (
          person.zugehoerigkeiten.map((z) => (
            <span key={z.id} className="rounded-full bg-flaeche-100 px-2 py-0.5">
              {z.standort ? `${z.standort.name} · ` : ""}
              {z.abteilung.name}
            </span>
          ))
        )}
        {person.gruppenIds.length > 0 && (
          <span className="rounded-full bg-flaeche-100 px-2 py-0.5">
            {person.gruppenIds.length} Gruppe{person.gruppenIds.length === 1 ? "" : "n"}
          </span>
        )}
        {person.berechtigungIds.length > 0 && (
          <span className="rounded-full bg-flaeche-100 px-2 py-0.5">
            {person.berechtigungIds.length} Berechtigung{person.berechtigungIds.length === 1 ? "" : "en"}
          </span>
        )}
      </div>
    </li>
  )
}
