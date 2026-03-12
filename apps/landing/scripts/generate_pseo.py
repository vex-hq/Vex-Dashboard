#!/usr/bin/env python3
"""Programmatic SEO content generator for Vex landing page.

Uses LiteLLM + Claude Sonnet 4.6 to fill strict JSON schemas
with niche-aware content based on the taxonomy files.

Usage:
    python scripts/generate_pseo.py --all
    python scripts/generate_pseo.py --category guides
    python scripts/generate_pseo.py --category guides --slug langchain
    python scripts/generate_pseo.py --all --dry-run
"""

import argparse
import asyncio
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import litellm
from pydantic import BaseModel, Field

# ── Paths ───────────────────────────────────────────────────────────

CONTENT_DIR = Path(__file__).resolve().parent.parent / "content" / "pseo"
TAXONOMY_DIR = CONTENT_DIR / "taxonomy"

MODEL = "anthropic/claude-sonnet-4-6"
MAX_CONCURRENT = 50
SEMAPHORE = asyncio.Semaphore(MAX_CONCURRENT)


# ── Pydantic models (mirrors TypeScript types) ──────────────────────


class GuidePoint(BaseModel):
    title: str
    explanation: str


class GuideFailure(BaseModel):
    name: str
    description: str
    severity: str = Field(pattern=r"^(critical|high|medium)$")
    example: str


class GuideStep(BaseModel):
    title: str
    description: str
    code: str
    language: str = Field(pattern=r"^(python|typescript)$")


class GuideTip(BaseModel):
    title: str
    description: str


class GuideContent(BaseModel):
    intro: str
    whyGuardrails: dict[str, Any]
    commonFailures: dict[str, Any]
    integration: dict[str, Any]
    bestPractices: dict[str, Any]
    cta: dict[str, Any]


class FrameworkGuideSchema(BaseModel):
    meta: dict[str, str]
    seo: dict[str, Any]
    content: GuideContent


class ChecklistItem(BaseModel):
    label: str
    description: str
    priority: str = Field(pattern=r"^(critical|high|medium)$")


class ChecklistSection(BaseModel):
    heading: str
    description: str
    items: list[ChecklistItem]


class ChecklistContentSchema(BaseModel):
    intro: str
    sections: list[ChecklistSection]
    regulatoryNotes: dict[str, Any]
    cta: dict[str, Any]


class ConceptApproach(BaseModel):
    name: str
    description: str
    strengths: list[str]
    weaknesses: list[str]


class ComparisonRow(BaseModel):
    dimension: str
    approachA: str
    approachB: str


class ConceptComparisonContentSchema(BaseModel):
    intro: str
    approachA: ConceptApproach
    approachB: ConceptApproach
    comparison: list[ComparisonRow]
    recommendation: dict[str, str]
    cta: dict[str, Any]


class ProblemExample(BaseModel):
    scenario: str
    consequence: str


class DetectionMethod(BaseModel):
    name: str
    description: str
    effectiveness: str = Field(pattern=r"^(high|medium|low)$")


class FixStrategy(BaseModel):
    name: str
    description: str
    code: str | None = None
    language: str | None = None


class ProblemGuideContentSchema(BaseModel):
    intro: str
    whatIsIt: dict[str, Any]
    howToDetect: dict[str, Any]
    howToFix: dict[str, Any]
    bestPractices: dict[str, Any]
    cta: dict[str, Any]


# ── Taxonomy loading ────────────────────────────────────────────────


def load_json(path: Path) -> Any:
    return json.loads(path.read_text())


def load_taxonomy():
    frameworks = load_json(TAXONOMY_DIR / "frameworks.json")
    use_cases = load_json(TAXONOMY_DIR / "use-cases.json")
    industries = load_json(TAXONOMY_DIR / "industries.json")
    return frameworks, use_cases, industries


# ── LLM call ────────────────────────────────────────────────────────


