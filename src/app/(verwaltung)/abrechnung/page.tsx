import { revalidatePath } from "next/cache"
import { AlertTriangle } from "lucide-react"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { formatiereCentAlsEuro } from "@/lib/geld"
import { AusleiheStatus } from "@/generated/prisma/enums"
import { Kopfleiste } from "@/components/kopfleiste"
import { Hinweis } from "@/components/hinweis"
import { ZurueckButton } from "@/components/zurueck-button"

/**
 * Auswertung für die Lohnbuchhaltung: geldwerter Vorteil je zurückgegebener
 * Ausleihe, dazu die Fünf-Tage-Warnung (BMF-Schreiben vom 3.3.2022, Rz. 16 —
 * siehe src/lib/steuer/geldwerter-vorteil.ts). Die App entscheidet hier
 * nichts, sie zeigt nur die berechneten Werte und warnt (Regel 9 sinngemäß).
 *
 * FÜNF-TAGE-GRENZE: Kalendertage einer Person werden nach dem Monat ihres
 * `geplantVon` gruppiert und aufsummiert — das ist der Monat, in dem die
 * Ausleihe stattfand, unabhängig davon, wann sie protokolliert wurde.
 */

const FUENF_TAGE_GRENZE = 5

function monatsSchluessel(personId: string, datum: Date): string {
  return `${personId}-${datum.getFullYear()}-${datum.getMonth()}`
}

async function anLohnbuchhaltungMelden(formData: FormData) {
  "use server"

  await berechtigung({ benoetigteBerechtigung: ["Werkstattleiter", "Adminbereich"] })
  const ausleiheId = String(formData.get("ausleiheId") ?? "")

  // Nur aus ZURUECKGEGEBEN heraus möglich — sonst gäbe es nichts Berechnetes
  // zu melden (Regel 5: auch hier serverseitig prüfen, nicht nur den Button
  // ausblenden).
  await prisma.ausleihe.updateMany({
    where: { id: ausleiheId, status: AusleiheStatus.ZURUECKGEGEBEN },
    data: { status: AusleiheStatus.ABGESCHLOSSEN, anLohnbuchhaltungGemeldetAm: new Date() },
  })

  revalidatePath("/abrechnung")
}

