import { notFound } from "next/navigation";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { SystemStatus } from "@/components/system-status";
import { getDictionary, isLocale } from "@/lib/i18n";

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = getDictionary(lang);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-10 px-6 py-12">
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

      <main id="main" className="flex flex-1 flex-col gap-8">
        <section className="rounded-2xl border border-line bg-surface p-8 shadow-sm">
          <p className="mb-3 inline-block rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
            {dict.phaseNote}
          </p>
          <p className="max-w-2xl text-base leading-relaxed text-ink">{dict.intro}</p>
        </section>

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
          <ul className="grid gap-2 text-sm text-ink sm:grid-cols-2">
            {dict.plannedList.map((item) => (
              <li key={item} className="rounded-lg border border-dashed border-line px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="text-xs text-muted">
        {dict.appName} · Phase 0 · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
