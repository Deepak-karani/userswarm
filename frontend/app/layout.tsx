import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "UserSwarm — release a swarm of AI users on your product",
  description:
    "Release a swarm of AI users on your product and watch where they hit friction. Human labels calibrate trust; Arize proves improvement; Orkes/Agentspan coordinates the swarm.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans">
        <header className="sticky top-0 z-20 border-b border-ink-line bg-ink/85 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
            <Link href="/" className="group flex items-center gap-2.5">
              {/* swarm glyph — cool dots with one running hot */}
              <span className="flex items-center gap-[3px]">
                <span className="h-1.5 w-1.5 rounded-full bg-cool" />
                <span className="h-1.5 w-1.5 rounded-full bg-cool/70" />
                <span className="h-1.5 w-1.5 rounded-full bg-heat-ember" />
              </span>
              <span className="font-mono text-sm font-semibold uppercase tracking-[0.22em] text-fog">
                UserSwarm
              </span>
            </Link>
            <nav className="flex items-center gap-5 font-mono text-xs uppercase tracking-widest text-fog-muted">
              <Link href="/" className="transition hover:text-cool">
                New run
              </Link>
            </nav>
          </div>
        </header>
        <main className="min-h-[70vh]">{children}</main>
      </body>
    </html>
  );
}
