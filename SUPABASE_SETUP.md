# 🟢 EJC Gincana — Guia de Configuração Supabase

## 1. CRIAR PROJETO

1. Acesse https://supabase.com e crie uma conta gratuita
2. Clique em "New Project"
3. Dê um nome (ex: `ejc-gincana`), defina uma senha forte para o banco
4. Escolha a região: **South America (São Paulo)**
5. Aguarde ~2 minutos até o projeto iniciar


## 2. CRIAR AS TABELAS (SQL Editor)

No painel do Supabase, vá em **SQL Editor → New Query** e execute:

```sql
-- ── EQUIPES ──────────────────────────────────────────
CREATE TABLE teams (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#f59e0b',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── GINCANAS ─────────────────────────────────────────
CREATE TABLE gincanas (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  date       DATE,
  max_pts    INTEGER,
  obs        TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── LANÇAMENTOS ──────────────────────────────────────
CREATE TABLE entries (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    UUID REFERENCES teams(id) ON DELETE SET NULL,
  gin_id     UUID REFERENCES gincanas(id) ON DELETE SET NULL,
  points     INTEGER NOT NULL,
  date       DATE NOT NULL,
  desc       TEXT DEFAULT '',
  type       TEXT NOT NULL CHECK (type IN ('bonus','punishment')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── ÍNDICES para performance ──────────────────────────
CREATE INDEX idx_entries_team_id ON entries(team_id);
CREATE INDEX idx_entries_date    ON entries(date);
CREATE INDEX idx_entries_gin_id  ON entries(gin_id);
```


## 3. HABILITAR REALTIME

No painel: **Database → Replication → Source**

Ative o realtime para as três tabelas:
- ✅ `teams`
- ✅ `entries`
- ✅ `gincanas`

Ou execute no SQL Editor:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE teams;
ALTER PUBLICATION supabase_realtime ADD TABLE entries;
ALTER PUBLICATION supabase_realtime ADD TABLE gincanas;
```


## 4. CONFIGURAR SEGURANÇA (Row Level Security)

No painel: **Authentication → Policies**

Execute no SQL Editor:

```sql
-- Habilitar RLS nas tabelas
ALTER TABLE teams    ENABLE ROW LEVEL SECURITY;
ALTER TABLE gincanas ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries  ENABLE ROW LEVEL SECURITY;

-- Política: qualquer pessoa autenticada pode LER
CREATE POLICY "leitura_publica" ON teams    FOR SELECT USING (true);
CREATE POLICY "leitura_publica" ON gincanas FOR SELECT USING (true);
CREATE POLICY "leitura_publica" ON entries  FOR SELECT USING (true);

-- Política: qualquer pessoa autenticada pode INSERIR
CREATE POLICY "insercao_publica" ON teams    FOR INSERT WITH CHECK (true);
CREATE POLICY "insercao_publica" ON gincanas FOR INSERT WITH CHECK (true);
CREATE POLICY "insercao_publica" ON entries  FOR INSERT WITH CHECK (true);

-- Política: qualquer pessoa autenticada pode ATUALIZAR
CREATE POLICY "atualizacao_publica" ON teams    FOR UPDATE USING (true);
CREATE POLICY "atualizacao_publica" ON gincanas FOR UPDATE USING (true);

-- Política: qualquer pessoa autenticada pode DELETAR
CREATE POLICY "exclusao_publica" ON teams    FOR DELETE USING (true);
CREATE POLICY "exclusao_publica" ON gincanas FOR DELETE USING (true);
```

### ⚠️ Por que isso é seguro?
A `anon key` do Supabase é pública por design — ela identifica o projeto,
não dá acesso irrestrito. O RLS é a camada de segurança real:
sem uma policy liberando, ninguém lê ou escreve nada, mesmo com a chave.

Para um grupo de líderes de confiança sem cadastro de usuários,
esse modelo (acesso via link com anon key + RLS) é adequado.


## 5. OBTER AS CREDENCIAIS

No painel: **Settings → API**

Copie:
- **Project URL** → ex: `https://xyzabc.supabase.co`
- **anon public key** → começa com `eyJ...`

Cole no topo do `app.js`:
```js
const SUPABASE_URL = 'https://SEU_PROJECT.supabase.co';
const SUPABASE_KEY = 'SUA_ANON_KEY';
```


## 6. HOSPEDAGEM GRATUITA

### Opção A — GitHub Pages (mais simples)
1. Crie um repositório **privado** no GitHub
2. Faça upload dos arquivos
3. Settings → Pages → branch main → /root
4. Acesse: `https://seuusuario.github.io/ejc-gincana`

### Opção B — Netlify (recomendado, com HTTPS automático)
1. Arraste a pasta do projeto em https://app.netlify.com/drop
2. URL gerada automaticamente em segundos
3. Pode configurar domínio personalizado grátis


## 7. GERAR ÍCONES PWA

Acesse https://realfavicongenerator.net
- Faça upload de uma imagem (cruz, logo EJC, etc.)
- Baixe o pacote e salve `icon-192.png` e `icon-512.png`
  na mesma pasta do `index.html`


## 8. CHECKLIST FINAL ✅

[ ] Tabelas criadas no SQL Editor
[ ] Realtime ativado nas 3 tabelas
[ ] RLS habilitado + policies configuradas
[ ] URL e anon key colados no app.js
[ ] Ícones icon-192.png e icon-512.png na pasta
[ ] App hospedado em HTTPS (obrigatório para PWA)
[ ] Testou abertura no celular e clicou "Adicionar à tela inicial"
[ ] Testou com 2 celulares ao mesmo tempo para ver o realtime funcionar


## 9. NOTAS PARA SEU ESTUDO DE SI

- O Supabase usa PostgreSQL com RLS (Row Level Security), que é
  muito mais robusto que as regras do Firebase
- Para evoluir: ative autenticação por Magic Link (email sem senha)
  e adicione `auth.uid()` nas policies para controle por usuário
- O Supabase expõe logs de todas as queries em Database → Logs,
  ótimo para auditoria
- A anon key nunca deve aparecer em repositórios públicos —
  use variáveis de ambiente se hospedar no Netlify/Vercel
