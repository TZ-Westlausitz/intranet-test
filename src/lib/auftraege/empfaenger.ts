export type EmpfaengerZeile = { person: { benutzername: string; vorname: string; nachname: string } }

/**
 * Empfänger einer Aufgabe als Text für Listen und Pop-Ups: "Anna Vogel",
 * "Anna Vogel, Ben Koch". Mit `eigeneId` steht die eigene Person als "dir"
 * vorn ("dir und Ben Koch") — so erkennt jede Person sofort, dass die
 * Aufgabe auch an andere geht.
 */
export function empfaengerNamen(empfaenger: EmpfaengerZeile[], eigeneId?: string): string {
  const eigene = eigeneId ? empfaenger.some((e) => e.person.benutzername === eigeneId) : false
  const andere = empfaenger
    .filter((e) => e.person.benutzername !== eigeneId)
    .map((e) => `${e.person.vorname} ${e.person.nachname}`)
  const alle = eigene ? ["dir", ...andere] : andere
  if (alle.length <= 1) return alle[0] ?? ""
  return `${alle.slice(0, -1).join(", ")} und ${alle[alle.length - 1]}`
}
