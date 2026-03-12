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

DEFAULT_MODEL = "xai/grok-4.1-fast-non-reasoning"
MAX_CONCURRENT = 50
SEMAPHORE = asyncio.Semaphore(MAX_CONCURRENT)

# LiteLLM proxy config (reads from .env.local or environment)
LITELLM_API_URL = os.getenv("LITELLM_API_URL")
LITELLM_API_KEY = os.getenv("LITELLM_API_KEY")

# Runtime model (can be overridden via --model flag)
_model = DEFAULT_MODEL


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
    problems = load_json(TAXONOMY_DIR / "problems.json")
    return frameworks, use_cases, industries, problems


# ── LLM call ────────────────────────────────────────────────────────


async def generate_json(system_prompt: str, user_prompt: str) -> dict:
    async with SEMAPHORE:
        # When routing through LiteLLM proxy, use openai/ prefix so litellm
        # treats the proxy as an OpenAI-compatible endpoint.
        model = f"openai/{_model}" if LITELLM_API_URL else _model
        kwargs: dict[str, Any] = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt + "\n\nReturn ONLY raw JSON. No markdown fences, no explanation."},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.3,
            "max_tokens": 16384,
        }
        if LITELLM_API_URL:
            kwargs["api_base"] = LITELLM_API_URL
        if LITELLM_API_KEY:
            kwargs["api_key"] = LITELLM_API_KEY

        response = await litellm.acompletion(**kwargs)
        text = response.choices[0].message.content.strip()
        # Strip markdown fences if model wraps JSON in ```json ... ```
        if text.startswith("```"):
            text = text.split("\n", 1)[1] if "\n" in text else text[3:]
            text = text.rsplit("```", 1)[0].strip()
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


def framework_usecase_title(framework_name: str, usecase_name: str) -> str:
    return f"Building {usecase_name} with {framework_name} + Vex Guardrails"


def framework_industry_title(framework_name: str, industry_name: str) -> str:
    return f"{framework_name} Guardrails for {industry_name}"


def problem_framework_title(problem_title: str, framework_name: str) -> str:
    return f"{problem_title.replace(' Guide', '')} in {framework_name} Agents"


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
    {
        "slug": "observability-vs-monitoring",
        "title": "Observability vs Monitoring for AI Agents",
        "approachA": "Observability",
        "approachB": "Monitoring",
    },
    {
        "slug": "rule-based-vs-llm-guardrails",
        "title": "Rule-Based vs LLM-Based Guardrails",
        "approachA": "Rule-Based Guardrails",
        "approachB": "LLM-Based Guardrails",
    },
    {
        "slug": "frameworks-vs-custom",
        "title": "Agent Frameworks vs Custom Orchestration",
        "approachA": "Agent Frameworks",
        "approachB": "Custom Orchestration",
    },
    {
        "slug": "cloud-vs-on-premise",
        "title": "Cloud vs On-Premise Agent Deployment",
        "approachA": "Cloud Deployment",
        "approachB": "On-Premise Deployment",
    },
    {
        "slug": "sync-vs-async-verification",
        "title": "Synchronous vs Async Agent Verification",
        "approachA": "Synchronous Verification",
        "approachB": "Asynchronous Verification",
    },
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


async def generate_framework_usecase(framework: dict, use_case: dict) -> dict:
    title = framework_usecase_title(framework["name"], use_case["name"])
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    system_prompt = (
        "You are a technical writer for Vex, an AI agent reliability platform. "
        "Generate structured JSON content for a framework × use-case integration guide. "
        "Be specific to both the framework's API patterns and the use case's architecture. "
        "Include real, working code examples using the Vex Python or TypeScript SDK."
    )

    user_prompt = f"""Generate a guide for: {framework['name']} + {use_case['name']}

Framework context:
- Language: {framework['language']}
- Common failure modes: {json.dumps(framework['commonFailureModes'])}
- Integration method: {framework['integrationMethod']}
- Install: {framework['installSnippet']}
- Description: {framework['description']}

Use case context:
- Architecture: {use_case['typicalArchitecture']}
- Risk profile: {use_case['riskProfile']}
- Verification needs: {json.dumps(use_case['verificationNeeds'])}

Return JSON with this exact structure:
{{
  "content": {{
    "intro": "2-3 sentences introducing building {use_case['name']} with {framework['name']} and why guardrails matter",
    "architectureOverview": {{
      "heading": "{use_case['name']} Architecture with {framework['name']}",
      "description": "2-3 paragraphs describing the typical architecture",
      "diagram": "ASCII or text-based architecture diagram"
    }},
    "risks": [exactly 4 objects with "name", "description", "severity" (critical|high|medium), "mitigation"],
    "implementation": [exactly 4 objects with "title", "description", "code" (real working code), "language" (python|typescript)],
    "vexIntegration": [exactly 3 objects with "title", "description", "code" (real working code), "language" (python|typescript)],
    "cta": {{
      "heading": "Secure Your {framework['name']} {use_case['name']}",
      "description": "one sentence CTA"
    }}
  }}
}}

IMPORTANT: Return ONLY the JSON object. Code examples must be real and specific to {framework['name']} and {use_case['name']}. Use {'python and typescript' if framework['language'] == 'both' else framework['language']} for code examples."""

    data = await generate_json(system_prompt, user_prompt)

    return {
        "meta": {"framework": framework["slug"], "useCase": use_case["slug"], "generatedAt": now},
        "seo": {
            "title": title,
            "description": f"Learn how to build {use_case['name'].lower()} with {framework['name']} + Vex guardrails. Detect failures, prevent drift, and ensure reliability.",
            "keywords": [
                f"{framework['name']} {use_case['name'].lower()}",
                f"{framework['name']} guardrails",
                f"{use_case['name'].lower()} reliability",
                f"Vex {framework['name']}",
                "AI agent guardrails",
            ],
        },
        "content": data["content"],
    }


