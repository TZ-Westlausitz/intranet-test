import Link from "next/link"

import { InfoAvatar } from "@/components/info-avatar"

type KontaktVorschau = { benutzername: string; vorname: string; nachname: string; profilbildPfad: string | null }

/** Startseiten-Kachel "Kontakte" — Schnellzugriff auf 3–5 selbst gewählte Personen (Rückmeldung 2026-09-28), in der Reihenfolge, in der sie in den Einstellungen ausgewählt wurden. */
export function KontakteKachel({ className, personen }: { className: string; personen: KontaktVorschau[] }) {
  return (
    <div
      className={`${className} flex flex-col rounded-2xl border border-x-rand border-b-rand border-t-4 border-t-marke-gruen bg-flaeche p-4 shadow-sm transition hover:border-marke-gruen`}
    >
      <Link
        href="/kontakte"
        className="flex items-center justify-between gap-1.5 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
      >
        <h2 className="text-lg font-semibold text-ueberschrift hover:underline">Kontakte</h2>
      </Link>

      {personen.length === 0 ? (
        <p className="mt-2 text-xs text-sekundaer">Keine Kontakte ausgewählt.</p>
      ) : (
        <ul className="mt-2 flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
          {personen.map((person) => (
            <li key={person.benutzername}>
              <Link
                href={`/kontakte/${person.benutzername}`}
                className="flex items-center gap-2 rounded-lg transition hover:text-marke-gruen-dunkel"
              >
                <InfoAvatar
                  alsUnternehmen={false}
                  vorname={person.vorname}
                  nachname={person.nachname}
                  personId={person.benutzername}
                  profilbildPfad={person.profilbildPfad}
                />
                <span className="truncate text-sm text-primaer">
                  {person.vorname} {person.nachname}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
