import { notFound } from "next/navigation";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { SpaceWorkspace } from "@/components/space-workspace";
import { getDictionary, isLocale } from "@/lib/i18n";

export default async function SpacePage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-lg font-semibold text-white">
            S
          </span>
          <div>
            <p className="text-lg font-semibold tracking-tight">{dict.appName}</p>
            <p className="text-sm text-muted">{dict.tagline}</p>
          </div>
        </div>
        <LocaleSwitcher locale={lang} label={dict.languageLabel} switchLabel={dict.switchTo} />
      </header>

      <main id="main" className="flex-1">
        <SpaceWorkspace
          spaceId={id}
          backHref={`/${lang}`}
          labels={{
            back: dict.backToSpaces,
            notFound: dict.spaceNotFound,
            loadError: dict.spaceLoadError,
            courseTitle: dict.courseTitle,
            courseEmpty: dict.courseEmpty,
            courseNamePlaceholder: dict.courseNamePlaceholder,
            courseCreate: dict.courseCreate,
            courseCreating: dict.courseCreating,
            taskTitle: dict.taskTitle,
            taskEmpty: dict.taskEmpty,
            taskNamePlaceholder: dict.taskNamePlaceholder,
            taskCreate: dict.taskCreate,
            taskCreating: dict.taskCreating,
            taskDone: dict.taskDone,
            taskUndo: dict.taskUndo,
            taskNoCourse: dict.taskNoCourse,
            taskConflict: dict.taskConflict,
            eventTitle: dict.eventTitle,
            eventEmpty: dict.eventEmpty,
            eventNamePlaceholder: dict.eventNamePlaceholder,
            eventStart: dict.eventStart,
            eventEnd: dict.eventEnd,
            eventCreate: dict.eventCreate,
            eventCreating: dict.eventCreating,
            eventInvalidRange: dict.eventInvalidRange,
          }}
        />
      </main>
    </div>
  );
}
