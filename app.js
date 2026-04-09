const SB_URL='https://uekinczkxqkqaoyzrmfg.supabase.co';
const SB_KEY='sb_publishable_Y70pjCNs3oClL_RG-81DDQ_xhp0pdd9';
const {createClient}=supabase;
const db=createClient(SB_URL,SB_KEY,{global:{headers:{'Accept':'application/json','Content-Type':'application/json'}},auth:{persistSession:true,autoRefreshToken:true}});

let CU=null,CR=null,allLug=[],allComp=[],allWup=[],allStore=[],allHandovers=[];
let photoLug=null,photoLF=null,photoStore=null;
const OVERDUE_WEEKS=3;
const catLabels={'guest-luggage':'Guest Luggage','guest-valuables':'Guest Valuables','hotel-equipment':'Hotel Equipment','hotel-supplies':'Hotel Supplies','banners-signage':'Banners & Signage','other':'Other'};
const catBadge={'guest-luggage':'bg','guest-valuables':'bb','hotel-equipment':'bo','hotel-supplies':'bgr','banners-signage':'bp','other':'bgr'};
const priMap={urgent:'br2',medium:'bo',low:'bg'};
const priOrder={urgent:0,important:1,medium:1,normal:2,low:2};

// ── GUEST RELATIONS ACCESS ──
var GR_PAGES=['dashboard','newspapers','timetable','lostfound','report','analytics','complaints'];
function isGR(){return CR==='gr';}
function grBlocked(page){return isGR()&&GR_PAGES.indexOf(page)===-1;}

// ── NEWSPAPER CONFIG ──
var NP_RECIPIENTS=[
  {id:1,name:'PRESIDENT',papers:['Nation','Standard','Business Daily','Star']},
  {id:2,name:'GENERAL MANAGER',papers:['Nation','Standard','Business Daily','Star']},
  {id:3,name:'G.M - FINANCE',papers:['Nation','Standard','Business Daily','Star']},
  {id:4,name:'FRONT OFFICE MANAGER',papers:['Nation','Standard','Business Daily','Star']},
  {id:5,name:'SALES/MARKETING MANAGER',papers:['Nation','Standard','Business Daily','Star']},
  {id:6,name:'HUMAN RESOURCES MANAGER',papers:['Nation','Standard','Business Daily','Star']},
  {id:7,name:'F&B MANAGER',papers:['Nation','Standard','Business Daily']},
  {id:8,name:'ICT MANAGER',papers:['Nation','Standard']},
  {id:9,name:'HEALTH CLUB MANAGER',papers:['Nation']},
  {id:10,name:'PROCUREMENT MANAGER',papers:['Nation','Business Daily']},
  {id:11,name:'SENIOR ACCOUNTANT',papers:['Nation']},
  {id:12,name:'EXECUTIVE CHEF',papers:['Nation']},
  {id:13,name:'SECURITY OFFICE',papers:['Nation']},
  {id:14,name:'EXECUTIVE HOUSEKEEPER',papers:['Nation']},
  {id:15,name:'LAUNDRY MANAGER',papers:['Nation']},
  {id:16,name:'MAINTENANCE MANAGER',papers:['Nation']},
  {id:17,name:'LANDSCAPING MANAGER',papers:['Nation']},
  {id:18,name:'ASS. F&B MANAGER',papers:['Nation']}
];
var ALL_PAPERS=['Nation','Standard','Business Daily','Star'];
var npCurrentData={};

// ── INIT ──
(async function(){
  var s=await db.auth.getSession();
  if(s.data.session){await loadProfile(s.data.session.user);return;}
  var u=await db.from('users').select('*',{count:'exact',head:true});
  u.count===0?showSetup():showLogin();
})();

function showSetup(){hide('login-wrap');show('setup-wrap');}
function showLogin(){hide('setup-wrap');show('login-wrap');}
function show(id){document.getElementById(id).classList.remove('hide');}
function hide(id){document.getElementById(id).classList.add('hide');}

// ── SETUP ──
async function doSetup(){
  var n=g('sn'),e=g('se'),p=g('sp'),p2=g('sp2'),err=document.getElementById('serr');
  err.textContent='';
  if(!n||!e||!p){err.textContent='Please fill all fields.';return;}
  if(p!==p2){err.textContent='Passwords do not match.';return;}
  if(p.length<6){err.textContent='Password must be at least 6 characters.';return;}
  var r=await db.auth.signUp({email:e,password:p});
  if(r.error){err.textContent=r.error.message;return;}
  var r2=await db.from('users').insert([{id:r.data.user.id,email:e,full_name:n,role:'admin'}]);
  if(r2.error){err.textContent=r2.error.message;return;}
  document.getElementById('cname').textContent=n;
  document.getElementById('cemail').textContent=e;
  hide('s1');show('s2');
  document.getElementById('d1').className='sdot done';
  document.getElementById('d2').className='sdot act';
}

// ── AUTH ──
async function doLogin(){
  var e=document.getElementById('le').value.trim(),p=document.getElementById('lp').value;
  var errEl=document.getElementById('lerr'),btn=document.getElementById('login-btn');
  errEl.textContent='';
  if(!e||!p){errEl.textContent='Please enter your email and password.';return;}
  btn.textContent='Signing in...';
  var r=await db.auth.signInWithPassword({email:e,password:p});
  btn.textContent='Sign In';
  if(r.error){errEl.textContent=r.error.message;return;}
  await loadProfile(r.data.user);
}
async function loadProfile(user){
  var r=await db.from('users').select('*').eq('id',user.id).maybeSingle();
  if(r.error){document.getElementById('lerr').textContent='Error: '+r.error.message;await db.auth.signOut();return;}
  if(!r.data){document.getElementById('lerr').textContent='Profile not found. Contact admin.';await db.auth.signOut();return;}
  CU=r.data;CR=r.data.role;initApp();
}
async function doLogout(){
  await db.auth.signOut();
  document.getElementById('app').classList.remove('show');
  showLogin();CU=null;CR=null;
}

// ── APP INIT ──
function initApp(){
  hide('setup-wrap');hide('login-wrap');
  document.getElementById('app').classList.add('show');
  var av=document.getElementById('uav');
  var initials=CU.full_name.split(' ').map(function(w){return w[0];}).join('').toUpperCase().substring(0,2);
  av.textContent=initials;
  if(CR==='admin')av.classList.add('is-admin');
  document.getElementById('uname').textContent=CU.full_name;
  document.getElementById('urole').textContent=isGR()?'GUEST RELATIONS':CR.toUpperCase();
  document.getElementById('wd').value=new Date().toISOString().split('T')[0];
  document.getElementById('report-date').value=new Date().toISOString().split('T')[0];
  if(CR==='admin'||CR==='hod'){show('anlbl');show('nav-users');}
if(isGR()){
  var grHide=['nav-luggage','nav-wakeup','nav-store','nav-handover'];
  grHide.forEach(function(id){var el=document.getElementById(id);if(el)el.classList.add('hide');});
}
  initWelcome();
  loadAll();
}
function loadAll(){
  loadDash();
  if(!isGR()){loadLug();loadWup();loadStore();loadHandovers();}
  loadComp();loadLF();loadNotifs();loadTimetable();initNpDate();
  if(CR==='admin'||CR==='hod')loadUsers();
}

// ── WELCOME ──
function getCurrentShift(){
  var h=new Date().getHours();
  if(h>=7&&h<15)return{name:'morning',label:'Morning Shift (7am–3pm)',next:'Afternoon Shift (3pm–11pm)'};
  if(h>=15&&h<23)return{name:'afternoon',label:'Afternoon Shift (3pm–11pm)',next:'Night Shift (11pm–7am)'};
  return{name:'night',label:'Night Shift (11pm–7am)',next:'Morning Shift (7am–3pm)'};
}
function initWelcome(){
  var now=new Date(),h=now.getHours();
  var shift=getCurrentShift();
  var greet=h<12?'Good morning':h<17?'Good afternoon':h<21?'Good evening':'Good night';
  var initials=CU.full_name.split(' ').map(function(w){return w[0];}).join('').toUpperCase().substring(0,2);
  document.getElementById('w-av').textContent=initials;
  document.getElementById('w-greet').textContent=greet+', '+CU.full_name.split(' ')[0]+' 👋';
  document.getElementById('w-shift').textContent='You are on the '+shift.label;
  document.getElementById('w-date').textContent=now.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  var lbl=document.getElementById('shift-lbl');
  if(lbl)lbl.textContent='Now: '+shift.label+' → Handing over to: '+shift.next;
if(CR==='gm'||isGR()){var wp=document.getElementById('write-ho-panel');if(wp)wp.style.display='none';}
  function tick(){document.getElementById('w-clock').textContent=new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});}
  tick();setInterval(tick,1000);
}

// ── NAV ──
var pgTitles={dashboard:'Dashboard',luggage:'Luggage Storage',complaints:'Guest Complaints',wakeup:'Wake-up Calls',lostfound:'Lost & Found',store:'Store Inventory',newspapers:'Newspaper Distribution',handover:'Shift Handover',report:'Daily Report',analytics:'Analytics',timetable:'Staff Timetable',users:'Manage Users'};
var pgActions={luggage:['+ Log New Bag','m-lug'],complaints:['+ Log Complaint','m-comp'],wakeup:['+ Schedule Call','m-wup'],lostfound:['+ Log Item','m-lf'],store:['+ Add Item','m-store'],users:['+ Add Staff','m-user']};

