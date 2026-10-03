import FileCaseForm from "@/components/FileCaseForm";
import SampleCases from "@/components/SampleCases";
import { publicConfig } from "@/lib/cases";

const WORDS = ["", "one", "two", "three", "four", "five", "six"];

export default function Home() {
  const { styles, languages, samples, bench } = publicConfig();
  const count = WORDS[bench.length] ?? String(bench.length);
  const panel = bench.length === 1 ? "An open-weight AI judge" : `A bench of ${count} open-weight AI judges`;
  return (
    <main className="wrap">
      <section className="hero">
        <p className="eyebrow">Every flat has a case pending</p>
        <h1>Settle it in court.</h1>
        <p className="lede">
          Each flatmate tells their side in private. {panel} hears everyone, then hands down a verdict, a chore rota
          and a new house rule.
        </p>
      </section>

      <FileCaseForm styles={styles} languages={languages} />

      <section className="card">
        <h2>No flatmates handy?</h2>
        <p className="notice">
          Watch the bench rule on a sample case. You play the first party, so you can appeal if you don&apos;t like
          the verdict.
        </p>
        <SampleCases samples={samples} />
      </section>

      <section className="card">
        <h2>How it works</h2>
        <ol className="steps">
          <li>
            <b>File.</b> Name the dispute and who&apos;s involved. Each flatmate gets their own private link.
          </li>
          <li>
            <b>Testify.</b> Everyone writes their side. Nobody sees anyone else&apos;s until the verdict.
          </li>
          <li>
            <b>Deliberate.</b>{" "}
            {bench.length === 1
              ? "The judge weighs every side and splits the blame."
              : `${count.charAt(0).toUpperCase()}${count.slice(1)} judges, each a different open-weight model, rule on their own. The blame split is the average of their rulings, and a judge who disagrees gets a dissent.`}
          </li>
          <li>
            <b>Sign or appeal.</b> Everyone signs the verdict, or uses their one appeal.
          </li>
        </ol>
      </section>
    </main>
  );
}
