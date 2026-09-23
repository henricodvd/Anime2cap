# 🚀 Plano de Lançamento Anime2Cap - Versão 2.0

## 🎯 Objetivo do Documento

Este documento estabelece o plano estratégico, arquitetural e operacional para o desenvolvimento e lançamento da **Versão 2.0 do Anime2Cap**. 

O objetivo principal desta versão é consolidar a independência de infraestrutura (migrando da Vercel para uma VPS dedicada na **Oracle Cloud Infrastructure - OCI**), automatizar a entrega contínua com **GitHub Actions (CI/CD)**, eliminar gargalos de performance críticos (como o atraso no carregamento do carrossel da Home) e implementar as pendências e melhorias necessárias antes de reintroduzir a aplicação em produção com alta disponibilidade e custo previsível.

Este arquivo foi estruturado para ser **iterativo**: para cada desafio ou módulo, são apresentadas as melhores alternativas técnicas para que possamos avaliar, selecionar e detalhar as implementações conforme novas pendências forem levantadas.

---

## 📋 Sumário dos Tópicos

1. [Migração de Hospedagem: Vercel ➔ VPS OCI (Oracle Cloud)](#1-migração-de-hospedagem-vercel--vps-oci-oracle-cloud)
2. [Esteira de CI/CD com GitHub Actions](#2-esteira-de-cicd-com-github-actions)
3. [Resolução do Atraso no Carrossel de Trends (Home)](#3-resolução-do-atraso-no-carrossel-de-trends-home)
4. [Estratégia de Banco de Dados e Background Workers (Cron / Ingestão)](#4-estratégia-de-banco-de-dados-e-background-workers)
5. [Performance, Camada de Cache e Otimização de Imagens](#5-performance-camada-de-cache-e-otimização-de-imagens)
6. [Reformulação do Pipeline de Ingestão e Mapeamento (Jikan, IA e Veracidade)](#6-reformulação-do-pipeline-de-ingestão-e-mapeamento-jikan-ia-e-veracidade)
7. [Sistema de Franquias e Relações entre Temporadas (Related Anime & Sequels)](#7-sistema-de-franquias-e-relações-entre-temporadas-related-anime--sequels)
8. [Backlog de Novas Features e Pendências v2.0](#8-backlog-de-novas-features-e-pendências-v20)
9. [Checklist de Prontidão para o Go-Live (Checklist v2.0)](#9-checklist-de-prontidão-para-o-go-live)



---

## 1. Migração de Hospedagem: Vercel ➔ VPS OCI (Oracle Cloud)

### Contexto e Motivação
A Vercel oferece grande comodidade no ecossistema Next.js, porém impõe limitações em ambientes serverless (tempo limite de execução de funções para rotinas longas da Jikan, custos elevados de edge/bandwidth, ausência de processos em segundo plano de longa duração e custos em escala). A migração para uma VPS OCI (utilizando o *Always Free Tier* da Oracle com instâncias ARM Ampere A1 de até 4 OCPUs e 24 GB de RAM, ou instâncias x86 dedicadas) garante controle total do ambiente, execução de rotinas agendadas (cron jobs) e redução drástica de custos.

Como o projeto já está configurado com `output: 'standalone'` em [next.config.mjs](file:///C:/Users/henri/Documents/Antigravity/ep-cap/next.config.mjs#L13), a aplicação já gera um build enxuto e ideal para execução em servidores dedicados.

### Alternativas de Implementação

#### 🥇 Alternativa 1.1 (Recomendada): Docker Multi-Stage + Docker Compose + Reverse Proxy (Caddy ou Nginx)
- **Descrição**: Encapsular a aplicação Next.js em uma imagem Docker utilizando o output `standalone`. Orquestrar os serviços via `docker-compose.yml`, incluindo um proxy reverso moderno como o **Caddy** (que gerencia certificados SSL Let's Encrypt de forma 100% automática e nativa) ou **Nginx**.
- **Vantagens**:
  - Paridade total entre ambientes local, homologação e produção.
  - O Caddy elimina a necessidade de scripts de renovação de Certbot/SSL manuais.
  - Facilidade de rollback: basta voltar a tag da imagem Docker anterior.
  - Isolamento seguro de rede e facilidade para acoplar outros serviços (ex: Redis local).
- **Desvantagens**:
  - Requer manutenção básica do daemon Docker na VPS.

#### 🥈 Alternativa 1.2: PaaS Auto-Hospedado (Coolify ou Dokku) na VPS OCI
- **Descrição**: Instalar o **Coolify** (Open Source alternativa à Vercel/Heroku) diretamente na máquina da OCI. Ele oferece interface visual, conexão direta ao GitHub, gerenciamento de variáveis de ambiente, deploy com zero downtime e emissão de SSL automática.
- **Vantagens**:
  - Interface amigável similar à Vercel.
  - Deploy por webhook/git push out-of-the-box.
  - Gestão visual de métricas de CPU/RAM e logs em tempo real.
- **Desvantagens**:
  - Consome uma fatia de recursos da VPS (em torno de 1 GB a 2 GB de RAM apenas para o painel do Coolify).
  - Camada adicional de abstração para debugar em caso de falhas de rede interna.

#### 🥉 Alternativa 1.3: Bare-Metal com Node.js + PM2 + Nginx + Certbot
- **Descrição**: Instalar o runtime Node.js diretamente no Ubuntu/Oracle Linux da VPS, utilizar o **PM2** como gerenciador de processos em cluster mode, e Nginx na borda com Certbot.
- **Vantagens**:
  - Menor overhead de virtualização; consumo de memória estritamente dedicado ao Node.
  - Controle nativo sobre arquivos do sistema operacional.
- **Desvantagens**:
  - Dificuldade para rollbacks rápidos.
  - O build direto na máquina pode concorrer por CPU/RAM com a aplicação em execução no momento do deploy.

---

## 2. Esteira de CI/CD com GitHub Actions

### Contexto e Motivação
Garantir que cada alteração mesclada na branch `main` passe por testes automatizados (Jest), validação de tipos TypeScript, linting e seja implantada na VPS sem intervenção manual e com o menor tempo de inatividade possível (*zero-downtime deployment*).

### Alternativas de Implementação

#### 🥇 Alternativa 2.1 (Recomendada): Build de Imagem no GitHub Actions + Deploy Remoto via SSH
- **Descrição**: O GitHub Actions executa os testes (`npm run test`), compila a imagem Docker multi-stage, faz o push para o **GitHub Container Registry (GHCR)** e conecta na VPS OCI via SSH seguro disparando:
  ```bash
  docker compose pull && docker compose up -d --remove-orphans
  ```
- **Vantagens**:
  - O esforço pesado de compilação e build do Next.js fica nos servidores do GitHub, poupando a CPU da VPS OCI.
  - Permite arquitetura multi-arch (build para `linux/arm64` no GitHub se a VPS for Oracle Ampere).
  - Versionamento completo de cada versão lançada através das tags de imagem no GHCR.
- **Desvantagens**:
  - Requer configurar credenciais de registro (`CR_PAT` ou `GITHUB_TOKEN`) na VPS para puxar imagens privadas do GHCR.

#### 🥈 Alternativa 2.2: Deploy Direto via SSH com Git Pull e Build Local na VPS
- **Descrição**: O workflow do GitHub Actions valida os testes e conecta na VPS via SSH. A VPS faz `git pull`, instala dependências (`npm ci`) e executa `npm run build` seguido de `pm2 reload` ou `docker compose build`.
- **Vantagens**:
  - Simples de configurar; não depende de registro de imagens Docker externo.
- **Desvantagens**:
  - O processo de `next build` consome picos de 100% de CPU e bastante memória RAM na VPS durante o deploy, podendo gerar lentidão passageira para os usuários conectados.

#### 🥉 Alternativa 2.3: Zero-Downtime Blue/Green com Traefik ou Nginx Upstream
- **Descrição**: Manter dois containers de aplicação rodando (versão A e versão B). O GitHub Actions sobe a nova versão em uma porta secundária, testa o endpoint de *health check* e comuta o tráfego do proxy reverso para a nova versão antes de desligar a antiga.
- **Vantagens**:
  - Zero downtime absoluto garantido.
- **Desvantagens**:
  - Maior complexidade de configuração nos scripts de deploy.

---

## 3. Resolução do Atraso no Carrossel de Trends (Home)

### Contexto e Motivação
Conforme diagnosticado, o carrossel duplo diagonal ([`HeroCarousel`](file:///C:/Users/henri/Documents/Antigravity/ep-cap/src/components/HeroCarousel.tsx#L9)) apresenta um atraso perceptível de aparição porque a página carrega via SSR sem dados de destaque. Somente após a hidratação do React no cliente, o `useEffect` de [HomeClient.tsx](file:///C:/Users/henri/Documents/Antigravity/ep-cap/src/app/[locale]/HomeClient.tsx#L32) dispara a chamada para [/api/featured](file:///C:/Users/henri/Documents/Antigravity/ep-cap/src/app/api/featured/route.ts), que por sua vez pode incorrer em latência de banco ou chamadas síncronas para a Jikan API.

### Alternativas de Implementação

#### 🥇 Alternativa 3.1 (Recomendada): Server Component Data Fetching (SSR / ISR) + Pre-load
- **Descrição**: 
  1. No Server Component da Home ([page.tsx](file:///C:/Users/henri/Documents/Antigravity/ep-cap/src/app/[locale]/page.tsx)), buscar os animes em destaque diretamente no banco através de uma função com cache do Next.js (`unstable_cache` ou revalidação a cada 1 hora).
  2. Injetar esses dados como propriedade inicial: `<HomeClient initialFeatured={featured} />`.
  3. No [HomeClient.tsx](file:///C:/Users/henri/Documents/Antigravity/ep-cap/src/app/[locale]/HomeClient.tsx), inicializar o estado com `initialFeatured`.
  4. Em [AnimeCard.tsx](file:///C:/Users/henri/Documents/Antigravity/ep-cap/src/components/AnimeCard.tsx), alterar as imagens da primeira dobra de `loading="lazy"` para `loading="eager"` ou utilizar o componente `Image` do Next.js com prioridade.
- **Vantagens**:
  - **Eliminação total do delay**: O carrossel e suas tags já estarão presentes no primeiro pacote HTML enviado pelo servidor.
  - Zero efeito cascata (*no waterfall*).
  - Melhora expressiva de SEO e métricas Core Web Vitals (LCP e eliminação de CLS).
- **Desvantagens**:
  - Exige ajuste nos testes existentes ([HeroCarousel.test.tsx](file:///C:/Users/henri/Documents/Antigravity/ep-cap/src/__tests__/HeroCarousel.test.tsx)) para garantir suporte à prop `initialFeatured`.

#### 🥈 Alternativa 3.2: Cache HTTP em Borda (Cache-Control) + Desacoplamento da Jikan
- **Descrição**: Manter o fetch no cliente, mas:
  1. Configurar cabeçalhos agressivos de cache HTTP na resposta de [/api/featured](file:///C:/Users/henri/Documents/Antigravity/ep-cap/src/app/api/featured/route.ts):
     `Cache-Control: public, s-maxage=86400, stale-while-revalidate=43200`.
  2. Desacoplar completamente a consulta à Jikan: remover chamadas externas de dentro da rota de API. As atualizações passam a rodar estritamente via script agendado na VPS.
  3. Adicionar um esqueleto (*skeleton loader*) animado com o mesmo tamanho e ângulo em [HeroCarousel.tsx](file:///C:/Users/henri/Documents/Antigravity/ep-cap/src/components/HeroCarousel.tsx) para evitar pulo de layout.
- **Vantagens**:
  - Resposta do endpoint quase instantânea (< 15ms) via cache do proxy ou navegador.
  - Elimina o risco de timeouts da API Jikan bloquearem o usuário.
- **Desvantagens**:
  - Ainda existe um pequeno atraso milissegundo de requisição cliente-servidor em relação ao SSR puro.

#### 🥉 Alternativa 3.3: Geração Estática Incremental (On-Demand ISR) com Tags de Revalidação
- **Descrição**: Tornar a página inicial estática via ISR (`revalidate: 3600`), revalidando a rota via webhook/cron sempre que novos títulos entrarem em destaque (`revalidateTag('featured')`).
- **Vantagens**:
  - Entrega mais rápida possível: a página inteira é servida como arquivo estático do disco.
- **Desvantagens**:
  - Mais complexo de orquestrar caso haja dados dinâmicos sensíveis a cada requisição na Home.

---

## 4. Estratégia de Banco de Dados e Background Workers

### Contexto e Motivação
A aplicação utiliza Drizzle ORM sobre PostgreSQL ([src/lib/db.ts](file:///C:/Users/henri/Documents/Antigravity/ep-cap/src/lib/db.ts)). Além das rotas de consulta da web, existem scripts críticos como [ingest-title-data.ts](file:///C:/Users/henri/Documents/Antigravity/ep-cap/src/scripts/ingest-title-data.ts) e [check-updates.ts](file:///C:/Users/henri/Documents/Antigravity/ep-cap/src/scripts/check-updates.ts) que consultam a Jikan e atualizam mapeamentos de capítulos. Na Vercel, esses scripts não podiam rodar como daemons persistentes.

### Alternativas de Implementação

#### 🥇 Alternativa 4.1 (Recomendada): PostgreSQL Gerenciado Externo (Supabase / Neon) + Workers na VPS OCI
- **Descrição**: Manter a base de dados em um serviço Postgres gerenciado em nuvem (ou instância autônoma com backups) e utilizar a VPS OCI para rodar a aplicação web Next.js e os workers de atualização agendados via Linux Cron ou container de tarefas.
- **Vantagens**:
  - Desacoplamento seguro: se a VPS precisar ser reiniciada ou reconfigurada, o banco de dados e seus backups permanecem intactos.
  - Backups gerenciados automáticos point-in-time.
  - Recursos de CPU/RAM da VPS ficam 100% livres para servir páginas web e compilar rotinas.
- **Desvantagens**:
  - Pequena latência de rede entre a VPS e o host do banco de dados (mitigada se alocados na mesma região geográfica, ex: Ashburn/São Paulo).

#### 🥈 Alternativa 4.2: PostgreSQL Conteinerizado na Própria VPS OCI
- **Descrição**: Subir um container Postgres com volume persistente no Docker Compose da VPS, com script diário de backup (`pg_dump`) enviado para o Oracle Object Storage ou bucket S3.
- **Vantagens**:
  - Latência zero de conexão de banco (`localhost` / rede interna Docker).
  - Sem custos com serviços externos de banco de dados gerenciado.
- **Desvantagens**:
  - Responsabilidade operacional total sobre integridade de dados, retenção de backups e restauração de desastres na VPS.

---

## 5. Performance, Camada de Cache e Otimização de Imagens

### Contexto e Motivação
No Next.js auto-hospedado (fora da Vercel), a otimização de imagens (`next/image`) utiliza a biblioteca `sharp` (já presente em [package.json](file:///C:/Users/henri/Documents/Antigravity/ep-cap/package.json#L35)) para redimensionamento e conversão em WebP/AVIF na CPU do servidor. Imagens de animes vindas de `cdn.myanimelist.net` podem sobrecarregar a máquina se não houver cache de borda.

### Alternativas de Implementação

#### 🥇 Alternativa 5.1 (Recomendada): Cloudflare na Borda com Cache de Ativos Estáticos e Imagens
- **Descrição**: Configurar o DNS do domínio no **Cloudflare** (plano gratuito), ativando proxy (nuvem laranja) com regras de cache para `/_next/image*` e `/_next/static/*`.
- **Vantagens**:
  - Absorve 90%+ do tráfego estático e de imagens nos servidores edge globais da Cloudflare, poupando a VPS OCI.
  - Proteção DDoS e SSL integrado na borda.
  - Acelera o carregamento dos posters do carrossel para usuários de qualquer país.
- **Desvantagens**:
  - Necessidade de purgar o cache do Cloudflare quando houver mudanças críticas em arquivos estáticos de mesmo nome.

#### 🥈 Alternativa 5.2: Cache Local Nginx/Caddy de Imagens em Disco na VPS
- **Descrição**: Configurar o proxy reverso da VPS para criar uma zona de cache em disco para respostas do `/_next/image` por 30 dias.
- **Vantagens**:
  - Independe de serviços terceiros além do próprio servidor.
- **Desvantagens**:
  - Consome espaço em disco (armazenamento de bloco da OCI).

---

---

## 6. Reformulação do Pipeline de Ingestão e Mapeamento (Jikan, IA e Veracidade)

### Contexto e Diagnóstico dos Problemas Atuais
A análise técnica detalhada dos scripts de ingestão ([src/scripts/ingest-title-data.ts](file:///C:/Users/henri/Documents/Antigravity/ep-cap/src/scripts/ingest-title-data.ts)), atualização ([src/scripts/check-updates.ts](file:///C:/Users/henri/Documents/Antigravity/ep-cap/src/scripts/check-updates.ts)) e utilitários ([src/scripts/ingest-utils.ts](file:///C:/Users/henri/Documents/Antigravity/ep-cap/src/scripts/ingest-utils.ts)) revelou os gargalos exatos responsáveis pelas inconsistências reportadas:

1. **A Discrepância "Jikan 0 vs Banco 10" e Falha ao Detectar Novos Episódios**:
   - Em [check-updates.ts (linha 81)](file:///C:/Users/henri/Documents/Antigravity/ep-cap/src/scripts/check-updates.ts#L81), o código faz:
     ```ts
     const jikanEps = anime.episodes || 0
     const dbMappedEps = dbMaxMappedMap.get(title.id) || 0
     ```
   - No MyAnimeList/Jikan, animes em exibição (*ongoing*) ou de longa duração (One Piece, Bleach, etc.) retornam `episodes: null`. O código converte `null` em `0`.
   - Se o banco já possui 10 episódios mapeados (`dbMappedEps = 10`), a comparação `jikanEps > dbMappedEps` resulta em `0 > 10` (**falso**). O script exibe no log `✅ OK (DB: 10 | Jikan: 0)` e **nunca detecta novos episódios**.
   - Além disso, o campo `anime.episodes` na Jikan representa o *total planejado* de episódios, e **não** quais episódios já foram ao ar semanalmente.

2. **Dificuldade de Encontrar Títulos na API**:
   - A busca da Jikan (`/anime?q=${target}&limit=1`) é sensível a grafias romaji oficiais do MAL. Nomes em inglês, português ou apelidos populares (ex: "DanMachi", "Slime Isekai", "Attack on Titan") falham ou trazem o título errado por usar `limit=1`.
   - A API pública da Jikan sofre constantemente com limites de requisição (HTTP 429) e erros de upstream com o MyAnimeList.

3. **Onde a IA Pesquisa e a Realidade do Scraping Atual**:
   - Em [ingest-title-data.ts (linha 152)](file:///C:/Users/henri/Documents/Antigravity/ep-cap/src/scripts/ingest-title-data.ts#L152-L158), o código passa para a IA:
     ```ts
     const chunkMappings = await extractMappingsWithAI(
       { fandom: [], filler: {} }, // ⚠️ VAZIO!
       animeName,
       searchResults,
       malId,
       range
     )
     ```
     As funções de raspagem de wikis (`parseFandomHTML` e `parseFillerHTML`) presentes em [ingest-utils.ts](file:///C:/Users/henri/Documents/Antigravity/ep-cap/src/scripts/ingest-utils.ts) **nunca são chamadas no fluxo real**, existindo apenas em testes unitários.
   - A busca na web atual é feita exclusivamente pela API da **Tavily** ([searchWebWithTavily](file:///C:/Users/henri/Documents/Antigravity/ep-cap/src/scripts/ingest-utils.ts#L274)), que executa uma consulta de texto genérica e traz apenas 5 pequenos fragmentos de texto soltos do Google/Bing.
   - Quando a Tavily traz snippets de fóruns, Quora ou blogs sem tabelas de correspondência, o Claude Haiku fica sem dados concretos e tenta "adivinhar" (alucinar) os capítulos de memória ou retorna vazio. Não há rastreabilidade de fontes, links salvos ou auditoria de veracidade.

---

### Alternativas de Implementação

#### 🥇 Alternativa 6.1 (Recomendada): Pipeline Híbrido com Fontes Primárias Determinísticas + IA Apenas como Normalizadora
- **Descrição**:
  1. **Detecção Precisa de Novos Episódios Semanais**:
     - Integrar a **API GraphQL do AniList** (sem rate limits abusivos) ou consultar o endpoint de episódios detalhados do Jikan (`/anime/{id}/episodes`). O AniList fornece o campo `nextAiringEpisode` e histórico de transmissão em tempo real, informando com exatidão que o episódio "X" foi exibido no Japão nesta semana.
  2. **Coleta Determinística em Fontes Especializadas de Alta Autoridade (Sem Alucinação)**:
     - **MangaUpdates (Baka-Updates API)**: Enciclopédia global de mangás que possui a relação verificada oficial: "Anime Start/End Chapter" (ex: "Starts at Vol 1, Chap 1 / Ends at Vol 4, Chap 33").
     - **AnimeFillerList (Scraping direto)**: Obtenção exata da lista de episódios canônicos vs fillers por número.
     - **Fandom Wikis Oficiais (MediaWiki API / Cheerio)**: Extrair diretamente as tabelas das páginas `/Episode_Guide` que contêm a coluna explícita "Adapted Chapter(s)".
  3. **IA com Grounding Rigoroso e Citação de Fonte**:
     - O modelo de IA (Claude / Gemini) só é acionado se a extração determinística direta encontrar formatos ambíguos. A IA é estritamente proibida de criar dados de memória: se a informação não estiver no texto da fonte, deve retornar nulo.
     - Salvar no banco a **URL da fonte** e o nível de confiança do mapeamento (`confidence: 'verified' | 'estimated'`).
- **Vantagens**:
  - Dados 100% verificáveis e confiáveis.
  - Elimina o bug "DB: 10 | Jikan: 0".
  - Atualização automática e pontual a cada episódio lançado semanalmente.
- **Desvantagens**:
  - Requer implementar conectores específicos para AniList e MangaUpdates.

#### 🥈 Alternativa 6.2: Agente Autônomo com Web Scraping Filtrado por Domínios Confiáveis (Tavily Domain Filter / Firecrawl)
- **Descrição**:
  - Configurar a busca da Tavily com filtro estrito de domínios confiáveis (`include_domains: ['fandom.com', 'animefillerlist.com', 'mangaupdates.com']`).
  - Utilizar uma ferramenta de extração de página completa (como **Firecrawl** ou **Cheerio**) para baixar o Markdown completo da página da Wiki, em vez de depender de 5 snippets curtos.
  - Enviar o Markdown estruturado da página para o modelo de IA extrair o JSON de correspondência.
- **Vantagens**:
  - Flexível para títulos onde a estrutura da wiki varia.
  - Aumenta a qualidade do contexto fornecido ao modelo.
- **Desvantagens**:
  - Custo adicional por requisição do Firecrawl ou Tavily avançado.
  - Ainda depende da interpretação do LLM para todas as consultas.

#### 🥉 Alternativa 6.3: Validador Cruzado Multi-Fonte com Painel de Curadoria
- **Descrição**:
  - O script consulta simultaneamente duas fontes (ex: AniList/Jikan + MangaUpdates). Se as duas fontes concordarem, o mapeamento é publicado com status `verified: true`.
  - Se houver divergência ou incerteza, o título é gravado com status `flagged_for_review` e disponibilizado em uma página simples de administração (`/admin/mappings`), onde o moderador visualiza o link da Wiki e aprova com 1 clique.
- **Vantagens**:
  - Segurança editorial máxima: nenhum dado incerto vai ao ar sem sinalização.
- **Desvantagens**:
  - Requer intervenção humana para títulos que apresentarem discordâncias.

---

---

## 7. Sistema de Franquias e Relações entre Temporadas (Related Anime & Sequels)

### Contexto e Diagnóstico dos Problemas Atuais
A experiência do usuário ao pesquisar ou navegar por animes com múltiplas temporadas (ex: *Re:Zero*, *Attack on Titan*, *Demon Slayer*, *One Piece*) é fragmentada e incompleta:
1. **O Campo `titles.related` Fica Quase Sempre `NULL` no Banco de Dados**:
   - No script [src/scripts/ingest-title-data.ts](file:///C:/Users/henri/Documents/Antigravity/ep-cap/src/scripts/ingest-title-data.ts) e em [src/scripts/ingest-utils.ts](file:///C:/Users/henri/Documents/Antigravity/ep-cap/src/scripts/ingest-utils.ts#L167), a função `saveTitle` **nem sequer recebe ou persiste o campo `related`**.
   - Nas rotas de busca ([src/app/api/search/route.ts](file:///C:/Users/henri/Documents/Antigravity/ep-cap/src/app/api/search/route.ts)) e destaques ([src/app/api/featured/route.ts](file:///C:/Users/henri/Documents/Antigravity/ep-cap/src/app/api/featured/route.ts)), o campo `related` é omitido do insert.
   - O único local que busca relações é [src/lib/title-service.ts](file:///C:/Users/henri/Documents/Antigravity/ep-cap/src/lib/title-service.ts#L93) chamando `/anime/${id}/full`. No entanto, se o título já existe no banco com `synopsis` preenchida, o serviço retorna o registro local diretamente do banco de dados (onde `related` é `null`) sem nunca consultar as relações na Jikan.
   - **Resultado Visual**: O componente [src/components/RelatedAnime.tsx](file:///C:/Users/henri/Documents/Antigravity/ep-cap/src/components/RelatedAnime.tsx#L47) faz `if (!relations || relations.length === 0) return null`, e a seção inteira simplesmente desaparece da tela.

2. **Ausência de Agrupamento por Franquia na Busca**:
   - Ao pesquisar por "Re:Zero" ou "One Piece", a API de busca retorna uma lista plana e desconectada de 10 a 20 títulos independentes (`Re:Zero Season 1`, `Re:Zero Season 2`, `Re:Zero Season 2 Part 2`, `Re:Zero Season 3`, filmes e OVAs).
   - Não há indicação visual de temporada, ordem cronológica, ou de que pertencem à mesma linhagem.

3. **Links Quebrados ou Vazios para Sequências**:
   - Quando as relações do Jikan existem, elas contêm apenas nomes e URLs externas do MAL. O componente tenta gerar URLs como `/title/${malId}-${cleanName}`, mas essas sequências muitas vezes ainda não foram cadastradas no banco local ou não possuem mapeamento de episódios para capítulos, levando o usuário a páginas sem conteúdo.

---

### Alternativas de Implementação

#### 🥇 Alternativa 7.1 (Recomendada): Grafo de Franquias com Tabela de Relações Dedicada e UI de Temporadas
- **Descrição**:
  1. **Modelagem de Dados Relacional**:
     - Criar uma tabela dedicada no banco de dados:
       ```sql
       CREATE TABLE title_relations (
         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         source_title_id INT REFERENCES titles(id) ON DELETE CASCADE,
         target_title_id INT REFERENCES titles(id) ON DELETE CASCADE,
         relation_type VARCHAR(50) NOT NULL, -- 'sequel', 'prequel', 'side_story', 'spin_off', 'movie'
         season_number INT,
         created_at TIMESTAMP DEFAULT NOW()
       );
       ```
     - Ou adicionar `franchise_root_id` e `season_number` diretamente na tabela `titles`.
  2. **Persistência no Ingest e Sincronização Recursiva de Franquia**:
     - Ao cadastrar *Re:Zero Season 1*, o ingest consulta as relações via Jikan `/anime/{id}/full` ou AniList GraphQL (`relations { edges { relationType node { id title format coverImage } } }`).
     - Cadastra automaticamente os nós de sequência (Season 2, Season 3) e cria o relacionamento bidirecional no banco.
  3. **Interface Visual com Seletor de Temporadas (UI/UX Premium)**:
     - Na página do anime ([title/[slug]/page.tsx](file:///C:/Users/henri/Documents/Antigravity/ep-cap/src/app/[locale]/title/[slug]/page.tsx)), exibir um seletor horizontal destacado: **"Temporadas da Franquia"** com pôster, número da temporada, status ("Mapeado: Ep 1-25 ➔ Cap 1-38") e botão para alternar instantaneamente de temporada.
     - Na busca, agrupar temporadas sob o título principal com um badge expansível (ex: "Re:Zero — 3 Temporadas disponíveis").
- **Vantagens**:
  - Navegação fluida e intuitiva entre temporadas sem o usuário precisar voltar para a barra de pesquisa.
  - Consistência total de dados entre temporadas anteriores e posteriores.
  - SEO enriquecido com schema markup de séries/episódios interligados.
- **Desvantagens**:
  - Exige migração no schema do banco de dados e ajuste na interface da página de título.

#### 🥈 Alternativa 7.2: Enriquecimento Dinâmico de Relações com Cache em JSONB no Título
- **Descrição**:
  - Manter a coluna `related: jsonb('related')` existente na tabela `titles`, mas garantir que o script de ingestão e o `title-service.ts` sempre a preencham obrigatoriamente.
  - Se `titleRecord.related` for `null` no banco, o `title-service.ts` busca o `/anime/{id}/full` em background e atualiza o JSONB localmente.
  - Melhorar o componente [RelatedAnime.tsx](file:///C:/Users/henri/Documents/Antigravity/ep-cap/src/components/RelatedAnime.tsx) para buscar e exibir os pôsteres dos animes relacionados (consultando imagens locais ou do MAL) em vez de apenas botões de texto simples.
- **Vantagens**:
  - Não requer alteração na estrutura das tabelas existentes (mantém o Drizzle schema atual).
  - Rápida implementação.
- **Desvantagens**:
  - Menor poder de consulta SQL avançada (consultar "todas as sequências de um anime" via JSONB é menos eficiente do que via chave estrangeira relacional).

#### 🥉 Alternativa 7.3: Agrupamento Heurístico Baseado em Título na Camada de Aplicação
- **Descrição**:
  - Utilizar algoritmos de similaridade de texto e expressões regulares para identificar temporadas a partir do título (ex: regex para `Season \d+`, `2nd Season`, `Part \d+`, `Cour \d+`).
  - Agrupar os títulos em memória na API de busca e nas páginas sem alterar o banco de dados.
- **Vantagens**:
  - Zero alteração no banco e sem chamadas adicionais a APIs externas.
- **Desvantagens**:
  - Frágil: títulos com nomes radicalmente diferentes entre temporadas (ex: *Shingeki no Kyojin* vs *Attack on Titan: The Final Season*, ou subtítulos japoneses específicos) não são detectados corretamente por regex.

---

## 8. Backlog de Novas Features e Pendências v2.0

*Esta seção é atualizada continuamente conforme novas demandas forem analisadas:*

| ID | Área | Descrição da Pendência / Feature | Status | Prioridade |
| :--- | :--- | :--- | :---: | :---: |
| **B-01** | **Performance** | Eliminar atraso do carrossel da Home (HeroCarousel) via SSR e cache | A Iniciar | 🔴 Alta |
| **B-02** | **Infra / Deploy** | Criação dos arquivos Dockerfile e docker-compose com Caddy/Nginx | A Iniciar | 🔴 Alta |
| **B-03** | **CI/CD** | Criação do workflow do GitHub Actions para testes e deploy automático | A Iniciar | 🔴 Alta |
| **B-04** | **Backend / Ingest** | Corrigir bug "DB: 10 / Jikan: 0" no check-updates (usar episódios exibidos/AniList) | A Iniciar | 🔴 Alta |
| **B-05** | **Backend / Ingest** | Conectar scrapers de Fandom/Filler e MangaUpdates no fluxo real de ingestão | A Iniciar | 🔴 Alta |
| **B-06** | **Backend / Ingest** | Salvar fontes de verificação (URLs) e nível de confiança em cada mapping | A Iniciar | 🟡 Média |
| **B-07** | **Franquias / UI** | Salvar e sincronizar relações entre temporadas (Sequels/Prequels) no banco | A Iniciar | 🔴 Alta |
| **B-08** | **Franquias / UI** | Criar seletor visual de temporadas na página de título (Season 1, 2, 3...) | A Iniciar | 🟡 Média |
| **B-09** | **Busca / UI** | Agrupar temporadas ou exibir tags de franquia nos resultados de busca | A Iniciar | 🟡 Média |
| **B-10** | **Backend** | Desacoplar atualizações da API Jikan do endpoint `/api/featured` | A Iniciar | 🟡 Média |
| **B-11** | **SEO / Meta** | Validação de metadados canônicos e tags OpenGraph dinâmicas | A Iniciar | 🟡 Média |
| **B-12** | **UI/UX** | *Espaço aberto para novas pendências levantadas* | Planejado | - |

---

## 9. Checklist de Prontidão para o Go-Live

- [ ] **Configuração da VPS OCI**: Criação da instância, configuração do firewall (portas 80/443 liberadas no Security List e no iptables/ufw).
- [ ] **Dockerização da Aplicação**: Dockerfile multi-stage com `sharp` e usuário não-root testado localmente.
- [ ] **Subida do Proxy Reverso**: Caddy ou Nginx configurado com SSL ativo para o domínio oficial.
- [ ] **Migração de Variáveis de Ambiente**: Arquivo `.env.production` populado com segredos de banco, Upstash Redis e Sentry.
- [ ] **Correção do Carrossel da Home**: Carrossel renderizando instantaneamente com SSR no primeiro carregamento.
- [ ] **Correção do Script de Ingestão e Check-Updates**: Detecção precisa de novos episódios com fontes auditadas.
- [ ] **Sincronização de Relações e Temporadas**: Temporadas conectadas com navegação direta entre Sequels/Prequels.
- [ ] **Validação dos Testes Automatizados**: Suíte de testes (`npm run test`) passando com 100% de sucesso.
- [ ] **Virada de DNS**: Apontamento do registro A/AAAA do domínio para o IP fixo da VPS OCI (ou via Cloudflare Proxy).

