export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type Severity = "low" | "medium" | "high" | string;
export type RunStatus = "pending" | "running" | "done" | "error";
export type Variant = "base" | "improved";

export interface Persona {
  id: string;
  name: string;
  description: string;
  traits: string[];
  goals: string[];
}

export interface StepLogItem {
  index: number;
  tool: string;
  args: Record<string, unknown> | string;
  observation: string;
  screenshot_path?: string | null;
}

export interface ReportBody {
  persona: string;
  task_success: boolean | string;
  step_log: string[];
  friction_points: string[];
  evidence: string[];
  severity: Severity;
  recommendations: string[];
  confidence: number;
}

export interface Report {
  id: string;
  persona_id: string;
  report: ReportBody;
  steps: StepLogItem[];
}

export interface RunEvent {
  node: string;
  status: string;
  detail?: string;
}

export interface EvalResult {
  eval_name: string;
  score: number;
  passed: boolean;
  explanation?: string;
}

export interface Aggregate {
  summary: string;
  overall_severity: Severity;
  top_friction_points: string[];
  recommendations: string[];
}

export interface RunOut {
  id: string;
  status: RunStatus;
  variant: Variant;
  parent_run_id?: string | null;
  url: string;
  description: string;
  audience: string;
  task: string;
  success_criteria: string;
  personas: Persona[];
  reports: Report[];
  events: RunEvent[];
  evals: EvalResult[];
  aggregate: Aggregate | null;
  error?: string | null;
}

export interface CreateRunInput {
  url: string;
  description: string;
  audience: string;
  task?: string; // optional — empty means the swarm free-explores
  success_criteria?: string;
  do_not_click_rules: string[];
}

export interface AnnotateData {
  run_id: string;
  description: string;
  task: string;
  reports: Report[];
  personas: Persona[];
  has_improved: boolean;
}

export interface AnnotationInput {
  report_id: string;
  report_b_id?: string;
  useful_to_builder?: number;
  specific_vs_vague?: number;
  hallucinated?: boolean;
  understood_task?: boolean;
  real_user_would_agree?: number;
  better_report?: "A" | "B";
  annotator: string;
}

export interface CompareMetrics {
  usefulness_rating: number;
  evidence_coverage: number;
  hallucination_risk: number;
  human_agreement: number;
  actionability_pass_rate: number;
  task_success_rate: number;
}

export interface CompareOut {
  base: CompareMetrics;
  improved: CompareMetrics;
  deltas: Partial<CompareMetrics>;
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body?.detail || body?.error || detail;
    } catch {
      /* ignore */
    }
    throw new Error(`${res.status}: ${detail}`);
  }
  return res.json() as Promise<T>;
}

export function createRun(input: CreateRunInput): Promise<{ id: string }> {
  return http<{ id: string }>("/runs", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getRun(id: string): Promise<RunOut> {
  return http<RunOut>(`/runs/${id}`);
}

export function listRuns(): Promise<RunOut[]> {
  return http<RunOut[]>("/runs");
}

export function improveRun(id: string): Promise<{ id: string }> {
  return http<{ id: string }>(`/runs/${id}/improve`, { method: "POST" });
}

export function getAnnotate(id: string): Promise<AnnotateData> {
  return http<AnnotateData>(`/annotate/${id}`);
}

export function postAnnotation(
  id: string,
  input: AnnotationInput
): Promise<{ ok: boolean }> {
  return http<{ ok: boolean }>(`/annotate/${id}`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getCompare(id: string): Promise<CompareOut> {
  return http<CompareOut>(`/runs/${id}/compare`);
}

export function staticUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${clean}`;
}
