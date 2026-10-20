import type {
  CalendarEventDto,
  CourseDto,
  SpaceDto,
  TaskDto,
  TermDto,
  UserDto,
} from "@study-os/contracts";
import type {
  CalendarEventRow,
  CourseRow,
  SpaceRow,
  TaskRow,
  TermRow,
  UserRow,
} from "@study-os/db";

export function toUserDto(row: UserRow): UserDto {
  return {
    id: row.id,
    kind: row.kind,
    displayName: row.displayName,
    locale: row.locale,
    timezone: row.timezone,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toSpaceDto(row: SpaceRow): SpaceDto {
  return {
    id: row.id,
    name: row.name,
    ownerId: row.ownerId,
    parentId: row.parentId,
    privacyLevel: row.privacyLevel,
    syncPolicy: row.syncPolicy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toTermDto(row: TermRow): TermDto {
  return {
    id: row.id,
    spaceId: row.spaceId,
    name: row.name,
    startsOn: row.startsOn,
    endsOn: row.endsOn,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toCourseDto(row: CourseRow): CourseDto {
  return {
    id: row.id,
    spaceId: row.spaceId,
    termId: row.termId,
    name: row.name,
    code: row.code,
    instructor: row.instructor,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toTaskDto(row: TaskRow): TaskDto {
  return {
    id: row.id,
    spaceId: row.spaceId,
    courseId: row.courseId,
    title: row.title,
    notes: row.notes,
    status: row.status,
    priority: row.priority,
    dueAt: row.dueAt?.toISOString() ?? null,
    estimateMinutes: row.estimateMinutes,
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toCalendarEventDto(row: CalendarEventRow): CalendarEventDto {
  return {
    id: row.id,
    spaceId: row.spaceId,
    title: row.title,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    timezone: row.timezone,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    locked: row.locked,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
