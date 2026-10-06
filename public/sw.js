/*
 * Service Worker für Push-Mitteilungen (siehe src/lib/push/). Bewusst NUR
 * Mitteilungen: kein Zwischenspeichern von Seiten und keine Offline-
 * Funktion — die App lädt wie bisher immer frisch vom Server.
 *
 * Der Server sendet nur neutrale Texte ohne Namen und Titel
 * ({ titel, text, link }); Details stehen erst in der App hinter der
 * Anmeldung. Jeder Push MUSS hier eine sichtbare Mitteilung zeigen (iOS
 * und Chrome verlangen das, sonst wird das Abo entzogen).
 */

self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (ereignis) => ereignis.waitUntil(self.clients.claim()))

self.addEventListener("push", (ereignis) => {
  let daten = {}
  try {
    daten = ereignis.data ? ereignis.data.json() : {}
  } catch {
    // Kein JSON: es bleibt beim neutralen Standardtext.
  }

  ereignis.waitUntil(
    self.registration.showNotification(daten.titel || "TPZ Intranet", {
      body: daten.text || "Neue Mitteilung",
      icon: "/icon-192.png",
      data: { link: daten.link || "/" },
    }),
  )
})

self.addEventListener("notificationclick", (ereignis) => {
  ereignis.notification.close()
  const ziel = new URL(ereignis.notification.data?.link || "/", self.location.origin).href

  ereignis.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((fenster) => {
      // Ist die App schon offen, dort hinspringen statt ein zweites Fenster zu öffnen.
      for (const eintrag of fenster) {
        if ("focus" in eintrag) {
          if ("navigate" in eintrag) eintrag.navigate(ziel)
          return eintrag.focus()
        }
      }
      return self.clients.openWindow(ziel)
    }),
  )
})
