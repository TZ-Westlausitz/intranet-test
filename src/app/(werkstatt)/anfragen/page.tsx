import { redirect } from "next/navigation"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { AusleiheStatus, Rolle } from "@/generated/prisma/enums"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"

/**
 * Offene Anfragen aus der Selbstbedienung (Mitarbeitende → "Fahrzeug
 * mieten"). Der Werkstattleiter bestätigt oder lehnt ab — die eigentliche
 * Unterschrift der Nutzungsvereinbarung passiert erst danach, bei der
 * Übergabe. Ein Häkchen in der Selbstbedienung ersetzt sie nicht.
 */

async function anfrageBestaetigen(formData: FormData) {
  "use server"

  const kontext = await berechtigung([Rolle.WERKSTATTLEITER, Rolle.ADMINISTRATION])
  const ausleiheId = String(formData.get("ausleiheId") ?? "")

  // updateMany statt update: die zusätzliche status-Bedingung ist keine
  // eindeutige Kennung, das lässt sich mit update() nicht kombinieren.
  await prisma.ausleihe.updateMany({
    where: { id: ausleiheId, status: AusleiheStatus.ANGEFRAGT },
    data: {
      status: AusleiheStatus.ZUGESAGT,
      entschiedenAm: new Date(),
      entschiedenVonId: kontext.personId,
    },
  })

  redirect("/anfragen")
}

async function anfrageAblehnen(formData: FormData) {
  "use server"

  const kontext = await berechtigung([Rolle.WERKSTATTLEITER, Rolle.ADMINISTRATION])
  const ausleiheId = String(formData.get("ausleiheId") ?? "")
  const ablehnungsgrund = String(formData.get("ablehnungsgrund") ?? "").trim() || null

  await prisma.ausleihe.updateMany({
    where: { id: ausleiheId, status: AusleiheStatus.ANGEFRAGT },
    data: {
      status: AusleiheStatus.ABGELEHNT,
      entschiedenAm: new Date(),
      entschiedenVonId: kontext.personId,
      ablehnungsgrund,
    },
  })

  redirect("/anfragen")
}

export default async function AnfragenSeite() {
  await berechtigung([Rolle.WERKSTATTLEITER, Rolle.ADMINISTRATION])

  const anfragen = await prisma.ausleihe.findMany({
    where: { status: AusleiheStatus.ANGEFRAGT },
    include: { fahrzeug: true, entleiher: true },
    orderBy: { angefragtAm: "asc" },
  })

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Kopfleiste />
      <h1 className="text-2xl font-semibold text-ueberschrift">Offene Anfragen</h1>

      {anfragen.length === 0 ? (
        <p className="mt-6 text-primaer">Keine offenen Anfragen.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-4">
          {anfragen.map((a) => (
            <li key={a.id} className="rounded-lg border border-rand p-4">
              <p className="font-medium">
                {a.entleiher.vorname} {a.entleiher.nachname}
              </p>
              <p className="mt-1 text-sm text-primaer">
                {a.fahrzeug.bezeichnung} · {a.geplantVon.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })}–
                {a.geplantBis.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })} · {a.zweck}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <form action={anfrageBestaetigen}>
                  <input type="hidden" name="ausleiheId" value={a.id} />
                  <button
                    type="submit"
                    className="rounded-lg bg-marke-gruen px-3 py-1.5 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
                  >
                    Bestätigen
                  </button>
                </form>

                <form action={anfrageAblehnen} className="flex flex-1 items-center gap-2">
                  <input type="hidden" name="ausleiheId" value={a.id} />
                  <input
                    type="text"
                    name="ablehnungsgrund"
                    placeholder="Grund (optional)"
                    className="min-w-0 flex-1 rounded-lg border border-flaeche-300 px-3 py-1.5 text-sm"
                  />
                  <button
                    type="submit"
                    className="whitespace-nowrap rounded-lg border border-flaeche-300 px-3 py-1.5 text-sm font-medium text-primaer transition hover:border-tertiaer"
                  >
                    Ablehnen
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ZurueckButton />
    </main>
  )
}
