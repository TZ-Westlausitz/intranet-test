import { prisma } from "@/lib/db"
import { wissenSichtbarFuer } from "@/lib/wissen/sichtbarkeit"

type WissenKontext = { personId: string }

const ANHANG_SELECT = { id: true, dateiname: true, groesseBytes: true, mimetyp: true } as const

const EMPFAENGER_INCLUDE = {
  empfaengerPersonen: { select: { personId: true } },
  empfaengerGruppen: { select: { gruppeId: true } },
  empfaengerAbteilungen: { select: { abteilungId: true } },
} as const

/** Alle aktiven Ordner fürs Kachel-Grid auf /wissen — Artikel-Anzahl ist die GESAMTZAHL, unabhängig von der Sichtbarkeit für die anzeigende Person (wie im Altsystem-Vorbild). */
export async function ordnerUebersicht() {
  return prisma.wissensOrdner.findMany({
    where: { aktiv: true },
    include: { _count: { select: { unterordner: { where: { aktiv: true } }, artikel: true } } },
    orderBy: { name: "asc" },
  })
}

/** Ein Ordner + seine aktiven Unterordner (mit Artikel-Zähler) + die für diese Person sichtbaren Artikel direkt im Ordner. */
export async function ordnerDetail(ordnerId: string, kontext: WissenKontext) {
  const [ordner, unterordner, artikel] = await Promise.all([
    prisma.wissensOrdner.findUnique({ where: { id: ordnerId } }),
    prisma.wissensUnterordner.findMany({
      where: { ordnerId, aktiv: true },
      include: { _count: { select: { artikel: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.wissensArtikel.findMany({
      where: { ordnerId, ...wissenSichtbarFuer(kontext.personId) },
      include: {
        erstelltVon: { select: { vorname: true, nachname: true } },
        anhaenge: { select: ANHANG_SELECT },
        ...EMPFAENGER_INCLUDE,
      },
      orderBy: { titel: "asc" },
    }),
  ])
  if (!ordner) return null
  return { ordner, unterordner, artikel }
}

/** Ein Unterordner + die für diese Person sichtbaren Artikel darin. */
export async function unterordnerDetail(unterordnerId: string, kontext: WissenKontext) {
  const [unterordner, artikel] = await Promise.all([
    prisma.wissensUnterordner.findUnique({ where: { id: unterordnerId }, include: { ordner: true } }),
    prisma.wissensArtikel.findMany({
      where: { unterordnerId, ...wissenSichtbarFuer(kontext.personId) },
      include: {
        erstelltVon: { select: { vorname: true, nachname: true } },
        anhaenge: { select: ANHANG_SELECT },
        ...EMPFAENGER_INCLUDE,
      },
      orderBy: { titel: "asc" },
    }),
  ])
  if (!unterordner) return null
  return { unterordner, artikel }
}

/** Volle Ansicht eines Artikels — `null`, wenn er für diese Person nicht sichtbar ist. */
export async function artikelDetailFuerPerson(artikelId: string, kontext: WissenKontext) {
  return prisma.wissensArtikel.findFirst({
    where: { id: artikelId, ...wissenSichtbarFuer(kontext.personId) },
    include: {
      erstelltVon: { select: { vorname: true, nachname: true } },
      ordner: { select: { id: true, name: true } },
      unterordner: { select: { id: true, name: true, ordnerId: true } },
      anhaenge: { select: ANHANG_SELECT },
      ...EMPFAENGER_INCLUDE,
    },
  })
}

/** Für die flache "Zuletzt bearbeitet"-Liste auf /wissen — die für diese Person sichtbaren Artikel, neueste zuerst. */
export async function zuletztBearbeiteteArtikel(kontext: WissenKontext, limit: number) {
  return prisma.wissensArtikel.findMany({
    where: wissenSichtbarFuer(kontext.personId),
    include: { anhaenge: { select: ANHANG_SELECT }, ...EMPFAENGER_INCLUDE },
    orderBy: { aktualisiertAm: "desc" },
    take: limit,
  })
}
