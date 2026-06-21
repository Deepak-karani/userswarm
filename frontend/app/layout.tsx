import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "UserSwarm — AI user agents for instant UX feedback",
  description:
    "AI user agents give instant UX feedback; human labels calibrate trust; Arize proves improvement; Orkes/Agentspan coordinates the workflow.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
                U
              </span>
              <span className="font-semibold tracking-tight">UserSwarm</span>
            </Link>
            <nav className="text-sm text-slate-500">
              <Link href="/" className="hover:text-slate-900">
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
