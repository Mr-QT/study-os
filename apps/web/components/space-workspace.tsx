"use client";

import type { CalendarEventDto, CourseDto, SpaceDto, TaskDto } from "@study-os/contracts";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { AiPanel } from "@/components/ai-panel";
import { ExamsPanel } from "@/components/exams-panel";
import { FilesPanel } from "@/components/files-panel";
import { FocusPanel } from "@/components/focus-panel";
import { NotesPanel } from "@/components/notes-panel";
import { QuestionsPanel } from "@/components/questions-panel";
import { SemanticSearchPanel } from "@/components/semantic-search-panel";
import { StatsPanel } from "@/components/stats-panel";

import {
  CALENDAR_EVENTS_ENDPOINT,
  COURSES_ENDPOINT,
  TASKS_ENDPOINT,
  calendarEventsEndpoint,
  courseListEndpoint,
  spaceEndpoint,
  taskEndpoint,
  taskListEndpoint,
} from "@/lib/api";
import { enqueueOperation, flushOutbox, pendingCount } from "@/lib/local-db";

type LoadState = "loading" | "ready" | "notfound" | "error";

export interface SpaceLabels {
  back: string;
  notFound: string;
  loadError: string;
  courseTitle: string;
  courseEmpty: string;
  courseNamePlaceholder: string;
  courseCreate: string;
  courseCreating: string;
  taskTitle: string;
  taskEmpty: string;
  taskNamePlaceholder: string;
  taskCreate: string;
  taskCreating: string;
  taskDone: string;
  taskUndo: string;
  taskNoCourse: string;
  taskConflict: string;
  offlinePending: string;
  eventTitle: string;
  eventEmpty: string;
  eventNamePlaceholder: string;
  eventStart: string;
  eventEnd: string;
  eventCreate: string;
  eventCreating: string;
  eventInvalidRange: string;
  notesTitle: string;
  notesEmpty: string;
  noteTitlePlaceholder: string;
  noteContentPlaceholder: string;
  noteCreate: string;
  noteCreating: string;
  noteDelete: string;
  focusTitle: string;
  focusStart: string;
  focusStop: string;
  focusRunning: string;
  focusEmpty: string;
  focusRecent: string;
  focusLogTitle: string;
  focusLogEmpty: string;
  focusMinutes: string;
  filesTitle: string;
  filesEmpty: string;
  fileUpload: string;
  fileUploading: string;
  fileSelect: string;
  fileDelete: string;
  fileHint: string;
  statsTitle: string;
  statsCourses: string;
  statsTasks: string;
  statsDone: string;
  statsNotes: string;
  statsFiles: string;
  statsFocus: string;
  aiTitle: string;
  aiDisabled: string;
  aiPlaceholder: string;
  aiGenerate: string;
  aiGenerating: string;
  aiBudget: string;
  aiRemaining: string;
  aiError: string;
  aiPrivacyNote: string;
  questionsTitle: string;
  questionsEmpty: string;
  questionPromptPlaceholder: string;
  questionAnswerPlaceholder: string;
  questionCreate: string;
  questionCreating: string;
  reviewTitle: string;
  reviewEmpty: string;
  reviewSubmit: string;
  reviewCorrect: string;
  reviewWrong: string;
  examsTitle: string;
  examsEmpty: string;
  examTitlePlaceholder: string;
  examCreate: string;
  examCreating: string;
  examStart: string;
  examSubmit: string;
  examScore: string;
  examAverage: string;
  examNoQuestions: string;
  semanticTitle: string;
  semanticPlaceholder: string;
  semanticSearch: string;
  semanticReindex: string;
  semanticEmpty: string;
  semanticReindexed: string;
  pdfView: string;
  pdfClose: string;
  pdfPrev: string;
  pdfNext: string;
  pdfPage: string;
  pdfLoading: string;
  pdfLoadError: string;
  pdfAnnotations: string;
  pdfNoAnnotations: string;
  pdfNotePlaceholder: string;
  pdfSave: string;
  pdfClickHint: string;
}

const jsonHeaders = { "content-type": "application/json", accept: "application/json" };

