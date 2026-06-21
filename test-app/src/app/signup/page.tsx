"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
import { useStore } from "@/lib/store";

type Errors = {
  name?: string;
  email?: string;
  password?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupPage() {
  const router = useRouter();
  const { setUser } = useStore();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});

  function validate(): Errors {
    const next: Errors = {};
    if (!name.trim()) {
      next.name = "Enter your name.";
    }
    if (!EMAIL_RE.test(email.trim())) {
      next.email = "Enter a valid email address.";
    }
    // Password rules are intentionally only surfaced here, after a failed submit.
    if (password.length < 8 || !/[0-9]/.test(password)) {
      next.password =
        "Password must be at least 8 characters and include a number.";
    }
    return next;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      return;
    }
    setUser({ name: name.trim(), email: email.trim() });
    router.push("/onboarding");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6">
      <header className="py-6">
        <Wordmark />
      </header>

      <div className="flex flex-1 flex-col justify-center pb-16">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Create your account
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Start your free Nimbus workspace. No credit card required.
        </p>

        <form
          onSubmit={handleSubmit}
          noValidate
          data-testid="signup-form"
          className="mt-8 space-y-5"
        >
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-slate-700"
            >
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              data-testid="signup-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
            {errors.name ? (
              <p
                data-testid="signup-name-error"
                className="mt-1 text-sm text-red-600"
              >
                {errors.name}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-700"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              data-testid="signup-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
            {errors.email ? (
              <p
                data-testid="signup-email-error"
                className="mt-1 text-sm text-red-600"
              >
                {errors.email}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              data-testid="signup-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
            {errors.password ? (
              <p
                data-testid="signup-password-error"
                className="mt-1 text-sm text-red-600"
              >
                {errors.password}
              </p>
            ) : null}
          </div>

          <button
            type="submit"
            data-testid="signup-submit"
            className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-brand-600 px-6 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
          >
            Create account
          </button>
        </form>
      </div>
    </main>
  );
}
