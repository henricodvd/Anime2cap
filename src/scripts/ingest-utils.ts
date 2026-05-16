import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import * as cheerio from 'cheerio'
import { db } from '@/lib/db'
import { mappings } from '@/db/schema'
import { sql } from 'drizzle-orm'

export interface FandomMapping {
  episode: number
  chapter: string
}

export interface FillerMapping {
  [episode: number]: boolean
}

/**
 * Parses Fandom Wiki HTML to extract episode-chapter mappings
 */
export function parseFandomHTML(html: string): FandomMapping[] {
  const $ = cheerio.load(html)
  const results: FandomMapping[] = []

  $('table.wikitable tr').each((_, el) => {
    const cols = $(el).find('td')
    if (cols.length >= 2) {
      const epText = $(cols[0]).text().trim().replace(/^EP\s+/i, '')
      const episode = parseInt(epText)
      const chapter = $(cols[1]).text().trim()
      
      if (!isNaN(episode) && chapter) {
        results.push({ episode, chapter })
      }
    }
  })

  return results
}

/**
 * Parses AnimeFillerList HTML to identify filler episodes
 */
export function parseFillerHTML(html: string): FillerMapping {
  const $ = cheerio.load(html)
  const results: FillerMapping = {}

  $('tr').each((_, el) => {
    const row = $(el)
    const epNum = parseInt(row.find('td.number').text().trim())
    if (!isNaN(epNum)) {
      const type = row.find('td.type').text().toLowerCase()
      results[epNum] = type.includes('filler') && !type.includes('mixed')
    }
  })

  return results
}

export interface IngestMapping {
  episode: number
  chapter: number
  isFiller: boolean
}

/**
 * Uses LLM (Haiku) to process scraped data into a structured mapping array.
 */
export async function extractMappingsWithAI(
  scrapedData: { fandom: FandomMapping[], filler: FillerMapping },
  animeTitle: string,
  searchContext?: string,
  malId?: number,
  episodeRange?: string
): Promise<IngestMapping[]> {
  const apiKey = process.env.OPENROUTER_API_KEY

  const prompt = `
    You are an anime data expert. You are processing data for "${animeTitle}" (MyAnimeList ID: ${malId || 'Unknown'}).
    Target Episode Range: ${episodeRange || 'All'}
    
    Structure the data into a clean JSON array of mappings for this SPECIFIC range.
    Each entry must have: { "episode": number, "chapter": number, "isFiller": boolean }.
    
    CRITICAL RULES:
    1. ONLY process episodes within the range ${episodeRange || 'All'}.
    2. If an episode corresponds to a chapter range (e.g. "1-2"), create one entry per chapter: {ep:1, cap:1}, {ep:1, cap:2}.
    3. Use the filler status provided if available.
    4. If the anime is an "Original" work (no manga), set chapter to null.
    5. Ensure you ARE NOT mixing this with other seasons or sequels.
    6. Return ONLY a valid JSON array, no conversational text.
    
    Scraped Data (Fandom):
    ${JSON.stringify(scrapedData.fandom)}

    Filler Status:
    ${JSON.stringify(scrapedData.filler)}

    Additional Web Search Context:
    ${searchContext || 'None'}
  `

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://anime2cap.com', // Optional for OpenRouter
        'X-Title': 'Anime2Cap Data Engine',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3-haiku',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' } // Some models support this
      }),
    })

    const data = await response.json()
    const content = data.choices[0].message.content
    
    // Robust JSON extraction: find a JSON array of objects, skipping
    // bracket characters that appear in anime titles like "[Oshi no Ko]"
    let parsed: IngestMapping[] | null = null

    // Strategy 1: Find all '[' positions and try to parse a JSON array from each
    // This handles both `[{` (compact) and `[\n  {` (pretty-printed)
    for (let i = 0; i < content.length && !parsed; i++) {
      if (content[i] !== '[') continue
      // Check if a '{' follows (with optional whitespace/newlines)
      const afterBracket = content.substring(i + 1).trimStart()
      if (!afterBracket.startsWith('{')) continue
      // Try parsing from this '[' to progressively earlier ']'
      for (let end = content.lastIndexOf(']'); end > i; end = content.lastIndexOf(']', end - 1)) {
        try {
          parsed = JSON.parse(content.substring(i, end + 1))
          break
        } catch {
          // try next ']'
        }
      }
    }

    // Strategy 2: Fallback — try the whole content as JSON
    if (!parsed) {
      try {
        const full = JSON.parse(content)
        parsed = Array.isArray(full) ? full : full.mappings ?? full.data ?? null
      } catch {
        // not valid JSON
      }
    }

    if (!parsed || !Array.isArray(parsed)) {
      throw new Error('No JSON array found in AI response: ' + content.substring(0, 200))
    }

    return parsed
  } catch (error) {
    console.error('Error extracting mappings with AI:', error)
    return []
  }
}

