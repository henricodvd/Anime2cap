import { db } from '../lib/db'
import { sql } from 'drizzle-orm'
import { titles } from '../db/schema'

async function main() {
  console.log('\n🔍 Testing Supabase/PostgreSQL connection...\n')

  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('❌ DATABASE_URL not set')
    process.exit(1)
  }
  console.log(`✅ DATABASE_URL found: ${url.substring(0, 45)}...`)

  try {
    console.log('⏳ Connecting and querying raw SQL (select 1)...')
    const rawResult = await db.execute(sql`SELECT 1 as val`)
    console.log('✅ Connection successful. Raw query result:', rawResult)

    console.log('⏳ Querying titles table limit 5...')
    const titleResults = await db
      .select()
      .from(titles)
      .limit(5)
    console.log(`✅ Query successful. Found ${titleResults.length} titles in DB.`)
    if (titleResults.length > 0) {
      console.log('First titles found:')
      titleResults.forEach(t => console.log(`- [ID: ${t.id}] ${t.name} (slug: ${t.slug})`))
    } else {
      console.log('⚠️ Titles table is empty!')
    }

  } catch (err) {
    console.error('❌ Database connection or query failed:', err)
    process.exit(1)
  }

  console.log('\n✅ Database test complete.\n')
  process.exit(0)
}

main().catch(console.error)
