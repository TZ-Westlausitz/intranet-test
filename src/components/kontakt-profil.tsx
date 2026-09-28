import { MessageCircle } from "lucide-react"

import { InfoAvatar } from "@/components/info-avatar"
import type { personKontaktDetail } from "@/lib/kontakte/abfragen"
import { direktkonversationOeffnen } from "@/lib/chat/aktionen"

type PersonDetail = NonNullable<Awaited<ReturnType<typeof personKontaktDetail>>>

/**
 * Reiner Anzeige-Baustein für ein Personenprofil — geteilt zwischen der
 * eigenen Seite (`/kontakte/[personId]`, Sprungziel für @Erwähnungen und
 * direkte Links) und dem Lese-Pop-up (`KontaktAnzeigenDialog`, Klick aus
 * `/kontakte` heraus). Kein "use client" nötig: reine Props → JSX, keine
 * Hooks — dadurch aus beiden Kontexten sicher importierbar. Das
 * Chat-Symbol öffnet direkt (oder legt an, `direktkonversationOeffnen`
 * per `upsert`) die Direktnachricht mit dieser Person (Rückmeldung
 * 2026-09-28) — fehlt bei der eigenen Person (kein Chat mit sich selbst,
 * serverseitig ohnehin abgelehnt) und bei bereits deaktivierten Personen.
 */
export function KontaktProfil({ person, eigenePersonId }: { person: PersonDetail; eigenePersonId: string }) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <InfoAvatar
            alsUnternehmen={false}
            vorname={person.vorname}
            nachname={person.nachname}
            personId={person.benutzername}
            profilbildPfad={person.profilbildPfad}
            groesse="gross"
          />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-ueberschrift">
              {person.vorname} {person.nachname}
            </h1>
            {!person.aktiv && <p className="text-xs text-tertiaer">Nicht mehr aktiv</p>}
          </div>
        </div>

        {person.aktiv && person.benutzername !== eigenePersonId && (
          <form action={direktkonversationOeffnen} className="shrink-0">
            <input type="hidden" name="andereId" value={person.benutzername} />
            <button
              type="submit"
              aria-label={`Chat mit ${person.vorname} ${person.nachname}`}
              title="Chat öffnen"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-rand text-primaer transition hover:border-marke-gruen hover:text-marke-gruen-dunkel"
            >
              <MessageCircle className="h-4 w-4" />
            </button>
          </form>
        )}
      </div>

      {person.aktiv && (
        <>
          {person.zugehoerigkeiten.length > 0 && (
            <div className="mt-4">
              <h2 className="text-xs font-medium text-sekundaer">Abteilung & Standort</h2>
              <ul className="mt-1.5 flex flex-col gap-1">
                {person.zugehoerigkeiten.map((z) => (
                  <li key={z.id} className="text-sm text-primaer">
                    {z.abteilung.name}
                    {z.standort ? ` · ${z.standort.name}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {person.gruppen.length > 0 && (
            <div className="mt-4">
              <h2 className="text-xs font-medium text-sekundaer">Gruppen</h2>
              <p className="mt-1.5 text-sm text-primaer">{person.gruppen.map((g) => g.gruppe.name).join(", ")}</p>
            </div>
          )}

          {(person.telefon || person.email) && (
            <div className="mt-4 flex flex-col gap-1">
              {person.telefon && (
                <p className="text-sm text-primaer">
                  <span className="text-sekundaer">Telefon: </span>
                  {person.telefon}
                </p>
              )}
              {person.email && (
                <p className="text-sm text-primaer">
                  <span className="text-sekundaer">E-Mail: </span>
                  {person.email}
                </p>
              )}
            </div>
          )}

          {person.weitereInformationen && (
            <div className="mt-4">
              <h2 className="text-xs font-medium text-sekundaer">Weitere Informationen</h2>
              <p className="mt-1.5 whitespace-pre-line text-sm text-primaer">{person.weitereInformationen}</p>
            </div>
          )}
        </>
      )}
    </>
  )
}