function pg(id,btn){
  if(grBlocked(id)){toast('Access restricted for your role','error');return;}
  document.querySelectorAll('.ps').forEach(function(s){s.classList.remove('active');});
  document.querySelectorAll('.ni').forEach(function(n){n.classList.remove('active');});
  document.getElementById('page-'+id).classList.add('active');
  if(btn)btn.classList.add('active');
  document.getElementById('pg-title').textContent=pgTitles[id]||id;
  var ab=document.getElementById('topbar-action');
  var grActionAllowed=(id==='complaints'||id==='lostfound');
  if(pgActions[id]&&CR!=='gm'&&(!isGR()||grActionAllowed)){ab.classList.remove('hide');ab.textContent=pgActions[id][0];ab.onclick=function(){openM(pgActions[id][1]);};
  else ab.classList.add('hide');
  document.getElementById('notif-panel').classList.remove('open');
  closeSidebar();
  if(id==='analytics')loadAnalytics();
  if(id==='newspapers')loadNpDay();
}
function pg(id,btn){
  if(grBlocked(id)){toast('Access restricted for your role','error');return;}
  document.querySelectorAll('.ps').forEach(function(s){s.classList.remove('active');});
  document.querySelectorAll('.ni').forEach(function(n){n.classList.remove('active');});
  document.getElementById('page-'+id).classList.add('active');
  document.getElementById('pg-title').textContent=pgTitles[id]||id;
  document.querySelectorAll('.ni').forEach(function(n){
    if(n.getAttribute('onclick')&&n.getAttribute('onclick').indexOf("'"+id+"'")>-1)n.classList.add('active');
  });
  var ab=document.getElementById('topbar-action');
  var grActionAllowed=(id==='complaints'||id==='lostfound');
  if(pgActions[id]&&CR!=='gm'&&(!isGR()||grActionAllowed)){ab.classList.remove('hide');ab.textContent=pgActions[id][0];ab.onclick=function(){openM(pgActions[id][1]);};
  else ab.classList.add('hide');
  closeSidebar();
}

// ── SIDEBAR MOBILE ──
function toggleSidebar(){
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sb-overlay').classList.toggle('show');
}
function closeSidebar(){
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sb-overlay').classList.remove('show');
}

// ── NOTIFICATIONS ──
async function loadNotifs(){
  var notifs=[];
  var od=new Date();od.setDate(od.getDate()-(OVERDUE_WEEKS*7));
  var ol=await db.from('luggage').select('*').eq('status','stored').lt('time_in',od.toISOString());
  if(ol.data&&ol.data.length)ol.data.forEach(function(r){notifs.push({type:'warn',icon:'🧳',text:'Overdue luggage: '+r.guest_name+' (Tag: '+(r.tag_code||'—')+')',time:fd(r.time_in)});});
  var uc=await db.from('complaints').select('*').eq('status','open').eq('priority','urgent');
  if(uc.data&&uc.data.length)uc.data.forEach(function(r){notifs.push({type:'danger',icon:'💬',text:'Urgent complaint: '+r.guest_name,time:fd(r.created_at)});});
  var nb=document.getElementById('notif-body');
  var dot=document.getElementById('notif-dot');
  var cnt=document.getElementById('notif-count');
  if(!notifs.length){nb.innerHTML='<div style="padding:20px;text-align:center;font-size:13px;color:var(--ink3);">No alerts right now ✓</div>';dot.classList.add('hide');cnt.textContent='0 alerts';return;}
  dot.classList.remove('hide');cnt.textContent=notifs.length+' alert'+(notifs.length>1?'s':'');
  nb.innerHTML=notifs.map(function(n){return '<div style="padding:10px 16px;border-bottom:1px solid var(--border);display:flex;gap:10px;align-items:flex-start;"><div style="width:30px;height:30px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;background:'+(n.type==='danger'?'var(--redbg)':'var(--amberbg)')+';">'+n.icon+'</div><div><div style="font-size:12px;color:var(--ink);">'+n.text+'</div><div style="font-size:10px;color:var(--ink3);margin-top:2px;">'+n.time+'</div></div></div>';}).join('');
}
function toggleNotif(){document.getElementById('notif-panel').classList.toggle('open');}

// ── DASHBOARD ──
async function loadDash(){
  var today=new Date().toISOString().split('T')[0];
  var l=await db.from('luggage').select('*',{count:'exact',head:true}).eq('status','stored');
  var c=await db.from('complaints').select('*',{count:'exact',head:true}).eq('status','open');
  var w=await db.from('wakeup_calls').select('*',{count:'exact',head:true}).eq('date',today).eq('status','pending');
  var lf=await db.from('lost_found').select('*',{count:'exact',head:true}).eq('status','unclaimed');
  document.getElementById('st-l').textContent=l.count||0;
  document.getElementById('st-c').textContent=c.count||0;
  document.getElementById('st-w').textContent=w.count||0;
  document.getElementById('st-lf').textContent=lf.count||0;
  document.getElementById('lb').textContent=l.count||0;
  document.getElementById('cb').textContent=c.count||0;
  if((c.count||0)>0)document.getElementById('cb').classList.add('alert');
  document.getElementById('wb').textContent=w.count||0;
  document.getElementById('lfb').textContent=lf.count||0;
  var r=await db.from('luggage').select('*').order('created_at',{ascending:false}).limit(5);
  var ra=document.getElementById('ra');
  if(!r.data||!r.data.length){ra.innerHTML='<div class="es"><div class="ei">📋</div><p>No recent activity</p></div>';return;}
  ra.innerHTML=r.data.map(function(x){return '<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border);"><div style="width:32px;height:32px;border-radius:8px;background:var(--sage);display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;">🧳</div><div style="flex:1;min-width:0;"><div style="font-size:12px;font-weight:600;">'+x.guest_name+' — Room '+(x.room_number||'—')+'</div><div style="font-size:11px;color:var(--ink3);">Tag: <span class="tag-code" style="font-size:10px;">'+(x.tag_code||'—')+'</span> · '+x.handled_by+' · '+fd(x.time_in)+'</div></div><span class="badge '+(x.status==='stored'?'bg':'bgr')+'">'+x.status+'</span></div>';}).join('');
  var shifts=await db.from('shifts').select('*').eq('date',today).order('created_at',{ascending:false}).limit(4);
  var ss=document.getElementById('shift-summary');var sd=document.getElementById('shift-display');
  if(!shifts.data||!shifts.data.length){ss.innerHTML='<div class="es" style="padding:16px;"><div class="ei">◑</div><p>No shift logged today</p></div>';if(sd)sd.innerHTML='';return;}
  var sc={morning:'shift-morning',afternoon:'shift-afternoon',night:'shift-night'};
  ss.innerHTML=shifts.data.map(function(s){return '<div class="shift-card"><div style="display:flex;align-items:center;gap:10px;"><div style="width:32px;height:32px;border-radius:8px;background:var(--sage);display:flex;align-items:center;justify-content:center;font-weight:600;font-size:13px;color:var(--ink2);">'+s.staff_name.charAt(0)+'</div><div><div style="font-size:13px;font-weight:600;">'+s.staff_name+'</div><div style="font-size:11px;color:var(--ink3);">'+(s.notes||'No notes')+'</div></div></div><span class="shift-indicator '+(sc[s.shift]||'')+'">'+s.shift+'</span></div>';}).join('');
  if(sd)sd.innerHTML='<span class="badge bg">'+shifts.data.length+' on duty</span>';
}

// ── LUGGAGE ──
function isLugOD(r){return r.status==='stored'&&(Date.now()-new Date(r.time_in).getTime())>(OVERDUE_WEEKS*7*86400000);}
async function loadLug(){
  var r=await db.from('luggage').select('*').order('created_at',{ascending:false});
  allLug=r.data||[];renderSplit(allLug);
}
function renderSplit(rows){
  var ins=(rows||[]).filter(function(r){return r.status==='stored';});
  var outs=(rows||[]).filter(function(r){return r.status==='collected';});
  document.getElementById('ci-count').textContent=ins.length;
  document.getElementById('co-count').textContent=outs.length;
  var ci=document.getElementById('ci-list');
  if(!ins.length){ci.innerHTML='<div class="es" style="padding:24px;"><div class="ei">🧳</div><p>No bags in storage</p></div>';}
  else{
    ci.innerHTML=ins.map(function(r){
      var od=isLugOD(r);
      var canDel=CR==='admin';
      return '<div style="padding:14px 18px;border-bottom:1px solid var(--border);cursor:pointer;'+(od?'background:var(--redbg);':'')+'" onclick="showTagDetail(\''+r.id+'\')">'
      +'<div style="display:flex;align-items:flex-start;gap:10px;">'
      +(r.photo_url?'<img src="'+r.photo_url+'" style="width:44px;height:44px;border-radius:9px;object-fit:cover;border:1px solid var(--border);flex-shrink:0;cursor:pointer;" onclick="openLightbox(\''+r.photo_url+'\',\'Bag Photo\')" onerror="this.style.display=\'none\'">' :'<div style="width:44px;height:44px;border-radius:9px;background:var(--sage);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">🧳</div>')
      +'<div style="flex:1;min-width:0;">'
      +'<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:4px;">'
      +'<span class="tag-code" style="font-size:11px;">'+(r.tag_code||'NO TAG')+'</span>'
      +(od?'<span style="background:var(--redbg);color:var(--red);font-size:9px;font-weight:700;padding:1px 6px;border-radius:4px;border:1px solid var(--redbd);">⚠ OVERDUE</span>':'')
      +'</div>'
      +'<div style="font-size:13px;font-weight:600;">'+r.guest_name+'</div>'
      +'<div style="font-size:11px;color:var(--ink3);margin-top:1px;">'+(r.room_number?'Room '+r.room_number+' · ':'Day visitor · ')+r.number_of_bags+' bag'+(r.number_of_bags>1?'s':'')+'</div>'
      +'<div style="margin-top:8px;padding-top:6px;border-top:1px solid var(--border);font-size:11px;color:var(--ink3);">⬇ <strong>In:</strong> '+fd(r.time_in)+' &nbsp;·&nbsp; By: '+r.handled_by+'</div>'
      +(CR!=='gm'?'<div style="display:flex;gap:6px;margin-top:8px;" onclick="event.stopPropagation();">'
        +'<button class="btn btn-gold btn-xs" style="flex:1;" onclick="openCollect(\''+r.id+'\')">Release All →</button>'
        +'<button class="btn btn-outline btn-xs" onclick="openAddBags(\''+r.id+'\')">+ Add Bags</button>'
        +'<button class="btn btn-outline btn-xs" onclick="openRemoveBags(\''+r.id+'\')">− Partial</button>'
        +(canDel?'<button class="btn btn-danger btn-xs" onclick="askDel(\'luggage\',\''+r.id+'\',\'Luggage for '+r.guest_name+'\')">Del</button>':'')
        +'</div>':'')
      +'</div></div></div>';
    }).join('');
  }
  var co=document.getElementById('co-list');
  if(!outs.length){co.innerHTML='<div class="es" style="padding:24px;"><div class="ei">✓</div><p>No bags released yet</p></div>';}
  else{
    co.innerHTML=outs.map(function(r){
      return '<div style="padding:14px 18px;border-bottom:1px solid var(--border);cursor:pointer;" onclick="showTagDetail(\''+r.id+'\')">'
      +'<div style="display:flex;align-items:flex-start;gap:10px;">'
      +(r.photo_url?'<img src="'+r.photo_url+'" style="width:44px;height:44px;border-radius:9px;object-fit:cover;border:1px solid var(--border);flex-shrink:0;opacity:.6;cursor:pointer;" onclick="openLightbox(\''+r.photo_url+'\',\'Bag Photo\')" onerror="this.style.display=\'none\'">' :'<div style="width:44px;height:44px;border-radius:9px;background:var(--offwhite);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;opacity:.5;">🧳</div>')
      +'<div style="flex:1;min-width:0;">'
      +'<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">'
      +'<span class="tag-code" style="font-size:11px;opacity:.7;">'+(r.tag_code||'NO TAG')+'</span>'
      +'<span class="badge bgr" style="font-size:9px;">collected</span>'
      +'</div>'
      +'<div style="font-size:13px;font-weight:600;">'+r.guest_name+'</div>'
      +'<div style="font-size:11px;color:var(--ink3);margin-top:1px;">'+(r.room_number?'Room '+r.room_number+' · ':'Day visitor · ')+r.number_of_bags+' bag'+(r.number_of_bags>1?'s':'')+'</div>'
      +'<div style="margin-top:8px;padding-top:6px;border-top:1px solid var(--border);">'
      +'<div style="font-size:11px;color:var(--ink3);">⬇ <strong>In:</strong> '+fd(r.time_in)+'</div>'
      +'<div style="font-size:11px;color:var(--amber);margin-top:2px;">⬆ <strong>Out:</strong> '+fd(r.time_out)+'</div>'
      +(r.collected_by?'<div style="font-size:11px;color:var(--ink3);margin-top:2px;">Collected by: <strong>'+r.collected_by+'</strong>'+(r.collector_relation?' ('+r.collector_relation+')':'')+'</div>':'')
      +(r.collected_by_staff?'<div style="margin-top:6px;display:flex;align-items:center;gap:6px;background:rgba(45,90,27,.08);border-radius:6px;padding:5px 8px;"><div style="width:22px;height:22px;border-radius:5px;background:var(--green);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff;flex-shrink:0;">'+r.collected_by_staff.charAt(0)+'</div><div style="font-size:10px;color:var(--ink2);">Released by: <strong>'+r.collected_by_staff+'</strong></div></div>':'')
      +'</div></div></div></div>';
    }).join('');
  }
}
function searchLug(q){
  var sr=document.getElementById('lug-search-results');
  if(!q){sr.style.display='none';renderSplit(allLug);return;}
  var ql=q.toLowerCase();
  var res=allLug.filter(function(r){return (r.tag_code||'').toLowerCase().indexOf(ql)>-1||(r.guest_name||'').toLowerCase().indexOf(ql)>-1||(r.room_number||'').toLowerCase().indexOf(ql)>-1||(r.bag_description||'').toLowerCase().indexOf(ql)>-1;});
  sr.style.display='block';
  var tb=document.getElementById('lug-tb');
  if(!res.length){tb.innerHTML='<tr><td colspan="10"><div class="es"><div class="ei">🧳</div><p>No results</p></div></td></tr>';return;}
  tb.innerHTML=res.map(function(r){
    return '<tr><td><span class="tag-code" style="cursor:pointer;" onclick="showTagDetail(\''+r.id+'\')">'+(r.tag_code||'—')+'</span></td>'
    +'<td><strong>'+r.guest_name+'</strong></td><td>'+(r.room_number||'—')+'</td><td>'+r.number_of_bags+'</td>'
    +'<td style="font-size:12px;white-space:nowrap;">'+fd(r.time_in)+'</td>'
    +'<td style="font-size:12px;white-space:nowrap;">'+(r.time_out?fd(r.time_out):'Still in')+'</td>'
    +'<td>'+r.handled_by+'</td>'
    +'<td>'+(r.collected_by_staff||'—')+'</td>'
    +'<td><span class="badge '+(r.status==='stored'?'bg':'bgr')+'">'+r.status+'</span></td>'
    +'<td style="white-space:nowrap;">'+(r.status==='stored'&&CR!=='gm'?'<button class="btn btn-gold btn-xs" onclick="openCollect(\''+r.id+'\')">Release</button> ':'')+( CR==='admin'?'<button class="btn btn-danger btn-xs" onclick="askDel(\'luggage\',\''+r.id+'\',\'Luggage for '+r.guest_name+'\')">Del</button>':'')+'</td></tr>';
  }).join('');
}
function filtLugDate(){
  var d=document.getElementById('lug-date').value;
  if(!d){renderSplit(allLug);return;}
  renderSplit(allLug.filter(function(r){return r.time_in&&r.time_in.indexOf(d)===0;}));
}
function clearLugFilters(){
  document.getElementById('lug-search').value='';
  document.getElementById('lug-date').value='';
  document.getElementById('lug-search-results').style.display='none';
  renderSplit(allLug);
}

// Tag Detail Modal
async function showTagDetail(id){
  var r=allLug.find(function(x){return x.id===id;});
  if(!r)return;
  var logs=await db.from('luggage_logs').select('*').eq('luggage_id',id).order('created_at',{ascending:true});
  var logData=logs.data||[];
  var od=isLugOD(r);
  document.getElementById('td-title').textContent='Tag: '+(r.tag_code||'—');
  document.getElementById('td-sub').textContent=r.guest_name+' · '+(r.room_number?'Room '+r.room_number:'Day visitor');
  var html='<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">';
  if(r.photo_url)html+='<div><img src="'+r.photo_url+'" style="width:100%;max-height:200px;object-fit:cover;border-radius:var(--r);border:1px solid var(--border);cursor:zoom-in;" onclick="window.open(\''+r.photo_url+'\',\'_blank\')"></div>';
  html+='<div>';
  if(od)html+='<div style="background:var(--redbg);border:1px solid var(--redbd);border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:12px;color:var(--red);font-weight:600;">⚠ Overdue — in storage over '+OVERDUE_WEEKS+' weeks</div>';
  html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px;">';
  html+='<div><span style="font-size:10px;color:var(--ink3);display:block;margin-bottom:2px;text-transform:uppercase;letter-spacing:.5px;">Tag Code</span><span class="tag-code">'+(r.tag_code||'—')+'</span></div>';
  html+='<div><span style="font-size:10px;color:var(--ink3);display:block;margin-bottom:2px;text-transform:uppercase;letter-spacing:.5px;">Status</span><span class="badge '+(r.status==='stored'?'bg':'bgr')+'">'+r.status+'</span></div>';
  html+='<div><span style="font-size:10px;color:var(--ink3);display:block;margin-bottom:2px;text-transform:uppercase;letter-spacing:.5px;">Guest</span><strong>'+r.guest_name+'</strong></div>';
  html+='<div><span style="font-size:10px;color:var(--ink3);display:block;margin-bottom:2px;text-transform:uppercase;letter-spacing:.5px;">Room</span>'+(r.room_number||'Day visitor')+'</div>';
  html+='<div><span style="font-size:10px;color:var(--ink3);display:block;margin-bottom:2px;text-transform:uppercase;letter-spacing:.5px;">Bags Now</span><strong style="font-size:16px;color:var(--green);">'+r.number_of_bags+'</strong></div>';
  html+='<div><span style="font-size:10px;color:var(--ink3);display:block;margin-bottom:2px;text-transform:uppercase;letter-spacing:.5px;">Checked In By</span>'+r.handled_by+'</div>';
  html+='<div><span style="font-size:10px;color:var(--ink3);display:block;margin-bottom:2px;text-transform:uppercase;letter-spacing:.5px;">Time In</span>'+fd(r.time_in)+'</div>';
  if(r.time_out)html+='<div><span style="font-size:10px;color:var(--ink3);display:block;margin-bottom:2px;text-transform:uppercase;letter-spacing:.5px;">Time Out</span>'+fd(r.time_out)+'</div>';
  html+='</div></div></div></div>';
  html+='<div style="margin-top:4px;"><div style="font-size:11px;font-weight:600;color:var(--ink3);text-transform:uppercase;letter-spacing:.8px;margin-bottom:10px;">Bag Activity Log</div>';
  html+='<div class="tag-log-item"><div class="tag-log-ico in">⬇</div><div style="flex:1;"><div style="font-size:12px;font-weight:600;color:var(--ink2);">Initial Check-in — '+r.number_of_bags+' bag'+(r.number_of_bags>1?'s':'')+'</div><div style="font-size:11px;color:var(--ink3);">'+(r.bag_description||'No description')+'</div><div style="font-size:11px;color:var(--ink3);margin-top:2px;">By: '+r.handled_by+' · '+fd(r.time_in)+'</div></div></div>';
  if(logData.length){
    html+=logData.map(function(l){
      var ico=l.action==='add'?'add':l.action==='remove'?'remove':'out';
      var color=l.action==='add'?'var(--blue)':l.action==='remove'?'var(--amber)':'var(--red)';
      var label=l.action==='add'?'+ Added '+l.bags_changed+' bag'+(l.bags_changed>1?'s':''):l.action==='remove'?'− Removed '+l.bags_changed+' bag'+(l.bags_changed>1?'s':''):'Final Release — all bags collected';
      return '<div class="tag-log-item"><div class="tag-log-ico '+ico+'" style="color:'+color+';">'+(l.action==='add'?'➕':l.action==='remove'?'➖':'⬆')+'</div><div style="flex:1;"><div style="font-size:12px;font-weight:600;color:var(--ink);">'+label+'</div>'+(l.notes?'<div style="font-size:11px;color:var(--ink3);">'+l.notes+'</div>':'')+'<div style="font-size:11px;color:var(--ink3);margin-top:2px;">By: '+(l.staff_name||'—')+'<span style="margin-left:6px;">'+(l.collected_by?'· Collected by: '+l.collected_by:'')+'</span> · '+fd(l.created_at)+'</div></div><div style="font-size:12px;font-weight:600;color:var(--ink3);">'+(l.bags_after!==undefined?l.bags_after+' left':'')+'</div></div>';
    }).join('');
  }
  html+='</div>';
  document.getElementById('td-body').innerHTML=html;
  var footer='<button class="btn btn-outline" onclick="closeM(\'m-tag-detail\')">Close</button>';
  if(r.status==='stored'&&CR!=='gm'){
    footer+='<button class="btn btn-outline" onclick="closeM(\'m-tag-detail\');openAddBags(\''+r.id+'\')">+ Add Bags</button>';
    footer+='<button class="btn btn-outline" onclick="closeM(\'m-tag-detail\');openRemoveBags(\''+r.id+'\')">− Partial Release</button>';
    footer+='<button class="btn btn-gold" onclick="closeM(\'m-tag-detail\');openCollect(\''+r.id+'\')">Release All →</button>';
  }
  if(CR==='admin')footer+='<button class="btn btn-danger" onclick="closeM(\'m-tag-detail\');askDel(\'luggage\',\''+r.id+'\',\'Luggage for '+r.guest_name+'\')">Delete</button>';
  document.getElementById('td-footer').innerHTML=footer;
  openM('m-tag-detail');
}

function openAddBags(id){
  var r=allLug.find(function(x){return x.id===id;});if(!r)return;
  document.getElementById('ab-lug-id').value=id;
  document.getElementById('ab-tag-label').textContent='Tag '+(r.tag_code||'—')+' — Currently '+r.number_of_bags+' bag'+(r.number_of_bags>1?'s':'')+' in storage';
  clr(['ab-count','ab-desc','ab-staff']);
  openM('m-add-bags');
}
async function addBagsToTag(){
  var id=document.getElementById('ab-lug-id').value;
  var count=parseInt(g('ab-count')||'0');
  var desc=g('ab-desc'),staff=g('ab-staff');
  if(!count||count<1){toast('Enter number of bags to add','error');return;}
  if(!staff){toast('Enter your name','error');return;}
  var r=allLug.find(function(x){return x.id===id;});if(!r)return;
  var newTotal=r.number_of_bags+count;
  await db.from('luggage').update({number_of_bags:newTotal}).eq('id',id);
  await db.from('luggage_logs').insert([{luggage_id:id,action:'add',bags_changed:count,bags_after:newTotal,staff_name:staff,notes:desc||null}]);
  closeM('m-add-bags');toast(count+' bag'+(count>1?'s':'')+' added to tag ✅');loadLug();loadDash();
}

function openRemoveBags(id){
  var r=allLug.find(function(x){return x.id===id;});if(!r)return;
  document.getElementById('rb-lug-id').value=id;
  document.getElementById('rb-tag-label').textContent='Tag '+(r.tag_code||'—');
  document.getElementById('rb-current-info').innerHTML='<strong>'+r.guest_name+'</strong> · Tag: <span class="tag-code" style="font-size:11px;">'+(r.tag_code||'—')+'</span> · Currently <strong>'+r.number_of_bags+' bag'+(r.number_of_bags>1?'s':'')+' in storage</strong>';
  clr(['rb-count','rb-by','rb-staff','rb-notes']);
  openM('m-remove-bags');
}
async function removeBagsFromTag(){
  var id=document.getElementById('rb-lug-id').value;
  var count=parseInt(g('rb-count')||'0');
  var by=g('rb-by'),staff=g('rb-staff'),notes=g('rb-notes');
  if(!count||count<1){toast('Enter number of bags being removed','error');return;}
  if(!by||!staff){toast('Fill all required fields','error');return;}
  var r=allLug.find(function(x){return x.id===id;});if(!r)return;
  if(count>=r.number_of_bags){toast('Use Release All to collect remaining bags','error');return;}
  var newTotal=r.number_of_bags-count;
  await db.from('luggage').update({number_of_bags:newTotal}).eq('id',id);
  await db.from('luggage_logs').insert([{luggage_id:id,action:'remove',bags_changed:count,bags_after:newTotal,staff_name:staff,collected_by:by,notes:notes||null}]);
  closeM('m-remove-bags');toast(count+' bag'+(count>1?'s':'')+' released — '+newTotal+' remaining ✅');loadLug();loadDash();
}

function openCollect(id){
  var r=allLug.find(function(x){return x.id===id;});if(!r)return;
  document.getElementById('col-id').value=id;
  document.getElementById('col-guest').textContent=r.guest_name;
  document.getElementById('col-tag').textContent=r.tag_code||'—';
  document.getElementById('col-room').textContent=r.room_number||'Day visitor';
  document.getElementById('col-bags').textContent=r.number_of_bags+' bag'+(r.number_of_bags>1?'s':'');
  document.getElementById('col-cin-by').textContent=r.handled_by||'—';
  document.getElementById('col-time-in').textContent=fd(r.time_in);
  clr(['col-by','col-id-no','col-relation']);
  var initials=CU.full_name.split(' ').map(function(w){return w[0];}).join('').toUpperCase().substring(0,2);
  document.getElementById('col-av').textContent=initials;
  document.getElementById('col-staff-name').textContent=CU.full_name;
  document.getElementById('col-staff-role').textContent=CR.toUpperCase()+' — '+getCurrentShift().label;
  document.getElementById('col-staff-time').textContent='Release time: '+new Date().toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
  openM('m-collect');
}
async function doCollect(){
  var id=document.getElementById('col-id').value;
  var by=g('col-by'),idno=g('col-id-no'),rel=g('col-relation');
  if(!by){toast('Enter who is collecting','error');return;}
  var r=allLug.find(function(x){return x.id===id;});
  var now=new Date().toISOString();
  await db.from('luggage').update({status:'collected',time_out:now,collected_by:by,collector_id:idno||null,collector_relation:rel||null,collected_by_staff:CU.full_name}).eq('id',id);
  await db.from('luggage_logs').insert([{luggage_id:id,action:'final_release',bags_changed:r?r.number_of_bags:0,bags_after:0,staff_name:CU.full_name,collected_by:by,notes:rel?'Relationship: '+rel:null}]);
  if(r)await syncLugCheckout(r);
  closeM('m-collect');
  toast('Luggage released — signed off by '+CU.full_name+' ✅');
  loadLug();loadStore();loadDash();loadNotifs();
}
async function saveLug(){
  var tag=g('l-tag'),bags=g('l-bags'),guest=g('l-guest'),room=g('l-room'),handler=g('l-handler'),desc=g('l-desc'),phone=g('l-phone'),email=g('l-email');
  if(!tag||!bags||!guest||!handler){toast('Please fill: Tag code, bags, guest name and handled by','error');return;}
  var rec={tag_code:tag.toUpperCase(),guest_name:guest,room_number:room||null,number_of_bags:parseInt(bags),bag_description:desc||null,handled_by:handler,guest_phone:phone||null,guest_email:email||null,time_in:new Date().toISOString(),status:'stored',photo_url:photoLug||null};
  var ins=await db.from('luggage').insert([rec]).select().single();
  if(ins.error){toast('Error: '+ins.error.message,'error');return;}
  if(ins.data)await syncLugToStore(ins.data);
  closeM('m-lug');toast('Luggage logged 🧳');
  clr(['l-tag','l-bags','l-guest','l-room','l-handler','l-desc','l-phone','l-email']);
  document.getElementById('l-photo-prev').style.display='none';photoLug=null;
  loadLug();loadStore();loadDash();loadNotifs();
}

// ── COMPLAINTS ──
async function loadComp(){
  var r=await db.from('complaints').select('*').order('created_at',{ascending:false});
  allComp=r.data||[];renderComp(allComp);
}
function renderComp(rows){
  var tb=document.getElementById('comp-tb');
  if(!rows||!rows.length){tb.innerHTML='<tr><td colspan="9"><div class="es"><div class="ei">💬</div><p>No complaints yet</p></div></td></tr>';return;}
  tb.innerHTML=rows.map(function(r){
    var canDel=CR==='admin';
    return '<tr '+(r.priority==='urgent'?'style="background:var(--redbg);"':'')+'>'
    +'<td><strong>'+r.guest_name+'</strong></td><td>'+(r.room_number||'—')+'</td>'
    +'<td style="max-width:180px;">'+r.complaint+'</td>'
    +'<td><span class="badge '+(priMap[r.priority]||'bg')+'">'+(r.priority||'low')+'</span></td>'
    +'<td>'+r.logged_by+'</td><td style="font-size:12px;white-space:nowrap;">'+fd(r.created_at)+'</td>'
    +'<td><span class="badge '+(r.status==='open'?'br2':'bg')+'">'+r.status+'</span></td>'
    +'<td style="font-size:11px;color:var(--ink3);max-width:150px;">'+(r.resolution_notes||'—')+'</td>'
    +'<td style="white-space:nowrap;">'+(r.status==='open'&&CR!=='gm'&&!isGR()?'<button class="btn btn-outline btn-xs" onclick="openResolve(\''+r.id+'\')">Resolve</button> ':'')+( canDel?'<button class="btn btn-danger btn-xs" onclick="askDel(\'complaints\',\''+r.id+'\',\'Complaint from '+r.guest_name+'\')">Del</button>':'')+'</td></tr>';
  }).join('');
}
function filtComp(v){renderComp(v==='all'?allComp:allComp.filter(function(r){return r.status===v;}));}
async function saveComp(){
  var guest=g('cg'),room=g('cr'),complaint=g('cc'),handler=g('ch'),priority=document.getElementById('cpri').value;
  if(!guest||!complaint||!handler){toast('Fill all required fields','error');return;}
  var r=await db.from('complaints').insert([{guest_name:guest,room_number:room||null,complaint:complaint,priority:priority,logged_by:handler,status:'open'}]);
  if(r.error){toast('Error: '+r.error.message,'error');return;}
  closeM('m-comp');toast('Complaint logged 💬');clr(['cg','cr','cc','ch']);loadComp();loadDash();loadNotifs();
}
function openResolve(id){document.getElementById('resolve-id').value=id;openM('m-resolve');}
async function doResolve(){
  var id=document.getElementById('resolve-id').value,notes=g('resolve-notes'),by=g('resolve-by');
  if(!notes||!by){toast('Fill all fields','error');return;}
  var r=await db.from('complaints').update({status:'resolved',resolution_notes:notes,resolved_by:by,resolved_at:new Date().toISOString()}).eq('id',id);
  if(r.error){toast('Error: '+r.error.message,'error');return;}
  closeM('m-resolve');toast('Complaint resolved ✅');clr(['resolve-notes','resolve-by']);loadComp();loadDash();loadNotifs();
}

// ── WAKEUP ──
async function loadWup(){
  var r=await db.from('wakeup_calls').select('*').order('date',{ascending:true}).order('wakeup_time',{ascending:true});
  allWup=r.data||[];renderWup(allWup);
}
function renderWup(rows){
  var tb=document.getElementById('wup-tb');
  if(!rows||!rows.length){tb.innerHTML='<tr><td colspan="8"><div class="es"><div class="ei">⏰</div><p>No wake-up calls scheduled</p></div></td></tr>';return;}
  tb.innerHTML=rows.map(function(r){
    var canDel=CR==='admin';
    return '<tr><td><strong>'+r.guest_name+'</strong></td><td>'+r.room_number+'</td>'
    +'<td><strong style="font-size:15px;">'+r.wakeup_time+'</strong></td><td>'+r.date+'</td>'
    +'<td>'+(r.repeat_nights&&r.repeat_nights>1?'<span class="badge bb">'+r.repeat_nights+' nights</span>':'Once')+'</td>'
    +'<td>'+r.logged_by+'</td>'
    +'<td><span class="badge '+(r.status==='pending'?'bo':'bg')+'">'+r.status+'</span></td>'
    +'<td style="white-space:nowrap;">'+(r.status==='pending'&&CR!=='gm'?'<button class="btn btn-gold btn-xs" onclick="doneWup(\''+r.id+'\')">Done</button> ':'')+( canDel?'<button class="btn btn-danger btn-xs" onclick="askDel(\'wakeup_calls\',\''+r.id+'\',\'Wake-up for '+r.guest_name+'\')">Del</button>':'')+'</td></tr>';
  }).join('');
}
function filtWup(v){renderWup(v==='all'?allWup:allWup.filter(function(r){return r.status===v;}));}
async function saveWup(){
  var guest=g('wg'),room=g('wr'),time=g('wt'),date=g('wd'),handler=g('wh'),nights=parseInt(document.getElementById('wrepeat').value)||1;
  if(!guest||!room||!time||!date||!handler){toast('Fill all required fields','error');return;}
  var records=[];
  for(var i=0;i<nights;i++){var d=new Date(date);d.setDate(d.getDate()+i);records.push({guest_name:guest,room_number:room,wakeup_time:time,date:d.toISOString().split('T')[0],logged_by:handler,status:'pending',repeat_nights:nights});}
  var r=await db.from('wakeup_calls').insert(records);
  if(r.error){toast('Error: '+r.error.message,'error');return;}
  closeM('m-wup');toast('Wake-up call scheduled ⏰'+(nights>1?' for '+nights+' nights':''));clr(['wg','wr','wt','wh']);loadWup();loadDash();
}
async function doneWup(id){
  var r=await db.from('wakeup_calls').update({status:'done'}).eq('id',id);
  if(r.error){toast('Error: '+r.error.message,'error');return;}
  toast('Done ✅');loadWup();loadDash();
}

// ── LOST & FOUND ──
async function loadLF(){
  var r=await db.from('lost_found').select('*').order('created_at',{ascending:false});
  var tb=document.getElementById('lf-tb');
  document.getElementById('lfb').textContent=(r.data||[]).filter(function(x){return x.status==='unclaimed';}).length;
  if(!r.data||!r.data.length){tb.innerHTML='<tr><td colspan="9"><div class="es"><div class="ei">🔍</div><p>No items logged yet</p></div></td></tr>';return;}
  tb.innerHTML=r.data.map(function(x){
    var canDel=CR==='admin';
    return '<tr><td>'+(x.photo_url?'<img src="'+x.photo_url+'" style="width:36px;height:36px;border-radius:7px;object-fit:cover;border:1px solid var(--border);cursor:pointer;" onclick="openLightbox(\''+x.photo_url+'\',\'Found Item\')" onerror="this.style.display=\'none\'">' :'—')+'</td>'
    +'<td><strong>'+x.item_description+'</strong></td><td>'+(x.found_location||'—')+'</td>'
    +'<td>'+(x.guest_name||'—')+'</td><td>'+(x.room_number||'—')+'</td>'
    +'<td>'+x.logged_by+'</td><td style="font-size:12px;white-space:nowrap;">'+fd(x.created_at)+'</td>'
    +'<td><span class="badge '+(x.status==='unclaimed'?'bo':'bg')+'">'+x.status+'</span></td>'
    +'<td style="white-space:nowrap;">'+(x.status==='unclaimed'&&CR!=='gm'?'<button class="btn btn-outline btn-xs" onclick="claimLF(\''+x.id+'\')">Claimed</button> ':'')+( canDel?'<button class="btn btn-danger btn-xs" onclick="askDel(\'lost_found\',\''+x.id+'\',\''+x.item_description.substring(0,30)+'\')">Del</button>':'')+'</td></tr>';
  }).join('');
}
async function saveLF(){
  var item=g('lfi'),loc=g('lfl'),handler=g('lfh'),guest=g('lfg'),room=g('lfr');
  if(!item||!handler){toast('Fill all required fields','error');return;}
  var r=await db.from('lost_found').insert([{item_description:item,found_location:loc||null,logged_by:handler,guest_name:guest||null,room_number:room||null,status:'unclaimed',photo_url:photoLF||null}]);
  if(r.error){toast('Error: '+r.error.message,'error');return;}
  closeM('m-lf');toast('Item logged 🔍');clr(['lfi','lfl','lfh','lfg','lfr']);document.getElementById('lf-photo-prev').style.display='none';photoLF=null;loadLF();loadDash();loadNotifs();
}
async function claimLF(id){
  var r=await db.from('lost_found').update({status:'claimed'}).eq('id',id);
  if(r.error){toast('Error: '+r.error.message,'error');return;}
  toast('Marked as claimed ✅');loadLF();loadDash();loadNotifs();
}

// ── STORE ──
var STORE_OD=21;
function isStoreOD(r){if(r.status!=='in-storage')return false;if(r.expected_out)return new Date()>new Date(r.expected_out+'T23:59:59');return(Date.now()-new Date(r.date_in||r.created_at).getTime())>(STORE_OD*86400000);}
async function loadStore(){
  var r=await db.from('store_items').select('*').order('created_at',{ascending:false});
  allStore=r.data||[];
  renderStore(allStore);renderTodayCOs();renderODStore();
  document.getElementById('stb').textContent=allStore.filter(function(i){return i.status==='in-storage';}).length;
  document.getElementById('store-count').textContent=allStore.length+' item'+(allStore.length!==1?'s':'');
}
function renderStore(rows){
  var tb=document.getElementById('store-tb');
  if(!rows||!rows.length){tb.innerHTML='<tr><td colspan="11"><div class="es"><div class="ei">◫</div><p>No items in store yet</p></div></td></tr>';return;}
  var cb={excellent:'bg',good:'bg',fair:'bo',poor:'br2'};
  tb.innerHTML=rows.map(function(r){
    var od=isStoreOD(r);var canDel=CR==='admin';
    return '<tr class="'+(od?'store-overdue':'')+'">'
    +'<td><div style="display:flex;align-items:center;gap:8px;">'+(r.photo_url?'<img src="'+r.photo_url+'" style="width:34px;height:34px;border-radius:7px;object-fit:cover;border:1px solid var(--border);flex-shrink:0;cursor:pointer;" onclick="openLightbox(\''+r.photo_url+'\',\''+r.item_name+'\')">'  :'<div style="width:34px;height:34px;border-radius:7px;background:var(--sagel);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:15px;">📦</div>')+'<div><div style="font-size:13px;font-weight:600;">'+r.item_name+'</div>'+(od?'<span style="background:var(--redbg);color:var(--red);font-size:9px;font-weight:600;padding:1px 6px;border-radius:4px;border:1px solid var(--redbd);">⚠ Overdue</span>':'')+'</div></div></td>'
    +'<td><span class="tag-code">'+(r.tag_code||'—')+'</span></td>'
    +'<td><span class="badge '+(catBadge[r.category]||'bgr')+'">'+(catLabels[r.category]||r.category)+'</span></td>'
    +'<td style="text-align:center;font-weight:600;">'+r.quantity+'</td>'
    +'<td><span class="badge '+(cb[r.condition]||'bgr')+'">'+(r.condition||'—')+'</span></td>'
    +'<td>'+(r.owner_name||'—')+'</td>'
    +'<td>'+(r.room_number||'—')+'</td>'
    +'<td style="font-size:12px;white-space:nowrap;">'+fd(r.date_in||r.created_at)+'</td>'
    +'<td style="font-size:12px;">'+(r.expected_out?r.expected_out:'—')+'</td>'
    +'<td><span class="badge '+(r.status==='in-storage'?'bg':'bgr')+'">'+r.status+'</span></td>'
    +'<td style="white-space:nowrap;">'+(r.status==='in-storage'&&CR!=='gm'?'<button class="btn btn-gold btn-xs" onclick="openCO(\''+r.id+'\')">Check Out</button> ':'')+( canDel?'<button class="btn btn-danger btn-xs" onclick="askDel(\'store_items\',\''+r.id+'\',\''+r.item_name+'\')">Del</button>':'')+'</td></tr>';
  }).join('');
}
function renderTodayCOs(){
  var today=new Date().toISOString().split('T')[0];
  var rows=allStore.filter(function(r){return r.checked_out_at&&r.checked_out_at.indexOf(today)===0;});
  var el=document.getElementById('today-cos');
  document.getElementById('today-co-count').textContent=rows.length+' item'+(rows.length!==1?'s':'');
  if(!rows.length){el.innerHTML='<div class="es" style="padding:16px;"><div class="ei" style="font-size:20px;">✓</div><p>No checkouts today</p></div>';return;}
  el.innerHTML=rows.map(function(r){return '<div style="display:flex;align-items:center;gap:9px;padding:8px 0;border-bottom:1px solid var(--border);"><span style="font-size:16px;">📦</span><div style="flex:1;"><div style="font-size:12px;font-weight:600;">'+r.item_name+'</div><div style="font-size:11px;color:var(--ink3);">By: '+(r.checked_out_by||'—')+'</div></div><span class="tag-code" style="font-size:10px;">'+(r.tag_code||'—')+'</span></div>';}).join('');
}
function renderODStore(){
  var rows=allStore.filter(function(r){return isStoreOD(r);});
  var el=document.getElementById('overdue-st');
  document.getElementById('overdue-st-count').textContent=rows.length;
  if(!rows.length){el.innerHTML='<div class="es" style="padding:16px;"><div class="ei" style="font-size:20px;">✓</div><p>No overdue items</p></div>';return;}
  el.innerHTML=rows.map(function(r){return '<div style="display:flex;align-items:center;gap:9px;padding:8px 0;border-bottom:1px solid var(--border);"><span style="font-size:16px;">⚠️</span><div style="flex:1;"><div style="font-size:12px;font-weight:600;color:var(--red);">'+r.item_name+'</div><div style="font-size:11px;color:var(--ink3);">'+(r.owner_name||'Hotel')+' · Since '+fd(r.date_in||r.created_at)+'</div></div><span class="tag-code" style="font-size:10px;">'+(r.tag_code||'—')+'</span></div>';}).join('');
}
function filtStore(){
  var cat=document.getElementById('store-cat-f').value,stat=document.getElementById('store-stat-f').value;
  var rows=allStore;
  if(cat!=='all')rows=rows.filter(function(r){return r.category===cat;});
  if(stat==='overdue')rows=rows.filter(function(r){return isStoreOD(r);});
  else if(stat!=='all')rows=rows.filter(function(r){return r.status===stat;});
  renderStore(rows);
}
function searchStore(q){
  if(!q){renderStore(allStore);return;}
  var ql=q.toLowerCase();
  renderStore(allStore.filter(function(r){return (r.item_name||'').toLowerCase().indexOf(ql)>-1||(r.tag_code||'').toLowerCase().indexOf(ql)>-1||(r.owner_name||'').toLowerCase().indexOf(ql)>-1||(r.category||'').toLowerCase().indexOf(ql)>-1;}));
}
async function saveStoreItem(){
  var name=g('st-name'),cat=document.getElementById('st-cat').value,qty=g('st-qty')||'1',cond=document.getElementById('st-cond').value;
  var owner=g('st-owner'),room=g('st-room'),expected=g('st-expected'),desc=g('st-desc'),handler=g('st-handler'),tag=g('st-tag');
  if(!name||!handler){toast('Fill all required fields','error');return;}
  var r=await db.from('store_items').insert([{item_name:name,tag_code:tag?tag.toUpperCase():null,category:cat,quantity:parseInt(qty),condition:cond,owner_name:owner||null,room_number:room||null,expected_out:expected||null,description:desc||null,logged_by:handler,date_in:new Date().toISOString(),status:'in-storage',photo_url:photoStore||null}]);
  if(r.error){toast('Error: '+r.error.message,'error');return;}
  closeM('m-store');toast('Item added to store 📦');clr(['st-name','st-tag','st-qty','st-owner','st-room','st-expected','st-desc','st-handler']);document.getElementById('st-photo-prev').style.display='none';photoStore=null;loadStore();loadDash();
}
function openCO(id){
  var r=allStore.find(function(x){return x.id===id;});if(!r)return;
  document.getElementById('co-id').value=id;
  document.getElementById('co-info').innerHTML='<div style="display:flex;gap:10px;align-items:center;">'+(r.photo_url?'<img src="'+r.photo_url+'" style="width:44px;height:44px;border-radius:8px;object-fit:cover;border:1px solid var(--border);flex-shrink:0;">':'<div style="width:44px;height:44px;border-radius:8px;background:var(--sagel);display:flex;align-items:center;justify-content:center;font-size:20px;">📦</div>')+'<div><div style="font-weight:600;font-size:13px;">'+r.item_name+'</div><div style="font-size:11px;color:var(--ink3);">Tag: <span class="tag-code" style="font-size:10px;">'+(r.tag_code||'—')+'</span> · '+r.quantity+' item(s)</div></div></div>';
  clr(['co-by','co-reason','co-auth']);openM('m-checkout');
}
async function doCheckout(){
  var id=document.getElementById('co-id').value,by=g('co-by'),reason=g('co-reason'),auth=g('co-auth');
  if(!by||!auth){toast('Fill all required fields','error');return;}
  var r=await db.from('store_items').update({status:'checked-out',checked_out_at:new Date().toISOString(),checked_out_by:by,checkout_reason:reason||null,authorised_by:auth}).eq('id',id);
  if(r.error){toast('Error: '+r.error.message,'error');return;}
  closeM('m-checkout');toast('Item checked out ✅');loadStore();loadDash();
}

// ── LUGGAGE ↔ STORE SYNC ──
async function syncLugToStore(r){
  if(r.tag_code){var ex=await db.from('store_items').select('id').eq('tag_code',r.tag_code).maybeSingle();if(ex.data)return;}
  await db.from('store_items').insert([{item_name:'Guest Luggage — '+r.guest_name,tag_code:r.tag_code||null,category:'guest-luggage',quantity:r.number_of_bags,condition:'good',owner_name:r.guest_name,room_number:r.room_number||null,description:r.bag_description||null,logged_by:r.handled_by,date_in:r.time_in,status:'in-storage',photo_url:r.photo_url||null,luggage_ref:r.id}]);
}
async function syncLugCheckout(r){
  if(!r.tag_code)return;
  var si=await db.from('store_items').select('id').eq('tag_code',r.tag_code).eq('status','in-storage').maybeSingle();
  if(!si.data)return;
  await db.from('store_items').update({status:'checked-out',checked_out_at:new Date().toISOString(),checked_out_by:r.guest_name+' (Guest collected)',checkout_reason:'Guest collected luggage',authorised_by:r.handled_by||'Concierge'}).eq('id',si.data.id);
}

// ── HANDOVER ──
async function loadHandovers(){
  var r=await db.from('handovers').select('*').order('created_at',{ascending:false}).limit(50);
  allHandovers=r.data||[];
  renderHandovers(allHandovers);renderLatestHO();checkUnreadHO();
}
async function checkUnreadHO(){
  if(!allHandovers.length)return;
  var h=allHandovers[0];
  var reads=h.read_by||[];
  var hasRead=reads.some(function(r){return r.id===CU.id;})||h.written_by_id===CU.id;
  var badge=document.getElementById('hb'),banner=document.getElementById('unread-ho');
  if(!hasRead){badge.classList.remove('hide');banner.classList.remove('hide');}
  else{badge.classList.add('hide');banner.classList.add('hide');}
}
function renderLatestHO(){
  var el=document.getElementById('latest-ho');
  if(!allHandovers.length){el.innerHTML='<div class="es"><div class="ei">◑</div><p>No handovers yet</p></div>';return;}
  var h=allHandovers[0];
  var reads=h.read_by||[];
  var pc={urgent:'br2',important:'bo',normal:'bg'};
  el.innerHTML='<div style="padding-bottom:12px;border-bottom:1px solid var(--border);margin-bottom:10px;"><div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;"><span class="badge '+(pc[h.priority]||'bg')+'">'+h.priority+'</span><span class="shift-indicator shift-'+h.shift+'" style="font-size:10px;padding:3px 8px;">'+h.shift+'</span><span style="font-size:11px;color:var(--ink3);">'+fd(h.created_at)+'</span></div><div style="font-size:13px;color:var(--ink);line-height:1.6;margin-bottom:6px;">'+h.notes+'</div><div style="font-size:11px;color:var(--ink3);">By: <strong>'+h.written_by+'</strong> → <strong>'+h.incoming_staff+'</strong></div></div><div style="font-size:11px;color:var(--ink3);">'+(reads.length?'👁 Seen by: '+reads.map(function(r){return r.name;}).join(', '):'Not yet read')+'</div>';
}
function renderHandovers(rows){
  var feed=document.getElementById('ho-feed');
  if(!rows||!rows.length){feed.innerHTML='<div class="es" style="padding:32px;"><div class="ei">◑</div><p>No handovers yet</p></div>';return;}
  var pc={urgent:'br2',important:'bo',normal:'bg'};
  var sorted=rows.slice().sort(function(a,b){return (priOrder[a.priority]||2)-(priOrder[b.priority]||2)||(new Date(b.created_at)-new Date(a.created_at));});
  feed.innerHTML=sorted.map(function(h){
    var reads=h.read_by||[];
    var iRead=reads.some(function(r){return r.id===CU.id;})||h.written_by_id===CU.id;
    var bg=h.priority==='urgent'?'background:var(--redbg);':h.priority==='important'?'background:var(--amberbg);':'';
    var canDel=CR==='admin';
    return '<div style="padding:16px 20px;border-bottom:1px solid var(--border);'+bg+'" onclick="readHO(\''+h.id+'\')" style="cursor:pointer;">'
    +'<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;">'
    +'<div style="flex:1;"><div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;"><span class="badge '+(pc[h.priority]||'bg')+'">'+h.priority+'</span><span class="shift-indicator shift-'+h.shift+'" style="font-size:10px;padding:3px 8px;">'+h.shift+'</span><span style="font-size:11px;color:var(--ink3);">'+fd(h.created_at)+'</span>'+(!iRead?'<span style="background:var(--red);color:#fff;font-size:9px;font-weight:700;padding:2px 7px;border-radius:10px;">UNREAD</span>':'')+'</div>'
    +'<div style="font-size:13px;line-height:1.7;color:var(--ink);white-space:pre-wrap;">'+h.notes+'</div>'
    +'<div style="font-size:11px;color:var(--ink3);margin-top:8px;">By: <strong>'+h.written_by+'</strong> → <strong>'+h.incoming_staff+'</strong></div></div>'
    +(canDel?'<button class="btn btn-danger btn-xs" onclick="event.stopPropagation();askDel(\'handovers\',\''+h.id+'\',\'Handover by '+h.written_by+'\')">Del</button>':'')
    +'</div>'
    +'<div style="margin-top:10px;padding-top:8px;border-top:1px solid var(--border);font-size:11px;color:var(--ink3);">'
    +(reads.length?'👁 Seen by: '+reads.map(function(r){return '<strong>'+r.name+'</strong> ('+new Date(r.time).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})+')';}).join(', '):'Not yet read')
    +'</div></div>';
  }).join('');
}
async function readHO(id){
  var ho=allHandovers.find(function(x){return x.id===id;});if(!ho)return;
  var reads=ho.read_by||[];
  if(reads.some(function(r){return r.id===CU.id;})||ho.written_by_id===CU.id)return;
  var newReads=reads.concat([{id:CU.id,name:CU.full_name,role:CR,time:new Date().toISOString()}]);
  await db.from('handovers').update({read_by:newReads}).eq('id',id);
  ho.read_by=newReads;renderHandovers(allHandovers);renderLatestHO();checkUnreadHO();
}
function filtHandovers(v){
  if(v==='all')renderHandovers(allHandovers);
  else if(v==='urgent')renderHandovers(allHandovers.filter(function(h){return h.priority==='urgent';}));
  else renderHandovers(allHandovers.filter(function(h){return h.shift===v;}));
}
async function saveHandover(){
  var incoming=g('ho-incoming'),notes=g('ho-notes'),priority=document.getElementById('ho-priority').value;
  if(!incoming||!notes){toast('Please fill all fields','error');return;}
  var shift=getCurrentShift();
  var r=await db.from('handovers').insert([{written_by:CU.full_name,written_by_id:CU.id,incoming_staff:incoming,shift:shift.name,shift_label:shift.label,next_shift:shift.next,priority:priority,notes:notes,read_by:[],created_at:new Date().toISOString()}]);
  if(r.error){toast('Error: '+r.error.message,'error');return;}
  clr(['ho-incoming','ho-notes']);document.getElementById('ho-priority').value='normal';
  toast('Handover posted ◑');loadHandovers();loadDash();
}

