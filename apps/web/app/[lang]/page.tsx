import { notFound } from "next/navigation";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { SystemStatus } from "@/components/system-status";
import { WorkspaceHome } from "@/components/workspace-home";
import { getDictionary, isLocale } from "@/lib/i18n";

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = getDictionary(lang);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-lg font-semibold text-white">
            S
          </span>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">{dict.appName}</h1>
            <p className="text-sm text-muted">{dict.tagline}</p>
          </div>
        </div>
        <LocaleSwitcher locale={lang} label={dict.languageLabel} switchLabel={dict.switchTo} />
      </header>

      <main id="main" className="flex flex-1 flex-col gap-6">
        <section className="rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-block rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent-ink">
              {dict.phaseNote}
            </span>
            <p className="text-sm text-muted">{dict.intro}</p>
          </div>

          <WorkspaceHome
            locale={lang}
            labels={{
              title: dict.workspaceTitle,
              subtitle: dict.workspaceSubtitle,
              loading: dict.workspaceLoading,
              empty: dict.workspaceEmpty,
              namePlaceholder: dict.workspaceNamePlaceholder,
              create: dict.workspaceCreate,
              creating: dict.workspaceCreating,
              createError: dict.workspaceCreateError,
              dbUnavailable: dict.workspaceDbUnavailable,
              error: dict.workspaceError,
              offlineCached: dict.offlineCached,
              retry: dict.retry,
              spacesCount: dict.spacesCount,
              guestLabel: dict.guestLabel,
              privacyShared: dict.privacyShared,
              privacyPersonal: dict.privacyPersonal,
              privacyPrivateLocal: dict.privacyPrivateLocal,
              privacySensitive: dict.privacySensitive,
            }}
          />
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <SystemStatus
            title={dict.statusTitle}
            checking={dict.statusChecking}
            connected={dict.statusConnected}
            degraded={dict.statusDegraded}
            unreachable={dict.statusUnreachable}
            offline={dict.statusOffline}
            hint={dict.statusHint}
            retry={dict.retry}
            databaseLabel={dict.database}
            dbDisabled={dict.dbDisabled}
            dbOk={dict.dbOk}
            dbError={dict.dbError}
            versionLabel={dict.version}
          />

          <section className="rounded-2xl border border-line bg-surface p-6">
            <h2 className="mb-3 text-sm font-semibold text-muted">{dict.planned}</h2>
            <ul className="grid gap-2 text-sm text-ink">
              {dict.plannedList.map((item) => (
                <li key={item} className="rounded-lg border border-dashed border-line px-3 py-2">
                  {item}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>

      <footer className="text-xs text-muted">
        {dict.appName} · Phase 1.3 · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
