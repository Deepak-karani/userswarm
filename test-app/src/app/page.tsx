import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { LandingDemo } from "@/components/LandingDemo";

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6">
      <header className="flex items-center justify-between py-6">
        <Wordmark />
        <nav className="flex items-center gap-4 text-sm text-slate-600">
          <a href="#features" className="hover:text-slate-900">
            Features
          </a>
          <Link href="/pricing" className="hover:text-slate-900">
            Pricing
          </Link>
        </nav>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center py-20 text-center">
        <span className="mb-4 inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
          Project management, minus the busywork
        </span>
        <h1 className="max-w-3xl text-balance text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl">
          Plans that actually move forward
        </h1>
        <p className="mt-6 max-w-xl text-lg text-slate-600">
          Nimbus is a lightweight workspace where small teams turn fuzzy ideas
          into shipped projects — without the overhead of heavyweight tools.
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            data-testid="cta-get-started"
            className="inline-flex h-12 w-56 items-center justify-center rounded-lg bg-brand-600 px-6 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
          >
            Get started free
          </Link>
          <Link
            href="/signup"
            data-testid="cta-sign-in"
            className="inline-flex h-12 w-56 items-center justify-center rounded-lg border border-brand-600 bg-white px-6 text-base font-semibold text-brand-700 shadow-sm transition-colors hover:bg-brand-50"
          >
            Sign in
          </Link>
        </div>

        <div className="mt-14 flex w-full justify-center">
          <LandingDemo />
        </div>
      </section>

      <section
        id="features"
        className="grid gap-6 pb-16 sm:grid-cols-3"
        aria-label="Features"
      >
        {[
          {
            title: "Stay focused",
            body: "One workspace, one list of projects. No nested boards to get lost in.",
          },
          {
            title: "Move fast",
            body: "Create a project in seconds and share it with your team instantly.",
          },
          {
            title: "Zero setup",
            body: "No templates, no configuration. Sign up and you're already working.",
          },
        ].map((feature) => (
          <div
            key={feature.title}
            className="rounded-xl border border-slate-200 bg-white p-6 text-left"
          >
            <h2 className="text-base font-semibold text-slate-900">
              {feature.title}
            </h2>
            <p className="mt-2 text-sm text-slate-600">{feature.body}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500">
        © 2026 Nimbus. A demo product.
      </footer>
    </main>
  );
}
