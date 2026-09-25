"use client"

import { useEffect, useRef, useState } from "react"

/** Kantenlänge des Bildfensters im Dialog (CSS-Pixel). */
const ANSICHT = 288
/**
 * Durchmesser des Kreises = das, was später als Profilbild bleibt. Kleiner
 * als das Fenster, damit die Kreislinie nicht am Fensterrand angeschnitten
 * wird und man auch sieht, was außerhalb des Kreises liegt.
 */
const KREIS = 256
/** Kantenlänge des hochgeladenen Bildes — reicht für den größten Avatar (h-20) auch auf Retina-Displays. */
const AUSGABE = 512
const ZOOM_MAX = 4

type Quelle = { url: string; breite: number; hoehe: number }
type Versatz = { x: number; y: number }

/**
 * "Profilbild bearbeiten"-Knopf mit Zuschnitt: Die Dateiauswahl öffnet
 * einen Dialog, in dem der Bildausschnitt für die Kreismaske gewählt wird
 * (Verschieben mit dem Finger/der Maus, Zoomen per Zwei-Finger-Geste,
 * Mausrad oder Regler). Erst "Übernehmen" lädt hoch — als quadratisches
 * JPEG (512×512), gerendert im Browser aus dem gewählten Ausschnitt. Das
 * hält die Datei klein, entfernt Kameradaten (EXIF, z. B. Ortung) und der
 * Server prüft weiterhin Typ und Größe (siehe profilbildPruefen).
 *
 * `aktion` und `loeschenAktion` sind direkte Aufrufe der Server Actions
 * (kein `<form action=...>`), weil hier kein umgebendes Formular gebraucht
 * wird. "Bild löschen" setzt zurück auf den Initialen-Kreis.
 *
 * Bewusst ohne Zuschnitt-Bibliothek: Die Geometrie ist klein (Bild deckt
 * das Quadrat immer vollständig ab, Versatz wird an den Rändern
 * begrenzt) und bleibt so für Außenstehende nachvollziehbar.
 */