async def generate_framework_industry(framework: dict, industry: dict) -> dict:
    title = framework_industry_title(framework["name"], industry["name"])
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    system_prompt = (
        "You are a compliance expert writing for Vex, an AI agent reliability platform. "
        "Generate structured JSON content for a framework × industry compliance guide. "
        "Be specific to both the framework's patterns and the industry's regulations. "
        "Include real, working code examples using the Vex Python or TypeScript SDK."
    )

    user_prompt = f"""Generate a compliance guide for: {framework['name']} in {industry['name']}

Framework context:
- Language: {framework['language']}
- Common failure modes: {json.dumps(framework['commonFailureModes'])}
- Integration method: {framework['integrationMethod']}
- Install: {framework['installSnippet']}
- Description: {framework['description']}

Industry context:
- Compliance: {json.dumps(industry['complianceRequirements'])}
- Sensitivity: {industry['sensitivityLevel']}
- Regulations: {json.dumps(industry['commonRegulations'])}
- Failure consequences: {industry['failureConsequences']}

Return JSON with this exact structure:
{{
  "content": {{
    "intro": "2-3 sentences about why {industry['name']} teams using {framework['name']} need compliance guardrails",
    "complianceRequirements": [exactly 4 objects with "regulation", "description", "howVexHelps"],
    "industryRisks": [exactly 4 objects with "name", "description", "severity" (critical|high|medium), "example"],
    "implementation": [exactly 3 objects with "title", "description", "code" (real working code), "language" (python|typescript)],
    "caseStudyScenario": {{
      "heading": "{framework['name']} in {industry['name']}: A Scenario",
      "scenario": "2-3 paragraphs describing a realistic deployment scenario",
      "outcome": "1-2 paragraphs describing the outcome with Vex guardrails"
    }},
    "cta": {{
      "heading": "Comply with {industry['name']} Regulations Using Vex",
      "description": "one sentence CTA"
    }}
  }}
}}

IMPORTANT: Return ONLY the JSON object. Code examples must be real and specific to {framework['name']} in {industry['name']}. Use {'python and typescript' if framework['language'] == 'both' else framework['language']} for code examples."""

    data = await generate_json(system_prompt, user_prompt)

    return {
        "meta": {"framework": framework["slug"], "industry": industry["slug"], "generatedAt": now},
        "seo": {
            "title": title,
            "description": f"Compliance guide for {framework['name']} agents in {industry['name'].lower()}. Meet {', '.join(industry['complianceRequirements'][:2])} requirements with Vex guardrails.",
            "keywords": [
                f"{framework['name']} {industry['name'].lower()}",
                f"{industry['name'].lower()} AI compliance",
                f"{framework['name']} guardrails",
                f"{industry['name'].lower()} AI agents",
                "AI compliance guardrails",
            ],
        },
        "content": data["content"],
    }


