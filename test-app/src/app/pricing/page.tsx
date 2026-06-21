import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "For individuals getting started",
    features: ["3 projects", "Unlimited tasks", "1 team member", "Basic reports"],
    cta: "Get started",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$12",
    period: "per user/month",
    description: "For small teams that need more",
    features: ["Unlimited projects", "Unlimited tasks", "Up to 10 members", "Calendar view", "Priority support", "Activity feed"],
    cta: "Start free trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "contact us",
    description: "For organizations at scale",
    features: ["Everything in Pro", "Unlimited members", "SSO & SAML", "Audit logs", "Dedicated support", "Custom integrations"],
    cta: "Contact sales",
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6">
      <header className="flex items-center justify-between py-6">
        <Wordmark />
        <nav className="flex items-center gap-4 text-sm text-slate-600">
          <Link href="/#features" className="hover:text-slate-900">Features</Link>
          <Link href="/pricing" className="font-medium text-slate-900">Pricing</Link>
        </nav>
      </header>

      <section className="flex-1 py-20">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Simple, transparent pricing
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600">
            Start free, upgrade when your team grows. No hidden fees, no surprises.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3" data-testid="pricing-grid">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              data-testid={`plan-${plan.name.toLowerCase()}`}
              className={`flex flex-col rounded-2xl border p-8 ${
                plan.highlighted
                  ? "border-brand-600 bg-white shadow-lg ring-1 ring-brand-600"
                  : "border-slate-200 bg-white"
              }`}
            >
              {plan.highlighted && (
                <span className="mb-4 inline-block w-fit rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
                  Most popular
                </span>
              )}
              <h2 className="text-xl font-bold text-slate-900">{plan.name}</h2>
              <p className="mt-1 text-sm text-slate-500">{plan.description}</p>
              <div className="mt-6">
                <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
                <span className="ml-2 text-sm text-slate-500">{plan.period}</span>
              </div>
              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-slate-600">
                    <svg className="h-4 w-4 shrink-0 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                data-testid={`cta-${plan.name.toLowerCase()}`}
                className={`mt-8 inline-flex h-11 items-center justify-center rounded-lg px-6 text-sm font-semibold transition-colors ${
                  plan.highlighted
                    ? "bg-brand-600 text-white shadow-sm hover:bg-brand-700"
                    : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500">
        &copy; 2026 Nimbus. A demo product.
      </footer>
    </main>
  );
}
