"use client"

import { useEffect, useRef, useState } from "react"
import { Camera, X } from "lucide-react"

/** Längste Bildkante nach dem Verkleinern — für die Schadensdokumentation reicht das, die Datei bleibt klein. */
const MAX_KANTE = 1600
const JPEG_QUALITAET = 0.85
const MAX_FOTOS = 8

type Foto = { id: number; datei: File; vorschauUrl: string }

/**
 * Foto-Auswahl für einen Fahrzeugschaden: Jedes gewählte Bild wird im
 * Browser auf höchstens 1600 Pixel verkleinert und als neues JPEG
 * gerendert. Das hält die Datei klein und entfernt dabei alle Kamera-
 * Metadaten (EXIF, z. B. die GPS-Position, Regel 10); der Server entfernt
 * sie zur Sicherheit noch einmal (siehe jpegOhneMetadaten).
 *
 * Die fertigen Dateien werden in ein verstecktes `<input type="file">`
 * mit dem Namen `name` geschrieben und gehen so mit dem ganz normalen
 * Formular-Absenden an die Server Action — kein eigener Upload-Weg.
 * `absendenText` zeigt, sobald Fotos gewählt sind, einen eigenen
 * Absenden-Knopf (für das nachträgliche Hinzufügen); beim Erfassen sendet
 * das umgebende Formular selbst.
 */
export function SchadenFotoAuswahl({ name = "fotos", absendenText }: { name?: string; absendenText?: string }) {
  const waehlenRef = useRef<HTMLInputElement>(null)
  const versendenRef = useRef<HTMLInputElement>(null)
  const naechsteId = useRef(0)
  const [fotos, setFotos] = useState<Foto[]>([])
  const [bearbeitet, setBearbeitet] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  // Das versteckte Absende-Feld immer auf den aktuellen Stand bringen.
  useEffect(() => {
    if (!versendenRef.current) return
    const transfer = new DataTransfer()
    for (const foto of fotos) transfer.items.add(foto.datei)
    versendenRef.current.files = transfer.files
  }, [fotos])

  // Vorschau-URLs beim Verlassen freigeben.
  useEffect(() => {
    return () => fotos.forEach((foto) => URL.revokeObjectURL(foto.vorschauUrl))
    // Nur beim Abbau — einzelne Fotos räumen sich beim Entfernen selbst auf.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function verkleinern(datei: File): Promise<File> {
    const bild = await createImageBitmap(datei)
    const faktor = Math.min(1, MAX_KANTE / Math.max(bild.width, bild.height))
    const leinwand = document.createElement("canvas")
    leinwand.width = Math.round(bild.width * faktor)
    leinwand.height = Math.round(bild.height * faktor)
    leinwand.getContext("2d")!.drawImage(bild, 0, 0, leinwand.width, leinwand.height)
    bild.close()
    const blob = await new Promise<Blob | null>((fertig) => leinwand.toBlob(fertig, "image/jpeg", JPEG_QUALITAET))
    if (!blob) throw new Error("kein JPEG")
    return new File([blob], `schaden-${Date.now()}-${naechsteId.current}.jpg`, { type: "image/jpeg" })
  }

  async function ausgewaehlt(ereignis: React.ChangeEvent<HTMLInputElement>) {
    const dateien = Array.from(ereignis.target.files ?? [])
    ereignis.target.value = ""
    if (dateien.length === 0) return

    setFehler(null)
    setBearbeitet(true)
    const neu: Foto[] = []
    let nichtLesbar = 0
    for (const datei of dateien) {
      if (fotos.length + neu.length >= MAX_FOTOS) break
      try {
        const klein = await verkleinern(datei)
        neu.push({ id: naechsteId.current++, datei: klein, vorschauUrl: URL.createObjectURL(klein) })
      } catch {
        nichtLesbar++
      }
    }
    setFotos((alt) => [...alt, ...neu])
    setBearbeitet(false)

    if (nichtLesbar > 0) {
      setFehler("Ein Foto konnte nicht gelesen werden. Bitte als JPG oder PNG aufnehmen bzw. auswählen.")
    } else if (fotos.length + dateien.length > MAX_FOTOS) {
      setFehler(`Es sind höchstens ${MAX_FOTOS} Fotos auf einmal möglich.`)
    }
  }

  function entfernen(id: number) {
    setFotos((alt) => {
      const weg = alt.find((foto) => foto.id === id)
      if (weg) URL.revokeObjectURL(weg.vorschauUrl)
      return alt.filter((foto) => foto.id !== id)
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <input ref={versendenRef} type="file" name={name} multiple className="hidden" tabIndex={-1} aria-hidden />
      <input
        ref={waehlenRef}
        type="file"
        accept="image/*"
        multiple
        onChange={ausgewaehlt}
        className="hidden"
        tabIndex={-1}
        aria-hidden
      />

      {fotos.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {fotos.map((foto) => (
            <li key={foto.id} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={foto.vorschauUrl} alt="Vorschau des gewählten Fotos" className="h-20 w-20 rounded-lg border border-rand object-cover" />
              <button
                type="button"
                onClick={() => entfernen(foto.id)}
                aria-label="Foto entfernen"
                className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-neutral-800 text-white"
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => waehlenRef.current?.click()}
          disabled={bearbeitet || fotos.length >= MAX_FOTOS}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-flaeche-300 px-3 text-sm font-medium text-primaer transition hover:bg-flaeche-100 disabled:opacity-60"
        >
          <Camera className="h-4 w-4" aria-hidden />
          {bearbeitet ? "Wird verkleinert …" : fotos.length > 0 ? "Weitere Fotos" : "Fotos hinzufügen"}
        </button>
        {absendenText && fotos.length > 0 && (
          <button
            type="submit"
            className="h-9 rounded-lg bg-marke-gruen px-3 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel"
          >
            {absendenText}
          </button>
        )}
      </div>

      {fehler && <p className="text-xs text-red-700 dark:text-red-400">{fehler}</p>}
    </div>
  )
}
