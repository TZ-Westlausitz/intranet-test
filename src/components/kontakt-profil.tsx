import { InfoAvatar } from "@/components/info-avatar"
import { ROLLE_NAMEN } from "@/lib/rollen-optionen"
import type { personKontaktDetail } from "@/lib/kontakte/abfragen"

type PersonDetail = NonNullable<Awaited<ReturnType<typeof personKontaktDetail>>>

/**
 * Reiner Anzeige-Baustein für ein Personenprofil — geteilt zwischen der
 * eigenen Seite (`/kontakte/[personId]`, Sprungziel für @Erwähnungen und
 * direkte Links) und dem Lese-Pop-up (`KontaktAnzeigenDialog`, Klick aus
 * `/kontakte` heraus). Kein "use client" nötig: reine Props → JSX, keine
 * Hooks — dadurch aus beiden Kontexten sicher importierbar.
 */
export function KontaktProfil({ person }: { person: PersonDetail }) {
  return (
    <>
      <div className="flex items-center gap-3">
        <InfoAvatar
          alsUnternehmen={false}
          vorname={person.vorname}
          nachname={person.nachname}
          personId={person.benutzername}
          profilbildPfad={person.profilbildPfad}
          groesse="gross"
        />
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold text-marke-grau">
            {person.vorname} {person.nachname}
          </h1>
          {!person.aktiv && <p className="text-xs text-neutral-400">Nicht mehr aktiv</p>}
        </div>
      </div>

      {person.aktiv && (
        <>
          {person.zugehoerigkeiten.length > 0 && (
            <div className="mt-4">
              <h2 className="text-xs font-medium text-neutral-500">Abteilung & Standort</h2>
              <ul className="mt-1.5 flex flex-col gap-1">
                {person.zugehoerigkeiten.map((z) => (
                  <li key={z.id} className="text-sm text-neutral-700">
                    {z.abteilung.name}
                    {z.standort ? ` · ${z.standort.name}` : ""} · {ROLLE_NAMEN[z.rolle]}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {person.gruppen.length > 0 && (
            <div className="mt-4">
              <h2 className="text-xs font-medium text-neutral-500">Gruppen</h2>
              <p className="mt-1.5 text-sm text-neutral-700">{person.gruppen.map((g) => g.gruppe.name).join(", ")}</p>
            </div>
          )}

          {(person.telefon || person.email) && (
            <div className="mt-4 flex flex-col gap-1">
              {person.telefon && (
                <p className="text-sm text-neutral-700">
                  <span className="text-neutral-500">Telefon: </span>
                  {person.telefon}
                </p>
              )}
              {person.email && (
                <p className="text-sm text-neutral-700">
                  <span className="text-neutral-500">E-Mail: </span>
                  {person.email}
                </p>
              )}
            </div>
          )}

          {person.weitereInformationen && (
            <div className="mt-4">
              <h2 className="text-xs font-medium text-neutral-500">Weitere Informationen</h2>
              <p className="mt-1.5 whitespace-pre-line text-sm text-neutral-700">{person.weitereInformationen}</p>
            </div>
          )}
        </>
      )}
    </>
  )
}
