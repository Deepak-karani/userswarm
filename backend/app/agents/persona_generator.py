"""PersonaGeneratorAgent: synthesize 3-5 distinct user personas for a target.

Prompt deliberately contains the words "generate" and "persona" so the offline
mock keys onto the right canned response.
"""
from __future__ import annotations

from ..llm.client import FAST, LLMClient

_DEFAULT_PERSONAS = [
    {"name": "Skeptical Compliance Buyer",
     "description": "A critical, hard-to-convince evaluator who assumes claims are marketing until proven. "
                    "Reads pricing and proof points closely, distrusts vague copy, and bounces fast if "
                    "anything feels hand-wavy or broken. Lens: does this actually back up what it promises?",
     "traits": ["skeptical", "critical", "proof-seeking", "low-patience-for-fluff", "desktop"],
     "goals": ["verify the product delivers on its claims before trusting it"]},
    {"name": "Impatient Mobile Skimmer",
     "description": "A time-starved, mobile-first user who never reads — only skims headlines and taps the "
                    "biggest button. Low patience: if the path isn't obvious in seconds they give up. "
                    "Lens: can I get this done in three taps without thinking?",
     "traits": ["impatient", "mobile-first", "skims-never-reads", "taps-fast", "easily-frustrated"],
     "goals": ["finish the task as fast as possible with minimal reading"]},
    {"name": "Thorough Detail Researcher",
     "description": "A methodical, detail-oriented researcher who reads every word, compares options, and opens "
                    "secondary pages before committing. High patience, high diligence. Lens: do I fully "
                    "understand every detail and trade-off before I act?",
     "traits": ["thorough", "reads-everything", "high-patience", "comparison-driven", "detail-oriented"],
     "goals": ["understand the product completely before committing to anything"]},
    {"name": "Non-Technical First-Timer",
     "description": "A non-technical newcomer who has never seen this category of product and gets confused by "
                    "jargon, dense forms, or unexplained steps. Needs hand-holding and plain language. "
                    "Lens: do I even understand what I'm supposed to do here?",
     "traits": ["non-technical", "first-timer", "confused-by-jargon", "needs-guidance", "cautious"],
     "goals": ["figure out what this is and complete the task without feeling lost"]},
    {"name": "Enthusiastic Power User",
     "description": "A tech-savvy, fast-moving power user who knows the category cold, wants shortcuts and "
                    "advanced options, and is annoyed by oversimplified or slow flows. Lens: is this "
                    "powerful and efficient enough for someone who already gets it?",
     "traits": ["tech-savvy", "fast", "power-user", "wants-shortcuts", "enthusiastic-but-demanding"],
     "goals": ["accomplish the task efficiently and probe for advanced capability"]},
]

_SYSTEM = (
    "You are a UX research lead. Generate diverse, realistic user personas for a product. "
    "Each persona must be a genuinely DIFFERENT human archetype with a distinct evaluation lens and "
    "behavioral tendency — vary patience (impatient vs thorough), reading style (skims vs reads everything), "
    "tech-savviness (non-technical first-timer vs power user), and disposition (skeptical critic vs "
    "enthusiast). Encode each persona's perspective and behavior in its description and traits, so two "
    "personas would react to the same page in clearly different ways."
)


def generate(llm: LLMClient, inputs: dict, n: int = 3) -> list[dict]:
    """Return 3-5 personas as ``{name, description, traits[], goals[]}``."""
    n = max(1, min(5, n))
    ptypes = [str(t).strip() for t in (inputs.get("persona_types") or []) if str(t).strip()]
    types_line = (
        f"The builder specifically requested these persona TYPES — generate one persona matching each "
        f"(in order, up to {n}): {', '.join(ptypes)}. "
        if ptypes else ""
    )
    user = (
        f"Generate {n} distinct personas to test this experience. {types_line}Each persona must be a different human "
        f"archetype with its own evaluation lens and behavior — e.g. a skeptical/critical buyer, an "
        f"impatient mobile-first skimmer, a thorough detail-oriented researcher, a non-technical "
        f"first-timer, an enthusiastic power user. Make the description and traits encode that persona's "
        f"perspective plus its behavioral tendency (patience, skim-vs-read, tech-savviness) so two "
        f"personas would react to the same page differently.\n"
        f"URL: {inputs.get('url', '')}\n"
        f"Description: {inputs.get('description', '')}\n"
        f"Target audience: {inputs.get('audience', '')}\n"
        f"Task to attempt: {inputs.get('task', '')}\n"
        f"Success criteria: {inputs.get('success_criteria', '')}\n\n"
        'Respond as JSON: {"personas": [{"name","description","traits":[],"goals":[]}, ...]}'
    )
    data = llm.complete_json(system=_SYSTEM, user=user, tier=FAST,
                             default={"personas": _DEFAULT_PERSONAS})
    personas = data.get("personas") if isinstance(data, dict) else None
    if not isinstance(personas, list) or not personas:
        return list(_DEFAULT_PERSONAS)[:n]

    cleaned: list[dict] = []
    for p in personas[:n]:
        if not isinstance(p, dict):
            continue
        cleaned.append({
            "name": str(p.get("name") or "Unnamed Persona"),
            "description": str(p.get("description") or ""),
            "traits": [str(t) for t in (p.get("traits") or []) if t],
            "goals": [str(g) for g in (p.get("goals") or []) if g],
        })
    return cleaned or list(_DEFAULT_PERSONAS)[:n]