export default async function AbrechnungSeite() {
  await berechtigung({ benoetigteBerechtigung: ["Werkstattleiter", "Adminbereich"] })

  const ausleihen = await prisma.ausleihe.findMany({
    where: { status: { in: [AusleiheStatus.ZURUECKGEGEBEN, AusleiheStatus.ABGESCHLOSSEN] } },
    include: { fahrzeug: true, entleiher: true },
    orderBy: { geplantVon: "desc" },
  })

  // Kalendertage pro Person und Kalendermonat aufsummieren — Grundlage der
  // Fünf-Tage-Warnung. Zählt über beide Status hinweg (auch schon gemeldete),
  // weil die Grenze sich auf den tatsächlichen Kalendermonat bezieht, nicht
  // darauf, ob schon gemeldet wurde.
  const tageProMonat = new Map<string, number>()
  for (const a of ausleihen) {
    if (a.kalendertage === null) continue
    const schluessel = monatsSchluessel(a.entleiherId, a.geplantVon)
    tageProMonat.set(schluessel, (tageProMonat.get(schluessel) ?? 0) + a.kalendertage)
  }

  const offene = ausleihen.filter((a) => a.status === AusleiheStatus.ZURUECKGEGEBEN)
  const gemeldete = ausleihen.filter((a) => a.status === AusleiheStatus.ABGESCHLOSSEN)

  function zeile(a: (typeof ausleihen)[number]) {
    const tageImMonat = tageProMonat.get(monatsSchluessel(a.entleiherId, a.geplantVon)) ?? 0
    const ueberschritten = tageImMonat > FUENF_TAGE_GRENZE

    return (
      <li key={a.id} className="rounded-lg border border-rand p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium">
              {a.entleiher.vorname} {a.entleiher.nachname}
            </p>
            <p className="mt-0.5 text-sm text-primaer">
              {a.fahrzeug.bezeichnung} · Ausleihe {a.vorgangsnummer}
            </p>
          </div>
          {a.status === AusleiheStatus.ZURUECKGEGEBEN && (
            <form action={anLohnbuchhaltungMelden}>
              <input type="hidden" name="ausleiheId" value={a.id} />
              <button
                type="submit"
                className="shrink-0 rounded-lg bg-marke-gruen px-3 py-1.5 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
              >
                An Lohnbuchhaltung gemeldet
              </button>
            </form>
          )}
        </div>

        <dl className="mt-3 flex flex-col gap-1.5 text-sm">
          <div className="flex justify-between border-b border-flaeche-100 pb-1.5">
            <dt className="text-sekundaer">Gefahrene Kilometer</dt>
            <dd className="font-medium">{a.gefahreneKilometer ?? "—"} km</dd>
          </div>
          <div className="flex justify-between border-b border-flaeche-100 pb-1.5">
            <dt className="text-sekundaer">Kalendertage</dt>
            <dd className="font-medium">{a.kalendertage ?? "—"}</dd>
          </div>
          <div className="flex justify-between border-b border-flaeche-100 pb-1.5">
            <dt className="text-sekundaer">Geldwerter Vorteil</dt>
            <dd className="font-medium">
              {a.geldwerterVorteilCent !== null
                ? formatiereCentAlsEuro(a.geldwerterVorteilCent)
                : "Kein Listenpreis hinterlegt"}
            </dd>
          </div>
          {a.anLohnbuchhaltungGemeldetAm && (
            <div className="flex justify-between">
              <dt className="text-sekundaer">Gemeldet am</dt>
              <dd className="font-medium">
                {a.anLohnbuchhaltungGemeldetAm.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })}
              </dd>
            </div>
          )}
        </dl>

        {ueberschritten && (
          <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-marke-orange/40 bg-marke-orange/10 px-3 py-2 text-sm text-ueberschrift">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              {a.entleiher.vorname} {a.entleiher.nachname} kommt in{" "}
              {a.geplantVon.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin", month: "long", year: "numeric" })} auf{" "}
              {tageImMonat} Kalendertage — über der Fünf-Tage-Grenze. Statt der
              0,001-%-Regel greift dann vermutlich die 1-%-Regelung für den
              ganzen Monat. Bitte mit dem Steuerberater klären.
            </span>
          </p>
        )}
      </li>
    )
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Kopfleiste />
      <h1 className="text-2xl font-semibold text-ueberschrift">Abrechnung</h1>
      <p className="mt-1 text-sm text-primaer">
        Geldwerter Vorteil aus privater Fahrzeugnutzung — zur Meldung an die
        Lohnbuchhaltung.
      </p>

      <Hinweis>
        Die Berechnung (0,001 % des Listenpreises je gefahrenem Kilometer)
        muss vor dem Produktivbetrieb vom Steuerberater bestätigt werden.
        Diese Seite warnt bei mehr als fünf Kalendertagen im Monat, sie
        entscheidet nicht, welche Regel im Einzelfall gilt.
      </Hinweis>

      <h2 className="mt-8 text-sm font-medium text-sekundaer">
        Noch zu melden ({offene.length})
      </h2>
      {offene.length === 0 ? (
        <p className="mt-3 text-primaer">Keine offenen Meldungen.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">{offene.map(zeile)}</ul>
      )}

      {gemeldete.length > 0 && (
        <>
          <h2 className="mt-8 text-sm font-medium text-sekundaer">
            Bereits gemeldet ({gemeldete.length})
          </h2>
          <ul className="mt-3 flex flex-col gap-3">{gemeldete.map(zeile)}</ul>
        </>
      )}

      <ZurueckButton />
    </main>
  )
}
