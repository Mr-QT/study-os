import type { SpaceDto, UserDto } from "@study-os/contracts";
import type { SpaceRow, UserRow } from "@study-os/db";

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
