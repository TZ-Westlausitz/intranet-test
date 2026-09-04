"use client"

/**
 * NUR FÜR DIE TESTPHASE (siehe Kommentar bei der Server Action in
 * app/(werkstatt)/reservierungen/page.tsx) — vor der ersten offiziellen
 * Testphase mit anderen Mitarbeitenden wieder entfernen. Ermöglicht echtes,
 * unwiderrufliches Löschen einer Reservierung direkt aus der Übersicht, zum
 * schnellen Aufräumen von Testdaten. Danach gilt wieder nur noch Stornieren
 * (Regel: nachvollziehbar, kein spurloses Löschen).
 */
export function TestphaseLoeschenButton({ action }: { action: (formData: FormData) => void }) {
  return (
    <form
      action={action}
      onSubmit={(ev) => {
        if (
          !confirm(
            "Reservierung wirklich endgültig löschen? Das kann nicht rückgängig gemacht werden.",
          )
        ) {
          ev.preventDefault()
        }
      }}
    >
      <button
        type="submit"
        aria-label="Reservierung endgültig löschen (nur Testphase)"
        title="Nur Testphase: endgültig löschen"
        className="rounded-md p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-700"
      >
        🗑️
      </button>
    </form>
  )
}
