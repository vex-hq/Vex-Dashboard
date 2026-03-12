import fs from 'fs';
import path from 'path';

import type {
  ChecklistPage,
  ConceptComparison,
  FrameworkGuide,
  FrameworkMeta,
  IndustryMeta,
  ProblemGuide,
  ToolComparison,
  UseCaseMeta,
} from './types';

const PSEO_DIR = path.join(process.cwd(), 'content', 'pseo');

function readJson<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

function readAllJson<T>(dir: string): T[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => readJson<T>(path.join(dir, f)));
}

// --- Taxonomy ---

export function getFrameworks(): FrameworkMeta[] {
  return readJson<FrameworkMeta[]>(path.join(PSEO_DIR, 'taxonomy', 'frameworks.json'));
}

export function getUseCases(): UseCaseMeta[] {
  return readJson<UseCaseMeta[]>(path.join(PSEO_DIR, 'taxonomy', 'use-cases.json'));
}

export function getIndustries(): IndustryMeta[] {
  return readJson<IndustryMeta[]>(path.join(PSEO_DIR, 'taxonomy', 'industries.json'));
}

// --- Content ---

export function getAllGuides(): FrameworkGuide[] {
  return readAllJson<FrameworkGuide>(path.join(PSEO_DIR, 'guides'));
}

export function getGuideBySlug(slug: string): FrameworkGuide | undefined {
  const filePath = path.join(PSEO_DIR, 'guides', `${slug}.json`);
  if (!fs.existsSync(filePath)) return undefined;
  return readJson<FrameworkGuide>(filePath);
}

export function getAllChecklists(): ChecklistPage[] {
  return readAllJson<ChecklistPage>(path.join(PSEO_DIR, 'checklists'));
}

export function getChecklistBySlug(slug: string): ChecklistPage | undefined {
  const filePath = path.join(PSEO_DIR, 'checklists', `${slug}.json`);
  if (!fs.existsSync(filePath)) return undefined;
  return readJson<ChecklistPage>(filePath);
}

export function getAllToolComparisons(): ToolComparison[] {
  return readAllJson<ToolComparison>(path.join(PSEO_DIR, 'comparisons', 'tools'));
}

export function getToolComparisonBySlug(slug: string): ToolComparison | undefined {
  const filePath = path.join(PSEO_DIR, 'comparisons', 'tools', `${slug}.json`);
  if (!fs.existsSync(filePath)) return undefined;
  return readJson<ToolComparison>(filePath);
}

export function getAllConceptComparisons(): ConceptComparison[] {
  return readAllJson<ConceptComparison>(path.join(PSEO_DIR, 'comparisons', 'concepts'));
}

export function getConceptComparisonBySlug(slug: string): ConceptComparison | undefined {
  const filePath = path.join(PSEO_DIR, 'comparisons', 'concepts', `${slug}.json`);
  if (!fs.existsSync(filePath)) return undefined;
  return readJson<ConceptComparison>(filePath);
}

export function getAllProblemGuides(): ProblemGuide[] {
  return readAllJson<ProblemGuide>(path.join(PSEO_DIR, 'problem-guides'));
}

export function getProblemGuideBySlug(slug: string): ProblemGuide | undefined {
  const filePath = path.join(PSEO_DIR, 'problem-guides', `${slug}.json`);
  if (!fs.existsSync(filePath)) return undefined;
  return readJson<ProblemGuide>(filePath);
}
