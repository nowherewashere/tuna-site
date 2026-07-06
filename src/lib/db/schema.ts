import {
  pgTable,
  uuid,
  text,
  bigint,
  boolean,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Our DB (spec §3). The spine is `remnawave_uuid`: site and bot point to the
 * same panel user, so the subscription is managed from either entry.
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique(),
  passwordHash: text("password_hash"),
  // REFERENCE to the panel user (source of truth for VPN). Unique, not null once created.
  remnawaveUuid: text("remnawave_uuid").unique(),
  telegramId: bigint("telegram_id", { mode: "number" }).unique(),
  isReferred: boolean("is_referred").notNull().default(false),
  referredBy: uuid("referred_by"),
  referralBalanceRub: integer("referral_balance_rub").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
});

export const magicLinks = pgTable("magic_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  tokenHash: text("token_hash").notNull().unique(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  token: text("token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** 50% recurring commission ledger. */
export const referralEvents = pgTable("referral_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  referrerId: uuid("referrer_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  referredId: uuid("referred_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  paymentRub: integer("payment_rub").notNull(),
  commissionRub: integer("commission_rub").notNull(),
  status: text("status").notNull().default("pending"), // pending | cleared | reversed
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Withdrawal requests (≥ REFERRAL_PAYOUT_MIN_RUB). */
export const payouts = pgTable("payouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  amountRub: integer("amount_rub").notNull(),
  method: text("method"),
  status: text("status").notNull().default("requested"), // requested | paid | rejected
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