async def generate_json(system_prompt: str, user_prompt: str) -> dict:
    async with SEMAPHORE:
        response = await litellm.acompletion(
            model=MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
            max_tokens=4096,
        )
        text = response.choices[0].message.content
        return json.loads(text)


# ── Title templates (deterministic, NOT AI-generated) ───────────────


def guide_title(framework_name: str) -> str:
    return f"How to Add Guardrails to {framework_name} Agents"


def checklist_title(industry_name: str, use_case_name: str) -> str:
    return f"{industry_name} {use_case_name} AI Agent Checklist"


def concept_comparison_title(concept: dict) -> str:
    return concept["title"]


def problem_guide_title(problem: dict) -> str:
    return problem["title"]


# ── Generators ──────────────────────────────────────────────────────


CONCEPT_COMPARISONS = [
    {
        "slug": "guardrails-vs-finetuning",
        "title": "Guardrails vs Fine-Tuning for Agent Reliability",
        "approachA": "Runtime Guardrails",
        "approachB": "Fine-Tuning",
    },
    {
        "slug": "runtime-verification-vs-prompt-engineering",
        "title": "Runtime Verification vs Prompt Engineering",
        "approachA": "Runtime Verification",
        "approachB": "Prompt Engineering",
    },
    {
        "slug": "open-source-vs-commercial-monitoring",
        "title": "Agent Monitoring: Open Source vs Commercial",
        "approachA": "Open Source Tools",
        "approachB": "Commercial Platforms",
    },
    {
        "slug": "pre-deploy-evals-vs-runtime-checks",
        "title": "Pre-Deploy Evals vs Runtime Checks for AI Agents",
        "approachA": "Pre-Deploy Evaluations",
        "approachB": "Runtime Checks",
    },
    {
        "slug": "single-agent-vs-multi-agent-safety",
        "title": "Single-Agent vs Multi-Agent Safety Patterns",
        "approachA": "Single-Agent Architecture",
        "approachB": "Multi-Agent Architecture",
    },
]

PROBLEM_GUIDES = [
    {"slug": "hallucination-detection", "title": "AI Agent Hallucination Detection Guide"},
    {"slug": "drift-monitoring", "title": "AI Agent Drift Monitoring Guide"},
    {"slug": "tool-loop-detection", "title": "Tool Loop Detection in AI Agents"},
    {"slug": "pii-filtering", "title": "PII Filtering for AI Agents"},
    {"slug": "prompt-injection-prevention", "title": "Prompt Injection Prevention for AI Agents"},
    {"slug": "output-consistency", "title": "Ensuring Output Consistency in AI Agents"},
]


async def generate_guide(framework: dict) -> dict:
    title = guide_title(framework["name"])
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    system_prompt = (
        "You are a technical writer for Vex, an AI agent reliability platform. "
        "Generate structured JSON content for a framework integration guide. "
        "Be specific to the framework — reference its actual API patterns, classes, and methods. "
        "Include real, working code examples using the Vex Python or TypeScript SDK. "
        "Do NOT be generic. Every section must be specific to this framework."
    )

    user_prompt = f"""Generate a guide for: {framework['name']}

Framework context:
- Language: {framework['language']}
- Common failure modes: {json.dumps(framework['commonFailureModes'])}
- Integration method: {framework['integrationMethod']}
- Install: {framework['installSnippet']}
- Description: {framework['description']}

Return JSON with this exact structure:
{{
  "content": {{
    "intro": "2-3 sentences introducing why {framework['name']} developers need guardrails",
    "whyGuardrails": {{
      "heading": "Why {framework['name']} Agents Need Guardrails",
      "points": [exactly 4 objects with "title" and "explanation"]
    }},
    "commonFailures": {{
      "heading": "Common {framework['name']} Failure Modes",
      "failures": [exactly 5 objects with "name", "description", "severity" (critical|high|medium), "example"]
    }},
    "integration": {{
      "heading": "Integrating Vex with {framework['name']}",
      "steps": [exactly 4 objects with "title", "description", "code" (real working code), "language" (python|typescript)]
    }},
    "bestPractices": {{
      "heading": "Best Practices",
      "tips": [exactly 5 objects with "title" and "description"]
    }},
    "cta": {{
      "heading": "Start Securing Your {framework['name']} Agents",
      "description": "one sentence CTA"
    }}
  }}
}}

IMPORTANT: Return ONLY the JSON object. Code examples must be real and specific to {framework['name']}."""

    data = await generate_json(system_prompt, user_prompt)

    return {
        "meta": {"framework": framework["slug"], "generatedAt": now},
        "seo": {
            "title": title,
            "description": f"Learn how to add runtime guardrails to {framework['name']} agents with Vex. Detect hallucinations, prevent drift, and auto-correct bad outputs.",
            "keywords": [
                f"{framework['name']} guardrails",
                f"{framework['name']} monitoring",
                f"{framework['name']} hallucination detection",
                f"Vex {framework['name']}",
                "AI agent reliability",
            ],
        },
        "content": data["content"],
    }


