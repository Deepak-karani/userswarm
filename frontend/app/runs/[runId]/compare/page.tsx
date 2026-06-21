"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCompare, CompareOut } from "@/lib/api";
import BeforeAfterTable from "@/components/BeforeAfterTable";
import PitchFooter from "@/components/PitchFooter";

export default function ComparePage({
  params,
}: {
  params: { runId: string };
}) {
  const { runId } = params;
  const [data, setData] = useState<CompareOut | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCompare(runId)
      .then(setData)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load comparison")
      );
  }, [runId]);

  return (
    <>
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Link
          href={`/runs/${runId}`}
          className="text-sm text-accent-fg hover:underline"
        >
          ← Back to run
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">
          Base vs Improved
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Arize proves whether the improvement moved the metrics that matter.
        </p>

        <div className="mt-6">
          {error ? (
            <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          ) : !data ? (
            <p className="text-sm text-slate-400">Loading comparison…</p>
          ) : (
            <BeforeAfterTable data={data} />
          )}
        </div>
      </div>
      <PitchFooter />
    </>
  );
}
