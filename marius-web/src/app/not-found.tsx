import Link from "next/link";

export default function NotFound() {
  return (
    <main className="shell">
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>
        Not found
      </h1>
      <p style={{ color: "var(--muted)" }}>
        That page does not exist.{" "}
        <Link href="/" style={{ color: "var(--ink)" }}>
          Back to work
        </Link>
      </p>
    </main>
  );
}
