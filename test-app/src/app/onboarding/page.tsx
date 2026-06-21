"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
import { useStore } from "@/lib/store";

export default function OnboardingPage() {
  const router = useRouter();
  const { setWorkspaceName } = useStore();

  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!value.trim()) {
      setError("This field is required.");
      return;
    }
    setError(null);
    setWorkspaceName(value.trim());
    router.push("/app");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6">
      <header className="py-6">
        <Wordmark />
      </header>

      <div className="flex flex-1 flex-col justify-center pb-16">
        <p className="text-sm font-medium text-brand-700">Step 1 of 1</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Set up your workspace
        </h1>

        <form
          onSubmit={handleSubmit}
          noValidate
          data-testid="onboarding-form"
          className="mt-8 space-y-5"
        >
          <div>
            <label
              htmlFor="workspace"
              className="block text-sm font-medium text-slate-700"
            >
              What should we call this?
            </label>
            <input
              id="workspace"
              name="workspace"
              type="text"
              data-testid="onboarding-workspace"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
            {error ? (
              <p
                data-testid="onboarding-error"
                className="mt-1 text-sm text-red-600"
              >
                {error}
              </p>
            ) : null}
          </div>

          <button
            type="submit"
            data-testid="onboarding-continue"
            className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-brand-600 px-6 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
          >
            Continue
          </button>
        </form>
      </div>
    </main>
  );
}
