import { index, pgEnum, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

/** Guest users exist without an account; accounts are added in a later milestone. */
export const userKindEnum = pgEnum("user_kind", ["guest", "account"]);

/** Privacy levels follow docs/SECURITY-PRIVACY.md. */
export const spacePrivacyEnum = pgEnum("space_privacy", [
  "shared",
  "personal",
  "private_local",
  "sensitive",
]);

export const membershipRoleEnum = pgEnum("membership_role", ["owner", "editor", "viewer"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: userKindEnum("kind").notNull().default("guest"),
  displayName: text("display_name").notNull(),
  locale: text("locale").notNull().default("zh-CN"),
  timezone: text("timezone").notNull().default("Asia/Shanghai"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const spaces = pgTable(
  "spaces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Hierarchy is validated at the application layer to keep this milestone small;
    // the FK to spaces.id is added with the hierarchy milestone.
    parentId: uuid("parent_id"),
    name: text("name").notNull(),
    privacyLevel: spacePrivacyEnum("privacy_level").notNull().default("personal"),
    syncPolicy: text("sync_policy").notNull().default("synced"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [index("spaces_owner_idx").on(table.ownerId)],
);

export const memberships = pgTable(
  "memberships",
  {
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: membershipRoleEnum("role").notNull().default("viewer"),
    invitedBy: uuid("invited_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.spaceId, table.userId] }),
    index("memberships_user_idx").on(table.userId),
  ],
);

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type SpaceRow = typeof spaces.$inferSelect;
export type NewSpaceRow = typeof spaces.$inferInsert;
export type MembershipRow = typeof memberships.$inferSelect;