export function SpaceWorkspace({
  spaceId,
  backHref,
  labels,
}: {
  spaceId: string;
  backHref: string;
  labels: SpaceLabels;
}) {
  const [state, setState] = useState<LoadState>("loading");
  const [space, setSpace] = useState<SpaceDto | null>(null);
  const [courses, setCourses] = useState<CourseDto[]>([]);
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [events, setEvents] = useState<CalendarEventDto[]>([]);

  const [courseName, setCourseName] = useState("");
  const [courseBusy, setCourseBusy] = useState(false);
  const [courseError, setCourseError] = useState(false);

  const [taskTitle, setTaskTitle] = useState("");
  const [taskCourse, setTaskCourse] = useState("");
  const [taskBusy, setTaskBusy] = useState(false);
  const [taskError, setTaskError] = useState(false);
  const [taskConflict, setTaskConflict] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(0);

  const [eventTitle, setEventTitle] = useState("");
  const [eventStart, setEventStart] = useState("");
  const [eventEnd, setEventEnd] = useState("");
  const [eventBusy, setEventBusy] = useState(false);
  const [eventError, setEventError] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [spaceResponse, coursesResponse, tasksResponse, eventsResponse] = await Promise.all([
        fetch(spaceEndpoint(spaceId), { credentials: "include", headers: { accept: "application/json" } }),
        fetch(courseListEndpoint(spaceId), { credentials: "include", headers: { accept: "application/json" } }),
        fetch(taskListEndpoint(spaceId), { credentials: "include", headers: { accept: "application/json" } }),
        fetch(calendarEventsEndpoint(spaceId), { credentials: "include", headers: { accept: "application/json" } }),
      ]);

      if (spaceResponse.status === 404) {
        setState("notfound");
        return;
      }
      if (!spaceResponse.ok || !coursesResponse.ok || !tasksResponse.ok || !eventsResponse.ok) {
        setState("error");
        return;
      }

      const spaceBody = (await spaceResponse.json()) as { space: SpaceDto };
      const coursesBody = (await coursesResponse.json()) as { courses: CourseDto[] };
      const tasksBody = (await tasksResponse.json()) as { tasks: TaskDto[] };
      const eventsBody = (await eventsResponse.json()) as { events: CalendarEventDto[] };

      setSpace(spaceBody.space);
      setCourses(coursesBody.courses);
      setTasks(tasksBody.tasks);
      setEvents(eventsBody.events);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [spaceId]);

  useEffect(() => {
    void (async () => {
      await flushOutbox(spaceId);
      await load();
      setPendingChanges(await pendingCount(spaceId));
    })();

    const handleOnline = () => {
      void (async () => {
        const result = await flushOutbox(spaceId);
        if (result.conflicts > 0) setTaskConflict(true);
        await load();
        setPendingChanges(await pendingCount(spaceId));
      })();
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [load, spaceId]);

  const createCourse = useCallback(
    async (formEvent: React.FormEvent<HTMLFormElement>) => {
      formEvent.preventDefault();
      const name = courseName.trim();
      if (!name || courseBusy) return;
      setCourseBusy(true);
      setCourseError(false);
      try {
        const response = await fetch(COURSES_ENDPOINT, {
          method: "POST",
          credentials: "include",
          headers: jsonHeaders,
          body: JSON.stringify({ spaceId, name }),
        });
        if (!response.ok) {
          setCourseError(true);
          return;
        }
        const { course } = (await response.json()) as { course: CourseDto };
        setCourses((previous) => [...previous, course]);
        setCourseName("");
      } catch {
        setCourseError(true);
      } finally {
        setCourseBusy(false);
      }
    },
    [courseBusy, courseName, spaceId],
  );

  const createTask = useCallback(
    async (formEvent: React.FormEvent<HTMLFormElement>) => {
      formEvent.preventDefault();
      const title = taskTitle.trim();
      if (!title || taskBusy) return;
      setTaskBusy(true);
      setTaskError(false);
      try {
        const response = await fetch(TASKS_ENDPOINT, {
          method: "POST",
          credentials: "include",
          headers: jsonHeaders,
          body: JSON.stringify({
            spaceId,
            title,
            ...(taskCourse ? { courseId: taskCourse } : {}),
          }),
        });
        if (!response.ok) {
          setTaskError(true);
          return;
        }
        const { task } = (await response.json()) as { task: TaskDto };
        setTasks((previous) => [...previous, task]);
        setTaskTitle("");
      } catch {
        setTaskError(true);
      } finally {
        setTaskBusy(false);
      }
    },
    [spaceId, taskBusy, taskCourse, taskTitle],
  );

  const toggleTask = useCallback(
    async (task: TaskDto) => {
      const status = task.status === "done" ? "todo" : "done";
      setTasks((previous) =>
        previous.map((item) => (item.id === task.id ? { ...item, status } : item)),
      );

      try {
        const response = await fetch(taskEndpoint(task.id), {
          method: "PATCH",
          credentials: "include",
          headers: jsonHeaders,
          body: JSON.stringify({ status, version: task.version }),
        });

        if (response.status === 409) {
          const refreshed = await fetch(taskListEndpoint(spaceId), {
            credentials: "include",
            headers: { accept: "application/json" },
          });
          if (refreshed.ok) {
            const body = (await refreshed.json()) as { tasks: TaskDto[] };
            setTasks(body.tasks);
            const current = body.tasks.find((item) => item.id === task.id);
            if (current && current.status !== status) {
              const retry = await fetch(taskEndpoint(task.id), {
                method: "PATCH",
                credentials: "include",
                headers: jsonHeaders,
                body: JSON.stringify({ status, version: current.version }),
              });
              if (retry.ok) {
                const { task: updated } = (await retry.json()) as { task: TaskDto };
                setTasks((previous) =>
                  previous.map((item) => (item.id === updated.id ? updated : item)),
                );
                setTaskConflict(false);
                return;
              }
            }
          }
          setTaskConflict(true);
          return;
        }

        if (!response.ok) {
          setTaskError(true);
          return;
        }

        const { task: updated } = (await response.json()) as { task: TaskDto };
        setTasks((previous) => previous.map((item) => (item.id === updated.id ? updated : item)));
        setTaskConflict(false);
      } catch {
        // Offline: keep the optimistic state and replay through the sync outbox.
        await enqueueOperation({
          spaceId,
          entityType: "task",
          entityId: task.id,
          action: "patch",
          patch: { status },
          baseVersion: task.version,
        });
        setPendingChanges(await pendingCount(spaceId));
      }
    },
    [spaceId],
  );

  const createEvent = useCallback(
    async (formEvent: React.FormEvent<HTMLFormElement>) => {
      formEvent.preventDefault();
      const title = eventTitle.trim();
      if (!title || !eventStart || !eventEnd || eventBusy) return;
      if (Date.parse(eventEnd) <= Date.parse(eventStart)) {
        setEventError(labels.eventInvalidRange);
        return;
      }
      setEventBusy(true);
      setEventError("");
      try {
        const response = await fetch(CALENDAR_EVENTS_ENDPOINT, {
          method: "POST",
          credentials: "include",
          headers: jsonHeaders,
          body: JSON.stringify({
            spaceId,
            title,
            startsAt: new Date(eventStart).toISOString(),
            endsAt: new Date(eventEnd).toISOString(),
          }),
        });
        if (!response.ok) {
          setEventError(labels.eventInvalidRange);
          return;
        }
        const { event } = (await response.json()) as { event: CalendarEventDto };
        setEvents((previous) => [...previous, event]);
        setEventTitle("");
        setEventStart("");
        setEventEnd("");
      } catch {
        setEventError(labels.eventInvalidRange);
      } finally {
        setEventBusy(false);
      }
    },
    [eventBusy, eventEnd, eventStart, eventTitle, labels.eventInvalidRange, spaceId],
  );

  if (state === "loading") {
    return <p className="mt-8 text-sm text-muted">{labels.loadError}</p>;
  }

  if (state === "notfound" || state === "error") {
    return (
      <div className="mt-8 rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
        {state === "notfound" ? labels.notFound : labels.loadError}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={backHref} className="text-sm text-muted hover:text-accent-ink">
          ← {labels.back}
        </Link>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">{space?.name}</h2>
      </div>

      <section className="rounded-2xl border border-line bg-surface p-6">
        <h3 className="text-lg font-semibold">{labels.courseTitle}</h3>
        <form onSubmit={createCourse} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={courseName}
            onChange={(event) => setCourseName(event.target.value)}
            placeholder={labels.courseNamePlaceholder}
            aria-label={labels.courseNamePlaceholder}
            maxLength={120}
            className="flex-1 rounded-xl border border-line bg-canvas px-4 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
          <button
            type="submit"
            disabled={courseBusy || courseName.trim().length === 0}
            className="rounded-xl bg-accent-ink px-5 py-2.5 text-sm font-medium text-canvas disabled:opacity-50"
          >
            {courseBusy ? labels.courseCreating : labels.courseCreate}
          </button>
        </form>
        {courseError ? <p role="alert" className="mt-2 text-xs text-danger">!</p> : null}
        {courses.length === 0 ? (
          <p className="mt-4 text-sm text-muted">{labels.courseEmpty}</p>
        ) : (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {courses.map((course) => (
              <li key={course.id} className="rounded-xl border border-line bg-canvas px-4 py-3">
                <p className="font-medium">{course.name}</p>
                {course.code ? <p className="text-xs text-muted">{course.code}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-surface p-6">
        <h3 className="text-lg font-semibold">{labels.taskTitle}</h3>
        <form onSubmit={createTask} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={taskTitle}
            onChange={(event) => setTaskTitle(event.target.value)}
            placeholder={labels.taskNamePlaceholder}
            aria-label={labels.taskNamePlaceholder}
            maxLength={200}
            className="flex-1 rounded-xl border border-line bg-canvas px-4 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
          <select
            value={taskCourse}
            onChange={(event) => setTaskCourse(event.target.value)}
            aria-label={labels.taskNoCourse}
            className="rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm"
          >
            <option value="">{labels.taskNoCourse}</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={taskBusy || taskTitle.trim().length === 0}
            className="rounded-xl bg-accent-ink px-5 py-2.5 text-sm font-medium text-canvas disabled:opacity-50"
          >
            {taskBusy ? labels.taskCreating : labels.taskCreate}
          </button>
        </form>
        {taskError ? <p role="alert" className="mt-2 text-xs text-danger">!</p> : null}
        {taskConflict ? (
          <p role="status" className="mt-2 text-xs text-warn">
            {labels.taskConflict}
          </p>
        ) : null}
        {pendingChanges > 0 ? (
          <p role="status" className="mt-2 text-xs text-warn">
            {labels.offlinePending} ({pendingChanges})
          </p>
        ) : null}
        {tasks.length === 0 ? (
          <p className="mt-4 text-sm text-muted">{labels.taskEmpty}</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {tasks.map((task) => (
              <li
                key={task.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-canvas px-4 py-3"
              >
                <div>
                  <p className={task.status === "done" ? "text-muted line-through" : "font-medium"}>
                    {task.title}
                  </p>
                  <p className="text-xs text-muted">
                    {courses.find((course) => course.id === task.courseId)?.name ?? labels.taskNoCourse}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void toggleTask(task)}
                  className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium hover:border-accent hover:text-accent-ink"
                >
                  {task.status === "done" ? labels.taskUndo : labels.taskDone}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-surface p-6">
        <h3 className="text-lg font-semibold">{labels.eventTitle}</h3>
        <form onSubmit={createEvent} className="mt-3 flex flex-col gap-2">
          <input
            value={eventTitle}
            onChange={(event) => setEventTitle(event.target.value)}
            placeholder={labels.eventNamePlaceholder}
            aria-label={labels.eventNamePlaceholder}
            maxLength={200}
            className="rounded-xl border border-line bg-canvas px-4 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="flex-1 text-xs text-muted">
              {labels.eventStart}
              <input
                type="datetime-local"
                value={eventStart}
                onChange={(event) => setEventStart(event.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink"
              />
            </label>
            <label className="flex-1 text-xs text-muted">
              {labels.eventEnd}
              <input
                type="datetime-local"
                value={eventEnd}
                onChange={(event) => setEventEnd(event.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink"
              />
            </label>
            <button
              type="submit"
              disabled={eventBusy || !eventTitle.trim() || !eventStart || !eventEnd}
              className="self-end rounded-xl bg-accent-ink px-5 py-2.5 text-sm font-medium text-canvas disabled:opacity-50"
            >
              {eventBusy ? labels.eventCreating : labels.eventCreate}
            </button>
          </div>
        </form>
        {eventError ? <p role="alert" className="mt-2 text-xs text-danger">{eventError}</p> : null}
        {events.length === 0 ? (
          <p className="mt-4 text-sm text-muted">{labels.eventEmpty}</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {events.map((event) => (
              <li key={event.id} className="rounded-xl border border-line bg-canvas px-4 py-3">
                <p className="font-medium">{event.title}</p>
                <p className="text-xs text-muted">
                  {new Date(event.startsAt).toLocaleString()} – {new Date(event.endsAt).toLocaleTimeString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <NotesPanel
        spaceId={spaceId}
        labels={{
          title: labels.notesTitle,
          empty: labels.notesEmpty,
          titlePlaceholder: labels.noteTitlePlaceholder,
          contentPlaceholder: labels.noteContentPlaceholder,
          create: labels.noteCreate,
          creating: labels.noteCreating,
          remove: labels.noteDelete,
        }}
      />

      <FocusPanel
        spaceId={spaceId}
        labels={{
          title: labels.focusTitle,
          start: labels.focusStart,
          stop: labels.focusStop,
          running: labels.focusRunning,
          empty: labels.focusEmpty,
          recent: labels.focusRecent,
          logTitle: labels.focusLogTitle,
          logEmpty: labels.focusLogEmpty,
          minutes: labels.focusMinutes,
        }}
      />

      <FilesPanel
        spaceId={spaceId}
        labels={{
          title: labels.filesTitle,
          empty: labels.filesEmpty,
          upload: labels.fileUpload,
          uploading: labels.fileUploading,
          selectFile: labels.fileSelect,
          remove: labels.fileDelete,
          hint: labels.fileHint,
          pdfView: labels.pdfView,
          pdfClose: labels.pdfClose,
          pdfPrev: labels.pdfPrev,
          pdfNext: labels.pdfNext,
          pdfPage: labels.pdfPage,
          pdfLoading: labels.pdfLoading,
          pdfLoadError: labels.pdfLoadError,
          pdfAnnotations: labels.pdfAnnotations,
          pdfNoAnnotations: labels.pdfNoAnnotations,
          pdfNotePlaceholder: labels.pdfNotePlaceholder,
          pdfSave: labels.pdfSave,
          pdfClickHint: labels.pdfClickHint,
        }}
      />
      <SemanticSearchPanel
        spaceId={spaceId}
        labels={{
          title: labels.semanticTitle,
          placeholder: labels.semanticPlaceholder,
          search: labels.semanticSearch,
          reindex: labels.semanticReindex,
          empty: labels.semanticEmpty,
          reindexed: labels.semanticReindexed,
        }}
      />

      <ExamsPanel
        spaceId={spaceId}
        labels={{
          title: labels.examsTitle,
          empty: labels.examsEmpty,
          titlePlaceholder: labels.examTitlePlaceholder,
          create: labels.examCreate,
          creating: labels.examCreating,
          start: labels.examStart,
          submit: labels.examSubmit,
          score: labels.examScore,
          average: labels.examAverage,
          noQuestions: labels.examNoQuestions,
        }}
      />

      <QuestionsPanel
        spaceId={spaceId}
        labels={{
          title: labels.questionsTitle,
          empty: labels.questionsEmpty,
          promptPlaceholder: labels.questionPromptPlaceholder,
          answerPlaceholder: labels.questionAnswerPlaceholder,
          create: labels.questionCreate,
          creating: labels.questionCreating,
          reviewTitle: labels.reviewTitle,
          reviewEmpty: labels.reviewEmpty,
          submit: labels.reviewSubmit,
          correct: labels.reviewCorrect,
          wrong: labels.reviewWrong,
        }}
      />

      <StatsPanel
        spaceId={spaceId}
        labels={{
          title: labels.statsTitle,
          courses: labels.statsCourses,
          tasks: labels.statsTasks,
          done: labels.statsDone,
          notes: labels.statsNotes,
          files: labels.statsFiles,
          focus: labels.statsFocus,
        }}
      />

      <AiPanel
        spaceId={spaceId}
        labels={{
          title: labels.aiTitle,
          disabled: labels.aiDisabled,
          placeholder: labels.aiPlaceholder,
          generate: labels.aiGenerate,
          generating: labels.aiGenerating,
          budget: labels.aiBudget,
          remaining: labels.aiRemaining,
          error: labels.aiError,
          privacyNote: labels.aiPrivacyNote,
        }}
      />
    </div>
  );
}
