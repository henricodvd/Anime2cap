import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { 
  extractMappingsWithAI, 
  saveTitle,
  saveMappings, 
  searchWebWithTavily 
} from './ingest-utils'
import slugify from 'slugify'
import { db } from '../lib/db'
import { mappings, titles } from '../db/schema'
import { eq, sql } from 'drizzle-orm'
import { jikanGet } from '../lib/jikan-client'

export async function ingestTitle(
  target: string,
  options: {
    isDryRun?: boolean
    isIncremental?: boolean
    manualEpisodes?: number | null
  } = {}
) {
  const { isDryRun = false, isIncremental = false, manualEpisodes = null } = options
  console.log(`\n🚀 Starting ingestion for: ${target} ${isDryRun ? '(DRY RUN)' : ''} ${isIncremental ? '(INCREMENTAL)' : ''}`)

  // 1. Resolve Anime Name and MAL ID
  let animeName = target
  let malId: number | null = parseInt(target)
  
  if (isNaN(malId)) {
    malId = null
    console.log(`🔍 Searching for metadata for: ${target}...`)
    const searchRes = await jikanGet(`/anime?q=${encodeURIComponent(target)}&limit=1`)
    const searchData = await searchRes.json()
    if (searchData.data?.[0]) {
      animeName = searchData.data[0].title
      malId = searchData.data[0].mal_id
      console.log(`✅ Found: ${animeName} (MAL ID: ${malId})`)
    }
  } else {
    const res = await jikanGet(`/anime/${malId}`)
    const data = await res.json()
    if (data.data) {
      animeName = data.data.title
      console.log(`✅ Title: ${animeName}`)
    }
  }

  if (!malId) {
    throw new Error('Could not resolve MAL ID.')
  }

  // 1.1 Get total episodes
  const jikanRes = await jikanGet(`/anime/${malId}`)
  const jikanData = await jikanRes.json()
  let animeMetadata = jikanData.data
  
  if (!animeMetadata) {
    // Fallback to local database if the title already exists
    console.log('⚠️ Jikan API returned error. Trying to load metadata from local database...')
    const localTitle = await db.select().from(titles).where(eq(titles.id, malId)).limit(1)
    if (localTitle[0]) {
      animeMetadata = {
        title: localTitle[0].name,
        episodes: localTitle[0].episodes,
        status: localTitle[0].status,
        synopsis: localTitle[0].synopsis,
        source: localTitle[0].source,
        score: localTitle[0].score,
        images: { jpg: { image_url: localTitle[0].image } }
      }
      console.log(`✅ Loaded metadata for "${animeMetadata.title}" from local DB.`)
    } else {
      throw new Error(`Could not fetch metadata from Jikan (Status: ${jikanRes.status}) and title does not exist in local database. Message: ${jikanData.message || 'Unknown'}`)
    }
  }

  // Check database for existing mappings when running incrementally
  let startEpisode = 1
  let maxMapped = 0

  if (isIncremental) {
    console.log('🔍 Checking existing mappings in database for incremental update...')
    const maxMappedResult = await db
      .select({
        maxEpisode: sql<number>`MAX(CAST(${mappings.episode} AS NUMERIC))`
      })
      .from(mappings)
      .where(eq(mappings.titleId, malId))
    
    maxMapped = maxMappedResult[0]?.maxEpisode ? Number(maxMappedResult[0].maxEpisode) : 0
    startEpisode = maxMapped + 1
    console.log(`   Last mapped episode in DB: ${maxMapped}`)
  }

  // Handle manual episodes override
  let totalEpisodes = manualEpisodes || animeMetadata.episodes || 12

  // For long running ongoing animes where Jikan episodes is null,
  // we check up to maxMapped + 10 episodes in incremental mode
  if (isIncremental && !manualEpisodes && !animeMetadata.episodes) {
    totalEpisodes = maxMapped + 10
  }
  
  console.log(`📡 Target Episode Range: ${startEpisode} to ${totalEpisodes}${manualEpisodes ? ' (Manual Override)' : ''}`)

  if (isIncremental && startEpisode > totalEpisodes) {
    console.log(`✅ Title "${animeName}" is already up to date (mapped up to episode ${maxMapped}).`)
    return
  }

  const slug = slugify(animeName, { lower: true, strict: true })

  if (!isDryRun) {
    console.log('💾 Saving title metadata...')
    await saveTitle({
      id: malId,
      name: animeMetadata.title,
      slug: slug,
      type: 'anime',
      episodes: animeMetadata.episodes || totalEpisodes,
      image: animeMetadata.images?.jpg?.image_url,
      status: animeMetadata.status?.toLowerCase().includes('fin') ? 'finished' : 'ongoing',
      synopsis: animeMetadata.synopsis,
      score: animeMetadata.score?.toString(),
      source: animeMetadata.source,
    })
  }

  // 2. Scraping/Search Layer
  console.log(`🔍 Searching web for episode-to-chapter mapping (range: ${startEpisode}-${totalEpisodes})...`)
  const searchQuery = `${animeName} anime episodes ${startEpisode} to ${totalEpisodes} manga chapter mapping list filler list`
  const searchResults = await searchWebWithTavily(searchQuery)
  
  if (!searchResults) {
    console.log('⚠️ No search results found. Ingestion might be limited.')
  }

  // 3. AI Layer with Chunking
  const chunkSize = 50
  const allMappings: any[] = []
  
  console.log(`🧠 Processing data with AI (Haiku) in chunks of ${chunkSize}...`)
  
  for (let i = startEpisode; i <= totalEpisodes; i += chunkSize) {
    const start = i
    const end = Math.min(i + chunkSize - 1, totalEpisodes)
    const range = `${start}-${end}`
    
    console.log(`   🔸 Processing chunk: episodes ${range}...`)
    
    const chunkMappings = await extractMappingsWithAI(
      { fandom: [], filler: {} },
      animeName,
      searchResults,
      malId,
      range
    )
    
    // Filter to ensure only valid episodes within the chunk range are added
    const isOriginal = animeMetadata.source?.toLowerCase() === 'original'
    const validMappings = chunkMappings.filter(m => {
      if (m.episode === null || m.episode === undefined || isNaN(Number(m.episode))) return false
      // If it is NOT an original work, it must have a valid mapped chapter to prevent saving future empty episodes
      if (!isOriginal && (m.chapter === null || m.chapter === undefined)) return false
      return m.episode >= start && m.episode <= end
    })
    
    allMappings.push(...validMappings)
    
    // Rate limit protection
    if (end < totalEpisodes) {
      await new Promise(r => setTimeout(r, 1000))
    }
  }

  console.log(`\n📊 Generated ${allMappings.length} mappings.`)

  if (isDryRun) {
    console.log('\n✨ DRY RUN RESULTS (Sample):')
    console.table(allMappings.slice(0, 10))
    if (allMappings.length > 10) console.log(`... and ${allMappings.length - 10} more.`)
    console.log('✅ Dry run complete. No data saved.')
  } else {
    if (allMappings.length > 0) {
      console.log('💾 Saving to database...')
      await saveMappings(malId, allMappings, animeMetadata.source)
      console.log('✅ Ingestion complete!')
    } else {
      console.log('ℹ️ No new valid mappings found to save.')
    }
  }
}

async function main() {
  const args = process.argv.slice(2)
  const isDryRun = args.includes('--dry-run')
  const isIncremental = args.includes('--incremental')
  const target = args.find(arg => !arg.startsWith('--'))

  if (!target) {
    console.error('Usage: npx tsx src/scripts/ingest-title-data.ts <MAL_ID|Name> [--dry-run] [--incremental]')
    process.exit(1)
  }

  const episodesArg = args.find(arg => arg.startsWith('--episodes='))
  const manualEpisodes = episodesArg ? parseInt(episodesArg.split('=')[1]) : null

  await ingestTitle(target, { isDryRun, isIncremental, manualEpisodes })
}

// Run main if executed directly
const isMain = process.argv[1] && (
  process.argv[1].endsWith('ingest-title-data.ts') || 
  process.argv[1].endsWith('ingest-title-data')
)

if (isMain) {
  main().catch(err => {
    console.error('💥 Fatal error:', err)
    process.exit(1)
  })
}
