import 'dotenv/config'
import { db } from '../lib/db'
import { titles, mappings } from '../db/schema'
import { eq, isNull } from 'drizzle-orm'
import slugify from 'slugify'

const hypedAnimes = [
  "Mushoku Tensei: Isekai Ittara Honki Dasu",
  "Mushoku Tensei: Isekai Ittara Honki Dasu Part 2",
  "Naruto: Shippuuden",
  "Re:Zero kara Hajimeru Isekai Seikatsu 2nd Season Part 2",
  "Re:Zero kara Hajimeru Isekai Seikatsu 3rd Season",
  "Re:Zero kara Hajimeru Isekai Seikatsu 4th Season",
  "Saikyou no Ousama Nidome no Jinsei wa Nani wo Suru?",
  "Saikyou no Ousama Nidome no Jinsei wa Nani wo Suru? Season 2",
  "Tsue to Tsurugi no Wistoria",
  "Tsue to Tsurugi no Wistoria Season 2",
  "Vinland Saga Season 2",
  "Yomi no Tsugai",
  "Hunter X Hunter",
  "Lord of Mysteries",
  "chained soldier",
  "chained soldier 2",
  "hajime no ippo",
  "jojo",
  "apothecary diaries",
  "shingeki no kyojin",
  "kaiju no 8",
  "black clover",
  "agents of the four season",
  "the angel next door spoils me rotten",
  "the ramparts of ice",
  "fire force",
  "golden kamuy",
  "hells paradise",
  "you and i are polar opposites",
  "tales of zestira the x",
  "haibaras teenage game+",
  "hundred scenes of awajima",
  "kanan is devilishly easy",
  "a replica can fall in love",
  "needy girl overdose",
  "second prettiest girl",
  "want to end this love game",
  "gals cant be kind to otaku",
  "akane-banashi"
]

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function fetchFromJikan(query: string) {
  try {
    const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=3`)
    if (!res.ok) return null
    const data = await res.json()
    return data.data?.[0] || null
  } catch (e) {
    return null
  }
}

async function fetchJikanById(id: number) {
  try {
    const res = await fetch(`https://api.jikan.moe/v4/anime/${id}`)
    if (!res.ok) return null
    const data = await res.json()
    return data.data || null
  } catch (e) {
    return null
  }
}

function mapJikanType(type: string): string {
  const t = type?.toLowerCase() || ''
  if (t === 'tv' || t === 'tv_special') return 'anime'
  if (t === 'movie') return 'movie'
  if (t === 'ova') return 'ova'
  if (t === 'special') return 'special'
  if (t === 'ona') return 'ona'
  if (t === 'music') return 'music'
  return 'anime'
}

function mapJikanStatus(jikanStatus: string): 'ongoing' | 'finished' | 'upcoming' {
  if (jikanStatus?.includes('Airing') && !jikanStatus?.includes('Finished')) return 'ongoing'
  if (jikanStatus?.includes('Finished')) return 'finished'
  if (jikanStatus?.includes('Not yet aired')) return 'upcoming'
  return 'ongoing'
}

async function main() {
  console.log("🚀 Starting Hyped Anime Verification...")
  
  const missingMappings: string[] = []

  for (const name of hypedAnimes) {
    console.log(`\n🔍 Searching Jikan for: ${name}`)
    const anime = await fetchFromJikan(name)
    
    if (!anime) {
      console.log(`❌ Could not find "${name}" on Jikan.`)
      missingMappings.push(name)
      await delay(1000)
      continue
    }

    console.log(`✅ Found: ${anime.title} (ID: ${anime.mal_id})`)

    // Check mappings
    const maps = await db.select().from(mappings).where(eq(mappings.titleId, anime.mal_id)).limit(1)
    if (maps.length === 0) {
      console.log(`⚠️  NO MAPPINGS FOUND for ${anime.title} (ID: ${anime.mal_id}).`)
      missingMappings.push(anime.title)
    } else {
      console.log(`✅ Mappings exist for ${anime.title}.`)
    }

    // Upsert Title
    const generatedSlug = slugify(anime.title, { lower: true, strict: true })
    
    try {
      await db.insert(titles).values({
        id: anime.mal_id,
        name: anime.title,
        nameJapanese: anime.title_japanese,
        slug: generatedSlug,
        type: mapJikanType(anime.type) as any,
        image: anime.images?.jpg?.image_url,
        status: mapJikanStatus(anime.status) as any,
        synopsis: anime.synopsis,
        episodes: anime.episodes,
        score: anime.score?.toString(),
        source: anime.source,
      }).onConflictDoUpdate({
        target: titles.id,
        set: {
          name: anime.title,
          slug: generatedSlug,
          source: anime.source,
          updatedAt: new Date()
        }
      })
      console.log(`💾 Saved/Updated title metadata for ${anime.title}.`)
    } catch (e: any) {
      console.log(`❌ Failed to save title ${anime.title}: ${e.message}`)
    }

    await delay(1000) // Rate limit
  }

  console.log("\n==================================================")
  console.log("🚀 Starting Global Source Update for all titles...")
  
  // Find all titles missing source
  const allTitles = await db.select({ id: titles.id, name: titles.name, source: titles.source }).from(titles)
  const titlesToUpdate = allTitles.filter(t => !t.source)
  
  console.log(`Found ${titlesToUpdate.length} titles missing 'source'.`)

  let updatedCount = 0
  for (const t of titlesToUpdate) {
    console.log(`🔄 Fetching source for ${t.name} (ID: ${t.id})...`)
    const anime = await fetchJikanById(t.id)
    if (anime && anime.source) {
      await db.update(titles).set({ source: anime.source, updatedAt: new Date() }).where(eq(titles.id, t.id))
      console.log(`   ✅ Set source to: ${anime.source}`)
      updatedCount++
    } else {
      console.log(`   ⚠️ Could not determine source for ${t.name}.`)
    }
    await delay(1000) // Rate limit
  }

  console.log("\n==================================================")
  console.log("🏁 SUMMARY:")
  console.log(`Updated ${updatedCount} old titles with new source metadata.`)
  if (missingMappings.length > 0) {
    console.log("\n🚨 The following animes DO NOT HAVE MAPPINGS yet (you need to run ingest-title-data.ts for them):")
    missingMappings.forEach(m => console.log(` - ${m}`))
  } else {
    console.log("\n✅ All hyped animes have mappings!")
  }

  process.exit(0)
}

main().catch(console.error)
