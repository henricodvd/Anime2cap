import {
  pgTable,
  integer,
  numeric,
  uuid,
  varchar,
  boolean,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core'

// ─── Enums ───────────────────────────────────────────────
export const titleTypeEnum = pgEnum('title_type', [
  'anime',
  'manga',
  'manhwa',
  'donghua',
  'light_novel',
  'movie',
  'ova',
  'special',
  'ona',
  'music',
])

export const titleStatusEnum = pgEnum('title_status', [
  'ongoing',
  'finished',
  'upcoming',
])

export const sourceTypeEnum = pgEnum('source_type', [
  'manga',
  'light_novel',
  'original',
])

// ─── Tables ──────────────────────────────────────────────

/**
 * titles — synced from Jikan API.
 * PK is the Jikan `mal_id` (integer), NOT a UUID.
 */
export const titles = pgTable('titles', {
  id: integer('id').primaryKey(),                       // Jikan mal_id
  slug: varchar('slug', { length: 500 }).notNull().unique(),
  name: varchar('name', { length: 500 }).notNull(),
  nameJapanese: varchar('name_japanese', { length: 500 }),
  type: titleTypeEnum('type').notNull(),
  image: varchar('image', { length: 1000 }),
  status: titleStatusEnum('status').default('ongoing'),
  synopsis: varchar('synopsis', { length: 5000 }),
  episodes: integer('episodes'),
  score: varchar('score', { length: 10 }), // Storing as string or decimal
  source: varchar('source', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

/**
 * mappings — the core EP ↔ Cap conversion data.
 * Each row maps one episode to one chapter for a given title.
 */
export const mappings = pgTable('mappings', {
  id: uuid('id').primaryKey().defaultRandom(),
  titleId: integer('title_id')
    .references(() => titles.id)
    .notNull(),
  episode: numeric('episode').notNull(),
  chapter: numeric('chapter'),
  isFiller: boolean('is_filler').default(false),
  isCanon: boolean('is_canon').default(true),
  sourceType: sourceTypeEnum('source_type').default('manga'),
  createdAt: timestamp('created_at').defaultNow(),
})
