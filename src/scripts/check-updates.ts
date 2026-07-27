import 'dotenv/config'
import { db } from '../lib/db'
import { titles, mappings } from '../db/schema'
import { eq, sql } from 'drizzle-orm'
import { jikanGet } from '../lib/jikan-client'
import { ingestTitle } from './ingest-title-data'
import readline from 'readline'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

interface UpdateItem {
  id: number
  name: string
  dbEpisodes: number
  latestEpisodes: number
  diff: number
  isNew: boolean
}

async function main() {
  console.log('🔍 Iniciando verificação de atualizações no banco de dados...')

  // 1. Carregar todos os títulos do DB para termos referência rápida de IDs
  const dbTitles = await db
    .select({
      id: titles.id,
      name: titles.name,
      status: titles.status,
      episodes: titles.episodes,
    })
    .from(titles)

  const dbTitlesMap = new Map(dbTitles.map(t => [t.id, t]))
  const dbTitlesSet = new Set(dbTitles.map(t => t.id))

  // 2. Mapear o maior número de episódio mapeado por título no DB
  const mappedCounts = await db
    .select({
      titleId: mappings.titleId,
      maxEpisode: sql<number>`MAX(CAST(${mappings.episode} AS NUMERIC))`
    })
    .from(mappings)
    .groupBy(mappings.titleId)

  const dbMaxMappedMap = new Map<number, number>()
  for (const row of mappedCounts) {
    dbMaxMappedMap.set(row.titleId, row.maxEpisode || 0)
  }

  const updatesNeeded: UpdateItem[] = []
  const newAnimeCandidates: UpdateItem[] = []

  // 3. Verificar animes ONGOING que já temos no DB
  const ongoingTitles = dbTitles.filter(t => t.status === 'ongoing')
  console.log(`\n📺 Verificando ${ongoingTitles.length} animes ongoing já cadastrados...`)

  for (const title of ongoingTitles) {
    try {
      console.log(`   🔄 Consultando Jikan para: "${title.name}" (ID: ${title.id})...`)
      const res = await jikanGet(`/anime/${title.id}`)
      
      if (!res.ok) {
        console.warn(`   ⚠️ Erro ao consultar MAL ID ${title.id}: ${res.statusText}`)
        await delay(1500)
        continue
      }

      const data = await res.json()
      
      if (data.status === 500 || data.type === 'UpstreamException') {
        console.warn(`   ⚠️ Jikan falhou em se comunicar com o MyAnimeList (Erro de SSL/Upstream). Pulando verificação deste título...`)
        await delay(1500)
        continue
      }

      const anime = data.data
      
      if (anime) {
        // Obter maior episódio no Jikan. Se estiver ongoing e não souber o total final,
        // usamos o 'episodes' retornado ou assumimos os episódios que já foram exibidos.
        const jikanEps = anime.episodes || 0
        const dbMappedEps = dbMaxMappedMap.get(title.id) || 0
        
        // Jikan pode reportar status atualizado (ex: se o anime acabou de finalizar)
        const currentJikanStatus = anime.status?.toLowerCase().includes('fin') ? 'finished' : 'ongoing'

        // Se houver episódios novos no Jikan
        if (jikanEps > dbMappedEps) {
          updatesNeeded.push({
            id: title.id,
            name: title.name,
            dbEpisodes: dbMappedEps,
            latestEpisodes: jikanEps,
            diff: jikanEps - dbMappedEps,
            isNew: false,
          })
          console.log(`   💡 Atualização detectada! DB: ${dbMappedEps} | Jikan: ${jikanEps}`)
        } else {
          console.log(`   ✅ OK (DB: ${dbMappedEps} | Jikan: ${jikanEps})`)
        }

        // Se o status mudou na Jikan API, atualiza no banco local de forma silenciosa
        if (currentJikanStatus !== title.status) {
          await db
            .update(titles)
            .set({ status: currentJikanStatus as any, updatedAt: new Date() })
            .where(eq(titles.id, title.id))
          console.log(`   📝 Status atualizado no DB para: ${currentJikanStatus}`)
        }
      }
    } catch (err) {
      console.error(`   ❌ Erro ao processar MAL ID ${title.id}:`, err)
    }

    // Rate limit preventivo para a API pública do Jikan (3 req/s max)
    await delay(1500)
  }

  // 4. Buscar os animes em exibição na temporada atual (Top 50 por popularidade)
  console.log('\n📡 Buscando animes da temporada atual no Jikan para detectar novos lançamentos populares...')
  const seasonalAnimes: any[] = []

  try {
    for (let page = 1; page <= 2; page++) {
      console.log(`   Página ${page}/2...`)
      const res = await jikanGet(`/seasons/now?page=${page}`)
      if (res.ok) {
        const data = await res.json()
        const items = data.data || []
        seasonalAnimes.push(...items)
      } else {
        console.warn(`   ⚠️ Erro ao carregar página ${page} de seasons/now: ${res.statusText}`)
      }
      await delay(1500)
    }
  } catch (err) {
    console.error('   ❌ Falha geral ao carregar dados sazonais:', err)
  }

  // 5. Cruzar os dados para encontrar animes populares da temporada que faltam no DB
  console.log(`\n🔍 Analisando ${seasonalAnimes.length} animes sazonais...`)
  const processedSeasonalIds = new Set<number>()

  for (const anime of seasonalAnimes) {
    // Evitar duplicados na resposta do Jikan
    if (processedSeasonalIds.has(anime.mal_id)) continue
    processedSeasonalIds.add(anime.mal_id)

    // Apenas tipos relevantes (TV / ONA / Series)
    const type = anime.type?.toLowerCase()
    if (type !== 'tv' && type !== 'ona') continue

    // Se NÃO estiver no banco de dados, é um lançamento relevante ausente
    if (!dbTitlesSet.has(anime.mal_id)) {
      newAnimeCandidates.push({
        id: anime.mal_id,
        name: anime.title,
        dbEpisodes: 0,
        latestEpisodes: anime.episodes || 0,
        diff: anime.episodes || 0,
        isNew: true,
      })
    } else {
      // Se JÁ estiver no banco de dados mas não identificamos como "ongoing" localmente,
      // ou se tiver novos episódios que não pegamos no passo anterior
      const dbTitle = dbTitlesMap.get(anime.mal_id)!
      const dbMappedEps = dbMaxMappedMap.get(anime.mal_id) || 0
      const jikanEps = anime.episodes || 0

      // Se por algum motivo o banco local achou que ele não era ongoing mas ele está em seasons/now
      if (dbTitle.status !== 'ongoing' && anime.status?.toLowerCase().includes('airing')) {
        await db
          .update(titles)
          .set({ status: 'ongoing', updatedAt: new Date() })
          .where(eq(titles.id, anime.mal_id))
        console.log(`   📝 Corrigido status de "${dbTitle.name}" para 'ongoing' (está no ar)`)
      }

      // Se houver episódios pendentes que não foram listados antes
      const jaIdentificado = updatesNeeded.some(u => u.id === anime.mal_id)
      if (jikanEps > dbMappedEps && !jaIdentificado) {
        updatesNeeded.push({
          id: anime.mal_id,
          name: dbTitle.name,
          dbEpisodes: dbMappedEps,
          latestEpisodes: jikanEps,
          diff: jikanEps - dbMappedEps,
          isNew: false,
        })
      }
    }
  }

  // 6. Apresentar Relatório
  console.log('\n==================================================')
  console.log('📊 RELATÓRIO DE ATUALIZAÇÕES PENDENTES')
  console.log('==================================================')

  if (updatesNeeded.length === 0 && newAnimeCandidates.length === 0) {
    console.log('✅ Tudo atualizado! Nenhum anime pendente encontrado.')
    process.exit(0)
  }

  if (updatesNeeded.length > 0) {
    console.log('\n🔄 ANIMES EXISTENTES COM NOVOS EPISÓDIOS:')
    for (const item of updatesNeeded) {
      console.log(`   - [ID: ${item.id}] ${item.name}: DB tem ${item.dbEpisodes} ep(s) mapeado(s) | Jikan tem ${item.latestEpisodes} ep(s) (+${item.diff} novos)`)
    }
  }

  if (newAnimeCandidates.length > 0) {
    console.log('\n✨ NOVOS ANIMES DA TEMPORADA (NÃO CADASTRADOS):')
    for (const item of newAnimeCandidates) {
      console.log(`   - [ID: ${item.id}] ${item.name} (${item.latestEpisodes || '?'} eps disponíveis no Jikan)`)
    }
  }

  console.log('\n==================================================')

  // 7. Prompt Interativo para Execução
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  rl.question('❓ Deseja iniciar a ingestão dos animes listados acima? (y/n): ', async (answer) => {
    rl.close()
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'sim') {
      const allToIngest = [...updatesNeeded, ...newAnimeCandidates]
      console.log(`\n🚀 Iniciando a ingestão incremental para ${allToIngest.length} animes...\n`)

      for (const item of allToIngest) {
        try {
          console.log(`--------------------------------------------------`)
          console.log(`👉 Processando: ${item.name} (ID: ${item.id})`)
          if (item.isNew) {
            console.log(`   🆕 Tipo: Novo Anime. Criando Title + Mappings completos...`)
            await ingestTitle(item.id.toString(), { isIncremental: false })
          } else {
            console.log(`   🔄 Tipo: Incremental. Mapeando episódios novos (${item.dbEpisodes + 1} a ${item.latestEpisodes})...`)
            await ingestTitle(item.id.toString(), { isIncremental: true })
          }
          console.log(`   ✅ Finalizado com sucesso!`)
        } catch (err) {
          console.error(`   ❌ Falha ao processar "${item.name}" (ID: ${item.id}):`, err)
        }
        // Intervalo para evitar sobrecarregar recursos ou APIs no loop de execução
        await delay(1000)
      }
      console.log('\n🎉 Ingestão de lote concluída!')
    } else {
      console.log('\n❌ Operação cancelada pelo usuário.')
    }
    process.exit(0)
  })
}

main().catch(err => {
  console.error('💥 Erro fatal no script de atualizações:', err)
  process.exit(1)
})