export function ProfilbildBearbeiten({
  aktion,
  loeschenAktion,
  hatBild,
}: {
  aktion: (formData: FormData) => Promise<void>
  /** Setzt das Profilbild zurück auf den Initialen-Kreis. */
  loeschenAktion: () => Promise<void>
  /** Der "Bild löschen"-Knopf erscheint nur, wenn es überhaupt ein Bild zu löschen gibt. */
  hatBild: boolean
}) {
  const eingabeRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const bildRef = useRef<HTMLImageElement>(null)

  const [quelle, setQuelle] = useState<Quelle | null>(null)
  const [zoom, setZoom] = useState(1)
  const [versatz, setVersatz] = useState<Versatz>({ x: 0, y: 0 })
  const [wirdHochgeladen, setWirdHochgeladen] = useState(false)
  const [fehlerText, setFehlerText] = useState<string | null>(null)
  const [wirdGeloescht, setWirdGeloescht] = useState(false)

  // Aktive Finger/Zeiger für Ziehen (einer) und Zoomen (zwei).
  const zeiger = useRef(new Map<number, { x: number; y: number }>())
  const letzterAbstand = useRef<number | null>(null)

  // Skalierung, bei der das Bild bei Zoom 1 das Quadrat gerade ausfüllt.
  const basis = quelle ? KREIS / Math.min(quelle.breite, quelle.hoehe) : 1

  /** Begrenzt den Versatz so, dass das Bild das Quadrat immer vollständig abdeckt. */
  function begrenzen(v: Versatz, z: number): Versatz {
    if (!quelle) return v
    const maxX = Math.max(0, (quelle.breite * basis * z - KREIS) / 2)
    const maxY = Math.max(0, (quelle.hoehe * basis * z - KREIS) / 2)
    return { x: Math.min(maxX, Math.max(-maxX, v.x)), y: Math.min(maxY, Math.max(-maxY, v.y)) }
  }

  function zoomSetzen(neu: number) {
    const z = Math.min(ZOOM_MAX, Math.max(1, neu))
    setZoom(z)
    setVersatz((v) => begrenzen(v, z))
  }

  // Dialog öffnen, sobald ein Bild geladen ist.
  useEffect(() => {
    if (quelle) dialogRef.current?.showModal()
  }, [quelle])

  function zuruecksetzen() {
    setQuelle((alt) => {
      if (alt) URL.revokeObjectURL(alt.url)
      return null
    })
    setZoom(1)
    setVersatz({ x: 0, y: 0 })
    zeiger.current.clear()
    letzterAbstand.current = null
  }

  function schliessen() {
    dialogRef.current?.close()
  }

  function ausgewaehlt(ereignis: React.ChangeEvent<HTMLInputElement>) {
    const datei = ereignis.target.files?.[0]
    ereignis.target.value = ""
    if (!datei) return

    setFehlerText(null)
    const url = URL.createObjectURL(datei)
    const bild = new Image()
    bild.onload = () => {
      setZoom(1)
      setVersatz({ x: 0, y: 0 })
      setQuelle({ url, breite: bild.naturalWidth, hoehe: bild.naturalHeight })
    }
    bild.onerror = () => {
      URL.revokeObjectURL(url)
      setFehlerText("Dieses Bild kann nicht gelesen werden. Bitte ein anderes Foto (JPG oder PNG) wählen.")
    }
    bild.src = url
  }

  function zeigerRunter(ereignis: React.PointerEvent<HTMLDivElement>) {
    ereignis.currentTarget.setPointerCapture(ereignis.pointerId)
    zeiger.current.set(ereignis.pointerId, { x: ereignis.clientX, y: ereignis.clientY })
    letzterAbstand.current = null
  }

  function zeigerBewegt(ereignis: React.PointerEvent<HTMLDivElement>) {
    const alt = zeiger.current.get(ereignis.pointerId)
    if (!alt) return
    const neu = { x: ereignis.clientX, y: ereignis.clientY }
    zeiger.current.set(ereignis.pointerId, neu)

    if (zeiger.current.size === 1) {
      setVersatz((v) => begrenzen({ x: v.x + neu.x - alt.x, y: v.y + neu.y - alt.y }, zoom))
    } else if (zeiger.current.size === 2) {
      const [a, b] = [...zeiger.current.values()]
      const abstand = Math.hypot(a.x - b.x, a.y - b.y)
      if (letzterAbstand.current) zoomSetzen(zoom * (abstand / letzterAbstand.current))
      letzterAbstand.current = abstand
    }
  }

  function zeigerHoch(ereignis: React.PointerEvent<HTMLDivElement>) {
    zeiger.current.delete(ereignis.pointerId)
    letzterAbstand.current = null
  }

  async function uebernehmen() {
    const bild = bildRef.current
    if (!quelle || !bild) return

    // Sichtbarer Ausschnitt in Pixeln des Originalbildes.
    const skala = basis * zoom
    const quadrat = KREIS / skala
    const links = (quelle.breite * skala / 2 - versatz.x - KREIS / 2) / skala
    const oben = (quelle.hoehe * skala / 2 - versatz.y - KREIS / 2) / skala

    const leinwand = document.createElement("canvas")
    leinwand.width = AUSGABE
    leinwand.height = AUSGABE
    const kontext = leinwand.getContext("2d")
    if (!kontext) return
    // Weißer Untergrund: JPEG kennt keine Transparenz, transparente Stellen
    // (z. B. bei Logos als PNG) würden sonst schwarz.
    kontext.fillStyle = "#ffffff"
    kontext.fillRect(0, 0, AUSGABE, AUSGABE)
    kontext.drawImage(bild, links, oben, quadrat, quadrat, 0, 0, AUSGABE, AUSGABE)

    const blob = await new Promise<Blob | null>((fertig) => leinwand.toBlob(fertig, "image/jpeg", 0.9))
    if (!blob) {
      setFehlerText("Das Bild konnte nicht zugeschnitten werden. Bitte erneut versuchen.")
      schliessen()
      return
    }

    const formData = new FormData()
    formData.append("profilbild", new File([blob], "profilbild.jpg", { type: "image/jpeg" }))
    setWirdHochgeladen(true)
    try {
      await aktion(formData)
    } finally {
      setWirdHochgeladen(false)
      schliessen()
    }
  }

  async function loeschen() {
    if (!window.confirm("Profilbild wirklich löschen? Danach werden wieder deine Initialen angezeigt.")) return
    setWirdGeloescht(true)
    try {
      await loeschenAktion()
    } finally {
      setWirdGeloescht(false)
    }
  }

  const skala = basis * zoom

  return (
    <>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => eingabeRef.current?.click()}
          disabled={wirdHochgeladen || wirdGeloescht}
          className="h-9 rounded-lg bg-flaeche-100 px-3 text-sm font-medium text-primaer transition hover:bg-flaeche-200 disabled:opacity-50"
        >
          {wirdHochgeladen ? "Wird hochgeladen …" : "Profilbild bearbeiten"}
        </button>
        {hatBild && (
          <button
            type="button"
            onClick={loeschen}
            disabled={wirdHochgeladen || wirdGeloescht}
            className="h-9 rounded-lg px-3 text-sm font-medium text-red-600 transition hover:bg-red-500/10 disabled:opacity-50"
          >
            {wirdGeloescht ? "Wird gelöscht …" : "Bild löschen"}
          </button>
        )}
      </div>
      {fehlerText && (
        <p role="alert" className="max-w-xs text-center text-sm text-red-600">
          {fehlerText}
        </p>
      )}
      <input
        ref={eingabeRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        onChange={ausgewaehlt}
        className="hidden"
      />

      <dialog
        ref={dialogRef}
        onClose={zuruecksetzen}
        className="fixed top-1/2 left-1/2 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-rand bg-flaeche p-0 shadow-xl backdrop:bg-neutral-900/40"
      >
        {quelle && (
          <div className="flex flex-col items-center gap-4 px-5 py-5">
            <h2 className="self-start text-lg font-semibold text-ueberschrift">Bildausschnitt wählen</h2>

            {/* touch-none: sonst scrollt/zoomt iPadOS die Seite statt das Bild zu verschieben. */}
            <div
              onPointerDown={zeigerRunter}
              onPointerMove={zeigerBewegt}
              onPointerUp={zeigerHoch}
              onPointerCancel={zeigerHoch}
              onWheel={(e) => zoomSetzen(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08))}
              style={{ width: ANSICHT, height: ANSICHT }}
              className="relative cursor-grab touch-none select-none overflow-hidden rounded-lg bg-white active:cursor-grabbing"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- lokale Vorschau aus einer Blob-URL */}
              <img
                ref={bildRef}
                src={quelle.url}
                alt="Vorschau des gewählten Bildes"
                draggable={false}
                style={{
                  position: "absolute",
                  maxWidth: "none",
                  width: quelle.breite * skala,
                  height: quelle.hoehe * skala,
                  left: ANSICHT / 2 + versatz.x - (quelle.breite * skala) / 2,
                  top: ANSICHT / 2 + versatz.y - (quelle.hoehe * skala) / 2,
                }}
                className="pointer-events-none"
              />
              {/* Kreismaske: der Bereich außerhalb des Kreises wird abgedunkelt — genau das, was später sichtbar bleibt, liegt im Kreis. */}
              <div
                aria-hidden
                style={{ width: KREIS, height: KREIS }}
                className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
              />
            </div>

            <label className="flex w-full items-center gap-3 text-xs text-sekundaer">
              Zoom
              <input
                type="range"
                min={1}
                max={ZOOM_MAX}
                step={0.01}
                value={zoom}
                onChange={(e) => zoomSetzen(Number(e.target.value))}
                className="h-8 flex-1 accent-marke-gruen"
              />
            </label>
            <p className="text-center text-xs text-tertiaer">
              Bild verschieben, mit zwei Fingern oder dem Regler vergrößern.
            </p>

            <div className="flex w-full justify-end gap-2">
              <button
                type="button"
                onClick={schliessen}
                disabled={wirdHochgeladen}
                className="h-10 rounded-lg px-4 text-sm font-medium text-sekundaer transition hover:bg-flaeche-100 disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={uebernehmen}
                disabled={wirdHochgeladen}
                className="h-10 rounded-lg bg-marke-gruen px-4 text-sm font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel disabled:opacity-60"
              >
                {wirdHochgeladen ? "Wird hochgeladen …" : "Übernehmen"}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </>
  )
}
