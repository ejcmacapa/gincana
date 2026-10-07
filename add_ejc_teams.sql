-- ══════════════════════════════════════════════════════
--  EJC Gincana — Equipes Organizadoras do EJC
--  Execute no SQL Editor do Supabase
-- ══════════════════════════════════════════════════════

-- 1. Tabela de equipes organizadoras
CREATE TABLE IF NOT EXISTS ejc_teams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  logo_url    TEXT,          -- URL da logo (pode ser emoji ou link externo)
  logo_emoji  TEXT,          -- Emoji como logo (alternativa simples)
  color       TEXT DEFAULT '#7c3aed',
  total_vagas INTEGER DEFAULT 0,
  ordem       INTEGER DEFAULT 0,  -- para ordenar a exibição
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de membros por equipe
CREATE TABLE IF NOT EXISTS ejc_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ejc_team_id   UUID NOT NULL REFERENCES ejc_teams(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  role          TEXT,          -- Ex: Coordenador, Membro, Sub-coordenador
  is_coordinator BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 3. RLS
ALTER TABLE ejc_teams   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ejc_members ENABLE ROW LEVEL SECURITY;

-- Leitura pública (visitantes veem tudo)
CREATE POLICY "ejc_teams_select"   ON ejc_teams   FOR SELECT USING (true);
CREATE POLICY "ejc_members_select" ON ejc_members FOR SELECT USING (true);

-- Escrita só para autenticados
CREATE POLICY "ejc_teams_insert"   ON ejc_teams   FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ejc_teams_update"   ON ejc_teams   FOR UPDATE  USING (auth.uid() IS NOT NULL);
CREATE POLICY "ejc_teams_delete"   ON ejc_teams   FOR DELETE  USING (auth.uid() IS NOT NULL);
CREATE POLICY "ejc_members_insert" ON ejc_members FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ejc_members_update" ON ejc_members FOR UPDATE  USING (auth.uid() IS NOT NULL);
CREATE POLICY "ejc_members_delete" ON ejc_members FOR DELETE  USING (auth.uid() IS NOT NULL);

-- 4. Realtime
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='ejc_teams') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE ejc_teams;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='ejc_members') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE ejc_members;
  END IF;
END $$;

-- 5. Verificação
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('ejc_teams','ejc_members');
