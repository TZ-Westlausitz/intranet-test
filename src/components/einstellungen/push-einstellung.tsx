"use client"

import { useEffect, useState } from "react"

type Zustand =
  | "pruefe"
  | "nichtUnterstuetzt"
  | "iosOhneApp"
  | "nichtEingerichtet"
  | "verweigert"
  | "aus"
  | "an"

/** Der öffentliche VAPID-Schlüssel kommt als Base64-URL-Text, der Browser will Bytes. */
function schluesselAlsBytes(base64: string): Uint8Array<ArrayBuffer> {
  const auffuellung = "=".repeat((4 - (base64.length % 4)) % 4)
  const roh = atob((base64 + auffuellung).replace(/-/g, "+").replace(/_/g, "/"))
  const bytes = new Uint8Array(new ArrayBuffer(roh.length))
  for (let i = 0; i < roh.length; i++) bytes[i] = roh.charCodeAt(i)
  return bytes
}

function istApple(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  )
}

function alsAppGeoeffnet(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true
}

/**
 * Schieberegler "Mitteilungen auf diesem Gerät" (Web Push, siehe src/lib/push/).
 * Jedes Gerät meldet sich selbst an — Handy, Tablet und PC getrennt. Der
 * Browser fragt dabei nach der Erlaubnis; das muss ein Tipp der Person
 * auslösen, sonst blockiert vor allem iOS die Abfrage. Auf iPhone/iPad
 * funktioniert Push nur, wenn die Seite zum Home-Bildschirm hinzugefügt und
 * von dort geöffnet wurde. Gesendet werden nur neutrale Texte ohne Namen/Titel.
 */
