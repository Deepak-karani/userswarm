import Link from "next/link";

export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      data-testid="brand-wordmark"
      className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900"
    >
      <span
        aria-hidden="true"
        className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-sm font-bold text-white"
      >
        N
      </span>
      Nimbus
    </Link>
  );
}
