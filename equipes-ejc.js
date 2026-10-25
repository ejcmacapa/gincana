/* Equipes de trabalho EJC: módulo independente dos círculos da gincana. */
(() => {
  'use strict';
  let groups = [], members = [], editingId = null, channel = null;
  const BUCKET='ejc-team-logos';
  const $ = id => document.getElementById(id);
  const safe = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const authorized = () => typeof canWrite === 'function' && canWrite();
  function message(text, error=false) { const e=$('ejc-feedback');e.textContent=text;e.className=error?'ejc-error':'ejc-ok'; }
  function reset() { editingId=null;$('ejc-team-form').reset();$('ejc-form-title').textContent='Cadastrar equipe';$('ejc-cancel').hidden=true;$('ejc-remove-logo').checked=false; }
  function imageUrl(path) {
    if (!path || !/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(png|jpg|webp)$/i.test(path)) return '';
    return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }
  function logoHtml(path,cls='ejc-logo') {
    const url=imageUrl(path);
    return url?`<img class="${cls}" src="${safe(url)}" alt="Logo da equipe" loading="lazy">`:'';
  }
  async function uploadLogo(teamId,file) {
    if (!file) return null;
    const types={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'};
    const ext=types[file.type];
    if(!ext || file.size>2*1024*1024 || !file.size)throw Error('A logo deve ser PNG, JPG ou WebP com até 2 MB.');
    const path=`${teamId}/${crypto.randomUUID()}.${ext}`;
    const {error}=await sb.storage.from(BUCKET).upload(path,file,{contentType:file.type,upsert:false});
    if(error)throw error;
    return path;
  }
  function issuer() {
    if (typeof isGuest!=='undefined' && isGuest) return 'Visitante (sem login)';
    if (typeof currentProfile!=='undefined' && currentProfile) return currentProfile.name||currentProfile.username||currentProfile.email||'Usuário autenticado';
    return 'Não identificado';
  }
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
      return `<article class="ejc-panel ejc-team"><div class="ejc-team-header">${logoHtml(group.logo_path)}<h3>${safe(group.name)}</h3><span class="ejc-status">${complete?'✅ Completa':'🟡 Faltam '+(slots-filled)}</span></div><p>${filled} de ${slots} vagas preenchidas</p>${rows}<ul class="ejc-members">${peopleRows}</ul><form class="ejc-member-form ejc-write-only" data-team="${group.id}"><input name="name" maxlength="120" required placeholder="Nome do integrante" aria-label="Nome do integrante"><select name="category" aria-label="Categoria"><option value="coordinator">Coordenador(a)</option><option value="man">Homem</option><option value="woman">Mulher</option></select><button type="submit" class="btn-save">Adicionar</button></form><div class="ejc-actions ejc-write-only"><button type="button" data-edit-team="${group.id}">Editar vagas</button><button type="button" data-remove-team="${group.id}">Excluir equipe</button></div></article>`;
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
    const totalSlots=groups.reduce((n,g)=>n+g.coordinator_slots+g.male_slots+g.female_slots,0);
    const blocks=groups.map(group=>{
      const {people,used,limits}=counts(group);
      const total=limits.coordinator+limits.man+limits.woman;
      const complete=Object.keys(limits).every(k=>used[k]===limits[k]);
      const pct=total?Math.round(people.length*100/total):100;
      const lines=people.map(person=>`<tr class="${person.category==='coordinator'?'coord':''}"><td>${safe(person.name)}</td><td>${person.category==='coordinator'?'★ Coordenação':person.category==='man'?'Homem':'Mulher'}</td></tr>`).join('');
      return `<section class="team"><div class="team-head">${logoHtml(group.logo_path,'team-logo')}<div><h2>${safe(group.name)}</h2><span class="status ${complete?'complete':''}">${complete?'Equipe completa':'Faltam '+Math.max(0,total-people.length)+' vagas'}</span></div></div><div class="stats"><span>Coordenação <b>${used.coordinator}/${limits.coordinator}</b></span><span>Homens <b>${used.man}/${limits.man}</b></span><span>Mulheres <b>${used.woman}/${limits.woman}</b></span><span>Total <b>${people.length}/${total}</b></span></div><div class="track"><div style="width:${Math.min(100,pct)}%"></div></div><table><thead><tr><th>Integrante</th><th>Função</th></tr></thead><tbody>${lines||'<tr><td colspan="2">Nenhum integrante cadastrado</td></tr>'}</tbody></table></section>`;
    }).join('');
    const win=window.open('','_blank');
    if(!win)return message('Permita janelas pop-up para gerar o PDF.',true);
    const now=new Date().toLocaleString('pt-BR');
    const logo=new URL('logo-ejc.png',location.href).href;
    win.document.open();win.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório de Equipes EJC</title><style>
    *{box-sizing:border-box}body{font:12px Arial,sans-serif;color:#292136;margin:0;background:#fff}.header{display:flex;align-items:center;gap:18px;border-bottom:3px solid #503268;padding-bottom:13px;margin-bottom:15px}.brand{width:85px;height:85px;object-fit:contain}h1{font-size:23px;color:#352047;margin:0 0 5px}.sub{color:#756780;font-size:12px}.meta{display:flex;justify-content:space-between;gap:12px;font-size:11px;margin:14px 0 20px}.summary{display:flex;gap:12px;margin:15px 0 22px}.summary div{flex:1;background:#f2eef6;padding:12px;border-radius:8px;text-align:center}.summary strong{display:block;font-size:20px;color:#4c2e65}.team{margin:0 0 24px;break-inside:avoid-page;page-break-inside:avoid}.team-head{display:flex;align-items:center;gap:12px;margin-bottom:12px}.team-logo{width:48px;height:48px;object-fit:contain}.team h2{font-size:17px;color:#43265d;margin:0 0 4px}.status{color:#8c5c00;font-weight:bold}.status.complete{color:#247443}.stats{display:flex;justify-content:space-between;gap:8px;background:#f7f5f9;padding:9px;border-radius:5px}.track{height:5px;background:#e7e0ee;margin:8px 0 12px;border-radius:6px;overflow:hidden}.track div{height:100%;background:#8c67ac}table{border-collapse:collapse;width:100%;font-size:11px}th{background:#503268;color:#fff;text-align:left}th,td{padding:7px 9px;border:1px solid #e1dbe6}tbody tr:nth-child(even){background:#faf8fc}tbody tr.coord{background:#fff5d8;font-weight:bold}.footer{margin-top:20px;border-top:1px solid #d6ccdf;padding-top:9px;color:#756780;font-size:10px}@page{size:A4;margin:15mm}@media screen{body{max-width:820px;margin:25px auto;padding:20px;box-shadow:0 0 10px #ddd}}@media print{.team{break-inside:avoid-page}thead{display:table-header-group}}
    </style></head><body><header class="header"><img class="brand" src="${safe(logo)}" alt="Logo EJC"><div><h1>Equipes de Trabalho EJC</h1><div class="sub">Controle de integrantes, coordenação e vagas</div></div></header><div class="meta"><span><b>Emitido por:</b> ${safe(issuer())}</span><span><b>Emissão:</b> ${safe(now)}</span></div><div class="summary"><div><strong>${groups.length}</strong>Equipes</div><div><strong>${members.length}</strong>Integrantes</div><div><strong>${totalSlots}</strong>Vagas totais</div></div>${blocks}<footer class="footer">EJC · Relatório de equipes · ${safe(now)}</footer></body></html>`);win.document.close();
    // Esperar as imagens antes da janela de impressão, sem bloquear indefinidamente.
    const imgs=Array.from(win.document.images);
    Promise.race([Promise.all(imgs.map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.onload=resolve;img.onerror=resolve;}))),new Promise(resolve=>setTimeout(resolve,2500))]).then(()=>{if(!win.closed){win.focus();win.print();}});
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
    const file=$('ejc-logo').files[0], remove=$('ejc-remove-logo').checked;
    const previous=editingId?groups.find(g=>g.id===editingId):null;
    let id=editingId, newLogo=null;
    if(!id){
      const {data:created,error}=await sb.from('ejc_work_teams').insert(data).select('id').single();
      if(error)return message(error.message,true);
      id=created.id;
    }
    try {
      if(file)newLogo=await uploadLogo(id,file);
      if(newLogo)data.logo_path=newLogo;
      else if(remove)data.logo_path=null;
      if(editingId || newLogo || remove){
        const {error}=await sb.from('ejc_work_teams').update(data).eq('id',id);
        if(error)throw error;
      }
      // Limpeza de imagem antiga somente após a atualização confirmada.
      if(previous?.logo_path && (newLogo||remove)){
        const {error:cleanupError}=await sb.storage.from(BUCKET).remove([previous.logo_path]);
        if(cleanupError)console.warn('Não foi possível remover a imagem antiga:',cleanupError.message);
      }
      reset();message('Equipe salva!');await load();
    } catch(error){
      if(newLogo)await sb.storage.from(BUCKET).remove([newLogo]);
      message('Erro ao salvar a logo/equipe: '+error.message,true);
    }
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
      if(b.dataset.editTeam){const g=groups.find(g=>g.id===b.dataset.editTeam);if(!g)return;editingId=g.id;$('ejc-name').value=g.name;$('ejc-coord-limit').value=g.coordinator_slots;$('ejc-men-limit').value=g.male_slots;$('ejc-women-limit').value=g.female_slots;$('ejc-remove-logo').checked=false;$('ejc-form-title').textContent='Editar equipe';$('ejc-cancel').hidden=false;$('ejc-team-form').scrollIntoView({behavior:'smooth'});}
    });
    document.querySelector('[data-tab="equipes-ejc"]').addEventListener('click',()=>{load();if(!channel){channel=sb.channel('ejc-work-changes').on('postgres_changes',{event:'*',schema:'public',table:'ejc_work_teams'},load).on('postgres_changes',{event:'*',schema:'public',table:'ejc_work_members'},load).subscribe();}});
  });
})();
