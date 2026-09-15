import Link from "next/link"
import { revalidatePath } from "next/cache"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { dateiLoeschen } from "@/lib/ablage"
import { AusleiheStatus, Rolle } from "@/generated/prisma/enums"
import { Kopfleiste } from "@/components/kopfleiste"
import { StatusBadge } from "@/components/status-badge"
import { ZurueckButton } from "@/components/zurueck-button"
import { TestphaseLoeschenButton } from "@/components/testphase-loeschen-button"

/**
 * Bestätigte Ausleihen auf einen Blick — zum Nachschauen, was als Nächstes
 * an Übergaben ansteht, und um dabei gleich an den vorbereiteten
 * PDF-Entwurf der Nutzungsvereinbarung zu kommen.
 *
 * Zeigt auch stornierte Reservierungen (mit Vermerk statt sie einfach
 * verschwinden zu lassen) — sonst wirkt eine Stornierung wie ein
 * spurloses Löschen. Reine Übersicht, sonst keine Aktionen:
 * Bestätigen/Ablehnen passiert unter /anfragen, solange der Status noch
 * ANGEFRAGT ist; Stornieren auf der jeweiligen Ausleihe-Seite selbst.
 *
 * AUSNAHME NUR FÜR DIE TESTPHASE: der Mülleimer-Button daneben. Er löscht
 * die Ausleihe (und alles, was an ihr hängt) endgültig aus der Datenbank —
 * bewusst kein Stornieren, sondern echtes Löschen, damit Testdaten schnell
 * wieder verschwinden. Das widerspricht Regel 2 (Nachvollziehbarkeit,
 * kein spurloses Löschen) und darf deshalb NICHT in Betrieb gehen, sobald
 * andere Mitarbeitende testen oder produktiv arbeiten.
 * >>> VOR DER ERSTEN OFFIZIELLEN TESTPHASE MIT ANDEREN MITARBEITENDEN
 * >>> WIEDER ENTFERNEN: diese Funktion, den Button, die Komponente
 * >>> TestphaseLoeschenButton und den Import von dateiLoeschen oben.
 */
async function reservierungEndgueltigLoeschen(ausleiheId: string) {
  "use server"

  await berechtigung([Rolle.WERKSTATTLEITER, Rolle.ADMINISTRATION])

  const ausleihe = await prisma.ausleihe.findUnique({
    where: { id: ausleiheId },
    include: { vereinbarung: true, protokolle: true },
  })
  if (!ausleihe) return

  await prisma.$transaction([
    prisma.schadensfoto.deleteMany({ where: { schaden: { protokoll: { ausleiheId } } } }),
    prisma.schaden.deleteMany({ where: { protokoll: { ausleiheId } } }),
    prisma.uebergabeprotokoll.deleteMany({ where: { ausleiheId } }),
    prisma.vereinbarung.deleteMany({ where: { ausleiheId } }),
    prisma.fuehrerscheinkontrolle.deleteMany({ where: { ausleiheId } }),
    prisma.abrechnungsposten.deleteMany({ where: { ausleiheId } }),
    prisma.ausleihe.delete({ where: { id: ausleiheId } }),
  ])

  if (ausleihe.vereinbarungsentwurfPfad) await dateiLoeschen(ausleihe.vereinbarungsentwurfPfad)
  if (ausleihe.ausgabeprotokollEntwurfPfad) await dateiLoeschen(ausleihe.ausgabeprotokollEntwurfPfad)
  if (ausleihe.vereinbarung) {
    await dateiLoeschen(ausleihe.vereinbarung.unterschriftEntleiherPfad)
    await dateiLoeschen(ausleihe.vereinbarung.unterschriftFirmaPfad)
    await dateiLoeschen(ausleihe.vereinbarung.pdfPfad)
  }
  for (const protokoll of ausleihe.protokolle) {
    await dateiLoeschen(protokoll.unterschriftEntleiherPfad)
    await dateiLoeschen(protokoll.unterschriftFirmaPfad)
    await dateiLoeschen(protokoll.pdfPfad)
  }

  revalidatePath("/reservierungen")
}

export default async function ReservierungenSeite() {
  await berechtigung([Rolle.WERKSTATTLEITER, Rolle.ADMINISTRATION])

  const reservierungen = await prisma.ausleihe.findMany({
    where: { status: { in: [AusleiheStatus.ZUGESAGT, AusleiheStatus.STORNIERT] } },
    include: { fahrzeug: true, entleiher: true },
    orderBy: { geplantVon: "asc" },
  })

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Kopfleiste />
      <h1 className="text-2xl font-semibold text-ueberschrift">Reservierungen</h1>
      <p className="mt-1 text-sm text-primaer">Bestätigte Ausleihen</p>

      {reservierungen.length === 0 ? (
        <p className="mt-6 text-primaer">Derzeit keine bestätigten Reservierungen.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {reservierungen.map((r) => (
            <li key={r.id} className="rounded-lg border border-rand p-4">
              <div className="flex items-start gap-2">
                <Link
                  href={`/ausleihen/${r.id}`}
                  className="block min-w-0 flex-1 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen"
                >
                  <p className="flex items-center justify-between gap-2 font-medium">
                    <span>
                      {r.entleiher.vorname} {r.entleiher.nachname}
                    </span>
                    {r.status === AusleiheStatus.STORNIERT && (
                      <StatusBadge status={r.status} />
                    )}
                  </p>
                  <p className="mt-1 text-sm text-primaer">
                    {r.fahrzeug.bezeichnung} · {r.geplantVon.toLocaleDateString("de-DE")}–
                    {r.geplantBis.toLocaleDateString("de-DE")} · {r.zweck}
                  </p>
                </Link>

                <TestphaseLoeschenButton
                  action={reservierungEndgueltigLoeschen.bind(null, r.id)}
                />
              </div>

              {r.vereinbarungsentwurfPfad && (
                <Link
                  href={`/api/ausleihen/${r.id}/vereinbarungsentwurf`}
                  target="_blank"
                  className="mt-2 inline-block text-sm font-semibold text-marke-gruen-dunkel underline hover:text-ueberschrift"
                >
                  Nutzungsvereinbarung (PDF) ansehen
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}

      <ZurueckButton />
    </main>
  )
}
