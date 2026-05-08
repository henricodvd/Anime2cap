/**
 * @jest-environment node
 */
import { parseFandomHTML, parseFillerHTML, extractMappingsWithAI, saveMappings, searchWebWithTavily } from '../ingest-utils'
import { db } from '../../lib/db'

jest.mock('../../lib/db', () => ({
  db: {
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    onConflictDoUpdate: jest.fn().mockResolvedValue({}),
  },
}))

// Mock global fetch for OpenRouter/Tavily
global.fetch = jest.fn() as jest.Mock

process.env.OPENROUTER_API_KEY = 'mock-key'
process.env.TAVILY_API_KEY = 'mock-key'

describe('Data Engine Scrapers (Cheerio)', () => {
  it('should parse Fandom Episode List HTML correctly', () => {
    const mockHTML = `
      <table class="wikitable">
        <tbody>
          <tr><th>Ep</th><th>Chapter</th></tr>
          <tr><td>1</td><td>1</td></tr>
          <tr><td>2</td><td>2-3</td></tr>
        </tbody>
      </table>
    `
    const result = parseFandomHTML(mockHTML)
    expect(result).toContainEqual({ episode: 1, chapter: '1' })
    expect(result).toContainEqual({ episode: 2, chapter: '2-3' })
  })

  it('should parse AnimeFillerList HTML correctly', () => {
    const mockHTML = `
      <table>
        <tr class="manga_canon">
          <td class="number">1</td>
          <td class="type"><span>Manga Canon</span></td>
        </tr>
        <tr class="filler">
          <td class="number">2</td>
          <td class="type"><span>Filler</span></td>
        </tr>
      </table>
    `
    const result = parseFillerHTML(mockHTML)
    expect(result[1]).toBe(false) // episode 1 is NOT filler (canon)
    expect(result[2]).toBe(true)  // episode 2 IS filler
  })

  describe('AI Data Structuring', () => {
    it('should format mappings using AI logic (mocked fetch)', async () => {
      const scrapedData = {
        fandom: [{ episode: 1, chapter: '1' }, { episode: 2, chapter: '2-3' }],
        filler: { 1: false, 2: true }
      }
      
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify([
                { episode: 1, chapter: 1, isFiller: false },
                { episode: 2, chapter: 2, isFiller: true },
                { episode: 2, chapter: 3, isFiller: true }
              ])
            }
          }]
        })
      })

      const result = await extractMappingsWithAI(scrapedData, 'Test Anime')
      
      expect(result).toContainEqual({ episode: 1, chapter: 1, isFiller: false })
      expect(result).toContainEqual({ episode: 2, chapter: 2, isFiller: true })
      expect(result).toContainEqual({ episode: 2, chapter: 3, isFiller: true })
    })
  })

  describe('Database Layer', () => {
    it('should save mappings using Drizzle', async () => {
      const testMappings = [{ episode: 1, chapter: 1, isFiller: false }]
      await saveMappings(123, testMappings)
      
      expect(db.insert).toHaveBeenCalled()
    })
  })

  describe('Fallback Search (Tavily)', () => {
    it('should search web and return text results (mocked fetch)', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [{ content: 'Episode 1 of Naruto is canon and maps to chapter 1.' }]
        })
      })
      
      const result = await searchWebWithTavily('Naruto filler list')
      expect(result).toContain('Naruto')
      expect(result).toContain('canon')
    })
  })
})
