/* Equipes de trabalho EJC: módulo independente dos círculos da gincana. */
(() => {
  'use strict';
  let groups = [], members = [], editingId = null, channel = null;
  const $ = id => document.getElementById(id);
  const safe = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const authorized = () => typeof canWrite === 'function' && canWrite();
  function message(text, error=false) { const e=$('ejc-feedback');e.textContent=text;e.className=error?'ejc-error':'ejc-ok'; }
  function reset() { editingId=null;$('ejc-team-form').reset();$('ejc-form-title').textContent='Cadastrar equipe';$('ejc-cancel').hidden=true; }
  function counts(group) {
    const people=members.filter(m=>m.team_id===group.id).sort((a,b)=>(a.category==='coordinator'?0:1)-(b.category==='coordinator'?0:1)||a.name.localeCompare(b.name,'pt-BR'));
    const used={coordinator:0,man:0,woman:0};people.forEach(m=>{if(m.category in used)used[m.category]++;});
    return {people,used,limits:{coordinator:group.coordinator_slots,man:group.male_slots,woman:group.female_slots}};
  }
  function render() {
    const totals={filled:0,slots:0,complete:0};
    const cards=groups.map(group=>{
      const {people,used,limits}=counts(group);
      const slots=Object.values(limits).reduce((a,b)=>a+b,0),filled=people.length;
      totals.filled+=filled;totals.slots+=slots;
      const complete=Object.keys(limits).every(k=>used[k]===limits[k]);if(complete)totals.complete++;
      const rows=[['coordinator','Coordenadores'],['man','Homens'],['woman','Mulheres']].map(([key,label])=>{
        const n=used[key],limit=limits[key],remaining=Math.max(0,limit-n),pct=limit?Math.min(100,100*n/limit):100;
        return `<div class="ejc-stat"><div>${label}: <strong>${n}/${limit}</strong> · ${remaining ? `Faltam ${remaining}`:'Completo'}</div><div class="ejc-track"><span style="width:${pct}%"></span></div></div>`;
      }).join('');
      const peopleRows=people.map(person=>`<li class="${person.category==='coordinator'?'ejc-coordinator':''}"><span>${person.category==='coordinator'?'⭐ ':''}${safe(person.name)} <small>${person.category==='coordinator'?'★ Coordenador(a)':person.category==='man'?'Homem':'Mulher'}</small></span><button type="button" class="ejc-write-only" data-remove-member="${person.id}" aria-label="Remover ${safe(person.name)}">✕</button></li>`).join('');
      return `<article class="ejc-panel ejc-team"><div class="ejc-team-header"><h3>${safe(group.name)}</h3><span class="ejc-status">${complete?'✅ Completa':'🟡 Faltam '+(slots-filled)}</span></div><p>${filled} de ${slots} vagas preenchidas</p>${rows}<ul class="ejc-members">${peopleRows}</ul><form class="ejc-member-form ejc-write-only" data-team="${group.id}"><input name="name" maxlength="120" required placeholder="Nome do integrante" aria-label="Nome do integrante"><select name="category" aria-label="Categoria"><option value="coordinator">Coordenador(a)</option><option value="man">Homem</option><option value="woman">Mulher</option></select><button type="submit" class="btn-save">Adicionar</button></form><div class="ejc-actions ejc-write-only"><button type="button" data-edit-team="${group.id}">Editar vagas</button><button type="button" data-remove-team="${group.id}">Excluir equipe</button></div></article>`;
    }).join('');
    $('ejc-summary').textContent=`${groups.length} equipes · ${totals.filled}/${totals.slots} vagas ocupadas · ${totals.complete} equipes completas`;
    $('ejc-team-form').style.display=authorized()?'':'none';
    $('ejc-teams-list').innerHTML=cards||'<p>Nenhuma equipe cadastrada. Cadastre a primeira acima.</p>';
  }
  function exportRows() {
    const rows=[['Equipe','Nome do integrante','Função','Vagas coordenação','Coordenadores cadastrados','Vagas homens','Homens cadastrados','Vagas mulheres','Mulheres cadastradas','Total preenchido','Total de vagas','Status']];
    for(const group of groups){
      const {people,used,limits}=counts(group);
      const filled=people.length,total=limits.coordinator+limits.man+limits.woman;
      const status=Object.keys(limits).every(k=>used[k]===limits[k])?'Completa':'Incompleta';
      const base=[limits.coordinator,used.coordinator,limits.man,used.man,limits.woman,used.woman,filled,total,status];
      if(!people.length)rows.push([group.name,'','',...base]);
      for(const person of people)rows.push([group.name,person.name,person.category==='coordinator'?'Coordenador(a)':person.category==='man'?'Homem':'Mulher',...base]);
    }
    return rows;
  }
  function exportCsv() {
    if(!groups.length)return message('Cadastre uma equipe antes de exportar.',true);
    const csv='\uFEFF'+exportRows().map(row=>row.map(value=>'"'+String(value??'').replace(/"/g,'""')+'"').join(';')).join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download='equipes-ejc.csv';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
    message('Planilha CSV gerada. Abra no Excel ou Google Planilhas.');
  }
  function exportPrint() {
    if(!groups.length)return message('Cadastre uma equipe antes de imprimir.',true);
    const blocks=groups.map(group=>{
      const {people,used,limits}=counts(group);
      const total=limits.coordinator+limits.man+limits.woman;
      const complete=Object.keys(limits).every(k=>used[k]===limits[k]);
      const lines=people.map(person=>`<tr><td>${safe(person.name)}</td><td>${person.category==='coordinator'?'★ Coordenador(a)':person.category==='man'?'Homem':'Mulher'}</td></tr>`).join('');
      return `<section><h2>${safe(group.name)} — ${complete?'Completa':'Incompleta'}</h2><p>Coordenação: ${used.coordinator}/${limits.coordinator} · Homens: ${used.man}/${limits.man} · Mulheres: ${used.woman}/${limits.woman} · Total: ${people.length}/${total}</p><table><thead><tr><th>Integrante</th><th>Função</th></tr></thead><tbody>${lines||'<tr><td colspan="2">Nenhum integrante cadastrado</td></tr>'}</tbody></table></section>`;
    }).join('');
    const win=window.open('','_blank');
    if(!win)return message('Permita janelas pop-up para gerar o PDF.',true);
    win.document.open();win.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Equipes EJC</title><style>body{font:14px Arial,sans-serif;color:#222;margin:30px}h1{border-bottom:2px solid #444;padding-bottom:12px}section{break-inside:avoid;margin:24px 0}h2{font-size:18px}p{font-size:13px}table{width:100%;border-collapse:collapse}th,td{padding:7px;border:1px solid #bbb;text-align:left}th{background:#eee}@page{size:A4;margin:15mm}@media print{body{margin:0}}</style></head><body><h1>Equipes de Trabalho EJC</h1><p>Gerado em ${safe(new Date().toLocaleDateString('pt-BR'))}</p>${blocks}</body></html>`);win.document.close();win.focus();
    // O usuário escolhe "Salvar como PDF" ou a impressora no diálogo.
    setTimeout(()=>win.print(),400);
  }
  async function load() {
    const [a,b]=await Promise.all([sb.from('ejc_work_teams').select('*').order('name'),sb.from('ejc_work_members').select('*').order('name')]);
    if(a.error||b.error){message('Não foi possível carregar as equipes. Execute primeiro o arquivo SQL de instalação no Supabase. '+(a.error?.message||b.error?.message),true);return;}
    groups=a.data||[];members=b.data||[];render();
  }
  async function saveTeam(e) {
    e.preventDefault();if(!authorized())return message('Acesso restrito.',true);
    const name=$('ejc-name').value.trim(),values=['ejc-coord-limit','ejc-men-limit','ejc-women-limit'].map(id=>Number($(id).value));
    if(!name||values.some(n=>!Number.isInteger(n)||n<0)||values.every(n=>n===0))return message('Informe nome e pelo menos uma vaga válida.',true);
    if(values[0]>200||values[1]>500||values[2]>500)return message('Quantidade de vagas acima do limite.',true);
    if(groups.some(g=>g.name.toLowerCase()===name.toLowerCase()&&g.id!==editingId))return message('Já existe uma equipe com esse nome.',true);
    const data={name,coordinator_slots:values[0],male_slots:values[1],female_slots:values[2]};
    if(editingId){const old=groups.find(g=>g.id===editingId),{used}=counts(old);if(used.coordinator>values[0]||used.man>values[1]||used.woman>values[2])return message('Não é possível reduzir as vagas abaixo do número de integrantes cadastrados.',true);}
    const result=editingId?await sb.from('ejc_work_teams').update(data).eq('id',editingId):await sb.from('ejc_work_teams').insert(data);
    if(result.error)return message(result.error.message,true);
    reset();message('Equipe salva!');await load();
  }
  async function addMember(form) {
    if(!authorized())return;
    const id=form.dataset.team,name=form.elements.name.value.trim(),category=form.elements.category.value,group=groups.find(g=>g.id===id);
    if(!group||!name||!['coordinator','man','woman'].includes(category))return;
    const {used,limits}=counts(group);if(used[category]>=limits[category])return message('Não há vagas disponíveis nessa categoria.',true);
    const {error}=await sb.from('ejc_work_members').insert({team_id:id,name,category});
    if(error)return message(error.message,true);
    message('Integrante adicionado.');await load();
  }
  async function removeMember(id) {
    if(!authorized()||!confirm('Remover este integrante?'))return;
    const {error}=await sb.from('ejc_work_members').delete().eq('id',id);
    if(error)return message(error.message,true);message('Integrante removido.');await load();
  }
  async function removeTeam(id) {
    if(!authorized()||!confirm('Excluir a equipe e todos os integrantes cadastrados nela?'))return;
    const {error}=await sb.from('ejc_work_teams').delete().eq('id',id);
    if(error)return message(error.message,true);message('Equipe excluída.');await load();
  }
  document.addEventListener('DOMContentLoaded',()=>{
    $('ejc-export-csv').addEventListener('click',exportCsv);$('ejc-export-pdf').addEventListener('click',exportPrint);$('ejc-team-form').addEventListener('submit',saveTeam);$('ejc-cancel').addEventListener('click',reset);
    $('ejc-teams-list').addEventListener('submit',e=>{const form=e.target.closest('.ejc-member-form');if(form){e.preventDefault();addMember(form);}});
    $('ejc-teams-list').addEventListener('click',e=>{
      const b=e.target.closest('button');if(!b)return;
      if(b.dataset.removeMember)return removeMember(b.dataset.removeMember);
      if(b.dataset.removeTeam)return removeTeam(b.dataset.removeTeam);
      if(b.dataset.editTeam){const g=groups.find(g=>g.id===b.dataset.editTeam);if(!g)return;editingId=g.id;$('ejc-name').value=g.name;$('ejc-coord-limit').value=g.coordinator_slots;$('ejc-men-limit').value=g.male_slots;$('ejc-women-limit').value=g.female_slots;$('ejc-form-title').textContent='Editar equipe';$('ejc-cancel').hidden=false;$('ejc-team-form').scrollIntoView({behavior:'smooth'});}
    });
    document.querySelector('[data-tab="equipes-ejc"]').addEventListener('click',()=>{load();if(!channel){channel=sb.channel('ejc-work-changes').on('postgres_changes',{event:'*',schema:'public',table:'ejc_work_teams'},load).on('postgres_changes',{event:'*',schema:'public',table:'ejc_work_members'},load).subscribe();}});
  });
})();