export function PushEinstellung({
  oeffentlicherSchluessel,
  speichernAktion,
  loeschenAktion,
  testAktion,
}: {
  /** Öffentlicher VAPID-Schlüssel; `null` = Versand auf dem Server nicht eingerichtet. */
  oeffentlicherSchluessel: string | null
  speichernAktion: (abo: { endpoint: string; keys: { p256dh: string; auth: string } }) => Promise<void>
  loeschenAktion: (endpoint: string) => Promise<void>
  testAktion: () => Promise<{ eingerichtet: boolean; zugestellt: number }>
}) {
  const [zustand, setZustand] = useState<Zustand>("pruefe")
  const [meldung, setMeldung] = useState<string | null>(null)
  const [beschaeftigt, setBeschaeftigt] = useState(false)

  useEffect(() => {
    async function ermitteln() {
      const registrierung =
        "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration("/sw.js") : undefined
      if (!oeffentlicherSchluessel) return setZustand("nichtEingerichtet")
      if (istApple() && !alsAppGeoeffnet()) return setZustand("iosOhneApp")
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        return setZustand("nichtUnterstuetzt")
      }
      if (Notification.permission === "denied") return setZustand("verweigert")
      const abo = await registrierung?.pushManager.getSubscription()
      setZustand(abo && Notification.permission === "granted" ? "an" : "aus")
    }
    void ermitteln()
  }, [oeffentlicherSchluessel])

  async function aktivieren() {
    if (!oeffentlicherSchluessel) return
    setBeschaeftigt(true)
    setMeldung(null)
    try {
      const erlaubnis = await Notification.requestPermission()
      if (erlaubnis !== "granted") {
        setZustand(erlaubnis === "denied" ? "verweigert" : "aus")
        return
      }
      const registrierung = await navigator.serviceWorker.register("/sw.js")
      await navigator.serviceWorker.ready
      const abo =
        (await registrierung.pushManager.getSubscription()) ??
        (await registrierung.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: schluesselAlsBytes(oeffentlicherSchluessel),
        }))
      const daten = abo.toJSON()
      if (!daten.endpoint || !daten.keys?.p256dh || !daten.keys?.auth) throw new Error("unvollständiges Abo")
      await speichernAktion({ endpoint: daten.endpoint, keys: { p256dh: daten.keys.p256dh, auth: daten.keys.auth } })
      setZustand("an")
    } catch {
      setMeldung("Das hat nicht geklappt. Bitte versuche es noch einmal.")
    } finally {
      setBeschaeftigt(false)
    }
  }

  async function deaktivieren() {
    setBeschaeftigt(true)
    setMeldung(null)
    try {
      const registrierung = await navigator.serviceWorker.getRegistration("/sw.js")
      const abo = await registrierung?.pushManager.getSubscription()
      if (abo) {
        const endpoint = abo.endpoint
        await abo.unsubscribe()
        await loeschenAktion(endpoint)
      }
      setZustand("aus")
    } catch {
      setMeldung("Das hat nicht geklappt. Bitte versuche es noch einmal.")
    } finally {
      setBeschaeftigt(false)
    }
  }

  async function testen() {
    setBeschaeftigt(true)
    setMeldung(null)
    try {
      const ergebnis = await testAktion()
      setMeldung(
        !ergebnis.eingerichtet
          ? "Der Versand ist auf dem Server noch nicht eingerichtet."
          : ergebnis.zugestellt > 0
            ? "Test-Mitteilung gesendet. Sie sollte gleich ankommen."
            : "Es konnte keine Mitteilung zugestellt werden. Schalte die Mitteilungen aus und wieder an.",
      )
    } catch {
      setMeldung("Das hat nicht geklappt. Bitte versuche es noch einmal.")
    } finally {
      setBeschaeftigt(false)
    }
  }

  const hinweis: Partial<Record<Zustand, string>> = {
    nichtUnterstuetzt: "Dieses Gerät oder dieser Browser unterstützt keine Mitteilungen von Web-Apps.",
    iosOhneApp:
      "Auf iPhone und iPad gehen Mitteilungen nur, wenn die App auf dem Home-Bildschirm liegt: In Safari auf Teilen tippen, „Zum Home-Bildschirm“ wählen und die App von dort öffnen.",
    nichtEingerichtet: "Der Versand von Mitteilungen ist auf dem Server noch nicht eingerichtet.",
    verweigert:
      "Mitteilungen sind für diese Seite blockiert. Erlaube sie in den Einstellungen deines Geräts oder Browsers und lade die Seite danach neu.",
  }
  const eingeschaltet = zustand === "an"
  const bedienbar = (zustand === "an" || zustand === "aus") && !beschaeftigt

  return (
    <div className="mt-3">
      {/* Schieberegler wie beim Farbschema; schaltet sofort um. */}
      <div className="flex items-center gap-3">
        <label
          className={"relative inline-flex h-6 w-11 shrink-0 items-center " + (bedienbar ? "cursor-pointer" : "opacity-50")}
        >
          <input
            type="checkbox"
            role="switch"
            checked={eingeschaltet}
            disabled={!bedienbar}
            onChange={(ereignis) => (ereignis.target.checked ? aktivieren() : deaktivieren())}
            className="peer sr-only"
            aria-label="Mitteilungen auf diesem Gerät"
          />
          <span className="absolute inset-0 rounded-full bg-flaeche-300 transition peer-checked:bg-marke-gruen" />
          {/* bg-white bewusst literal: Der Knopf bleibt in beiden Farbschemata weiß (wie FarbschemaSchalter). */}
          <span className="absolute left-0.5 h-5 w-5 translate-x-0 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
        </label>
        <span className="text-sm font-medium text-ueberschrift">
          {zustand === "pruefe" ? "Wird geprüft …" : eingeschaltet ? "Auf diesem Gerät an" : "Auf diesem Gerät aus"}
        </span>
        {eingeschaltet && (
          <button
            type="button"
            onClick={testen}
            disabled={beschaeftigt}
            className="ml-auto h-8 rounded-lg px-2.5 text-xs font-medium text-marke-gruen-dunkel transition hover:bg-flaeche-100 disabled:opacity-60"
          >
            Test senden
          </button>
        )}
      </div>

      {hinweis[zustand] && (
        <p className="mt-2 rounded-lg bg-flaeche-schwach px-3 py-2 text-sm text-sekundaer">{hinweis[zustand]}</p>
      )}

      {meldung && (
        <p role="status" className="mt-2 text-xs text-sekundaer">
          {meldung}
        </p>
      )}
    </div>
  )
}
