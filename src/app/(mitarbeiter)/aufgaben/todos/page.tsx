import { redirect } from "next/navigation"

/**
 * Die persönliche To-Do-Liste ist seit 2026-09-23 Teil von /aufgaben
 * (Rückmeldung: ohne die Berechtigung "Aufgaben", ohne Projekt und ohne
 * zugewiesenen Auftrag wirkte die Seite sonst leer) — dieser Redirect
 * fängt alte Links/Lesezeichen auf /aufgaben/todos ab.
 */
export default function ToDosSeite() {
  redirect("/aufgaben")
}
