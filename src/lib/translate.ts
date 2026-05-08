/**
 * Translation utility using OpenRouter AI
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function translateText(text: string, targetLocale: string): Promise<string> {
  if (!text || targetLocale === 'en') return text // Assuming source is always English
  if (!OPENROUTER_API_KEY) {
    console.warn('OPENROUTER_API_KEY not found. Skipping translation.')
    return text
  }

  const targetLangName = 
    targetLocale === 'pt' ? 'Portuguese (Brazil)' : 
    targetLocale === 'jp' ? 'Japanese' : 
    'English'

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": SITE_URL,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "anthropic/claude-3.5-haiku",
        "messages": [
          {
            "role": "system",
            "content": `You are a professional translator specialized in anime and manga. Translate the following anime synopsis to ${targetLangName}. Maintain the tone, style, and specific terminology of the genre. Return ONLY the translated text without any preamble or quotes.`
          },
          {
            "role": "user",
            "content": text
          }
        ],
        "temperature": 0.3
      })
    })

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`)
    }

    const data = await response.json()
    const translatedText = data.choices?.[0]?.message?.content?.trim()
    
    return translatedText || text
  } catch (error) {
    console.error("Translation failed:", error)
    return text
  }
}