async def generate_checklist(industry: dict, use_case: dict) -> dict:
    title = checklist_title(industry["name"], use_case["name"])
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    slug = f"{industry['slug']}-{use_case['slug']}"

    system_prompt = (
        "You are a compliance and AI safety expert writing for Vex. "
        "Generate a structured checklist for deploying AI agents in a specific industry and use case. "
        "Be specific to the industry regulations and use case requirements. "
        "Each checklist item should be actionable and concrete, not vague."
    )

    user_prompt = f"""Generate a checklist for: {industry['name']} + {use_case['name']}

Industry context:
- Compliance: {json.dumps(industry['complianceRequirements'])}
- Sensitivity: {industry['sensitivityLevel']}
- Regulations: {json.dumps(industry['commonRegulations'])}
- Failure consequences: {industry['failureConsequences']}

Use case context:
- Architecture: {use_case['typicalArchitecture']}
- Risk profile: {use_case['riskProfile']}
- Verification needs: {json.dumps(use_case['verificationNeeds'])}

Return JSON:
{{
  "content": {{
    "intro": "2-3 sentences about why this checklist matters for {industry['name']} {use_case['name']}",
    "sections": [exactly 4 sections, each with "heading", "description", and "items" (6-8 items each with "label", "description", "priority" (critical|high|medium))],
    "regulatoryNotes": {{
      "heading": "Regulatory Considerations",
      "notes": [exactly 4 specific regulatory notes for {industry['name']}]
    }},
    "cta": {{
      "heading": "Automate Your {industry['name']} Agent Compliance",
      "description": "one sentence CTA"
    }}
  }}
}}

IMPORTANT: Return ONLY the JSON object. Be specific to {industry['name']} regulations and {use_case['name']} patterns."""

    data = await generate_json(system_prompt, user_prompt)

    return {
        "meta": {"industry": industry["slug"], "useCase": use_case["slug"], "generatedAt": now},
        "seo": {
            "title": title,
            "description": f"Production readiness checklist for {use_case['name'].lower()} AI agents in {industry['name'].lower()}. Covers {', '.join(industry['complianceRequirements'][:3])}.",
            "keywords": [
                f"{industry['name']} AI checklist",
                f"{use_case['name']} agent checklist",
                f"{industry['name']} AI compliance",
                "AI agent production readiness",
                "AI guardrails checklist",
            ],
        },
        "content": data["content"],
    }


