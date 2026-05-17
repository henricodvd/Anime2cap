import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { 
  parseFandomHTML, 
  parseFillerHTML, 
  extractMappingsWithAI, 
  saveTitle,
  saveMappings, 
  searchWebWithTavily 
} from './ingest-utils'
import slugify from 'slugify'

async function main() {
  const args = process.argv.slice(2)
  const isDryRun = args.includes('--dry-run')
  const target = args.find(arg => !arg.startsWith('--'))

  if (!target) {
    console.error('Usage: npx tsx src/scripts/ingest-title-data.ts <MAL_ID|Name> [--dry-run]')
    process.exit(1)
  }

  console.log(`\n🚀 Starting ingestion for: ${target} ${isDryRun ? '(DRY RUN)' : ''}`)

  // 1. Resolve Anime Name and MAL ID
  let animeName = target
  let malId: number | null = parseInt(target)
  
  if (isNaN(malId)) {
    malId = null
    console.log(`🔍 Searching for metadata for: ${target}...`)
    // Optional: Search Jikan to get real name and MAL ID
    const searchRes = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(target)}&limit=1`)
    const searchData = await searchRes.json()
    if (searchData.data?.[0]) {
      animeName = searchData.data[0].title
      malId = searchData.data[0].mal_id
      console.log(`✅ Found: ${animeName} (MAL ID: ${malId})`)
    }
  } else {
    const res = await fetch(`https://api.jikan.moe/v4/anime/${malId}`)
    const data = await res.json()
    if (data.data) {
      animeName = data.data.title
      console.log(`✅ Title: ${animeName}`)
    }
  }

  if (!malId) {
    console.error('❌ Could not resolve MAL ID.')
    process.exit(1)
  }

  // 1.1 Get total episodes
  const jikanRes = await fetch(`https://api.jikan.moe/v4/anime/${malId}`)
  const jikanData = await jikanRes.json()
  const animeMetadata = jikanData.data
  if (!animeMetadata) {
    console.error('❌ Could not fetch metadata from Jikan.')
    process.exit(1)
  }

  // Handle manual episodes override
  const episodesArg = args.find(arg => arg.startsWith('--episodes='))
  const manualEpisodes = episodesArg ? parseInt(episodesArg.split('=')[1]) : null
  
  const totalEpisodes = manualEpisodes || animeMetadata.episodes || 12
  console.log(`📡 Total Episodes: ${totalEpisodes}${manualEpisodes ? ' (Manual Override)' : ''}`)

  const slug = slugify(animeName, { lower: true, strict: true })

  if (!isDryRun) {
    console.log('💾 Saving title metadata...')
    await saveTitle({
      id: malId,
      name: animeMetadata.title,
      slug: slug,
      type: 'anime',
      episodes: totalEpisodes,
      image: animeMetadata.images?.jpg?.image_url,
      status: animeMetadata.status?.toLowerCase().includes('fin') ? 'finished' : 'ongoing',
      synopsis: animeMetadata.synopsis,
      score: animeMetadata.score?.toString(),
      source: animeMetadata.source,
    })
  }

  // 2. Scraping/Search Layer
  console.log('🔍 Searching web for episode-to-chapter mapping...')
  const searchQuery = `${animeName} anime episodes 1 to ${totalEpisodes} manga chapter mapping list filler list`
  const searchResults = await searchWebWithTavily(searchQuery)
  
  if (!searchResults) {
    console.log('⚠️ No search results found. Ingestion might be limited.')
  }

  // 3. AI Layer with Chunking
  const chunkSize = 50
  const allMappings: any[] = []
  
  console.log(`🧠 Processing data with AI (Haiku) in chunks of ${chunkSize}...`)
  
  for (let i = 1; i <= totalEpisodes; i += chunkSize) {
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
    
    allMappings.push(...chunkMappings)
    
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
    console.log('💾 Saving to database...')
    await saveMappings(malId, allMappings, animeMetadata.source)
    console.log('✅ Ingestion complete!')
  }
}

main().catch(err => {
  console.error('💥 Fatal error:', err)
  process.exit(1)
})
