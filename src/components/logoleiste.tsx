import Image from "next/image"

export function Logoleiste() {
  return (
    <div className="mb-6">
      <Image
        src="/logo.png"
        alt="Therapie- und Pflegezentrum Westlausitz"
        width={160}
        height={32}
        priority
        className="h-8 w-auto"
      />
    </div>
  )
}