// ── REPORT ──
async function genReport(){
  var date=document.getElementById('report-date').value;
  var type=document.getElementById('report-type').value;
  var preparer=document.getElementById('report-by').value.trim();
  if(!date){toast('Please select a date','error');return;}
  if(!preparer){toast('Please enter who prepared this report','error');return;}
  var out=document.getElementById('report-output');
  out.innerHTML='<div class="ld"><span class="sp"></span>Generating report...</div>';
  var tFrom=date+'T00:00:00',tTo=date+'T23:59:59';
  if(type==='morning'){tFrom=date+'T06:00:00';tTo=date+'T13:59:59';}
  else if(type==='afternoon'){tFrom=date+'T14:00:00';tTo=date+'T21:59:59';}
  else if(type==='night'){tFrom=date+'T22:00:00';tTo=date+'T23:59:59';}
  var lug=await db.from('luggage').select('*').gte('time_in',tFrom).lte('time_in',tTo).order('time_in',{ascending:true});
  var comp=await db.from('complaints').select('*').gte('created_at',tFrom).lte('created_at',tTo).order('created_at',{ascending:true});
  var wup=await db.from('wakeup_calls').select('*').eq('date',date).order('wakeup_time',{ascending:true});
  var lf=await db.from('lost_found').select('*').gte('created_at',tFrom).lte('created_at',tTo).order('created_at',{ascending:true});
  var shifts=await db.from('shifts').select('*').eq('date',date);
  var storeOut=await db.from('store_items').select('*').eq('status','checked-out').gte('checked_out_at',tFrom).lte('checked_out_at',tTo);
  var odLugRes=await db.from('luggage').select('*').eq('status','stored');
  var hoRes=await db.from('handovers').select('*').gte('created_at',date+'T00:00:00').lte('created_at',date+'T23:59:59').order('created_at',{ascending:true});
  var odLug=(odLugRes.data||[]).filter(function(r){return(Date.now()-new Date(r.time_in).getTime())>(OVERDUE_WEEKS*7*86400000);});
  var lD=lug.data||[],cD=comp.data||[],wD=wup.data||[],lfD=lf.data||[],stD=storeOut.data||[],hoD=hoRes.data||[];
  var shiftData=shifts.data||[];
  var urgComp=cD.filter(function(c){return c.priority==='urgent';});
  var fdate=new Date(date+'T12:00:00').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  var now2=new Date().toLocaleString('en-GB',{day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'});
  var typeLabel=type==='full'?'Full Day':type==='morning'?'Morning Shift':type==='afternoon'?'Afternoon Shift':'Night Shift';
  var pc={urgent:'br2',important:'bo',normal:'bg'};
  function tbl(heads,rows){return '<div class="tw"><table><thead><tr>'+heads.map(function(h){return '<th>'+h+'</th>';}).join('')+'</tr></thead><tbody>'+rows+'</tbody></table></div>';}
  out.innerHTML='<div><div class="panel" style="margin-bottom:16px;"><div style="background:linear-gradient(135deg,#0f2a08,#2d5a1b);padding:22px 28px;"><div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:12px;"><div><div style="font-family:\'Cormorant Garamond\',serif;font-size:24px;font-weight:600;color:#fff;">Safari Park Hotel</div><div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.6);margin-top:3px;">Concierge Operations — '+typeLabel+' Report</div></div><div style="text-align:right;"><div style="font-family:\'Cormorant Garamond\',serif;font-size:17px;color:#fff;font-weight:600;">'+fdate+'</div><div style="font-size:11px;color:rgba(255,255,255,.6);margin-top:3px;">Generated: '+now2+'</div><div style="font-size:11px;color:rgba(255,255,255,.6);">By: <strong style="color:rgba(255,255,255,.9);">'+preparer+'</strong></div></div></div></div>'
  +'<div style="display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid var(--border);">'
  +'<div style="padding:14px 18px;border-right:1px solid var(--border);text-align:center;"><div style="font-family:\'Cormorant Garamond\',serif;font-size:30px;font-weight:600;color:var(--green);">'+lD.length+'</div><div style="font-size:10px;color:var(--ink3);font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Bags Logged</div></div>'
  +'<div style="padding:14px 18px;border-right:1px solid var(--border);text-align:center;"><div style="font-family:\'Cormorant Garamond\',serif;font-size:30px;font-weight:600;color:'+(urgComp.length>0?'var(--red)':'var(--green)')+';">'+cD.length+'</div><div style="font-size:10px;color:var(--ink3);font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Complaints</div></div>'
  +'<div style="padding:14px 18px;border-right:1px solid var(--border);text-align:center;"><div style="font-family:\'Cormorant Garamond\',serif;font-size:30px;font-weight:600;color:var(--amber);">'+wD.length+'</div><div style="font-size:10px;color:var(--ink3);font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Wake-up Calls</div></div>'
  +'<div style="padding:14px 18px;text-align:center;"><div style="font-family:\'Cormorant Garamond\',serif;font-size:30px;font-weight:600;color:var(--blue);">'+lfD.length+'</div><div style="font-size:10px;color:var(--ink3);font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Lost & Found</div></div>'
  +'</div>'
  +(urgComp.length?'<div style="padding:10px 20px;background:var(--redbg);border-bottom:1px solid var(--redbd);"><span style="font-size:11px;font-weight:700;color:var(--red);">⚠ '+urgComp.length+' urgent complaint'+(urgComp.length>1?'s':'')+' require attention</span></div>':'')
  +'<div style="padding:12px 20px;display:flex;gap:10px;background:var(--sagel);" class="no-print"><button class="btn btn-outline btn-sm" onclick="window.print()">🖨 Print</button><button class="btn btn-gold btn-sm" onclick="emailRep(\''+date+'\',\''+preparer+'\',\''+typeLabel+'\')">✉ Email to GM</button></div></div>'
  +(shiftData.length?'<div class="panel" style="margin-bottom:16px;"><div class="ph"><h3>Staff on Duty</h3><span class="badge bg">'+shiftData.length+'</span></div><div style="padding:0;">'+shiftData.map(function(s){return '<div style="display:flex;align-items:center;gap:12px;padding:12px 20px;border-bottom:1px solid var(--border);"><div style="width:32px;height:32px;border-radius:8px;background:var(--sage);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;color:var(--ink2);">'+s.staff_name.charAt(0)+'</div><div style="flex:1;"><div style="font-size:13px;font-weight:600;">'+s.staff_name+'</div>'+(s.notes?'<div style="font-size:11px;color:var(--ink3);">'+s.notes+'</div>':'')+'</div><span class="shift-indicator shift-'+s.shift+'">'+s.shift+'</span></div>';}).join('')+'</div></div>':'')
  +(hoD.length?'<div class="panel" style="margin-bottom:16px;"><div class="ph"><h3>Shift Handovers</h3><span class="badge bg">'+hoD.length+'</span></div><div style="padding:0;">'+hoD.map(function(h){return '<div style="padding:12px 20px;border-bottom:1px solid var(--border);'+(h.priority==='urgent'?'background:var(--redbg);':h.priority==='important'?'background:var(--amberbg);':'')+'"><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><span class="badge '+(pc[h.priority]||'bg')+'">'+h.priority+'</span><span class="shift-indicator shift-'+h.shift+'" style="font-size:10px;padding:3px 8px;">'+h.shift+'</span><span style="font-size:11px;color:var(--ink3);">'+fd(h.created_at)+'</span></div><div style="font-size:13px;line-height:1.6;white-space:pre-wrap;">'+h.notes+'</div><div style="font-size:11px;color:var(--ink3);margin-top:6px;">By: <strong>'+h.written_by+'</strong> → <strong>'+h.incoming_staff+'</strong></div></div>';}).join('')+'</div></div>':'')
  +'<div class="panel" style="margin-bottom:16px;"><div class="ph"><h3>Luggage Logged</h3><span class="badge '+(lD.length?'bg':'bgr')+'">'+lD.length+'</span></div>'+(lD.length?tbl(['Tag','Guest','Room','Bags','Time In','Staff','Status'],lD.map(function(r){return '<tr><td><span class="tag-code">'+(r.tag_code||'—')+'</span></td><td><strong>'+r.guest_name+'</strong></td><td>'+(r.room_number||'—')+'</td><td>'+r.number_of_bags+'</td><td style="font-size:12px;white-space:nowrap;">'+fd(r.time_in)+'</td><td>'+r.handled_by+'</td><td><span class="badge '+(r.status==='stored'?'bg':'bgr')+'">'+r.status+'</span></td></tr>';}).join('')):'<div class="pb"><p style="font-size:13px;color:var(--ink3);">No luggage logged this period.</p></div>')+'</div>'
  +'<div class="panel" style="margin-bottom:16px;"><div class="ph"><h3>Store Checkouts</h3><span class="badge '+(stD.length?'bo':'bgr')+'">'+stD.length+'</span></div>'+(stD.length?tbl(['Item','Tag','Qty','Checked Out By','Reason','Time'],stD.map(function(r){return '<tr><td><strong>'+r.item_name+'</strong></td><td><span class="tag-code">'+(r.tag_code||'—')+'</span></td><td>'+r.quantity+'</td><td>'+(r.checked_out_by||'—')+'</td><td style="font-size:12px;">'+(r.checkout_reason||'—')+'</td><td style="font-size:12px;white-space:nowrap;">'+fd(r.checked_out_at)+'</td></tr>';}).join('')):'<div class="pb"><p style="font-size:13px;color:var(--ink3);">No store checkouts this period.</p></div>')+'</div>'
  +'<div class="panel" style="margin-bottom:16px;"><div class="ph"><h3>Complaints</h3><span class="badge '+(cD.length?'bo':'bgr')+'">'+cD.length+'</span></div>'+(cD.length?tbl(['Guest','Room','Complaint','Priority','Status','Resolution'],cD.map(function(r){return '<tr '+(r.priority==='urgent'?'style="background:var(--redbg);"':'')+'><td><strong>'+r.guest_name+'</strong></td><td>'+(r.room_number||'—')+'</td><td>'+r.complaint+'</td><td><span class="badge '+(priMap[r.priority]||'bg')+'">'+r.priority+'</span></td><td><span class="badge '+(r.status==='open'?'br2':'bg')+'">'+r.status+'</span></td><td style="font-size:11px;">'+(r.resolution_notes||'—')+'</td></tr>';}).join('')):'<div class="pb"><p style="font-size:13px;color:var(--ink3);">No complaints this period.</p></div>')+'</div>'
  +'<div class="panel" style="margin-bottom:16px;"><div class="ph"><h3>Wake-up Calls</h3><span class="badge '+(wD.length?'bo':'bgr')+'">'+wD.length+'</span></div>'+(wD.length?tbl(['Guest','Room','Time','Status'],wD.map(function(r){return '<tr><td><strong>'+r.guest_name+'</strong></td><td>'+r.room_number+'</td><td><strong>'+r.wakeup_time+'</strong></td><td><span class="badge '+(r.status==='done'?'bg':'bo')+'">'+r.status+'</span></td></tr>';}).join('')):'<div class="pb"><p style="font-size:13px;color:var(--ink3);">No wake-up calls this period.</p></div>')+'</div>'
  +(odLug.length?'<div class="panel" style="margin-bottom:16px;"><div class="ph" style="background:var(--redbg);"><h3 style="color:var(--red);">⚠ Overdue Luggage</h3><span class="badge br2">'+odLug.length+'</span></div><div style="padding:0;">'+odLug.map(function(r){return '<div style="display:flex;align-items:center;gap:12px;padding:12px 20px;border-bottom:1px solid var(--redbd);background:var(--redbg);"><span style="font-size:18px;">🧳</span><div style="flex:1;"><div style="font-size:13px;font-weight:600;color:var(--red);">'+r.guest_name+'</div><div style="font-size:11px;color:var(--ink3);">Tag: <span class="tag-code" style="font-size:10px;">'+(r.tag_code||'—')+'</span> · '+(r.room_number||'Day visitor')+' · In since '+fd(r.time_in)+'</div></div></div>';}).join('')+'</div></div>':'')
  +'<div class="panel"><div class="pb"><div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;"><div><div style="font-size:10px;color:var(--ink3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Prepared By</div><div style="font-size:14px;font-weight:600;">'+preparer+'</div><div style="margin-top:44px;border-top:1px solid var(--ink);width:160px;padding-top:4px;font-size:10px;color:var(--ink3);">Signature & Date</div></div><div style="text-align:right;"><div style="font-size:10px;color:var(--ink3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Acknowledged By</div><div style="font-size:14px;font-weight:600;color:var(--ink3);">HOD / General Manager</div><div style="margin-top:44px;border-top:1px solid var(--ink);width:160px;padding-top:4px;font-size:10px;color:var(--ink3);margin-left:auto;">Signature & Date</div></div></div><div style="margin-top:18px;padding-top:12px;border-top:1px solid var(--border);font-size:10px;color:var(--ink3);text-align:center;">Safari Park Hotel · Concierge Operations System · '+now2+'</div></div></div></div>';
}
function emailRep(date,preparer,type){
  var sub=encodeURIComponent('Safari Park Hotel — Concierge '+type+' Report — '+date);
  var body=encodeURIComponent('Dear GM,\n\nPlease find the Concierge '+type+' Report for '+date+'.\n\nPrepared by: '+preparer+'\n\nKindly acknowledge receipt.\n\nRegards,\n'+preparer+'\nSafari Park Hotel');
  window.open('mailto:?subject='+sub+'&body='+body);
}

// ── USERS ──
async function loadUsers(){
  var r=await db.from('users').select('*').order('created_at',{ascending:true});
  var list=document.getElementById('users-list');
  if(!r.data||!r.data.length){list.innerHTML='<div class="es"><div class="ei">◫</div><p>No users yet</p></div>';return;}
  var rc={concierge:'bg',hod:'bo',gm:'bb',admin:'bp',gr:'bp'};
var roleLabel={concierge:'Concierge',hod:'HOD',gm:'General Manager',admin:'Administrator',gr:'Guest Relations'};
  list.innerHTML=r.data.map(function(u){return '<div class="uc"><div style="width:38px;height:38px;border-radius:10px;background:var(--sage);border:1px solid var(--sageborder);display:flex;align-items:center;justify-content:center;font-weight:600;font-size:14px;color:var(--ink2);flex-shrink:0;">'+u.full_name.charAt(0)+'</div><div style="flex:1;"><div style="font-size:13px;font-weight:600;">'+u.full_name+'</div><div style="font-size:11px;color:var(--ink3);">'+u.email+'</div></div><span class="badge '+(rc[u.role]||'bgr')+'">'+u.role+'</span>'+(u.id!==CU.id?'<button class="btn btn-danger btn-sm" onclick="delUser(\''+u.id+'\',\''+u.full_name+'\')">Remove</button>':'<span style="font-size:11px;color:var(--ink3);">You</span>')+'</div>';}).join('');
}
async function addUser(){
  var n=g('aun'),e=g('aue'),p=g('aup'),role=document.getElementById('aur').value;
  var err=document.getElementById('auerr'),suc=document.getElementById('ausuc');
  err.textContent='';suc.textContent='';
  if(!n||!e||!p){err.textContent='Please fill all fields.';return;}
  if(p.length<6){err.textContent='Password must be at least 6 characters.';return;}
  document.getElementById('aubtn').textContent='Creating...';
  var session=await db.auth.getSession();
  var r=await db.auth.signUp({email:e,password:p});
  if(r.error){err.textContent=r.error.message;document.getElementById('aubtn').textContent='Create Account';return;}
  var uid=r.data&&r.data.user?r.data.user.id:null;
  if(!uid){err.textContent='Could not create account. Try again.';document.getElementById('aubtn').textContent='Create Account';return;}
  var r2=await db.from('users').insert([{id:uid,email:e,full_name:n,role:role}]);
  if(r2.error){err.textContent=r2.error.message;document.getElementById('aubtn').textContent='Create Account';return;}
  if(session&&session.data&&session.data.session){
    await db.auth.setSession({access_token:session.data.session.access_token,refresh_token:session.data.session.refresh_token});
  }
  suc.textContent='✅ '+n+' added successfully!';
  document.getElementById('aubtn').textContent='Create Account';
  clr(['aun','aue','aup']);loadUsers();
}
async function delUser(id,name){
  if(!confirm('Remove '+name+' from the system?'))return;
  var r=await db.from('users').delete().eq('id',id);
  if(r.error){toast('Error: '+r.error.message,'error');return;}
  toast('User removed');loadUsers();
}

// ── DELETE ──
function askDel(table,id,desc){
  document.getElementById('del-table').value=table;
  document.getElementById('del-id').value=id;
  document.getElementById('del-desc').textContent=desc;
  openM('m-del');
}
async function doDelete(){
  var table=document.getElementById('del-table').value,id=document.getElementById('del-id').value;
  var r=await db.from(table).delete().eq('id',id);
  if(r.error){toast('Error: '+r.error.message,'error');return;}
  closeM('m-del');toast('Record deleted permanently');
  if(table==='luggage'){loadLug();loadStore();loadDash();}
  else if(table==='complaints'){loadComp();loadDash();}
  else if(table==='wakeup_calls'){loadWup();loadDash();}
  else if(table==='lost_found'){loadLF();loadDash();}
  else if(table==='store_items'){loadStore();loadDash();}
  else if(table==='handovers'){loadHandovers();loadDash();}
  else if(table==='timetables'){loadTimetable();}
  else if(table==='newspaper_deliveries'){loadNpDay();}
  loadNotifs();
}

// ── PHOTO ──
function previewPhoto(input,prevId,type){
  var file=input.files[0];if(!file)return;
  var img=new Image();
  var url=URL.createObjectURL(file);
  img.onload=function(){
    var canvas=document.createElement('canvas');
    var w=img.width,h=img.height,MAX=800;
    if(w>MAX||h>MAX){if(w>h){h=Math.round(h*MAX/w);w=MAX;}else{w=Math.round(w*MAX/h);h=MAX;}}
    canvas.width=w;canvas.height=h;
    canvas.getContext('2d').drawImage(img,0,0,w,h);
    var compressed=canvas.toDataURL('image/jpeg',0.7);
    var prev=document.getElementById(prevId);
    prev.src=compressed;prev.style.display='block';
    if(type==='lug')photoLug=compressed;
    else if(type==='lf')photoLF=compressed;
    else if(type==='store')photoStore=compressed;
    URL.revokeObjectURL(url);
    toast('Photo added ✅');
  };
  img.src=url;
}

// ── CHART.JS ──
var chartJS=document.createElement('script');
chartJS.src='https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
document.head.appendChild(chartJS);
var chartInstances={};

// ── ANALYTICS ──
async function loadAnalytics(){
  var days=parseInt(document.getElementById('an-period').value)||30;
  var from=new Date();from.setDate(from.getDate()-days);
  var fromStr=from.toISOString();
  var lug=await db.from('luggage').select('*').gte('created_at',fromStr);
  var comp=await db.from('complaints').select('*').gte('created_at',fromStr);
  var wup=await db.from('wakeup_calls').select('*').gte('created_at',fromStr);
  var lf=await db.from('lost_found').select('*').gte('created_at',fromStr);
  var lD=lug.data||[],cD=comp.data||[],wD=wup.data||[],lfD=lf.data||[];
  document.getElementById('an-lug').textContent=lD.length;
  document.getElementById('an-comp').textContent=cD.length;
  document.getElementById('an-wup').textContent=wD.length;
  document.getElementById('an-lf').textContent=lfD.length;
  if(typeof Chart==='undefined'){setTimeout(function(){loadAnalytics();},500);return;}
  var urgCount=cD.filter(function(c){return c.priority==='urgent';}).length;
  var medCount=cD.filter(function(c){return c.priority==='medium';}).length;
  var lowCount=cD.filter(function(c){return c.priority==='low';}).length;
  drawChart('chart-complaints','doughnut',['Urgent','Medium','Low'],[urgCount,medCount,lowCount],['#c0392b','#c9922a','#2d5a1b'],'Complaints by Priority');
  var lugByDay={};
  lD.forEach(function(r){var d=r.time_in?r.time_in.split('T')[0]:r.created_at.split('T')[0];lugByDay[d]=(lugByDay[d]||0)+1;});
  var lugDates=Object.keys(lugByDay).sort().slice(-14);
  var lugCounts=lugDates.map(function(d){return lugByDay[d]||0;});
  drawChart('chart-luggage','line',lugDates.map(function(d){return new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short'});}),lugCounts,['#2d5a1b'],'Bags per Day');
  var days2=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var dayCounts=[0,0,0,0,0,0,0];
  lD.forEach(function(r){var d=new Date(r.time_in||r.created_at).getDay();dayCounts[d]++;});
  cD.forEach(function(r){var d=new Date(r.created_at).getDay();dayCounts[d]++;});
  drawChart('chart-days','bar',days2,dayCounts,['#4a8a2a'],'Activity by Day of Week');
  drawChart('chart-overview','bar',['Luggage','Complaints','Wake-up','Lost & Found'],[lD.length,cD.length,wD.length,lfD.length],['#2d5a1b','#c0392b','#c9922a','#1a5fa8'],'Operations Overview');
  var words={};
  cD.forEach(function(r){
    var text=(r.complaint||'').toLowerCase();
    var keywords=['noise','water','ac','air','wifi','food','dirty','slow','broken','smell','cold','hot','tv','bathroom','room'];
    keywords.forEach(function(k){if(text.indexOf(k)>-1)words[k]=(words[k]||0)+1;});
  });
  var sorted=Object.entries(words).sort(function(a,b){return b[1]-a[1];}).slice(0,8);
  var el=document.getElementById('an-top-complaints');
  if(!sorted.length){el.innerHTML='<div class="es"><div class="ei">💬</div><p>Not enough complaint data yet</p></div>';return;}
  var maxVal=sorted[0][1];
  el.innerHTML=sorted.map(function(item){
    var pct=Math.round((item[1]/maxVal)*100);
    return '<div style="margin-bottom:14px;"><div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:13px;"><span style="font-weight:600;text-transform:capitalize;">'+item[0]+'</span><span style="color:var(--ink3);">'+item[1]+' time'+(item[1]>1?'s':'')+'</span></div><div style="background:var(--offwhite);border-radius:4px;height:8px;overflow:hidden;"><div style="background:var(--green);height:100%;border-radius:4px;width:'+pct+'%;transition:width .6s ease;"></div></div></div>';
  }).join('');
}
function drawChart(id,type,labels,data,colors,label){
  if(chartInstances[id]){chartInstances[id].destroy();}
  var ctx=document.getElementById(id);
  if(!ctx)return;
  var datasets=type==='doughnut'?
    [{data:data,backgroundColor:colors,borderWidth:2,borderColor:'#fff'}]:
    type==='line'?
    [{label:label,data:data,borderColor:colors[0],backgroundColor:colors[0]+'22',tension:.4,fill:true,pointRadius:3}]:
    [{label:label,data:data,backgroundColor:colors.length>1?colors:colors[0]+'cc',borderRadius:6}];
  chartInstances[id]=new Chart(ctx,{
    type:type,
    data:{labels:labels,datasets:datasets},
    options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:type==='doughnut',position:'bottom',labels:{font:{size:11},padding:12}}},
      scales:type!=='doughnut'?{y:{beginAtZero:true,grid:{color:'rgba(0,0,0,.06)'},ticks:{font:{size:11}}},x:{grid:{display:false},ticks:{font:{size:11}}}}:{}
    }
  });
}

// ── TIMETABLE ──
var timetablePhoto=null;
var allTimetables=[];
function previewTimetable(input){
  var file=input.files[0];if(!file)return;
  var img=new Image();
  var url=URL.createObjectURL(file);
  img.onload=function(){
    var canvas=document.createElement('canvas');
    var w=img.width,h=img.height,MAX=1200;
    if(w>MAX||h>MAX){if(w>h){h=Math.round(h*MAX/w);w=MAX;}else{w=Math.round(w*MAX/h);h=MAX;}}
    canvas.width=w;canvas.height=h;
    canvas.getContext('2d').drawImage(img,0,0,w,h);
    timetablePhoto=canvas.toDataURL('image/jpeg',0.85);
    var prev=document.getElementById('tt-photo-prev');
    prev.src=timetablePhoto;prev.style.display='block';
    URL.revokeObjectURL(url);
    toast('Timetable photo ready ✅');
  };
  img.src=url;
}
async function saveTimetable(){
  var month=g('tt-month'),notes=g('tt-notes');
  if(!month){toast('Please select a month','error');return;}
  if(!timetablePhoto){toast('Please upload a photo of the timetable','error');return;}
  var r=await db.from('timetables').insert([{month:month,notes:notes||null,photo_url:timetablePhoto,uploaded_by:CU.full_name,role:CR}]);
  if(r.error){toast('Error: '+r.error.message,'error');return;}
  toast('Timetable uploaded ✅');
  clr(['tt-month','tt-notes']);
  document.getElementById('tt-photo-prev').style.display='none';
  timetablePhoto=null;
  loadTimetable();
}
async function loadTimetable(){
  var r=await db.from('timetables').select('*').order('created_at',{ascending:false}).limit(10);
  allTimetables=r.data||[];
  var data=allTimetables;
  var ttDisplay=document.getElementById('tt-display');
  var ttHistory=document.getElementById('tt-history');
  var ttMonthLabel=document.getElementById('tt-month-label');
  var ttDashPreview=document.getElementById('tt-dash-preview');
  var ttDashImg=document.getElementById('tt-dash-img');
  var uploadPanel=document.getElementById('timetable-upload-panel');
  if(uploadPanel){uploadPanel.style.display=(CR==='admin'||CR==='hod')?'block':'none';}
  if(!data.length){
    if(ttDisplay)ttDisplay.innerHTML='<div class="es"><div class="ei">📅</div><p>No timetable uploaded yet</p></div>';
    if(ttHistory)ttHistory.innerHTML='<div class="es"><div class="ei">📅</div><p>No previous timetables</p></div>';
    if(ttDashPreview)ttDashPreview.style.display='none';
    return;
  }
  var current=data[0];
  var monthLabel=current.month?new Date(current.month+'-01').toLocaleDateString('en-GB',{month:'long',year:'numeric'}):'—';
  if(ttMonthLabel)ttMonthLabel.textContent=monthLabel;
  if(ttDisplay){
    var html='<div style="margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">';
    html+='<div><div style="font-size:13px;font-weight:600;">'+monthLabel+'</div>';
    html+='<div style="font-size:11px;color:var(--ink3);">Uploaded by '+current.uploaded_by+' · '+fd(current.created_at)+'</div>';
    if(current.notes)html+='<div style="font-size:12px;color:var(--ink3);margin-top:2px;">'+current.notes+'</div>';
    html+='</div>';
    html+='<button class="btn btn-outline btn-sm" onclick="openLightbox(allTimetables[0].photo_url,\'Timetable\')">View Full Size ↗</button>';
    html+='</div>';
    html+='<img src="'+current.photo_url+'" style="width:100%;border-radius:var(--r);border:1px solid var(--border);cursor:zoom-in;" onclick="openLightbox(allTimetables[0].photo_url,\'Timetable\')">';
    ttDisplay.innerHTML=html;
  }
  if(ttDashPreview&&ttDashImg){ttDashPreview.style.display='block';ttDashImg.src=current.photo_url;}
  if(ttHistory){
    var history=data.slice(1);
    if(!history.length){ttHistory.innerHTML='<div style="font-size:13px;color:var(--ink3);">No previous timetables</div>';return;}
    ttHistory.innerHTML=history.map(function(t,idx){
      var tidx=idx+1;
      var ml=t.month?new Date(t.month+'-01').toLocaleDateString('en-GB',{month:'long',year:'numeric'}):'—';
      var html2='<div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border);">';
      html2+='<img src="'+t.photo_url+'" style="width:60px;height:60px;object-fit:cover;border-radius:8px;border:1px solid var(--border);cursor:pointer;flex-shrink:0;" onclick="openLightbox(allTimetables['+tidx+'].photo_url,\'Previous Timetable\')">';
      html2+='<div style="flex:1;"><div style="font-size:13px;font-weight:600;">'+ml+'</div>';
      html2+='<div style="font-size:11px;color:var(--ink3);">'+t.uploaded_by+' · '+fd(t.created_at)+'</div>';
      if(t.notes)html2+='<div style="font-size:11px;color:var(--ink3);">'+t.notes+'</div>';
      html2+='</div>';
      html2+='<button class="btn btn-outline btn-xs" onclick="openLightbox(allTimetables['+tidx+'].photo_url,\'Previous Timetable\')">View ↗</button>';
      if(CR==='admin'){html2+='<button class="btn btn-danger btn-xs" data-id="'+t.id+'" onclick="delTimetable(this.dataset.id)">Del</button>';}
      html2+='</div>';
      return html2;
    }).join('');
  }
}

// ── NEWSPAPER DISTRIBUTION ──
function initNpDate(){
  var today=new Date().toISOString().split('T')[0];
  document.getElementById('np-date').value=today;
  var now=new Date();
  document.getElementById('np-month').value=now.getFullYear()+'-'+(now.getMonth()+1<10?'0':'')+(now.getMonth()+1);
}
function resetNpDate(){
  document.getElementById('np-date').value=new Date().toISOString().split('T')[0];
  loadNpDay();
}
async function loadNpDay(){
  var date=document.getElementById('np-date').value;
  if(!date)return;
  var label=new Date(date+'T12:00:00').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  document.getElementById('np-date-label').textContent=label;
  var r=await db.from('newspaper_deliveries').select('*').eq('date',date).maybeSingle();
  npCurrentData=r.data?r.data.deliveries:{};
  renderNpChecklist();
}
function renderNpChecklist(){
  var html='<div style="padding:10px 16px 6px;display:flex;gap:16px;background:var(--sagel);border-bottom:1px solid var(--border);">';
  html+='<div style="font-size:10px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.8px;min-width:180px;">Recipient</div>';
  ALL_PAPERS.forEach(function(p){
    html+='<div style="font-size:10px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.8px;min-width:90px;">'+p+'</div>';
  });
  html+='</div>';
  NP_RECIPIENTS.forEach(function(rec){
    html+='<div class="np-check-row">';
    html+='<div class="np-name">'+rec.name+'</div>';
    html+='<div class="np-papers">';
    ALL_PAPERS.forEach(function(paper){
      var allowed=rec.papers.indexOf(paper)>-1;
      var key=rec.id+'_'+paper.replace(/ /g,'_');
      var checked=npCurrentData[key]===true;
      if(allowed){
        html+='<label class="np-cb'+(checked?' checked':'')+'" id="lbl-'+key+'">';
        html+='<input type="checkbox" id="cb-'+key+'" '+(checked?'checked':'')+' onchange="npToggle('+rec.id+',\''+paper+'\',this.checked)">';
        html+=paper;
        html+='</label>';
      } else {
        html+='<div class="np-cb na">'+paper+'</div>';
      }
    });
    html+='</div>';
    html+='</div>';
  });
  document.getElementById('np-checklist').innerHTML=html;
}
function npToggle(recipientId,paper,checked){
  var key=recipientId+'_'+paper.replace(/ /g,'_');
  npCurrentData[key]=checked;
  var lbl=document.getElementById('lbl-'+key);
  if(lbl){if(checked)lbl.classList.add('checked');else lbl.classList.remove('checked');}
}
async function saveNpDay(){
  var date=document.getElementById('np-date').value;
  if(!date){toast('No date selected','error');return;}
  var r=await db.from('newspaper_deliveries').select('id').eq('date',date).maybeSingle();
  var payload={date:date,deliveries:npCurrentData,saved_by:CU.full_name,updated_at:new Date().toISOString()};
  var res;
  if(r.data){
    res=await db.from('newspaper_deliveries').update(payload).eq('id',r.data.id);
  } else {
    res=await db.from('newspaper_deliveries').insert([payload]);
  }
  if(res.error){toast('Error saving: '+res.error.message,'error');return;}
  toast('Checklist saved ✅');
}
async function genNpReport(){
  var month=document.getElementById('np-month').value;
  if(!month){toast('Please select a month','error');return;}
  var from=month+'-01';
  var toDate=new Date(month+'-01');
  toDate.setMonth(toDate.getMonth()+1);
  toDate.setDate(0);
  var to=month+'-'+('0'+toDate.getDate()).slice(-2);
  var r=await db.from('newspaper_deliveries').select('*').gte('date',from).lte('date',to).order('date',{ascending:true});
  var rows=r.data||[];
  var monthLabel=new Date(month+'-01').toLocaleDateString('en-GB',{month:'long',year:'numeric'});
  var out=document.getElementById('np-report-out');
  if(!rows.length){out.innerHTML='<div class="es"><div class="ei">📰</div><p>No data for '+monthLabel+'</p></div>';return;}

  // Build totals: per recipient per paper
  var totals={};
  NP_RECIPIENTS.forEach(function(rec){
    totals[rec.id]={};
    ALL_PAPERS.forEach(function(paper){totals[rec.id][paper]=0;});
  });
  rows.forEach(function(row){
    var d=row.deliveries||{};
    NP_RECIPIENTS.forEach(function(rec){
      ALL_PAPERS.forEach(function(paper){
        var key=rec.id+'_'+paper.replace(/ /g,'_');
        if(d[key]===true)totals[rec.id][paper]++;
      });
    });
  });

  var now2=new Date().toLocaleString('en-GB',{day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'});
  var html='<div style="background:linear-gradient(135deg,#0f2a08,#2d5a1b);padding:18px 22px;margin-bottom:0;">'
  +'<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;">'
  +'<div><div style="font-family:\'Cormorant Garamond\',serif;font-size:20px;font-weight:600;color:#fff;">Newspaper Distribution Report</div>'
  +'<div style="font-size:11px;color:rgba(255,255,255,.6);letter-spacing:1px;text-transform:uppercase;margin-top:3px;">Safari Park Hotel · '+monthLabel+'</div></div>'
  +'<div style="font-size:11px;color:rgba(255,255,255,.5);text-align:right;">Generated: '+now2+'<br>'+rows.length+' day'+(rows.length!==1?'s':'')+' recorded</div>'
  +'</div></div>';

  html+='<div class="tw"><table><thead><tr><th style="min-width:160px;">Recipient</th>';
  ALL_PAPERS.forEach(function(p){html+='<th style="text-align:center;">'+p+'</th>';});
  html+='<th style="text-align:center;">Total</th></tr></thead><tbody>';

  NP_RECIPIENTS.forEach(function(rec){
    var rowTotal=0;
    html+='<tr><td><strong>'+rec.name+'</strong></td>';
    ALL_PAPERS.forEach(function(paper){
      var allowed=rec.papers.indexOf(paper)>-1;
      var count=totals[rec.id][paper];
      rowTotal+=count;
      if(allowed){
        html+='<td style="text-align:center;"><strong style="color:'+(count>0?'var(--green)':'var(--ink3)')+';">'+count+'</strong></td>';
      } else {
        html+='<td style="text-align:center;color:var(--border);">—</td>';
      }
    });
    html+='<td style="text-align:center;"><span class="badge '+(rowTotal>0?'bg':'bgr')+'">'+rowTotal+'</span></td>';
    html+='</tr>';
  });

  // Totals row
  html+='<tr style="background:var(--sagel);font-weight:700;"><td>TOTAL</td>';
  var grandTotal=0;
  ALL_PAPERS.forEach(function(paper){
    var colTotal=0;
    NP_RECIPIENTS.forEach(function(rec){colTotal+=totals[rec.id][paper];});
    grandTotal+=colTotal;
    html+='<td style="text-align:center;font-weight:700;">'+colTotal+'</td>';
  });
  html+='<td style="text-align:center;font-weight:700;">'+grandTotal+'</td>';
  html+='</tr>';
  html+='</tbody></table></div>';

  out.innerHTML=html;
}

// ── LIGHTBOX ──
var lbRotation=0;
function openLightbox(src,caption){
  lbRotation=0;
  document.getElementById('lightbox-img').src=src;
  document.getElementById('lightbox-img').style.transform='rotate(0deg)';
  document.getElementById('lightbox-caption').textContent=caption||'';
  document.getElementById('lightbox').style.display='flex';
  document.body.style.overflow='hidden';
}
function closeLightbox(e){
  if(e&&e.target!==document.getElementById('lightbox'))return;
  document.getElementById('lightbox').style.display='none';
  document.body.style.overflow='';
  lbRotation=0;
}
function rotateLightbox(){
  lbRotation=(lbRotation+90)%360;
  document.getElementById('lightbox-img').style.transform='rotate('+lbRotation+'deg)';
}
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'){document.getElementById('lightbox').style.display='none';document.body.style.overflow='';}
});

// ── HELPERS ──
function openUrl(url){window.open(url,'_blank');}
function delTimetable(id){if(id)askDel('timetables',id,'Timetable record');}
function g(id){return document.getElementById(id)?document.getElementById(id).value.trim():'';}
function clr(ids){ids.forEach(function(id){var el=document.getElementById(id);if(el)el.value='';});}
function openM(id){document.getElementById(id).classList.add('open');}
function closeM(id){document.getElementById(id).classList.remove('open');}
function fd(d){if(!d)return'—';return new Date(d).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});}
function toast(msg,type){var t=document.getElementById('toast');t.textContent=msg;t.className='toast show'+(type==='error'?' error':'');setTimeout(function(){t.classList.remove('show');},3500);}
document.querySelectorAll('.mo').forEach(function(o){o.addEventListener('click',function(e){if(e.target===o)o.classList.remove('open');});});
document.addEventListener('click',function(e){if(!e.target.closest('#notif-panel')&&!e.target.closest('#notif-btn'))document.getElementById('notif-panel').classList.remove('open');});
