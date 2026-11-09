# 🚀 PulseOps - Plataforma de Gestão e Análise Operacional

O **PulseOps** é uma plataforma SaaS para gestão de negócios, desenvolvida para centralizar operações e facilitar a tomada de decisões. Permite gerenciar pedidos, clientes e produtos, acompanhar indicadores de faturamento e utilizar um Agente de Inteligência Artificial integrado para analisar os dados da empresa.

## 🛠️ Tecnologias Utilizadas

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS 4, ECharts e Radix UI.
- **Backend:** Next.js Route Handlers (Node.js).
- **Banco de Dados:** PostgreSQL (Neon) com Prisma 6.
- **Autenticação:** E-mail e senha com JWT customizado e login social via Google OAuth.
- **Inteligência Artificial:** Google Gemini (`@google/genai`).
- **Deploy:** Vercel.

## ✨ Principais Funcionalidades

- **Autenticação Segura:** Login com e-mail e senha ou conta Google, com proteção de rotas por cookies `httpOnly`.
- **Dashboard:** Indicadores de faturamento, pedidos e clientes, com gráficos de evolução temporal.
- **Analytics:** Visualização da distribuição de vendas por categoria, canal e região, com filtros por período.
- **Gestão de Dados:** CRUD completo de produtos e clientes, além de visualização detalhada de pedidos.
- **Importação e Exportação CSV:** Upload e processamento de arquivos em background e exportação de relatórios.
- **Auditoria e Segurança (RBAC):** Registro de ações sensíveis e controle de permissões por perfil: ADMIN, MANAGER, ANALYST e VIEWER.
- **UI/UX:** Interface responsiva, modo claro e escuro (Dark Mode) e transições suaves.

---

## 🤖 Agente de Inteligência Artificial

O PulseOps conta com um chat flutuante, localizado no canto inferior direito da aplicação, que funciona como um **Analista de Dados**, permitindo consultar informações da empresa em linguagem natural.

### Como funciona?

1. Quando o usuário envia uma mensagem, o backend (Next.js) consulta o banco de dados por meio do Prisma, obtendo informações como quantidade de clientes, pedidos e faturamento.
2. Os dados são adicionados a um **prompt de contexto**, que fornece à IA informações sobre a empresa e seus indicadores atuais.
3. O Google Gemini recebe o contexto e a pergunta do usuário, gerando uma resposta em linguagem natural baseada nos dados disponíveis.
4. **Resiliência e fallback:** Caso o modelo principal (`gemini-3.8-flash`) esteja sobrecarregado, o sistema utiliza um timeout de 10 segundos e tenta automaticamente modelos alternativos mais leves (`3.5-flash-lite` e `3.1-flash-lite`), reduzindo o risco de indisponibilidade do recurso.

---

## ⚙️ Como Executar Localmente

### 1. Acesse a pasta do projeto

Como o projeto está em uma subpasta, entre nela primeiro:

```bash
cd pulseops
```

### 2. Instale as dependências

```bash
pnpm install
```

### 3. Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz da pasta do projeto e configure suas credenciais:

```env
# Banco de Dados (Neon)
DATABASE_URL="postgresql://..."

# JWT (Autenticação Customizada)
JWT_ACCESS_SECRET="seu-segredo"
JWT_REFRESH_SECRET="seu-segredo"

# Google OAuth
GOOGLE_CLIENT_ID="seu-id"
GOOGLE_CLIENT_SECRET="seu-secret"
NEXTAUTH_SECRET="sua-string-aleatoria"
NEXTAUTH_URL="http://localhost:3000"

# Inteligência Artificial (Gemini)
GEMINI_API_KEY="sua-chave-do-google-ai-studio"
```

### 4. Gere o Prisma Client

```bash
npx prisma generate
```

### 5. Inicie a aplicação

```bash
pnpm dev
```

Acesse a aplicação em:

```text
http://localhost:3000
```

---

## 🔑 Credenciais de Acesso para Testes

O ambiente de demonstração possui dados populados e duas contas disponíveis para testar diferentes níveis de acesso.

### Administrador - Acesso Total

### Visitante - Somente Leitura

| Campo  | Credencial               |
| ------ | ------------------------ |
| E-mail | `visitante@pulseops.dev` |
| Senha  | `visitante123`           |

> **Observação:** A conta de visitante possui uma cópia dos dados de produtos e clientes, mas não permite executar ações de criação ou edição. Essas restrições são aplicadas pelo controle de permissões do sistema.

---

**PulseOps** - Gestão operacional, análise de dados e inteligência artificial em uma única plataforma.

> **Segurança:** As credenciais acima são destinadas exclusivamente à demonstração. Não utilize essas senhas em ambientes de produção.