async def generate_problem_framework(problem: dict, framework: dict) -> dict:
    title = problem_framework_title(problem["title"], framework["name"])
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    system_prompt = (
        "You are a technical writer for Vex, an AI agent reliability platform. "
        "Generate a deep-dive guide on how a specific problem manifests in a specific framework. "
        "Be specific to how this problem appears in this framework's patterns and APIs. "
        "Include concrete detection methods and fixes with real code."
    )

    user_prompt = f"""Generate a problem × framework deep-dive for: {problem['title']} in {framework['name']}

Problem: {problem['title']}

Framework context:
- Language: {framework['language']}
- Common failure modes: {json.dumps(framework['commonFailureModes'])}
- Integration method: {framework['integrationMethod']}
- Install: {framework['installSnippet']}
- Description: {framework['description']}

Return JSON with this exact structure:
{{
  "content": {{
    "intro": "2-3 sentences about how {problem['title'].replace(' Guide', '')} specifically manifests in {framework['name']} agents",
    "howItManifests": [exactly 4 objects with "scenario", "symptom", "impact"],
    "detection": [exactly 3 objects with "name", "description", "code" (real working code), "language" (python|typescript)],
    "fixes": [exactly 3 objects with "name", "description", "code" (real working code), "language" (python|typescript)],
    "vexAutomation": {{
      "heading": "Automating {problem['title'].replace(' Guide', '')} Detection with Vex",
      "description": "2-3 paragraphs on how Vex automates detection and remediation",
      "code": "real working code showing Vex integration",
      "language": "{'python' if framework['language'] != 'typescript' else 'typescript'}"
    }},
    "cta": {{
      "heading": "Detect and Fix This Automatically with Vex",
      "description": "one sentence CTA"
    }}
  }}
}}

IMPORTANT: Return ONLY the JSON object. All code must be specific to {framework['name']}. Use {'python and typescript' if framework['language'] == 'both' else framework['language']} for code examples."""

    data = await generate_json(system_prompt, user_prompt)

    return {
        "meta": {"problem": problem["slug"], "framework": framework["slug"], "generatedAt": now},
        "seo": {
            "title": title,
            "description": f"How to detect and fix {problem['title'].lower().replace(' guide', '')} in {framework['name']} agents. Framework-specific detection, fixes, and Vex automation.",
            "keywords": [
                problem["title"].lower().replace(" ", "-"),
                f"{framework['name']} {problem['slug']}",
                f"{framework['name']} reliability",
                "AI agent monitoring",
                "Vex guardrails",
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

    async def _gen(f):
        try:
            result = await generate_guide(f)
            write_json(CONTENT_DIR / "guides" / f"{f['slug']}.json", result)
        except Exception as e:
            print(f"  ✗ {f['slug']}: {e}")

    await asyncio.gather(*[_gen(f) for f in targets])


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

    async def _gen(ind, uc):
        s = f"{ind['slug']}-{uc['slug']}"
        try:
            result = await generate_checklist(ind, uc)
            write_json(CONTENT_DIR / "checklists" / f"{s}.json", result)
        except Exception as e:
            print(f"  ✗ {s}: {e}")

    await asyncio.gather(*[_gen(ind, uc) for ind, uc in pairs])


async def run_concept_comparisons(slug: str | None = None, dry_run: bool = False):
    targets = [c for c in CONCEPT_COMPARISONS if slug is None or c["slug"] == slug]
    print(f"\n▸ Generating {len(targets)} concept comparisons...")
    if dry_run:
        for c in targets:
            print(f"  [dry-run] {c['slug']}: {c['title']}")
        return

    async def _gen(c):
        try:
            result = await generate_concept_comparison(c)
            write_json(CONTENT_DIR / "comparisons" / "concepts" / f"{c['slug']}.json", result)
        except Exception as e:
            print(f"  ✗ {c['slug']}: {e}")

    await asyncio.gather(*[_gen(c) for c in targets])


async def run_problem_guides(problems: list, slug: str | None = None, dry_run: bool = False):
    targets = [p for p in problems if slug is None or p["slug"] == slug]
    print(f"\n▸ Generating {len(targets)} problem guides...")
    if dry_run:
        for p in targets:
            print(f"  [dry-run] {p['slug']}: {p['title']}")
        return

    async def _gen(p):
        try:
            result = await generate_problem_guide(p)
            write_json(CONTENT_DIR / "problem-guides" / f"{p['slug']}.json", result)
        except Exception as e:
            print(f"  ✗ {p['slug']}: {e}")

    await asyncio.gather(*[_gen(p) for p in targets])


async def run_framework_usecase(
    frameworks: list, use_cases: list, slug: str | None = None, dry_run: bool = False
):
    pairs = []
    for fw in frameworks:
        for uc in use_cases:
            s = f"{fw['slug']}-{uc['slug']}"
            if slug is None or s == slug:
                pairs.append((fw, uc))

    print(f"\n▸ Generating {len(pairs)} framework × use-case guides...")
    if dry_run:
        for fw, uc in pairs:
            print(f"  [dry-run] {fw['slug']}-{uc['slug']}: {framework_usecase_title(fw['name'], uc['name'])}")
        return

    async def _gen(fw, uc):
        s = f"{fw['slug']}-{uc['slug']}"
        try:
            result = await generate_framework_usecase(fw, uc)
            write_json(CONTENT_DIR / "guides" / "cross" / f"{s}.json", result)
        except Exception as e:
            print(f"  ✗ {s}: {e}")

    tasks = [_gen(fw, uc) for fw, uc in pairs]
    await asyncio.gather(*tasks)


async def run_framework_industry(
    frameworks: list, industries: list, slug: str | None = None, dry_run: bool = False
):
    pairs = []
    for fw in frameworks:
        for ind in industries:
            s = f"{fw['slug']}-{ind['slug']}"
            if slug is None or s == slug:
                pairs.append((fw, ind))

    print(f"\n▸ Generating {len(pairs)} framework × industry guides...")
    if dry_run:
        for fw, ind in pairs:
            print(f"  [dry-run] {fw['slug']}-{ind['slug']}: {framework_industry_title(fw['name'], ind['name'])}")
        return

    async def _gen(fw, ind):
        s = f"{fw['slug']}-{ind['slug']}"
        try:
            result = await generate_framework_industry(fw, ind)
            write_json(CONTENT_DIR / "guides" / "industry" / f"{s}.json", result)
        except Exception as e:
            print(f"  ✗ {s}: {e}")

    tasks = [_gen(fw, ind) for fw, ind in pairs]
    await asyncio.gather(*tasks)


async def run_problem_framework(
    problems: list, frameworks: list, slug: str | None = None, dry_run: bool = False
):
    pairs = []
    for prob in problems:
        for fw in frameworks:
            s = f"{prob['slug']}-{fw['slug']}"
            if slug is None or s == slug:
                pairs.append((prob, fw))

    print(f"\n▸ Generating {len(pairs)} problem × framework guides...")
    if dry_run:
        for prob, fw in pairs:
            print(f"  [dry-run] {prob['slug']}-{fw['slug']}: {problem_framework_title(prob['title'], fw['name'])}")
        return

    async def _gen(prob, fw):
        s = f"{prob['slug']}-{fw['slug']}"
        try:
            result = await generate_problem_framework(prob, fw)
            write_json(CONTENT_DIR / "problem-guides" / "cross" / f"{s}.json", result)
        except Exception as e:
            print(f"  ✗ {s}: {e}")

    tasks = [_gen(prob, fw) for prob, fw in pairs]
    await asyncio.gather(*tasks)


async def main():
    parser = argparse.ArgumentParser(description="Generate pSEO content for Vex")
    parser.add_argument("--all", action="store_true", help="Generate all categories")
    parser.add_argument(
        "--category",
        choices=[
            "guides",
            "checklists",
            "comparisons",
            "problem-guides",
            "framework-use-case",
            "framework-industry",
            "problem-framework",
        ],
    )
    parser.add_argument("--slug", help="Generate a single page by slug")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be generated")
    parser.add_argument("--model", default=DEFAULT_MODEL, help=f"LiteLLM model (default: {DEFAULT_MODEL})")
    args = parser.parse_args()

    global _model  # noqa: PLW0603
    _model = args.model

    if not args.all and not args.category:
        parser.print_help()
        sys.exit(1)

    frameworks, use_cases, industries, problems = load_taxonomy()

    total_start = datetime.now(timezone.utc)

    if args.all or args.category == "guides":
        await run_guides(frameworks, args.slug, args.dry_run)

    if args.all or args.category == "checklists":
        await run_checklists(industries, use_cases, args.slug, args.dry_run)

    if args.all or args.category == "comparisons":
        await run_concept_comparisons(args.slug, args.dry_run)

    if args.all or args.category == "problem-guides":
        await run_problem_guides(problems, args.slug, args.dry_run)

    if args.all or args.category == "framework-use-case":
        await run_framework_usecase(frameworks, use_cases, args.slug, args.dry_run)

    if args.all or args.category == "framework-industry":
        await run_framework_industry(frameworks, industries, args.slug, args.dry_run)

    if args.all or args.category == "problem-framework":
        await run_problem_framework(problems, frameworks, args.slug, args.dry_run)

    elapsed = (datetime.now(timezone.utc) - total_start).total_seconds()
    print(f"\n✓ Done in {elapsed:.1f}s")


if __name__ == "__main__":
    asyncio.run(main())