/**
 * Saves or updates a title in the database.
 */
export async function saveTitle(titleData: {
  id: number
  name: string
  slug: string
  type: 'anime' | 'manga'
  episodes?: number
  image?: string
  status?: 'ongoing' | 'finished' | 'upcoming'
  synopsis?: string
  score?: string
}): Promise<void> {
  const { titles } = await import('@/db/schema')
  await db.insert(titles).values({
    id: titleData.id,
    name: titleData.name,
    slug: titleData.slug,
    type: titleData.type,
    episodes: titleData.episodes,
    image: titleData.image,
    status: titleData.status,
    synopsis: titleData.synopsis,
    score: titleData.score,
  }).onConflictDoUpdate({
    target: [titles.id],
    set: {
      name: titleData.name,
      episodes: titleData.episodes,
      status: titleData.status,
      updatedAt: new Date(),
    }
  })
}

/**
 * Saves processed mappings to the database.
 */
export async function saveMappings(
  titleId: number,
  mappingsData: IngestMapping[]
): Promise<void> {
  if (mappingsData.length === 0) return

  const values = mappingsData.map(m => {
    if (m.episode === null || m.episode === undefined || isNaN(Number(m.episode))) {
      console.warn(`⚠️ Warning: Mapping has invalid episode (${m.episode}), skipping...`);
      return null;
    }

    let chapterVal: string | null = null;
    if (m.chapter != null) {
      // Try to parse chapter. The AI or scraper might return strings like "Heart of a Fire Soldier"
      const parsedCh = Number(m.chapter);
      if (!isNaN(parsedCh)) {
        chapterVal = parsedCh.toString();
      } else {
        console.warn(`⚠️ Warning: Episode ${m.episode} has invalid numeric chapter "${m.chapter}", setting to null.`);
      }
    }

    return {
      titleId,
      episode: Number(m.episode).toString(),
      chapter: chapterVal,
      isFiller: m.isFiller ?? false,
      isCanon: !(m.isFiller ?? false),
    };
  }).filter((v): v is NonNullable<typeof v> => v !== null)

  if (values.length === 0) return

  await db.insert(mappings).values(values).onConflictDoUpdate({
    target: [mappings.titleId, mappings.episode, mappings.chapter],
    set: {
      isFiller: sql`excluded.is_filler`,
      isCanon: sql`excluded.is_canon`,
    }
  })
}

/**
 * Performs an autonomous web search using Tavily API.
 */
export async function searchWebWithTavily(query: string): Promise<string> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) {
    console.warn('TAVILY_API_KEY not found. Skipping search.')
    return ''
  }

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query: query,
        search_depth: 'advanced',
        include_answer: true,
        max_results: 5,
      }),
    })

    const data = await response.json()
    const results = data.results || []
    const context = results
      .map((r: any) => `Source: ${r.url}\nContent: ${r.content}`)
      .join('\n\n')

    return context
  } catch (error) {
    console.error('Error searching web with Tavily:', error)
    return ''
  }
}
