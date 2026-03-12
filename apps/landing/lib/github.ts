const GITHUB_API_URL = 'https://api.github.com/repos/Vex-AI-Dev/Vex';

function formatStarCount(n: number): string {
  if (n < 1000) return String(n);
  const k = n / 1000;
  return k % 1 === 0 ? `${Math.floor(k)}k` : `${k.toFixed(1)}k`;
}

export async function getGitHubStars(): Promise<{
  stars: number | null;
  formatted: string | null;
}> {
  try {
    const headers: HeadersInit = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const res = await fetch(GITHUB_API_URL, {
      next: { revalidate: 3600 },
      headers,
    });

    if (!res.ok) return { stars: null, formatted: null };

    const data = (await res.json()) as { stargazers_count?: number };

    if (typeof data.stargazers_count !== 'number') {
      return { stars: null, formatted: null };
    }

    return {
      stars: data.stargazers_count,
      formatted: formatStarCount(data.stargazers_count),
    };
  } catch {
    return { stars: null, formatted: null };
  }
}
