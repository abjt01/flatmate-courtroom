import { Fraunces, Inter } from "next/font/google";
import Link from "next/link";
import { benchInfo } from "@/lib/court";
import "./globals.css";

const serif = Fraunces({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-serif" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Flatmate Court",
  description:
    "Settle flatmate fights fairly. Everyone tells their side in private, then a bench of open-weight AI judges hands down the verdict.",
};

export default function RootLayout({ children }) {
  const { bench, chief, mock, groq } = benchInfo();
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body>
        <header className="top">
          <Link className="brand" href="/">
            ⚖️ Flatmate Court
          </Link>
        </header>
        {children}
        <footer className="foot">
          <p>
            On the bench: {bench.join(", ")}. {chief} writes the judgment. All open-weight models
            {groq ? ", served free on Groq." : "."}
          </p>
          {mock && (
            <p>
              <span className="badge">Mock mode</span> No API key set, so rulings are canned.
            </p>
          )}
        </footer>
      </body>
    </html>
  );
}