async def generate_concept_comparison(concept: dict) -> dict:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    system_prompt = (
        "You are a technical architect writing for Vex. "
        "Generate a balanced comparison between two approaches to AI agent reliability. "
        "Be fair to both approaches but highlight where runtime verification (Vex's approach) fits."
    )

    user_prompt = f"""Generate a comparison: {concept['approachA']} vs {concept['approachB']}

Return JSON:
{{
  "content": {{
    "intro": "2-3 sentences framing this comparison",
    "approachA": {{
      "name": "{concept['approachA']}",
      "description": "2-3 sentences",
      "strengths": [exactly 4 strings],
      "weaknesses": [exactly 4 strings]
    }},
    "approachB": {{
      "name": "{concept['approachB']}",
      "description": "2-3 sentences",
      "strengths": [exactly 4 strings],
      "weaknesses": [exactly 4 strings]
    }},
    "comparison": [exactly 5 objects with "dimension", "approachA" (brief), "approachB" (brief)],
    "recommendation": {{
      "heading": "Which Should You Choose?",
      "summary": "2-3 sentences with balanced recommendation"
    }},
    "cta": {{
      "heading": "Try Runtime Verification with Vex",
      "description": "one sentence CTA"
    }}
  }}
}}

IMPORTANT: Return ONLY the JSON object."""

    data = await generate_json(system_prompt, user_prompt)

    return {
        "meta": {"slug": concept["slug"], "generatedAt": now},
        "seo": {
            "title": concept["title"],
            "description": f"Compare {concept['approachA']} and {concept['approachB']} for AI agent reliability. Understand trade-offs and when to use each approach.",
            "keywords": [
                concept["approachA"].lower(),
                concept["approachB"].lower(),
                "AI agent reliability",
                "agent safety comparison",
            ],
        },
        "content": data["content"],
    }


async def generate_problem_guide(problem: dict) -> dict:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    system_prompt = (
        "You are a technical writer for Vex, an AI agent reliability platform. "
        "Generate a deep-dive guide on a specific AI agent problem. "
        "Include concrete examples, detection methods, and fixes with code."
    )

    user_prompt = f"""Generate a guide for: {problem['title']}

Return JSON:
{{
  "content": {{
    "intro": "2-3 sentences introducing the problem",
    "whatIsIt": {{
      "heading": "What Is {problem['title'].replace('Guide', '').strip()}?",
      "explanation": "2-3 paragraphs explaining the problem",
      "examples": [exactly 4 objects with "scenario" and "consequence"]
    }},
    "howToDetect": {{
      "heading": "How to Detect It",
      "methods": [exactly 4 objects with "name", "description", "effectiveness" (high|medium|low)]
    }},
    "howToFix": {{
      "heading": "How to Fix It",
      "strategies": [exactly 4 objects with "name", "description", and optionally "code" (Python) and "language"]
    }},
    "bestPractices": {{
      "heading": "Best Practices",
      "tips": [exactly 5 objects with "title" and "description"]
    }},
    "cta": {{
      "heading": "Detect and Fix This Automatically with Vex",
      "description": "one sentence CTA"
    }}
  }}
}}

IMPORTANT: Return ONLY the JSON object. Include real code examples where relevant."""

    data = await generate_json(system_prompt, user_prompt)

    return {
        "meta": {"slug": problem["slug"], "generatedAt": now},
        "seo": {
            "title": problem["title"],
            "description": f"Complete guide to {problem['title'].lower()}. Learn detection methods, fixes, and best practices for production AI agents.",
            "keywords": [
                problem["title"].lower().replace(" ", "-"),
                "AI agent reliability",
                "agent monitoring",
            ],
        },
        "content": data["content"],
    }


# ── Write helpers ───────────────────────────────────────────────────


def write_json(path: Path, data: dict):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    print(f"  ✓ {path.relative_to(CONTENT_DIR)}")


# ── Main ────────────────────────────────────────────────────────────


async def run_guides(frameworks: list, slug: str | None = None, dry_run: bool = False):
    targets = [f for f in frameworks if slug is None or f["slug"] == slug]
    print(f"\n▸ Generating {len(targets)} framework guides...")
    if dry_run:
        for f in targets:
            print(f"  [dry-run] {f['slug']}: {guide_title(f['name'])}")
        return

    tasks = [generate_guide(f) for f in targets]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    for f, result in zip(targets, results):
        if isinstance(result, Exception):
            print(f"  ✗ {f['slug']}: {result}")
        else:
            write_json(CONTENT_DIR / "guides" / f"{f['slug']}.json", result)


