import { redirect } from "next/navigation"
import { AuthError } from "next-auth"

import { signIn } from "@/lib/auth/auth"
import { Logoleiste } from "@/components/logoleiste"
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
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 py-10">
      <Logoleiste />
      <h1 className="text-2xl font-semibold text-marke-grau">TPZ Intranet</h1>
      <p className="mt-1 text-sm text-neutral-600">Bitte anmelden</p>

      <form action={anmelden} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Benutzername</span>
          <input
            name="benutzername"
            required
            autoComplete="username"
            className="rounded-lg border border-neutral-300 px-3 py-2.5 text-base focus:border-marke-gruen focus:outline focus:outline-2 focus:outline-marke-gruen"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Passwort</span>
          <input
            name="passwort"
            type="password"
            required
            autoComplete="current-password"
            className="rounded-lg border border-neutral-300 px-3 py-2.5 text-base focus:border-marke-gruen focus:outline focus:outline-2 focus:outline-marke-gruen"
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
    </main>
  )
}
