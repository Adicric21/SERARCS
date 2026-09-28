import { integer, pgTable, real, serial, text, timestamp } from "drizzle-orm/pg-core";

export const crews = pgTable("crews", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  captain: text("captain").notNull(),
  ship: text("ship").notNull(),
  specialty: text("specialty").notNull(),
  color: text("color").notNull(),
  motto: text("motto").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const emergencyRequests = pgTable("emergency_requests", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  title: text("title").notNull(),
  emergencyType: text("emergency_type").notNull(),
  island: text("island").notNull(),
  locationDetail: text("location_detail").notNull().default(""),
  severity: integer("severity").notNull(),
  description: text("description").notNull().default(""),
  callerName: text("caller_name").notNull().default("Anonymous"),
  peopleAffected: integer("people_affected").notNull().default(1),
  status: text("status").notNull().default("pending"),
  crewId: integer("crew_id").references(() => crews.id),
  priorityScore: real("priority_score").notNull().default(0),
  priorityTier: text("priority_tier").notNull().default("rookie"),
  resolutionNote: text("resolution_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  priorityUpdatedAt: timestamp("priority_updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const requestEvents = pgTable("request_events", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id")
    .notNull()
    .references(() => emergencyRequests.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  message: text("message").notNull(),
  actor: text("actor").notNull().default("Den Den Mushi Dispatch"),
  fromStatus: text("from_status"),
  toStatus: text("to_status"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Crew = typeof crews.$inferSelect;
export type EmergencyRequest = typeof emergencyRequests.$inferSelect;
export type RequestEvent = typeof requestEvents.$inferSelect;