async def run_checklists(
    industries: list, use_cases: list, slug: str | None = None, dry_run: bool = False
):
    pairs = []
    for ind in industries:
        for uc in use_cases:
            s = f"{ind['slug']}-{uc['slug']}"
            if slug is None or s == slug:
                pairs.append((ind, uc))

    print(f"\n▸ Generating {len(pairs)} checklists...")
    if dry_run:
        for ind, uc in pairs:
            print(f"  [dry-run] {ind['slug']}-{uc['slug']}: {checklist_title(ind['name'], uc['name'])}")
        return

    tasks = [generate_checklist(ind, uc) for ind, uc in pairs]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    for (ind, uc), result in zip(pairs, results):
        s = f"{ind['slug']}-{uc['slug']}"
        if isinstance(result, Exception):
            print(f"  ✗ {s}: {result}")
        else:
            write_json(CONTENT_DIR / "checklists" / f"{s}.json", result)


async def run_concept_comparisons(slug: str | None = None, dry_run: bool = False):
    targets = [c for c in CONCEPT_COMPARISONS if slug is None or c["slug"] == slug]
    print(f"\n▸ Generating {len(targets)} concept comparisons...")
    if dry_run:
        for c in targets:
            print(f"  [dry-run] {c['slug']}: {c['title']}")
        return

    tasks = [generate_concept_comparison(c) for c in targets]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    for c, result in zip(targets, results):
        if isinstance(result, Exception):
            print(f"  ✗ {c['slug']}: {result}")
        else:
            write_json(CONTENT_DIR / "comparisons" / "concepts" / f"{c['slug']}.json", result)


async def run_problem_guides(slug: str | None = None, dry_run: bool = False):
    targets = [p for p in PROBLEM_GUIDES if slug is None or p["slug"] == slug]
    print(f"\n▸ Generating {len(targets)} problem guides...")
    if dry_run:
        for p in targets:
            print(f"  [dry-run] {p['slug']}: {p['title']}")
        return

    tasks = [generate_problem_guide(p) for p in targets]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    for p, result in zip(targets, results):
        if isinstance(result, Exception):
            print(f"  ✗ {p['slug']}: {result}")
        else:
            write_json(CONTENT_DIR / "problem-guides" / f"{p['slug']}.json", result)


async def main():
    parser = argparse.ArgumentParser(description="Generate pSEO content for Vex")
    parser.add_argument("--all", action="store_true", help="Generate all categories")
    parser.add_argument("--category", choices=["guides", "checklists", "comparisons", "problem-guides"])
    parser.add_argument("--slug", help="Generate a single page by slug")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be generated")
    parser.add_argument("--model", default=MODEL, help=f"LiteLLM model (default: {MODEL})")
    args = parser.parse_args()

    global MODEL
    MODEL = args.model

    if not args.all and not args.category:
        parser.print_help()
        sys.exit(1)

    frameworks, use_cases, industries = load_taxonomy()

    total_start = datetime.now(timezone.utc)

    if args.all or args.category == "guides":
        await run_guides(frameworks, args.slug, args.dry_run)

    if args.all or args.category == "checklists":
        await run_checklists(industries, use_cases, args.slug, args.dry_run)

    if args.all or args.category == "comparisons":
        await run_concept_comparisons(args.slug, args.dry_run)

    if args.all or args.category == "problem-guides":
        await run_problem_guides(args.slug, args.dry_run)

    elapsed = (datetime.now(timezone.utc) - total_start).total_seconds()
    print(f"\n✓ Done in {elapsed:.1f}s")


if __name__ == "__main__":
    asyncio.run(main())
