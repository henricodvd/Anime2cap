# 🍒 Anime2Cap

> **Conversor Inteligente de Episódios de Anime em Capítulos de Mangá**  
> *Descubra exatamente onde a história continua após qualquer episódio de anime — sem spoilers e sem fillers.*

🌐 **Aplicação em Produção:** [anime2cap.com](https://anime2cap.com)

---

## 🖐️ Boas-vindas

Seja bem-vindo(a) ao repositório do **Anime2Cap**!  
Este projeto foi desenvolvido como uma solução de alta performance, escalável e focada na experiência do usuário para resolver a transição entre animação e leitura de mangá. Se você está avaliando este código para uma oportunidade técnica ou por curiosidade, sinta-se à vontade para explorar a arquitetura, os scripts de ingestão e as suítes de teste.

---

## 🎯 Objetivo do Projeto

Assistir a uma temporada incrível de anime e descobrir que a continuação só sairá em 2 ou 3 anos é uma dor comum para milhões de fãs. A migração para o mangá ou light novel muitas vezes é frustrada por páginas de wikis confusas, contagens de episódios incompatíveis e episódios *fillers* (conteúdo exclusivo do anime que não existe na obra original).

O **Anime2Cap** resolve esse problema através de:
- **Mapeamento Direto 1:1**: Indica o capítulo exato equivalente a cada episódio.
- **Detecção de Fillers**: Sinaliza visualmente quais episódios são originais do anime para que o leitor não perca tempo buscando capítulos inexistentes.
- **Interface Noturna & Ultra-rápida**: Foco total na usabilidade mobile e desktop, sem anúncios intrusivos ou distrações.

---

## 🚀 Funcionalidades Implementadas

- **🔄 Conversão Bidirecional Inteligente (Episódio ↔ Capítulo)**: Mapeamento preciso de episódios de anime para capítulos/volumes do mangá e vice-versa.
- **🏷️ Indicador Visual de Content Type (Cânon vs. Filler)**: Distinção clara de episódios Cânon (`#1D9E75`) e Filler (`#E8A020`).
- **🔍 Busca Instantânea Multilíngue**: Pesquisa com suporte a títulos em Português, Inglês e Japonês (Romaji/Kanji).
- **🌐 Internacionalização Nativa (i18n)**: Suporte fluido a três idiomas (Português, Inglês e Japonês) gerenciado via `next-intl`.
- **⚙️ Pipeline de Ingestão & Automação de Dados**:
  - Scripts executados via CLI (`npm run check-updates` e `npm run ingest`) que consomem a API do **Jikan (MyAnimeList)** para identificar novos episódios de animes em exibição (*ongoing*) e novas tendências.
  - Atualização incremental sem chamadas desnecessárias ou alto custo.
- **🧠 Engine de Mapeamento com IA & Web Search Fallback**:
  - Quando um título não possui mapeamento estático completo, o pipeline de ingestão utiliza o **Tavily AI Search Engine** para realizar varreduras em wikis e fóruns especializados.
  - As informações encontradas são processadas e estruturadas em JSON de alta fidelidade pelo **Claude 3.5 Haiku (via OpenRouter)**.
- **🛡️ Rate Limiting & Resiliência**: Controle de requisições por IP e proteção contra sobrecarga de APIs externas através do `@upstash/ratelimit` e Redis.
- **📊 Monitoramento & Analytics**: Captura proativa de exceções com **Sentry**, métricas de uso com **Google Analytics 4** (`@next/third-parties`) e análise de experiência via **Microsoft Clarity**.

---

## 🛠️ Tech Stack & Arquitetura

### **Frontend & User Experience**
- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, Server Components e Parallel Routes)
- **Biblioteca Base**: [React 18](https://react.dev/) com [TypeScript 5](https://www.typescriptlang.org/)
- **Estilização**: [Tailwind CSS 3.4](https://tailwindcss.com/) com CSS Variables & Utilities
- **Componentes & Animações**: [Framer Motion](https://www.framer.com/motion/) e [Lucide React Icons](https://lucide.dev/)
- **Internacionalização**: [next-intl](https://next-intl-docs.vercel.app/)

### **Backend & Banco de Dados**
- **API Engine**: Next.js Server Routings & API Routes
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/) (TypeScript-first ORM)
- **Banco de Dados**: [PostgreSQL](https://www.postgresql.org/) (hospedado no Supabase)

### **🤖 IA & Automação de Dados**
- **LLM Engine**: [Claude 3.5 Haiku](https://www.anthropic.com/claude) via [OpenRouter API](https://openrouter.ai/)
- **Web Search Engine**: [Tavily AI Search API](https://tavily.com/)
- **Parsing & Scraping**: [Cheerio](https://cheerio.js.org/)
- **Execução de Scripts**: [tsx](https://github.com/privatenumber/tsx) para execução direta de TypeScript em Node.js

### **Performance & Resiliência**
- **Cache & Rate Limiting**: [Upstash Redis](https://upstash.com/) (`@upstash/redis` e `@upstash/ratelimit`)

### **Qualidade & Testes**
- **Testes Unitários & Integração**: [Jest 30](https://jestjs.io/) e [React Testing Library](https://testing-library.com/)
- **Linter**: ESLint 8 (configuração customizada Next.js)

---

## ☁️ Hospedagem & Serviços de Infraestrutura

| Serviço | Função no Projeto |
| :--- | :--- |
| **[Vercel](https://vercel.com/)** | Hospedagem principal da aplicação web, deploys contínuos via Git e Edge Network. |
| **[Supabase](https://supabase.com/)** | Banco de dados relacional PostgreSQL de alta disponibilidade. |
| **[Upstash Redis](https://upstash.com/)** | Armazenamento em memória Serverless para cache e proteção por Rate Limit. |
| **[Sentry](https://sentry.io/)** | Monitoramento de erros, rastreamento de exceções e relatórios de performance. |
| **[Google Analytics 4](https://analytics.google.com/)** | Métricas de audiência e rastreamento de conversão. |
| **[Jikan API v4](https://jikan.moe/)** | API pública REST com dados brutos do MyAnimeList. |
| **[OpenRouter](https://openrouter.ai/)** | Gateway de IA para estruturação inteligente de dados (Claude 3.5 Haiku) e tradução dinâmica de sinopses. |
| **[Tavily AI](https://tavily.com/)** | Motor de busca autônomo otimizado para extração de dados da web. |

---

## 💻 Guia de Instalação e Execução Local

### **Pré-requisitos**
- **Node.js**: `v18.x` ou superior
- **npm** (ou `yarn` / `pnpm`)
- Instância do **PostgreSQL** (ou conta gratuita no Supabase)
- Instância do **Upstash Redis** (opcional para ambiente local de dev)

### **Passo a Passo**

1. **Clonar o Repositório:**
   ```bash
   git clone https://github.com/seu-usuario/ep-cap.git
   cd ep-cap
   ```

2. **Instalar as Dependências:**
   ```bash
   npm install
   ```

3. **Configurar as Variáveis de Ambiente:**
   Copie o arquivo de exemplo `.env.example` para `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   Preencha as chaves no arquivo `.env.local` (consulte a documentação em cada variável no arquivo).

4. **Sincronizar a Schema do Banco de Dados:**
   ```bash
   npx drizzle-kit push
   ```

5. **Executar o Servidor de Desenvolvimento:**
   ```bash
   npm run dev
   ```
   Acesse no seu navegador: [http://localhost:3000](http://localhost:3000)

### **Scripts de Ingestão de Dados (CLI)**

- **Verificar atualizações de episódios de animes cadastrados:**
  ```bash
  npm run check-updates
  ```
- **Ingerir novo anime por nome ou ID do MAL:**
  ```bash
  npm run ingest -- "Chainsaw Man"
  ```

---

## 🧪 Execução de Testes

O projeto conta com suítes de testes unitários e de integração desenvolvidas em **Jest**.

```bash
# Executar a suíte de testes
npm test

# Executar testes em modo watch (desenvolvimento)
npm run test:watch
```

---

## 🎨 Design System & Identidade Visual

O **Anime2Cap** foi projetado seguindo a diretriz visual **Night Cherry**, trazendo um ar noturno, técnico e refinado:

- **Paleta de Cores Primária**:
  - **Night Background**: `#0A0A0A` (Profundidade escura absoluta)
  - **Dark Surface**: `#161616` (Superfície dos cards com efeito glassmorphism)
  - **Brand Cherry**: `#D93E64` (Accent principal da marca, glows e botões de ação)
  - **Canon Status**: `#1D9E75` (Verde para episódios originais do mangá)
  - **Filler Status**: `#E8A020` (Laranja/Dourado para conteúdos fillers)
  - **Paper White**: `#F5F4F0` (Texto principal de alta legibilidade)

- **Tipografia**:
  - Títulos e Destaques: **Syne** (800 / ExtraBold) — visual geométrico e marcante.
  - Corpo de Texto: **Plus Jakarta Sans** — leitura técnica, limpa e moderna.
  - Acentos Japoneses: **Noto Sans JP** — títulos originais em japonês.

- **Experiência Visual**:
  - *Glassmorphism* com `backdrop-blur-xl` e bordas translúcidas (`border-white/5`).
  - Transições suaves e microinterações com **Framer Motion**.

---

## 📄 Licença

Este projeto é de propriedade privada. Código disponibilizado para fins de demonstração técnica e portfólio de desenvolvimento.
