import { notFound } from "next/navigation";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { AutomationPanel } from "@/components/automation-panel";
import { GrowthPanel } from "@/components/growth-panel";
import { InsightsPanel } from "@/components/insights-panel";
import { MigrationPanel } from "@/components/migration-panel";
import { PlansPanel } from "@/components/plans-panel";
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
            offlinePending: dict.offlinePending,
            eventTitle: dict.eventTitle,
            eventEmpty: dict.eventEmpty,
            eventNamePlaceholder: dict.eventNamePlaceholder,
            eventStart: dict.eventStart,
            eventEnd: dict.eventEnd,
            eventCreate: dict.eventCreate,
            eventCreating: dict.eventCreating,
            eventInvalidRange: dict.eventInvalidRange,
            eventRecurrence: dict.eventRecurrence,
            recurrenceNone: dict.recurrenceNone,
            recurrenceDaily: dict.recurrenceDaily,
            recurrenceWeekly: dict.recurrenceWeekly,
            eventReminder: dict.eventReminder,
            eventReminderHint: dict.eventReminderHint,
            notesTitle: dict.notesTitle,
            notesEmpty: dict.notesEmpty,
            noteTitlePlaceholder: dict.noteTitlePlaceholder,
            noteContentPlaceholder: dict.noteContentPlaceholder,
            noteCreate: dict.noteCreate,
            noteCreating: dict.noteCreating,
            noteDelete: dict.noteDelete,
            focusTitle: dict.focusTitle,
            focusStart: dict.focusStart,
            focusStop: dict.focusStop,
            focusRunning: dict.focusRunning,
            focusEmpty: dict.focusEmpty,
            focusRecent: dict.focusRecent,
            focusLogTitle: dict.focusLogTitle,
            focusLogEmpty: dict.focusLogEmpty,
            focusMinutes: dict.focusMinutes,
            filesTitle: dict.filesTitle,
            filesEmpty: dict.filesEmpty,
            fileUpload: dict.fileUpload,
            fileUploading: dict.fileUploading,
            fileSelect: dict.fileSelect,
            statsTitle: dict.statsTitle,
            statsCourses: dict.statsCourses,
            statsTasks: dict.statsTasks,
            statsDone: dict.statsDone,
            statsNotes: dict.statsNotes,
            statsFiles: dict.statsFiles,
            statsFocus: dict.statsFocus,
            aiTitle: dict.aiTitle,
            aiDisabled: dict.aiDisabled,
            aiPlaceholder: dict.aiPlaceholder,
            aiGenerate: dict.aiGenerate,
            aiGenerating: dict.aiGenerating,
            aiBudget: dict.aiBudget,
            aiRemaining: dict.aiRemaining,
            aiError: dict.aiError,
            aiPrivacyNote: dict.aiPrivacyNote,
            questionsTitle: dict.questionsTitle,
            questionsEmpty: dict.questionsEmpty,
            questionPromptPlaceholder: dict.questionPromptPlaceholder,
            questionAnswerPlaceholder: dict.questionAnswerPlaceholder,
            questionCreate: dict.questionCreate,
            questionCreating: dict.questionCreating,
            reviewTitle: dict.reviewTitle,
            reviewEmpty: dict.reviewEmpty,
            reviewSubmit: dict.reviewSubmit,
            reviewCorrect: dict.reviewCorrect,
            reviewWrong: dict.reviewWrong,
            examsTitle: dict.examsTitle,
            examsEmpty: dict.examsEmpty,
            examTitlePlaceholder: dict.examTitlePlaceholder,
            examCreate: dict.examCreate,
            examCreating: dict.examCreating,
            examStart: dict.examStart,
            examSubmit: dict.examSubmit,
            examScore: dict.examScore,
            examAverage: dict.examAverage,
            examNoQuestions: dict.examNoQuestions,
            semanticTitle: dict.semanticTitle,
            semanticPlaceholder: dict.semanticPlaceholder,
            semanticSearch: dict.semanticSearch,
            semanticReindex: dict.semanticReindex,
            semanticEmpty: dict.semanticEmpty,
            semanticReindexed: dict.semanticReindexed,
            pdfView: dict.pdfView,
            pdfClose: dict.pdfClose,
            pdfPrev: dict.pdfPrev,
            pdfNext: dict.pdfNext,
            pdfPage: dict.pdfPage,
            pdfLoading: dict.pdfLoading,
            pdfLoadError: dict.pdfLoadError,
            pdfAnnotations: dict.pdfAnnotations,
            pdfNoAnnotations: dict.pdfNoAnnotations,
            pdfNotePlaceholder: dict.pdfNotePlaceholder,
            pdfSave: dict.pdfSave,
            pdfClickHint: dict.pdfClickHint,
            fileDelete: dict.fileDelete,
            fileHint: dict.fileHint,
          }}
        />
        <div className="mt-6 flex flex-col gap-6">
          <PlansPanel spaceId={id} locale={lang} />
          <GrowthPanel spaceId={id} locale={lang} />
          <MigrationPanel spaceId={id} locale={lang} />
          <AutomationPanel spaceId={id} locale={lang} />
          <InsightsPanel spaceId={id} locale={lang} />
        </div>
      </main>
    </div>
  );
}
