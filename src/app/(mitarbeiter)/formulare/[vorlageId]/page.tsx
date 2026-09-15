import { notFound } from "next/navigation"

import { berechtigung } from "@/lib/auth/berechtigung"
import { prisma } from "@/lib/db"
import { Kopfleiste } from "@/components/kopfleiste"
import { ZurueckButton } from "@/components/zurueck-button"
import { Hinweis } from "@/components/hinweis"
import { FormularAusfuellen } from "@/components/formular-ausfuellen"
import { formularZumAusfuellen } from "@/lib/formulare/abfragen"
import { formularEinreichen } from "@/lib/formulare/aktionen"

const FEHLER_TEXTE: Record<string, string> = {
  pflichtfeld: "Bitte alle Pflichtfelder ausfüllen.",
  elemente: "Eine Antwort ist ungültig — bitte die Auswahlfelder prüfen.",
  zuGross: "Eine Datei ist zu groß (maximal 15 MB je Anhang).",
  typUngueltig: "Nicht unterstützter Dateityp. Erlaubt sind PDF und Fotos (JPG, PNG, WEBP, HEIC).",
}

/** Formular ausfüllen — nur sichtbar, wenn `formularZumAusfuellen` etwas liefert (aktiv, kein Entwurf, für diese Person freigeschaltet, siehe dort). */
export default async function FormularAusfuellenSeite({
  params,
  searchParams,
}: {
  params: Promise<{ vorlageId: string }>
  searchParams: Promise<{ fehler?: string }>
}) {
  const kontext = await berechtigung()
  const { vorlageId } = await params
  const { fehler } = await searchParams

  const [vorlage, orte] = await Promise.all([
    formularZumAusfuellen(vorlageId, kontext),
    prisma.ort.findMany({ where: { aktiv: true }, orderBy: { name: "asc" } }),
  ])
  if (!vorlage) notFound()

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Kopfleiste />

      {fehler && <div className="mt-4"><Hinweis>{FEHLER_TEXTE[fehler] ?? "Das hat nicht geklappt."}</Hinweis></div>}

      <div className="mt-6">
        <FormularAusfuellen vorlage={vorlage} orte={orte} einreichenAktion={formularEinreichen} />
      </div>

      <ZurueckButton />
    </main>
  )
}
