import { prisma } from "@/lib/db"
import { wissenSichtbarFuer } from "@/lib/wissen/sichtbarkeit"

type WissenKontext = { personId: string }

const ANHANG_SELECT = { id: true, dateiname: true, groesseBytes: true, mimetyp: true } as const

const EMPFAENGER_INCLUDE = {
  empfaengerPersonen: { select: { personId: true } },
  empfaengerGruppen: { select: { gruppeId: true } },
  empfaengerAbteilungen: { select: { abteilungId: true } },
} as const

/** Alle aktiven Ordner fürs Kachel-Grid auf /wissen — Artikel-Anzahl ist die GESAMTZAHL, unabhängig von der Sichtbarkeit für die anzeigende Person (wie im Altsystem-Vorbild). Dieselbe Liste dient auch als Auswahl für die Startseiten-Wissensbereich-Kachel. */
export async function ordnerUebersicht() {
  return prisma.wissensOrdner.findMany({
    where: { aktiv: true },
    include: { _count: { select: { unterordner: { where: { aktiv: true } }, artikel: true } } },
    orderBy: { name: "asc" },
  })
}

/** Für die Wissensbereich-Kachel auf der Startseite — Name + ein paar für die Person sichtbare Artikel je gewähltem Ordner, in Auswahl-Reihenfolge. Deaktivierte Ordner fallen dabei still raus (Muster: personenFuerKachel). */
export async function ordnerVorschauFuerKachel(ordnerIds: string[], kontext: WissenKontext, artikelProOrdner = 4) {
  if (ordnerIds.length === 0) return []
  const ordner = await prisma.wissensOrdner.findMany({
    where: { id: { in: ordnerIds }, aktiv: true },
    include: {
      artikel: {
        where: wissenSichtbarFuer(kontext.personId),
        orderBy: { titel: "asc" },
        take: artikelProOrdner,
        select: { id: true, titel: true },
      },
      _count: { select: { artikel: { where: wissenSichtbarFuer(kontext.personId) } } },
    },
  })
  const nachId = new Map(ordner.map((o) => [o.id, o]))
  return ordnerIds.map((id) => nachId.get(id)).filter((o): o is NonNullable<typeof o> => o !== undefined)
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

/**
 * Auswahlliste für "#" im Info-Editor (siehe Wissensverweis): aktive Ordner und
 * Unterordner sowie die Artikel, die DIESE Person sehen darf. `id` ist der
 * Zielpfad — Artikel öffnen sich auf der Ordnerseite als Pop-up (?artikel=…).
 * Artikel in deaktivierten Ordnern fehlen, genau wie die Ordner selbst.
 */
export async function wissenVerweiseFuer(personId: string) {
  const [ordner, artikel] = await Promise.all([
    prisma.wissensOrdner.findMany({
      where: { aktiv: true },
      include: { unterordner: { where: { aktiv: true }, orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    }),
    prisma.wissensArtikel.findMany({
      where: wissenSichtbarFuer(personId),
      select: {
        id: true,
        titel: true,
        ordner: { select: { id: true, name: true, aktiv: true } },
        unterordner: { select: { id: true, name: true, aktiv: true, ordner: { select: { id: true, name: true, aktiv: true } } } },
      },
      orderBy: { titel: "asc" },
    }),
  ])

  const eintraege: { id: string; name: string; hinweis: string }[] = []
  for (const o of ordner) {
    eintraege.push({ id: `/wissen/${o.id}`, name: o.name, hinweis: "Ordner" })
    for (const u of o.unterordner) {
      eintraege.push({ id: `/wissen/${o.id}/${u.id}`, name: u.name, hinweis: `Unterordner · ${o.name}` })
    }
  }
  for (const a of artikel) {
    if (a.ordner?.aktiv) {
      eintraege.push({ id: `/wissen/${a.ordner.id}?artikel=${a.id}`, name: a.titel, hinweis: `Artikel · ${a.ordner.name}` })
    } else if (a.unterordner?.aktiv && a.unterordner.ordner.aktiv) {
      const u = a.unterordner
      eintraege.push({
        id: `/wissen/${u.ordner.id}/${u.id}?artikel=${a.id}`,
        name: a.titel,
        hinweis: `Artikel · ${u.ordner.name} › ${u.name}`,
      })
    }
  }
  return eintraege
}
