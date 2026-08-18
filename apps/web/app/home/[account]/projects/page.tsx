import Link from 'next/link';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { EmptyState } from '../_components/shell/context-table';
import { ShellPage } from '../_components/shell/shell-page';
import { L } from '../_components/shell/shell-tokens';
import { loadShellContextData } from '../_lib/server/shell-data';
import { SHELL_COPY } from '../_lib/shell/shell-copy';
import { relativeAge } from '../_lib/shell/relative-age';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();

  return { title: i18n.t('agentguard:projects.pageTitle') };
};

/**
 * Projects — "context by project".
 *
 * Three columns: Project · Items · Last. That is the whole screen.
 *
 * What is deliberately NOT here: Health, Priority, Lead, Target date, Issues
 * and Status. The page this replaces carried all six because it was styled
 * after Linear's Projects table — `Priority` rendered a literal `---` for every
 * row and `Target date` rendered an empty cell, neither having any backing
 * field. Columns that cannot hold data are not columns.
 *
 * Selecting a project filters Context by it, which is the prototype's
 * behaviour: `if(p2){fProj=p2.dataset.p2;view='context';paint();return;}`
 */
async function ProjectsPage({
  params,
}: {
  params: Promise<{ account: string }>;
}) {
  const { account } = await params;
  const { projects } = await loadShellContextData(account);

  return (
    <ShellPage
      title={SHELL_COPY.projects.title}
      subtitle={SHELL_COPY.projects.subtitle}
    >
      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          body="Context arrives filed under the project an agent was working in. Connect an agent and its first capture creates one."
        />
      ) : (
        <div
          className="overflow-hidden rounded-[6px] border"
          style={{ borderColor: L.line }}
        >
          <div
            className="grid h-8 items-center gap-3 border-b px-3 text-[11px] tracking-wide uppercase"
            style={{
              borderColor: L.line,
              color: L.muted,
              gridTemplateColumns: '1fr 120px 80px',
            }}
          >
            <span>Project</span>
            <span className="text-right">Items</span>
            <span className="text-right">Last</span>
          </div>

          <ul className="divide-y" style={{ borderColor: L.line }}>
            {projects.map((project) => (
              <li
                key={project.id ?? 'unfiled'}
                className="group relative"
                style={{ borderColor: L.line }}
              >
                <Link
                  href={`/home/${account}/context?project=${encodeURIComponent(project.name)}`}
                  className="klio-soft grid h-9 items-center gap-3 px-3 text-[13px]"
                  style={{
                    gridTemplateColumns: '1fr 120px 80px',
                    color: L.ink,
                  }}
                >
                  <span className="truncate">{project.name}</span>
                  <span
                    className="text-right tabular-nums"
                    style={{ color: L.muted }}
                  >
                    {project.items.toLocaleString()} items
                  </span>
                  <span
                    className="text-right tabular-nums"
                    style={{ color: L.muted }}
                  >
                    {project.last ? relativeAge(project.last) : '—'}
                  </span>
                </Link>

                {/* The row opens Context filtered by this project, per the
                    approved prototype. Access and sharing live on the project
                    itself, so that needs its own way in — without it the
                    access dialog is reachable only by typing a URL, which is
                    what happened when this screen was rebuilt. */}
                {project.id ? (
                  <Link
                    href={`/home/${account}/projects/${project.id}`}
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded-[4px] border px-2 py-0.5 text-[11px] opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                    style={{ borderColor: L.line, color: L.muted }}
                  >
                    Manage
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </ShellPage>
  );
}

export default withI18n(ProjectsPage);
