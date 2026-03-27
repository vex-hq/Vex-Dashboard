import fs from 'fs';
import matter from 'gray-matter';
import path from 'path';

const CHANGELOG_DIR = path.join(process.cwd(), 'content', 'changelog');

export interface ChangelogEntry {
  slug: string;
  title: string;
  description: string;
  date: string;
  version: string;
  tags: string[];
  content: string;
}

export function getAllChangelogs(): ChangelogEntry[] {
  if (!fs.existsSync(CHANGELOG_DIR)) return [];

  const files = fs.readdirSync(CHANGELOG_DIR).filter((f) => f.endsWith('.mdx'));

  const entries = files.map((filename) => {
    const slug = filename.replace('.mdx', '');
    const filePath = path.join(CHANGELOG_DIR, filename);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(fileContent);

    return {
      slug,
      title: data.title ?? '',
      description: data.description ?? '',
      date: data.date ?? '',
      version: data.version ?? '',
      tags: data.tags ?? [],
      content,
    };
  });

  return entries.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export function getChangelogBySlug(slug: string): ChangelogEntry | undefined {
  const entries = getAllChangelogs();
  return entries.find((e) => e.slug === slug);
}
