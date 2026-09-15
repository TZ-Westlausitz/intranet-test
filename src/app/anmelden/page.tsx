import { redirect } from "next/navigation"
import Image from "next/image"
import { AuthError } from "next-auth"

import { signIn } from "@/lib/auth/auth"
import { Hinweis } from "@/components/hinweis"

/**
 * Anmeldung mit Benutzername und Passwort.
 *
 * Benutzername statt E-Mail, weil nicht jede/r in Therapie und Pflege eine
 * Firmenadresse hat — automatisch aus Vorname, Nachname und
 * Abteilungskürzel zusammengesetzt (siehe personErstellen), keine echte
 * E-Mail. In der ersten Fassung melden sich ohnehin nur Werkstattleiter und
 * Verwaltung an.
 */

async function anmelden(formData: FormData) {
  "use server"

  try {
    await signIn("credentials", {
      benutzername: formData.get("benutzername"),
      passwort: formData.get("passwort"),
      redirect: false,
    })
  } catch (fehler) {
    if (fehler instanceof AuthError) {
      redirect("/anmelden?fehler=1")
    }
    throw fehler
  }

  redirect("/")
}

export default async function Anmeldeseite({
  searchParams,
}: {
  searchParams: Promise<{ fehler?: string }>
}) {
  const { fehler } = await searchParams

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-5 py-10">
      {/* Suchbild-Motiv als Seitenhintergrund, nur auf der Anmeldeseite
          (Rückmeldung 2026-09-11) — bewusst die graue statt die weiße
          Variante der Datei: /anmelden bleibt immer hell (kein
          data-theme, siehe berechtigung()), weiße Linien wären auf hellem
          Grund unsichtbar. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-flaeche-schwach"
        style={{
          backgroundImage: 'url("/hg-transparent-grau.svg")',
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* /90: das Fenster selbst leicht transparent, damit die Hintergrundgrafik
          durchscheint (Rückmeldung 2026-09-11) — Eingabefelder und Knopf
          darin bleiben bewusst voll deckend (bg-flaeche bzw. bg-marke-gruen
          ohne Opazität), nur die Fensterfläche drumherum ist betroffen. */}
      <div className="w-full max-w-sm rounded-2xl border border-rand bg-flaeche/90 p-6 shadow-xl">
        <div className="flex flex-col items-center text-center">
          <Image
            src="/logo.png"
            alt="Therapie- und Pflegezentrum Westlausitz"
            width={291}
            height={56}
            priority
            className="h-14 w-auto"
          />
          <p className="mt-5 text-sm text-sekundaer">Ein Portal für</p>
          <h1 className="text-xl font-semibold text-ueberschrift">Eine Gemeinschaft für Ihre Gesundheit</h1>
        </div>

        <form action={anmelden} className="mt-8 flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-primaer">Benutzername</span>
            <input
              name="benutzername"
              required
              autoComplete="username"
              className="rounded-lg border border-rand bg-flaeche px-3 py-2.5 text-base text-primaer focus:border-marke-gruen focus:outline focus:outline-2 focus:outline-marke-gruen"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-primaer">Passwort</span>
            <input
              name="passwort"
              type="password"
              required
              autoComplete="current-password"
              className="rounded-lg border border-rand bg-flaeche px-3 py-2.5 text-base text-primaer focus:border-marke-gruen focus:outline focus:outline-2 focus:outline-marke-gruen"
            />
          </label>

          {fehler && <Hinweis>Benutzername oder Passwort stimmen nicht.</Hinweis>}

          <button
            type="submit"
            className="mt-2 rounded-lg bg-marke-gruen px-4 py-2.5 font-semibold text-neutral-900 transition hover:bg-marke-gruen-dunkel focus-visible:outline focus-visible:outline-2 focus-visible:outline-marke-gruen focus-visible:outline-offset-2"
          >
            Anmelden
          </button>
        </form>
      </div>
    </main>
  )
}
