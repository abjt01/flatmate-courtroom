import Link from "next/link";

export default function NotFound() {
  return (
    <main className="wrap">
      <section className="hero">
        <p className="eyebrow">404</p>
        <h1>Case dismissed.</h1>
        <p className="lede">
          There&apos;s nothing at this address. <Link href="/">Back to the court</Link>.
        </p>
      </section>
    </main>
  );
}
