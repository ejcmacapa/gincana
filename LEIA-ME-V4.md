# EJC V4 — Logos e relatório

## O que mudou
- Logo oficial EJC em `logo-ejc.png` no relatório impresso.
- Relatório com emissor (usuário autenticado ou Visitante sem login), data/hora, indicadores e coordenadores destacados.
- Cadastro/edição de equipes com envio de PNG/JPG/WebP (até 2 MB), substituição e remoção de logo.
- `exemplo-logo-boa-vontade.png` incluído apenas como referência. Para associá-la à equipe Boa Vontade, edite a equipe no aplicativo e selecione o arquivo.
- CSV permanece inalterado.

## Instalação
1. Faça backup do banco e do repositório GitHub Pages.
2. Execute `INSTALAR_LOGOS_EJC_V4.sql` no SQL Editor do Supabase. **Leia o SQL antes de executar.** Ele altera uma coluna, configura o bucket público e políticas de Storage. Não execute os SQLs antigos novamente.
3. Confirme que `public.ejc_is_admin()` existe (instalação anterior) e que nenhuma política antiga de `storage.objects` libera gravação indiscriminada.
4. Publique os arquivos do app na pasta de origem do GitHub Pages, inclusive `logo-ejc.png` e `equipes-ejc.js`. Não publique os arquivos SQL, nem guias de instalação.
5. Atualize a página com Ctrl+Shift+R; o cache do service worker mudou para v4.
6. Entre como ADMIN/SUPERADMIN, edite uma equipe e selecione uma logo. Teste salvar, substituir, remover e exportar o relatório. Teste como VISITANTE e usuário comum.

## Segurança e limites
- As logos são **públicas** (necessário para visitante sem login). Não envie imagens privadas.
- A identidade do emissor no PDF é exibida pelo frontend e é **informativa, não assinatura digital nem prova de autoria**.
- O upload é validado por tipo MIME e tamanho no navegador e no bucket; o Supabase Storage valida MIME declarado, mas isso não substitui inspeção de conteúdo.
- É preciso testar no Supabase real; a versão foi verificada sintaticamente, mas não testada com credenciais reais.
- Se o usuário não estiver autenticado, o emissor aparece como Visitante (sem login).
