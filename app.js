
const $=i=>document.getElementById(i);
const KEY="mt_gemini_key",MOD="mt_gemini_model",DEF_MOD="gemini-flash-lite-latest";
let D=[],db=null,asc=true,sup=new Set(),nn=false,G=[];
let quiet=0;const dus=new Set();let ownN=null;const bump=()=>{if(quiet)return;try{localStorage.setItem("mt_chg",(+localStorage.getItem("mt_chg")||0)+1)}catch(e){}};
/* ---------- IndexedDB (base créée vierge au premier lancement) ---------- */
const idb=(m,fn,nb)=>(m==="readwrite"&&!nb&&bump(),db)?new Promise((res,rej)=>{const tx=db.transaction("films",m),r=fn(tx.objectStore("films"));tx.oncomplete=()=>res(r&&r.result);tx.onerror=tx.onabort=()=>rej(tx.error)}):Promise.reject(new Error("Base de données indisponible"));
const openDB=()=>new Promise((res,rej)=>{const q=indexedDB.open("mediatheque",2);q.onupgradeneeded=()=>{const d=q.result;if(!d.objectStoreNames.contains("films"))d.createObjectStore("films",{keyPath:"id"});if(!d.objectStoreNames.contains("snap"))d.createObjectStore("snap",{keyPath:"id"})};q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});
let wErrT=0;const storageWriteError=()=>{const n=$("n");if(n)n.textContent="Erreur de sauvegarde — vérifie tes réglages";if(Date.now()-wErrT>8000){wErrT=Date.now();try{alert("Erreur de sauvegarde : la dernière modification n'a PAS été enregistrée. Libère de l'espace ou exporte une sauvegarde (Réglages).")}catch(e){}}};
/* écriture échouée : on remet l'écran dans l'état réel de la base, pour ne jamais afficher une modification non enregistrée */
const resyncD=async()=>{try{const a=await idb("readonly",s=>s.getAll());if(Array.isArray(a)){D=a;lists();draw()}}catch(e){}};
const put=f=>idb("readwrite",s=>{s.put(f)}).then(()=>true,()=>{storageWriteError();resyncD();return false});
const putMany=(a,nb)=>idb("readwrite",s=>{a.forEach(f=>s.put(f))},nb).then(()=>true,()=>{storageWriteError();resyncD();return false});
/* ---------- utilitaires ---------- */
const key=s=>String(s||"").toLowerCase().replace(/^(le |la |les |l['’]|un |une |the )/,"").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const sk=s=>key(s).replace(/[^a-z0-9]+/g," ").trim();
const fmt=m=>m?Math.floor(m/60)+"h"+String(m%60).padStart(2,"0"):"";
const nl=v=>v===undefined?"":(v===0?"0":(Math.floor(v)||"")+(v%1?"½":"")) +" ★";
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const opt=(sel,v,t)=>{const o=document.createElement("option");o.value=v;o.textContent=t===undefined?v:t;sel.append(o)};
const yurl=t=>"https://www.allocine.fr/rechercher/?q="+encodeURIComponent(t).replace(/%20/g,"+");
const TR=["0h – 1h29","1h30 – 1h59","2h – 2h29","2h30 – 2h59","3h et +"];
const TRB=["Moins de 150 p.","150 – 299 p.","300 – 499 p.","500 p. et +"];
const tr=m=>(m===""||m==null||!(+m>0))?"Non renseignée":typ==="b"?(m<150?TRB[0]:m<300?TRB[1]:m<500?TRB[2]:TRB[3]):m<90?TR[0]:m<120?TR[1]:m<150?TR[2]:m<180?TR[3]:TR[4];
const dec=y=>y===""?"":Math.floor(y/10)*10;
const sp=v=>String(v||"").split(", ").map(t=>t.trim()).filter(t=>t&&t!=="—");
const uniq=f=>[...new Set(D.filter(isT).flatMap(f))].sort((a,b)=>a.localeCompare(b,"fr"));
const mkid=(t,y)=>t+"|"+(y||"");
[...TR,"Non renseignée"].forEach(t=>opt($("du"),t));
function lists(){G=[...new Set(D.filter(isT).flatMap(x=>x.g.split(" / ").filter(Boolean)))].sort((a,b)=>a.localeCompare(b,"fr"));
 const gv=$("g").value,dv=$("dc").value;
 $("g").innerHTML='<option value="">Tous les '+(typ==="m"?"styles":"genres")+'</option>';G.forEach(g=>opt($("g"),g));$("g").value=gv;{const sv=$("sgn").value;$("sgn").innerHTML='<option value="">Tous les '+(typ==="m"?"styles":"genres")+'</option>';G.forEach(g=>opt($("sgn"),g));$("sgn").value=sv}
 $("dc").innerHTML='<option value="">Toutes les années</option>';[...new Set(D.filter(isT).map(x=>dec(x.y)).filter(Boolean))].sort((a,b)=>a-b).forEach(d=>opt($("dc"),d,"Années "+d));$("dc").value=dv;
 [["lr",x=>sp(x.r)],["la",x=>sp(x.a)],["lp",x=>sp(x.p)]].forEach(([id,f])=>{$(id).innerHTML="";uniq(f).forEach(v=>opt($(id),v))})}
const cmp={t:x=>key(x.t),r:x=>key(x.r),y:x=>x.y,l:x=>x.d,g:x=>key(x.g),n:x=>x.n===undefined?"":x.n,a:x=>key(x.a),p:x=>key(x.p),s:x=>key(x.s),da:x=>x.da||""};
const sortGroup=(x,k)=>k==="l"?(x.d?tr(x.d):(x.k==="b"?"Pages non renseignées":"Durée non renseignée")):k==="y"?(x.y||"Année non renseignée"):k==="n"?(x.n===undefined?"Sans note":x.n+" ★"):k==="r"?(x.r||(x.k==="b"?"Auteur non renseigné":"Réalisateur / artiste non renseigné")):k==="g"?(x.g||"Genre non renseigné"):k==="a"?(x.a||"Acteur / artiste non renseigné"):k==="p"?(x.p||(x.k==="b"?"Éditeur non renseigné":"Production / label non renseigné")):k==="s"?(x.s||"Support non renseigné"):k==="da"?(x.da?"Ajouté le "+new Date(x.da).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"}):"Date d'ajout inconnue"):"";
const rt=v=>{v=v||0;let h="";for(let i=1;i<=5;i++){const d=Math.max(0,Math.min(1,v-(i-1)));h+=`<span class="st"><i class="bg">★</i><i class="fg" style="clip-path:inset(0 ${100-d*100}% 0 0)">★</i><b data-v="${i-.5}"></b><b data-v="${i}"></b></span>`}return '<button class="z" data-v="0" style="margin-left:0;margin-right:4px">0</button>'+h+'<button class="z" data-v="">Effacer</button>'};
const count=()=>{const k=D.filter(x=>isT(x)&&x.n!==undefined).length;return k?" · "+k+" noté"+(k>1?"s":""):""};
const card=id=>[...$("l").children].find(c=>c.dataset.id===id);
let view="c",typ="f",grid=false;try{grid=localStorage.getItem("mt_grid")==="1"}catch(e){}
let gcols=3;try{gcols=Math.max(1,Math.min(5,parseInt(localStorage.getItem("mt_gcols"),10)||3))}catch(e){}
const gridOn=()=>grid&&(view==="c"||view==="w"),tq=new Set();
const OPA=$("s").querySelector("option[value=a]"),setOptA=v=>{const S=$("s");if(v){if(!OPA.isConnected)S.insertBefore(OPA,S.querySelector("option[value=p]"))}else if(OPA.isConnected){if(S.value==="a")S.value="t";OPA.remove()}};
const isT=x=>(x.k||"f")===typ,own=x=>x.seasonsOwned?x.seasonsOwned.length:(x.ownedSeasons!==undefined?x.ownedSeasons:(x.ns||0)),seen=x=>x.k==="s"?(own(x)>0&&(x.sw||0)>=own(x)):!!x.vu,prog=x=>x.k==="s"&&(x.sw||0)>0&&!seen(x);
const SUPF=["DVD","Blu-ray","4K UHD","Fichier numérique"],SUPM=["Vinyle","CD","K7","MP3"],SUPB=["Roman","BD","Manga","Comics","Jeunesse","Essai","Autre"];let SUP=SUPF;const SC={"DVD":"dv","Vinyle":"vi","CD":"cd","K7":"k7","MP3":"fn","Blu-ray":"br","4K UHD":"uh","Fichier numérique":"fn","Roman":"ro","BD":"bd","Manga":"mg","Comics":"cx","Jeunesse":"je","Essai":"es","Autre":"au"},IMG="https://image.tmdb.org/t/p/";
const pimg=(p,w)=>/^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+\/=]+$/.test(p)||/^https:\/\//.test(p)?p:p.startsWith("gb:")?"https://books.google.com/books/content?id="+p.slice(3)+"&printsec=frontcover&img=1&zoom=1":p.startsWith("ol:")?"https://covers.openlibrary.org/b/id/"+p.slice(3)+(w==="w154"?"-M":"-L")+".jpg":p.startsWith("mb:")?"https://coverartarchive.org/release-group/"+p.slice(3)+"/front-250":IMG+w+p;
const supOf=v=>/^\s*roman/i.test(v)?"Roman":/^\s*(bd|bande)/i.test(v)?"BD":/^\s*manga/i.test(v)?"Manga":/^\s*comics?/i.test(v)?"Comics":/^\s*jeunesse/i.test(v)?"Jeunesse":/^\s*essai/i.test(v)?"Essai":/^\s*autre/i.test(v)?"Autre":/vinyl|33 ?t|45 ?t|\blp\b/i.test(v)?"Vinyle":/k7|cass/i.test(v)?"K7":/mp3|flac|stream/i.test(v)?"MP3":/\bcd\b/i.test(v)?"CD":/4k|uhd/i.test(v)?"4K UHD":/blu/i.test(v)?"Blu-ray":/num|fichier|digital/i.test(v)?"Fichier numérique":"DVD";
const fd=v=>v?String(v).split("-").reverse().join("/"):"";
const today=()=>new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);
const tlHTML=ov=>{let n=0,h='<div class="tl">';String(ov).split(/\r?\n/).map(s=>s.trim()).filter(Boolean).forEach(s=>{if(s.startsWith("## ")){n=0;h+='<div class="tlh">'+esc(s.slice(3))+'</div>'}else{n++;h+='<div class="tk"><span>'+n+'.</span><div>'+esc(s.replace(/^\d+[.)]\s+/,""))+'</div></div>'}});return h+"</div>"};
function rowHTML(x,open){
 const S=x.k==="s",M=x.k==="m",B=x.k==="b",sw=x.sw||0,ow=S?own(x):0;const vup=S?'<span class="sp">Saisons vues</span><button class="z sdn">−</button><b>'+esc(sw)+' / '+esc(x.ns||ow?ow:"?")+'</b><button class="z sin">+</button>'+(ow&&sw<ow?'<button class="z sall">Tout vu</button>':""):(x.vu?'<label class="vl">'+(M?"Écouté le":B?"Lu le":"Vu le")+' <input type="date" class="vd" value="'+esc(x.vu)+'"></label><button class="z vub">'+(M?"Pas écouté":B?"Pas lu":"Pas vu")+'</button>':'<button class="pri vub">'+(M?"✓ Marquer comme écouté":B?"✓ Marquer comme lu":"✓ Marquer comme vu")+'</button>');const acts=x.wl?'<button class="pri own">✓ Je l\'ai ! Ajouter à ma collection</button>':(x.l?'<span class="w">Prêté à '+esc(x.l.n)+' depuis le '+esc(fd(x.l.d))+'</span><button class="z lnb">Rendu</button>':'<button class="z lnb">Prêter…</button>');const rows2=x.wl?"":'<div class="ac vr'+(S?"":" nw")+'">'+vup+'</div>'+(S?'<div class="ac vr"><span class="sp">Saisons possédées</span><b>'+ow+' / '+(x.ns||ow?x.ns||ow:"?")+'</b></div>':"");
 return `<div class="it ${SC[x.s]||""}${open?" open":""}" data-id="${esc(x.id)}" tabindex="0"><div class="rw">${x.pi?`<img class="pz${M?" sq":""}" loading="lazy" alt="" onerror="this.remove()" src="${esc(pimg(x.pi,gridOn()?(gcols<=2?"w500":"w342"):"w154"))}">`:""}<div class="rb"><div class="top"><div class="t">${esc(x.t)}</div><span class="nt">${x.wl?"":nl(x.n)}</span></div><div class="m">${((pre,suf)=>esc(pre)+(x.s?(pre?", ":"")+'<span class="fm">'+esc(x.s)+'</span>':"")+esc(suf))([x.r,x.y,S?(x.ns?(own(x)+" / "+x.ns+" saison"+(x.ns>1?"s":"")):""):M?(x.d?x.d+" min":""):B?(x.d?x.d+" p.":""):fmt(x.d),S?(x.ownedEpisodes!==undefined?x.ownedEpisodes+" / "+(x.episodesTotal||x.ne||0)+" épisodes possédés":(x.ne?x.ne+" épisodes":"")):""].filter(Boolean).join(", "),(S?(seen(x)?" · ✓ terminée":prog(x)?" · en cours "+sw+"/"+own(x):""):(x.vu?(M?" · ✓ écouté":B?" · ✓ lu":" · ✓ vu"):""))+(x.l?" · prêté à "+x.l.n:""))}</div></div></div><div class="d">${x.ov?(M?tlHTML(x.ov):`<p class="ov">${esc(x.ov)}</p>`):""}<p><b>${M?"Style":"Genre"} :</b> ${esc(x.g||"à compléter")}</p>${M||B?"":`<p><b>Avec :</b> ${esc(x.a||"à compléter")}</p>`}<p><b>${M?"Label":B?"Éditeur":"Production"} :</b> ${esc(x.p||"à compléter")}</p>${x.da?`<p><b>Ajouté le :</b> ${new Date(x.da).toLocaleDateString("fr-FR")}</p>`:""}<div class="ac"><select class="sup" aria-label="Support">${SUP.map(v=>`<option${v===x.s?" selected":""}>${v}</option>`).join("")}</select>${acts}</div>${rows2}${x.wl?"":`<div class="rt">${rt(x.n)}</div>`}<textarea class="cm" rows="2" placeholder="Commentaire, souvenir, état du disque…">${esc(x.c||"")}</textarea><p><a href="${esc(M?"https://musicbrainz.org/search?type=release_group&query="+encodeURIComponent(x.r+" "+x.t):B?"https://www.babelio.com/resrecherche.php?Recherche="+encodeURIComponent(x.t+" "+(x.r||"")):yurl(x.t))}" target="_blank" rel="noopener">${M?"Voir sur MusicBrainz":B?"Voir sur Babelio":"Voir sur Allociné"}</a> · <a href="https://www.google.com/search?tbm=isch&q=${encodeURIComponent(B?"couverture livre "+(x.r||"")+" "+x.t:(M?"pochette ":"jaquette ")+x.s+" "+(M?x.r+" ":"")+x.t+(x.y?" "+x.y:""))}" target="_blank" rel="noopener">${M?"Voir la pochette":B?"Voir la couverture":"Voir la jaquette"}</a></p>${x.v?'<p class="w">Ajouté depuis l\'appli : infos à vérifier <button class="z vfy">✓ C\'est vérifié</button></p>':""}<div class="fbar"><button class="z0 del">${x.wl?"Retirer de mes souhaits":"Retirer de la collection"}</button><button class="edit-item" type="button" title="Modifier la fiche" aria-label="Modifier la fiche"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H6.5A2.5 2.5 0 0 0 4 5.5v13A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V11"/><path d="M18.4 2.6a1.9 1.9 0 0 1 2.7 2.7L12 14.4 8.5 15.5l1.1-3.5z"/></svg></button></div></div></div>`}
function refresh(id,open){const f=D.find(x=>x.id===id),c=card(id);if(f&&c)c.outerHTML=rowHTML(f,open===undefined?c.classList.contains("open"):open)}
function draw(){
  {const qv=$("q").value,hasF=document.activeElement===$("q");if(qv&&$("q").hidden)qOpen(true);else if(!qv&&!$("q").hidden&&!hasF)qOpen(false)}
 const q=sk($("q").value.trim()),g=$("g").value,s=$("s").value,f=cmp[s],du=[...dus].join("|"),dc=$("dc").value,nm=$("nm").value,fr=key($("fr").value.trim()),fa=key($("fa").value.trim()),fp=key($("fpr").value.trim()),st=$("st").value,W=view==="w";
 let r=D.filter(x=>isT(x)&&W===!!x.wl&&(!q||sk(x.t+" "+x.r+" "+x.a+" "+x.p).includes(q))&&(!g||x.g.split(" / ").includes(g))&&(!sup.size||sup.has(x.s))&&(!nn||x.n===undefined)&&(!dus.size||dus.has(tr(x.d)))&&(!dc||String(dec(x.y))===dc)&&(!nm||x.n>=+nm)&&(!fr||key(x.r).includes(fr))&&(!fa||key(x.a).includes(fa))&&(!fp||key(x.p).includes(fp))&&(!st||(st==="vu"?seen(x):st==="nv"?!seen(x):st==="en"?prog(x):x.l)));
 r.sort((a,b)=>{let p=f(a),c=f(b);if(p===""&&c!=="")return 1;if(c===""&&p!=="")return -1;const z=typeof p==="number"?p-c:String(p).localeCompare(String(c),"fr");return (asc?z:-z)||key(a.t).localeCompare(key(b.t),"fr")});
 const na=[g,du,dc,nm,fr,fa,fp,st,$("su").value].filter(Boolean).length+(nn?1:0);$("fb").textContent=na?"Filtres ("+na+")":"Filtres";
 const T=D.filter(isT),N=T.filter(x=>!x.wl).length,tot=W?T.length-N:N,wd=typ==="s"?" série":typ==="m"?" album":typ==="b"?" livre":" film";
 $("n").textContent=tot?r.length+(W?" souhait":wd)+(r.length>1?"s":"")+" sur "+tot+(W?"":count()):"";
 const grouped=!!tot&&s!=="t";
 const rendered=grouped?(()=>{let html="",last=null;r.forEach(x=>{const label=sortGroup(x,s);if(label!==last){html+='<div class="sort-group">'+esc(label)+'</div>';last=label}html+=rowHTML(x)});return html})():r.map(x=>rowHTML(x)).join("");
 $("l").innerHTML=!tot?(W?'<div class="e">Ta liste de souhaits est vide.<br>Appuie sur <b>+</b> pour noter '+(typ==="b"?"les livres":typ==="m"?"les albums":"les films")+' que tu cherches.</div>':(typ==="m"?'<div class="e">Aucun album pour l\'instant.<br>Appuie sur <b>+</b> pour en ajouter un.</div>':typ==="b"?'<div class="e">Aucun livre pour l\'instant.<br>Appuie sur <b>+</b> pour en ajouter un.</div>':typ==="s"?'<div class="e">Aucune série pour l\'instant.<br>Appuie sur <b>+</b> pour en ajouter une.</div>':'<div class="e">Ta médiathèque est vide.<br>Appuie sur <b>+</b> pour ajouter un film,<br>ou sur ⚙︎ pour importer un CSV.</div>')):r.length?rendered:'<div class="e">Aucun '+(typ==="m"?"album":typ==="b"?"livre":"film")+' ne correspond.</div>';
 {const u=$("up");if(u)u.hidden=!(r.length&&(view==="c"||view==="w"))}bkCheck()}
/* ---------- notes, vu, prêts, commentaires ---------- */
function rate(id,v){const f=D.find(x=>x.id===id);if(!f)return;if(v===""||f.n===+v)delete f.n;else f.n=+v;put(f);
 const c=card(id);if(c){c.querySelector(".rt").innerHTML=rt(f.n);c.querySelector(".nt").textContent=nl(f.n)}
 $("n").textContent=$("n").textContent.replace(/ · \d+ notés?$/,"")+count()}
/* ---------- récupération des visuels et résumés (films, séries, livres, albums) ----------
   Règle d'or : on ne remplit QUE les champs vides, on n'écrase jamais ce que tu as saisi ou corrigé. */
const hasTxt=v=>v!==undefined&&v!==null&&String(v).trim()!=="";
const imgOK=u=>new Promise(r=>{const i=new Image(),t=setTimeout(()=>{i.src="";r(false)},10000);i.onload=()=>{clearTimeout(t);r(true)};i.onerror=()=>{clearTimeout(t);r(false)};i.src=u});
function fillGaps(f,p){let n=0;for(const k of["pi","ov","r","y","d","g","a","p"])if(!hasTxt(f[k])&&hasTxt(p[k])){f[k]=p[k];n++}return n}
/* films et séries : TMDB (clé perso) — affiche, synopsis, + genre, acteurs, réalisateur, durée, production si vides */
async function patchVideo(f){const S=f.k==="s",nms=x=>[x.title,x.original_title,x.name,x.original_name];
 const r=(await tget(S?"/search/tv":"/search/movie",{query:f.t,language:"fr-FR",include_adult:"false"})).results||[];
 /* on n'accepte qu'un titre vraiment proche : pas d'affiche plutôt qu'une mauvaise affiche */
 const sc=r.filter(x=>tmScore(f.t,nms(x))>=60).map(x=>({x,s:rank(f.t,f.y,nms(x),(x.release_date||x.first_air_date||"").slice(0,4),x.vote_count,x.popularity,x.poster_path)})).sort((a,b)=>b.s-a.s),m=(sc[0]||{}).x;
 if(!m)return null;
 let d=null;try{d=await tget((S?"/tv/":"/movie/")+m.id,{language:"fr-FR",append_to_response:"credits"})}catch(e){if(e&&e.status===401)throw e}
 const cr=(d&&d.credits)||{},z=d||m,yr=(z.release_date||z.first_air_date||"").slice(0,4),pc=S?((z.production_companies&&z.production_companies.length)?z.production_companies:(z.networks||[])):(z.production_companies||[]);
 return{pi:z.poster_path||m.poster_path||"",ov:z.overview||m.overview||"",
  r:S?(z.created_by||[]).map(x=>x.name).join(", "):(cr.crew||[]).filter(x=>x.job==="Director").map(x=>x.name).join(", "),
  g:(z.genres||[]).slice(0,3).map(x=>x.name).join(" / "),a:(cr.cast||[]).slice(0,5).map(x=>x.name).join(", "),
  p:pc.slice(0,3).map(x=>x.name).join(", "),d:S?((z.episode_run_time||[])[0]||(z.last_episode_to_air||{}).runtime||""):(z.runtime||""),y:+yr||""}}
/* livres : Google Livres + Open Library (sans clé) — couverture, résumé, + auteur, année, pages, éditeur si vides */
async function patchBook(f){const t=f.t,au=f.r||"",n=f.isbn?isbnNorm(f.isbn):null,q=v=>String(v||"").replace(/"/g," ").replace(/\s+/g," ").trim();
 const rs=await Promise.allSettled([n?isbnGB(n):[],n?isbnOL(n):[],
  gbSearch('intitle:"'+q(t)+'"'+(au?' inauthor:"'+q(au)+'"':""),8),
  olSearch("title="+encodeURIComponent(q(t))+(au?"&author="+encodeURIComponent(q(au)):""))]);
 const bad=rs.filter(r=>r.status==="rejected");
 if(bad.length>=(n?4:2)&&rs.every((r,i)=>r.status==="rejected"||(!n&&i<2)))throw bad[0].reason;
 const val=i=>rs[i].status==="fulfilled"?rs[i].value:[],ln=sk(au).split(" ").filter(Boolean).pop()||"";
 const exact=[...val(0),...val(1)]; /* même ISBN = même édition */
 const near=rankBooks(t,dedupBooks([...val(2),...val(3)]),au).filter(x=>tmScore(t,[x.titre])>=60&&(!ln||!x.realisateur||sk(x.realisateur).includes(ln)));
 const p={},take=(k,v)=>{if(!hasTxt(p[k])&&hasTxt(v))p[k]=v};
 [...exact,...near].forEach(x=>{take("pi",x.affiche);take("ov",x.synopsis);take("r",x.realisateur);take("g",x.genre)});
 /* année, pages, éditeur : seulement la même édition (ISBN) ou la meilleure correspondance */
 [...exact,...near.slice(0,1)].forEach(x=>{take("y",+x.annee||"");take("d",+x.duree||"");take("p",x.production)});
 if(!hasTxt(f.ov)&&!p.ov){try{const r=await bookSyn(t,au,n);if(r.length)p.ov=r[0].synopsis}catch(e){}}
 return p}
/* albums : MusicBrainz + Cover Art Archive (sans clé) — pochette, liste des titres, + style, année si vides */
async function patchMusic(f){let rg=String(f.pi||"").startsWith("mb:")?f.pi.slice(3):"",p={};
 if(!rg||!hasTxt(f.g)||!hasTxt(f.y)){
  let list=await mbz(f.t,f.y||"",f.r||"");
  if(!list.length&&f.y){await sleep(1100);list=await mbz(f.t,"",f.r||"")}
  const x=list.find(z=>tmScore(f.t,[z.titre])>=60&&(!f.r||tmScore(f.r,[z.realisateur])>=50));
  if(x){const id=String(x.affiche).slice(3);
   if(!rg)rg=id;
   if(!f.pi&&await imgOK(pimg(x.affiche,"w154")))p.pi=x.affiche;
   p.g=x.genre;p.y=+x.annee||""}}
 if(rg&&!hasTxt(f.ov)){try{await sleep(1100);const t=await mbTracks(rg);if(t)p.ov=t}catch(e){}}
 return p}
/* une fiche : renvoie true (complétée), false (rien trouvé), null (erreur réseau, on pourra réessayer) */
async function enrich(f,bulk){
 if(!bulk&&(f.k==="m"||f.k==="b"))return false;
 if(f.eq&&!bulk)return false;
 const fn=f.k==="m"?patchMusic:f.k==="b"?patchBook:patchVideo;
 if(fn===patchVideo&&!tkey())return false;
 try{const p=await fn(f),n=p?fillGaps(f,p):0;
  if(n)delete f.eq;else f.eq=1;
  quiet=1;put(f);quiet=0;return n>0}
 catch(e){quiet=0;enrich.err=e;return null}}
let fOpen=false;
function toggleCard(it){const o=!it.classList.contains("open");
 if(o)$("l").querySelectorAll(".it.open").forEach(c=>{if(c!==it)c.classList.remove("open")});
 it.classList.toggle("open",o);
 if(o){if(!fOpen){try{history.pushState({f:1},"");fOpen=true}catch(e){}}const h=document.querySelector("header").offsetHeight+(parseFloat(getComputedStyle(document.documentElement).paddingTop)||0);
  window.scrollTo({top:Math.max(0,it.getBoundingClientRect().top+window.scrollY-h-8),behavior:"smooth"})}
 else if(fOpen){fOpen=false;try{history.back()}catch(e){}}
 return o}
$("l").onclick=e=>{const it=e.target.closest(".it");if(!it)return;const id=it.dataset.id,f=D.find(x=>x.id===id);if(!f)return;
 if(e.target.closest(".edit-item")){e.stopPropagation();const f=D.find(x=>x.id===id);if(f)editItem(f);return}
 if(e.target.closest(".vfy")){delete f.v;put(f);refresh(id);return}
 if(e.target.closest(".del")){askDel(id);return}
 if(e.target.closest(".sdn,.sin,.sall")){const all=e.target.closest(".sall");let w=f.sw||0;w=all?own(f):Math.max(0,Math.min(own(f)||99,w+(e.target.closest(".sin")?1:-1)));w?f.sw=w:delete f.sw;put(f);refresh(id);return}
 const h=e.target.closest(".rt [data-v]");if(h){rate(id,h.dataset.v);return}
 if(e.target.closest(".vub")){if(f.vu)delete f.vu;else f.vu=today();put(f);refresh(id);return}
 if(e.target.closest(".lnb")){if(f.l)delete f.l;else{const n=(prompt("Prêté à qui ?")||"").trim();if(!n)return;f.l={n,d:today()}}put(f);refresh(id);return}
 if(e.target.closest(".own")){delete f.wl;f.da=Date.now();put(f);lists();draw();return}
 if(e.target.closest(".rw")){const o=toggleCard(it);if(o&&!f.pi&&!f.eq)enrich(f).then(ok=>{if(ok)refresh(id)});
  if(o&&f.k==="m"&&!f.ov&&(f.pi||"").startsWith("mb:")&&!tq.has(id)){tq.add(id);mbTracks(f.pi.slice(3)).then(t=>{if(t){f.ov=t;put(f);refresh(id)}}).catch(()=>{})}}};
$("l").onchange=e=>{const it=e.target.closest(".it");if(!it)return;const id=it.dataset.id,f=D.find(x=>x.id===id),t=e.target;if(!f)return;
 if(t.classList.contains("sup")){f.s=t.value;put(f);refresh(id)}
 else if(t.classList.contains("vd")){t.value?f.vu=t.value:delete f.vu;put(f);refresh(id)}
 else if(t.classList.contains("cm")){const v=t.value.trim();v?f.c=v:delete f.c;put(f)}};
$("l").onkeydown=e=>{if(e.key==="Enter"&&e.target.classList.contains("it"))toggleCard(e.target)};
window.addEventListener("popstate",()=>{if(fOpen){fOpen=false;$("l").querySelectorAll(".it.open").forEach(c=>c.classList.remove("open"))}});
(()=>{let x0,y0,t0,it0=null;const L=$("l");
L.addEventListener("touchstart",e=>{const it=e.target.closest(".it.open");if(!it||e.touches.length>1||e.target.closest(".rt,textarea,select,input,button,a")){it0=null;return}it0=it;x0=e.touches[0].clientX;y0=e.touches[0].clientY;t0=Date.now()},{passive:true});
L.addEventListener("touchend",e=>{if(!it0)return;const t=e.changedTouches[0],dx=t.clientX-x0,dy=t.clientY-y0,it=it0;it0=null;
 if(Math.abs(dx)>90&&Math.abs(dy)<45&&Date.now()-t0<700&&it.classList.contains("open"))toggleCard(it)},{passive:true})})();
let synR=[],synI=0,synQ="";
$("synA").onclick=()=>{const t=$("fT").value.trim();if(!t){$("synS").textContent="Mets d'abord un titre.";return}window.open(yurl(t),"_blank","noopener");$("synS").textContent="Allociné ne se laisse pas lire depuis l'appli : copie le synopsis là-bas, reviens ici et colle-le dans la case."};
$("syn").onclick=async()=>{const t=$("fT").value.trim(),st=$("synS");if(!t){st.textContent="Mets d'abord un titre.";return}
 if(typ==="b"){const au=$("fR").value.trim(),is=isbnNorm(cur.isbn||""),bq=t+"|"+au+"|"+(is?is.i13:"");
  try{if(bq!==synQ){st.textContent="Recherche du résumé…";synR=await bookSyn(t,au,is);synI=0;synQ=bq}else synI=(synI+1)%Math.max(1,synR.length);
   if(!synR.length){st.textContent="Aucun résumé trouvé dans Google Livres ni Open Library : colle-le à la main (4ᵉ de couverture, Babelio…).";return}
   const r=synR[synI];$("fO").value=r.synopsis;cur.ov=r.synopsis;st.textContent=r.titre+(r.annee?" ("+r.annee+")":"")+" · "+r.src+" · "+(synI+1)+"/"+synR.length+(synR.length>1?" · pas le bon ? Rappuie pour le suivant.":"")}
  catch(e){st.textContent="Recherche impossible ("+netMsg(e)+") : réessaie dans un instant."}return}
 if(typ==="m"){st.textContent="Recherche des titres…";try{let rg=(cur.pi||"").startsWith("mb:")?cur.pi.slice(3):"";if(!rg){const ar=$("fR").value.trim(),c=s=>s.replace(/[+\-&|!(){}\[\]^"~*?:\\\/]/g," ").trim();const j=await mbget("https://musicbrainz.org/ws/2/release-group/?query="+encodeURIComponent("releasegroup:("+c(t)+")"+(ar?" AND artist:("+c(ar)+")":""))+"&fmt=json&limit=1",1);rg=((j["release-groups"]||[])[0]||{}).id||"";await sleep(1100)}
  if(!rg){st.textContent="Album introuvable sur MusicBrainz : colle les titres à la main, un par ligne.";return}
  const tl=await mbTracks(rg);if(!tl){st.textContent="Pas de liste de titres pour cet album : colle-la à la main, un par ligne.";return}
  $("fO").value=tl;cur.ov=tl;st.textContent="Titres récupérés sur MusicBrainz : relis-les avant d'enregistrer."}catch(e){st.textContent="MusicBrainz ne répond pas : réessaie dans un instant."}return}
 if(!tkey()){st.textContent="Pas de clé TMDB : colle le synopsis depuis Allociné.";return}
 const S=typ==="s",y=+$("fY").value||0,q=t+"|"+y;
 try{if(q!==synQ){st.textContent="Recherche…";synR=((await tget(S?"/search/tv":"/search/movie",{query:t,language:"fr-FR",include_adult:"false"})).results||[]).filter(r=>r.overview);if(y)synR.sort((a,b)=>Math.abs(+(a.release_date||a.first_air_date||"0").slice(0,4)-y)-Math.abs(+(b.release_date||b.first_air_date||"0").slice(0,4)-y));synI=0;synQ=q}else synI=(synI+1)%Math.max(1,synR.length);
  if(!synR.length){st.textContent="Aucun synopsis trouvé. Colle-le depuis Allociné.";return}
  const r=synR[synI];$("fO").value=r.overview;cur.ov=r.overview;
  st.textContent=(r.title||r.name)+" ("+((r.release_date||r.first_air_date||"").slice(0,4)||"?")+") · "+(synI+1)+"/"+synR.length+(synR.length>1?" · ce n'est pas le bon ? Rappuie pour le suivant.":"")}
 catch(e){st.textContent="Recherche impossible pour l'instant."}};
$("upb").onclick=()=>window.scrollTo({top:0,behavior:"smooth"});
/* ---------- onglets, ce soir, stats ---------- */
function resetSoir(){["sdu","sgn","sdir","sact"].forEach(i=>{const e=$(i);if(e)e.value=""});$("sst").selectedIndex=0;$("pick").innerHTML='<div class="e">Règle tes envies, puis tire au sort.<br>Les titres prêtés sont exclus.</div>';lp=null}
function setView(v){if(view==="s"&&v!=="s")resetSoir();view=v;document.body.dataset.view=v;applyGrid();document.querySelectorAll("#tb button[data-t]").forEach(b=>b.classList.toggle("on",b.dataset.t===v));
 $("l").hidden=!(v==="c"||v==="w");$("sv").hidden=v!=="s";$("tv").hidden=v!=="t";
 if(v==="t")stats();draw();window.scrollTo(0,0)}
function setType(t){typ=t;dus.clear();document.body.dataset.t=t;["du","dc","nm","fr","fa","fpr","q","g","su","st","sdu","sgn"].forEach(i=>{const e=$(i);if(e)e.value=""});$("sst").selectedIndex=0;$("s").value="t";asc=true;$("o").textContent=lab();$("pn").hidden=true;$("fb").setAttribute("aria-expanded","false");qOpen(false);window.scrollTo(0,0);sup.clear();nn=false;dus.clear();dubRefresh();document.querySelectorAll(".chip[data-k]").forEach(b=>b.setAttribute("aria-pressed","false"));$("v").setAttribute("aria-pressed","false");const S=t==="s";document.querySelectorAll("#ty button[data-y]").forEach(b=>b.classList.toggle("on",b.dataset.y===t));
 $("du").value="";$("sdu").value="";$("sdir").value="";$("sact").value="";$("q").value="";$("dice").textContent=S?"🎲 Tire-moi une série":"🎲 Tire-moi un film";
 $("sst").options[0].textContent=S?"Pas terminées":"Pas encore vus";$("sst").options[1].textContent="Vus ou non";$("st").innerHTML=S?'<option value="">Vues ou non</option><option value="vu">Terminées</option><option value="en">En cours</option><option value="nv">Pas terminées</option><option value="pr">Prêtées</option>':'<option value="">Vus ou non</option><option value="vu">Vus</option><option value="nv">Pas encore vus</option><option value="pr">Prêtés</option>';
 $("pick").innerHTML='<div class="e">Règle tes envies, puis tire au sort.<br>Les titres prêtés sont exclus.</div>';lp=null;musicUI(t==="m");bookUI(t==="b");lists();dubRefresh();draw();if(view==="t")stats()}
$("ty").onclick=e=>{const b=e.target.closest("button[data-y]");if(b&&b.dataset.y!==typ)setType(b.dataset.y)};
$("tb").onclick=e=>{const b=e.target.closest("button[data-t]");if(b)setView(b.dataset.t)};
let lp=null;
const bigHTML=f=>`<div class="big">${f.pi?`<img${f.k==="m"?' class="sq"':""} src="${esc(pimg(f.pi,"w342"))}" alt="">`:""}<div><div class="t">${esc(f.t)}</div><div class="m">${esc([f.r,f.y,f.k==="s"?(f.ns?f.ns+" saison"+(f.ns>1?"s":""):""):f.k==="b"?(f.d?f.d+" p.":""):fmt(f.d),f.s].filter(Boolean).join(", "))}</div><div class="m">${esc(f.g||"")}</div>${f.ov?`<p class="ov" style="margin-top:8px">${esc(f.ov.length>240?f.ov.slice(0,237)+"…":f.ov)}</p>`:""}</div></div><div class="row"><button id="pw" class="pri" style="flex:1">${f.k==="s"?"▶ On la lance":f.k==="m"?"▶ On l'écoute":f.k==="b"?"📖 On le lit":"✓ On le regarde"}</button><button id="px" style="flex:1">🎲 Un autre</button></div><div class="row"><button id="po" class="z0" style="flex:1">Ouvrir la fiche</button></div>`;
function pick(){const du=+$("sdu").value,g=$("sgn").value,nv=$("sst").value==="nv",dir=key($("sdir").value.trim()),act=key($("sact").value.trim());
 const p=D.filter(x=>isT(x)&&!x.wl&&!x.l&&(!nv||!seen(x))&&(!du||typ==="s"||(x.d&&x.d<du))&&(!g||x.g.split(" / ").includes(g))&&(!dir||key(x.r).includes(dir))&&(!act||key(x.a).includes(act)));
 if(!p.length){$("pick").innerHTML='<div class="e">Rien ne correspond : élargis un filtre.</div>';return}
 let f;do{f=p[Math.floor(Math.random()*p.length)]}while(p.length>1&&f.id===lp);lp=f.id;$("pick").innerHTML=bigHTML(f);
 if(!f.pi&&!f.eq)enrich(f).then(ok=>{if(ok&&lp===f.id)$("pick").innerHTML=bigHTML(f)})}
$("dice").onclick=pick;
["sdir","sact"].forEach(id=>$(id).addEventListener("input",()=>{if(view==="s")pick()}));
$("pick").onclick=e=>{const f=D.find(x=>x.id===lp);if(!f)return;
 if(e.target.closest("#px"))pick();
 else if(e.target.closest("#pw")){if(f.k==="s"){$("pick").innerHTML='<div class="e">Bonne séance ! 🍿<br>Pense à mettre à jour les saisons vues dans la fiche.</div>';return}f.vu=today();put(f);$("pick").innerHTML='<div class="e">'+(f.k==="m"?"Bonne écoute ! 🎧":f.k==="b"?"Bonne lecture ! 📖":"Bonne séance ! 🍿")+'<br>« '+esc(f.t)+' » est marqué comme '+(f.k==="m"?"écouté":f.k==="b"?"lu":"vu")+'.</div>'}
 else if(e.target.closest("#po")){setView("c");$("q").value=f.t;draw();const c=card(f.id);if(c){c.classList.add("open");c.scrollIntoView()}}};
function stats(){const C=D.filter(x=>isT(x)&&!x.wl),n=C.length,S=typ==="s";if(!n){$("tv").innerHTML='<div class="e">Ajoute '+(typ==="m"?"des albums":typ==="b"?"des livres":S?"des séries":"des films")+' pour voir tes stats.</div>';return}
 const cnt=fn=>{const m={};C.forEach(x=>fn(x).forEach(k=>m[k]=(m[k]||0)+1));return Object.entries(m).sort((a,b)=>b[1]-a[1])};
 const bars=(t,a)=>a.length?"<h3>"+t+"</h3>"+a.map(([k,v])=>`<div class="br2"><span>${esc(k)}</span><i style="--w:${v/Math.max(...a.map(z=>z[1]))*100}%"></i><b>${v}</b></div>`).join(""):"";
 const mins=C.reduce((t,x)=>t+(x.d||0),0),vus=C.filter(seen).length,nt=C.filter(x=>x.n!==undefined),pr=C.filter(x=>x.l),av=nt.length?(nt.reduce((t,x)=>t+x.n,0)/nt.length).toFixed(1).replace(".",","):"—";
 const box=(v,l)=>`<div><b>${v}</b><small>${l}</small></div>`;
 $("tv").innerHTML='<div class="sts">'+(typ==="b"?box(n,"livres")+box(new Set(C.map(x=>key(x.r))).size,"auteurs")+box(vus+" / "+n,"lus")+box(av+" ★","note moyenne")+box(pr.length,"en prêt")+box(D.filter(x=>isT(x)&&x.wl).length,"souhaits"):typ==="m"?box(n,"albums")+box(new Set(C.map(x=>key(x.r))).size,"artistes")+box(vus+" / "+n,"écoutés")+box(av+" ★","note moyenne")+box(pr.length,"en prêt")+box(D.filter(x=>isT(x)&&x.wl).length,"souhaits"):S?box(n,"séries")+box(C.reduce((t,x)=>t+(x.ns||0),0),"saisons")+box(vus+" / "+n,"terminées")+box(C.filter(prog).length,"en cours")+box(av+" ★","note moyenne")+box(pr.length,"en prêt"):box(n,"films")+box(Math.round(mins/60)+" h","de cinéma")+box(vus+" / "+n,"vus")+box(av+" ★","note moyenne")+box(pr.length,"en prêt")+box(D.filter(x=>isT(x)&&x.wl).length,"souhaits"))+'</div>'
 +bars(typ==="b"?"Types":"Supports",cnt(x=>[x.s]))+bars("Décennies",cnt(x=>x.y?[dec(x.y)+"s"]:[]).sort((a,b)=>a[0].localeCompare(b[0])))
 +bars(typ==="m"?"Styles":"Genres",cnt(x=>x.g.split(" / ").filter(Boolean)).slice(0,8))
 +bars((typ==="b"?"Auteurs":typ==="m"?"Artistes":S?"Créateurs":"Réalisateurs")+" les plus présents",cnt(x=>sp(x.r)).filter(z=>z[1]>1).slice(0,6))+(typ==="m"||typ==="b"?"":bars("Acteurs les plus présents",cnt(x=>sp(x.a)).filter(z=>z[1]>1).slice(0,6)))
 +recentHTML(C)+(pr.length?"<h3>En prêt</h3>"+pr.map(x=>`<p class="m">${esc(x.t)} → <b>${esc(x.l.n)}</b> (depuis le ${fd(x.l.d)})</p>`).join(""):"")}
/* ---------- sauvegarde : rappel + versions de secours ---------- */
const clean=a=>{const bad=[];a.forEach(f=>{if(f.n!==undefined&&!(typeof f.n==="number"&&f.n>=0&&f.n<=5)){delete f.n;bad.push(f)}});return bad};
const daysSince=v=>v?(Date.now()-new Date(v))/864e5:999;
function bkCheck(){const chg=+localStorage.getItem("mt_chg")||0,last=localStorage.getItem("mt_bk"),sn=localStorage.getItem("mt_bks");let first=localStorage.getItem("mt_first");
 if(!first){try{localStorage.setItem("mt_first",first=new Date().toISOString())}catch(e){}}
 const on=D.length&&!(sn&&daysSince(sn)<3)&&(chg>=10||(chg>0&&daysSince(last||first)>=14));
 $("bk").hidden=!on;if(on)$("bkt").textContent=chg+" modification"+(chg>1?"s":"")+" non sauvegardée"+(chg>1?"s":"")}
$("bkg").onclick=()=>{openSettings();$("ex").click()};
$("bkx").onclick=()=>{try{localStorage.setItem("mt_bks",new Date().toISOString())}catch(e){}$("bk").hidden=true};
const sdb=(m,fn)=>db?new Promise((res,rej)=>{const tx=db.transaction("snap",m),r=fn(tx.objectStore("snap"));tx.oncomplete=()=>res(r&&r.result);tx.onerror=tx.onabort=()=>rej(tx.error)}):Promise.reject(new Error("Base de données indisponible"));
async function snap(why){if(!D.length)return true;try{const all=(await sdb("readonly",x=>x.getAll()))||[];
 await sdb("readwrite",x=>{x.put({id:Date.now(),why,n:D.length,data:JSON.stringify(D)});all.sort((p,q)=>p.id-q.id).slice(0,Math.max(0,all.length-4)).forEach(z=>x.delete(z.id))});return true}catch(e){const s=$("sgs");if(s)s.textContent="Sauvegarde de secours impossible ("+why+") : espace insuffisant ou stockage indisponible.";return false}}
async function snapUI(){const a=((await sdb("readonly",x=>x.getAll()))||[]).sort((p,q)=>q.id-p.id);
 $("snl").innerHTML=a.length?a.map(x=>`<div class="row"><span style="flex:1;align-self:center;font-size:13.5px">${esc(new Date(x.id).toLocaleString("fr-FR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}))} · ${x.n} lignes · ${esc(x.why)}</span><button data-r="${x.id}">Restaurer</button></div>`).join(""):'<span class="hint">Aucune pour l\'instant.</span>'}
$("snl").onclick=async e=>{const b=e.target.closest("[data-r]");if(!b)return;if(!confirm("Restaurer cette version ? L'état actuel sera gardé en secours."))return;
 try{const x=await sdb("readonly",z=>z.get(+b.dataset.r));if(!x)return;const R=JSON.parse(x.data);if(!Array.isArray(R)||R.some(f=>!f||f.id===undefined))throw new Error("format");
  if(!(await snap("avant restauration"))&&!confirm("La copie de secours de l'état actuel n'a pas pu être créée. Restaurer quand même ?"))return;clean(R);await idb("readwrite",z=>{z.clear();R.forEach(f=>z.put(f))});D=R;lists();draw();snapUI();$("sgs").textContent="Version restaurée : "+D.length+" lignes."}
 catch(err){$("sgs").textContent="Restauration impossible : ta collection actuelle n'a pas été modifiée."}};
/* ---------- réglages : récupération des visuels et résumés ---------- */
const EN={v:{n:"Films et séries",w:3},b:{n:"Livres",w:2},m:{n:"Musique",w:1}};
const enKind=f=>f.k==="m"?"m":f.k==="b"?"b":"v";
const enMiss=f=>{const k=enKind(f);return k==="v"?!(f.pi&&f.ov&&hasTxt(f.g)&&hasTxt(f.a)&&hasTxt(f.r)&&hasTxt(f.d)&&hasTxt(f.p)):k==="b"?!(f.pi&&f.ov&&hasTxt(f.r)&&hasTxt(f.y)&&hasTxt(f.d)&&hasTxt(f.p)):!(f.pi&&f.ov&&hasTxt(f.g)&&hasTxt(f.y))};
let enBusy=false,enStop=false;
async function runEnrich(kinds){
 if(enBusy)return;const S=$("enS"),retry=$("enR").checked,jobs=[],notes=[];
 kinds.forEach(k=>{
  if(k==="v"&&!tkey()){notes.push("Films et séries : il faut une clé TMDB (voir « Recherche de film »).");return}
  const todo=D.filter(f=>enKind(f)===k&&enMiss(f)&&(retry||!f.eq));
  if(todo.length)jobs.push({k,todo,i:0,done:0,ok:0,miss:0,err:0,run:0,stop:0,why:""});
  else notes.push(EN[k].n+" : rien à compléter"+(retry?"":" (ou déjà essayé : coche « Réessayer »)")+".")});
 if(!jobs.length){S.textContent=notes.join(" ");return}
 enBusy=true;enStop=false;const ids=["enb","enF","enB","enM"];ids.forEach(i=>$(i).disabled=true);$("enX").hidden=false;
 const show=()=>{S.textContent=jobs.map(j=>EN[j.k].n+" : "+j.done+" / "+j.todo.length).join(" · ")+"…"};show();
 const work=async j=>{while(!enStop&&!j.stop&&j.i<j.todo.length){const f=j.todo[j.i++],r=await enrich(f,1);j.done++;
   if(r===null){j.err++;j.run++;const e=enrich.err;if(e&&e.status===401){j.stop=1;j.why="clé TMDB refusée"}else if(j.run>=4){j.stop=1;j.why=netMsg(e)}}
   else{j.run=0;r?j.ok++:j.miss++}
   show();if(j.k==="m")await sleep(1100)}};
 try{await Promise.all(jobs.map(j=>Promise.all(Array.from({length:EN[j.k].w},()=>work(j)))))}
 finally{enBusy=false;ids.forEach(i=>$(i).disabled=false);$("enX").hidden=true;lists();draw()}
 S.textContent=(enStop?"Arrêté. ":"Terminé. ")+jobs.map(j=>EN[j.k].n+" : "+j.ok+" complétée"+(j.ok>1?"s":"")+" sur "+j.done+(j.miss?", "+j.miss+" introuvable"+(j.miss>1?"s":""):"")+(j.err?", "+j.err+" erreur"+(j.err>1?"s":"")+(j.why?" ("+j.why+")":""):"")+(j.stop?" — abandonné pour ne pas insister":"")).concat(notes).join(" · ")}
$("enb").onclick=()=>runEnrich(["v","b","m"]);$("enF").onclick=()=>runEnrich(["v"]);$("enB").onclick=()=>runEnrich(["b"]);$("enM").onclick=()=>runEnrich(["m"]);$("enX").onclick=()=>{enStop=true;$("enS").textContent="Arrêt en cours…"};
/* ---------- loupe : ouvre / ferme la barre de recherche ---------- */
function qOpen(o,focus){$("q").hidden=!o;$("sb2").setAttribute("aria-pressed",o);if(o&&focus)$("q").focus()}
$("sb2").onclick=()=>{if($("q").hidden)qOpen(true,true);else{$("q").value="";qOpen(false);draw()}};
$("q").onkeydown=e=>{if(e.key==="Escape")$("sb2").click()};
/* ---------- thème PopCruz sombre / clair ---------- */
const THEMES=["dark","light"],TC={dark:"#000000",light:"#000000"},TI={dark:"☀︎",light:"☾"},TL={dark:"Passer en mode clair",light:"Passer en mode sombre"};
function setTheme(t,save){if(!TC[t])t="dark";const R=document.documentElement;if(t==="dark")delete R.dataset.theme;else R.dataset.theme=t;
 $("th").innerHTML=TI[t];$("th").setAttribute("aria-label",TL[t]);
 const m=document.querySelector("meta[name=theme-color]");if(m)m.content=TC[t];
 if(save)try{localStorage.setItem("mt_theme",t)}catch(e){}}
$("th").onclick=()=>{const c=document.documentElement.dataset.theme||"dark";setTheme(THEMES[(THEMES.indexOf(c)+1)%2],true)};
setTheme(document.documentElement.dataset.theme||"dark",false);
/* ---------- tri / filtres ---------- */
const lab=()=>$("s").value=="da"?(asc?"Anciens d'abord":"Récents d'abord"):($("s").value=="y"||$("s").value=="l"||$("s").value=="n")?(asc?"Croissant":"Décroissant"):(asc?"A → Z":"Z → A");
$("q").oninput=draw;$("g").onchange=draw;$("s").onchange=()=>{asc=$("s").value!=="n"&&$("s").value!=="da";$("o").textContent=lab();draw()};
$("o").onclick=()=>{asc=!asc;$("o").textContent=lab();draw()};
document.querySelectorAll(".chip[data-k]").forEach(b=>b.onclick=()=>{const k=b.dataset.k;sup.has(k)?sup.delete(k):sup.add(k);b.setAttribute("aria-pressed",sup.has(k));draw()});
$("fb").onclick=()=>{const o=$("pn").hidden;$("pn").hidden=!o;$("fb").setAttribute("aria-expanded",o)};
["du","dc","nm","st"].forEach(i=>$(i).onchange=draw);$("su").onchange=()=>{sup.clear();if($("su").value)sup.add($("su").value);draw()};["fr","fa","fpr"].forEach(i=>$(i).oninput=draw);
$("rz").onclick=()=>{["du","dc","nm","fr","fa","fpr","q","g","su","st"].forEach(i=>$(i).value="");sup.clear();nn=false;dus.clear();dubRefresh();document.querySelectorAll(".chip[data-k]").forEach(b=>b.setAttribute("aria-pressed","false"));$("v").setAttribute("aria-pressed","false");draw()};
$("v").onclick=()=>{nn=!nn;$("v").setAttribute("aria-pressed",nn);draw()};
/* ---------- retrait + annulation ---------- */
let pend=null,undo=null,utm;
function askDel(id){const x=D.find(f=>f.id===id);if(!x)return;pend=id;$("cp").textContent="« "+x.t+(x.y?" ("+x.y+")":"")+" » sera retiré de "+(x.wl?"tes souhaits":"ta collection")+". Tu pourras annuler juste après.";$("cf").hidden=false}
$("cn").onclick=()=>{$("cf").hidden=true;pend=null};
$("cy").onclick=()=>{$("cf").hidden=true;if(pend)delFilm(pend);pend=null};
async function delFilm(id){const i=D.findIndex(f=>f.id===id);if(i<0)return;const f=D[i];
 try{await idb("readwrite",s=>{s.delete(id)})}catch(e){storageWriteError();alert("Suppression impossible : « "+f.t+" » n'a pas été retirée (erreur de stockage).");return}
 const j=D.findIndex(z=>z.id===id);if(j>=0)D.splice(j,1);
 undo=f;$("tt").textContent="« "+f.t+" » retiré";$("ts").hidden=false;clearTimeout(utm);utm=setTimeout(()=>{$("ts").hidden=true;undo=null},8000);lists();draw()}
$("tu").onclick=async()=>{if(!undo)return;const f=undo;if(!(await put(f))){alert("Annulation impossible : « "+f.t+" » n'a pas pu être rétablie (erreur de stockage). Elle reste supprimée.");return}
 undo=null;$("ts").hidden=true;if(!D.some(z=>z.id===f.id))D.push(f);lists();draw()};
/* ---------- ajout : titre → TMDB puis Wikidata ; photo → Gemini (titre seulement) ---------- */
const msg=t=>{$("sm").textContent=t||""};
let cur={},editingId=null;
function editItem(f){editingId=f.id;cur={pi:f.pi||"",ov:f.ov||"",seasonEpisodes:f.seasonEpisodes||null,isbn:f.isbn||""};$("fO").value=f.ov||"";$("synS").textContent="";$("fT").value=f.t||"";$("fR").value=f.r||"";$("fY").value=f.y||"";$("fD").value=f.d||"";$("fG").value=f.g||"";$("fA").value=f.a||"";$("fP").value=f.p||"";$("fNs").value=f.ns||"";$("fNe").value=f.ne||"";if(SUP.includes(f.s))$("fS").value=f.s;$("manual").open=true;$("manual").hidden=false;$("ad").hidden=false;$("ad").querySelector("h2").textContent="Modifier la fiche";$("fok").textContent="Enregistrer les modifications";seasonEditor(f);coverUI(true);msg("Modifie les champs puis enregistre.");}
function fill(c){cur={pi:c.affiche||"",ov:c.synopsis||"",seasonEpisodes:c.seasonEpisodes||null,isbn:c.isbn||""};$("fO").value=c.synopsis||"";$("fT").value=c.titre||"";$("fR").value=c.realisateur||"";$("fY").value=c.annee||"";$("fD").value=c.duree||"";$("fG").value=c.genre||"";$("fA").value=c.acteurs||"";$("fP").value=c.production||"";$("fNs").value=c.saisons||"";$("fNe").value=c.episodes||"";if(SUP.includes(c.support))$("fS").value=c.support;if(typ==="s")seasonEditor({seasonEpisodes:c.seasonEpisodes});coverUI(true);
 if(typ==="m"&&!c.synopsis&&(c.affiche||"").startsWith("mb:")){const pi=c.affiche;$("synS").textContent="Récupération des titres…";mbTracks(pi.slice(3)).then(t=>{if(cur.pi!==pi)return;if(t&&!$("fO").value.trim()){$("fO").value=t;cur.ov=t;$("synS").textContent="Titres récupérés sur MusicBrainz."}else $("synS").textContent=""}).catch(()=>{if(cur.pi===pi)$("synS").textContent=""})}
 if(typ==="b"&&!c.synopsis&&c.titre){const me=cur;$("synS").textContent="Recherche du résumé…";bookSyn(c.titre,c.realisateur||"",isbnNorm(c.isbn||"")).then(r=>{if(cur!==me)return;if(r.length&&!$("fO").value.trim()){$("fO").value=r[0].synopsis;cur.ov=r[0].synopsis;$("synS").textContent="Résumé récupéré ("+r[0].src+") : relis-le avant d'enregistrer."}else $("synS").textContent=r.length?"":"Pas de résumé trouvé : colle-le à la main."}).catch(()=>{if(cur===me)$("synS").textContent=""})}}
function seasonEditor(f){ownN=(f&&f.id&&f.ownedSeasons!==undefined&&!Array.isArray(f.seasonsOwned))?f.ownedSeasons:null;seasonEditor0(f);ownUI()}
const seasonChecked=(f,z,seasons)=>{if(Array.isArray(f.seasonsOwned))return f.seasonsOwned.includes(z.season);if(!f.id)return false;
 if(typeof f.ownedSeasons==="number"&&f.ownedSeasons>=0){/* ancienne fiche : on connaît le NOMBRE de saisons possédées, pas lesquelles -> les N premières */return seasons.filter(q=>q.season>=1).map(q=>q.season).sort((a,b)=>a-b).slice(0,f.ownedSeasons).includes(z.season)}
 return true};
function seasonEditor0(f){const seasons=f.seasonEpisodes||cur.seasonEpisodes||[];if(!seasons.length){$("seasonPick").innerHTML="";return}
 $("seasonPick").innerHTML='<div class="w2"><b>Saisons possédées</b><div class="hint">Coche uniquement les saisons que tu as.</div></div>'+seasons.map(z=>`<label class="season-choice"><input type="checkbox" value="${esc(z.season)}" ${seasonChecked(f,z,seasons)?"checked":""}> Saison ${esc(z.season)} · ${esc(z.episodes)} épisode${z.episodes>1?"s":""}</label>`).join("")}
function show(a,src){a=dedupC(a||[]);$("sc").innerHTML="";if(!a.length){msg("Rien trouvé : ouvre « Saisie et retouches manuelles » pour créer la fiche, ou relance une recherche par titre.");$("manual").hidden=false;$("manual").open=true;return}
 const note="Fiche proposée par "+src+" : relis-la avant d'ajouter.";
 if(a.length===1){fill(a[0]);$("manual").hidden=false;$("manual").open=true;msg(note);return}
 msg("Plusieurs possibilités, touche la bonne :");
 a.forEach(c=>{const b=document.createElement("button");b.className="cd";b.textContent=(c.titre||"?")+(c.annee?" ("+c.annee+")":"")+(c.realisateur?" · "+c.realisateur:"")+(c.titreOriginal&&sk(c.titreOriginal)!==sk(c.titre)?" · « "+c.titreOriginal+" »":"");b.onclick=()=>{fill(c);$("manual").hidden=false;$("manual").open=true;$("sc").innerHTML="";msg(note)};$("sc").append(b)})}
/* ---------- réseau : délai maximal, une relance, erreurs lisibles ---------- */
let fseq=0;
async function fj(u,o,ms,tries){tries=tries===undefined?1:tries;
 for(let i=0;;i++){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms||12000);
  try{const r=await fetch(u,Object.assign({},o||{},{signal:c.signal}));
   if(r.ok)return await r.json();
   const e=new Error("HTTP "+r.status);e.status=r.status;
   if(i<tries&&(r.status===429||r.status>=500)){await sleep(900*(i+1));continue}
   throw e}
  catch(e){if(e&&e.status)throw e;
   if(i<tries){await sleep(700);continue}
   if(e&&e.name==="AbortError"){const x=new Error("Délai dépassé");x.timeout=1;throw x}
   throw e}
  finally{clearTimeout(t)}}}
const netMsg=e=>!navigator.onLine?"pas de connexion":e&&e.status===401?"clé TMDB refusée, vérifie-la dans les réglages":e&&e.status===403?"accès refusé par le service":e&&e.status===429?"service saturé, réessaie dans un instant":e&&e.timeout?"réponse trop lente":"service indisponible";
/* ---------- pertinence : score de ressemblance titre / requête, classement, doublons ---------- */
function tmScore(q,names){const Q=sk(q);if(!Q)return 0;const qt=Q.split(" ");let best=0;
 for(const n0 of names){const n=sk(n0);if(!n)continue;if(n===Q)return 100;
  const nt=n.split(" "),c=qt.filter(t=>nt.includes(t)).length;let s=c/Math.max(qt.length,nt.length)*80;
  if(n.startsWith(Q+" ")||Q.startsWith(n+" "))s=Math.max(s,70);else if((" "+n+" ").includes(" "+Q+" "))s=Math.max(s,60);
  best=Math.max(best,s)}
 return best}
function rank(q,y,names,yr,votes,pop,poster){let s=tmScore(q,names);
 if(y&&yr){const d=Math.abs(+yr-+y);s+=d===0?30:d===1?10:-15}
 return s+Math.min(15,Math.log10(1+(votes||0))*4)+Math.min(8,Math.log10(1+(pop||0))*3)+(poster?4:0)}
const dedupC=a=>{const s=new Set();return a.filter(x=>{const k=sk(x.titre)+"|"+(x.annee||"")+"|"+sk(x.realisateur||"");if(s.has(k))return false;s.add(k);return true})};
function splitYear(q,y){const m=String(q).match(/^(.+?)\s*[(\[]\s*((?:19|20)\d{2})\s*[)\]]\s*$/);return m?[m[1].trim(),y||m[2]]:[q,y]}
/* TMDB (clé perso dans les réglages) */
const TK="mt_tmdb_key";
const tkey=()=>(localStorage.getItem(TK)||"").trim();
async function tget(path,p){const k=tkey(),u=new URL("https://api.themoviedb.org/3"+path),h={};
 Object.entries(p||{}).forEach(([a,b])=>u.searchParams.set(a,b));
 if(k.length>40)h.Authorization="Bearer "+k;else u.searchParams.set("api_key",k);
 return fj(u,{headers:h})}
async function tmdb(q,y){const res=(await tget("/search/movie",{query:q,language:"fr-FR",include_adult:"false"})).results||[];
 const top=res.map(m=>({m,s:rank(q,y,[m.title,m.original_title],(m.release_date||"").slice(0,4),m.vote_count,m.popularity,m.poster_path)})).sort((a,b)=>b.s-a.s).slice(0,5);
 return Promise.all(top.map(async({m})=>{
  try{const d=await tget("/movie/"+m.id,{language:"fr-FR",append_to_response:"credits"}),cr=d.credits||{};
   return{titre:d.title||m.title,titreOriginal:d.original_title||"",realisateur:(cr.crew||[]).filter(x=>x.job==="Director").map(x=>x.name).join(", "),duree:d.runtime||"",genre:(d.genres||[]).slice(0,3).map(x=>x.name).join(" / "),annee:(d.release_date||"").slice(0,4),acteurs:(cr.cast||[]).slice(0,5).map(x=>x.name).join(", "),production:(d.production_companies||[]).slice(0,3).map(x=>x.name).join(", ")||"—",affiche:d.poster_path||"",synopsis:d.overview||""}}
  catch(e){return{titre:m.title,titreOriginal:m.original_title||"",realisateur:"",duree:"",genre:"",annee:(m.release_date||"").slice(0,4),acteurs:"",production:"—",affiche:m.poster_path||"",synopsis:m.overview||""}}}))}
/* Wikidata (sans clé, relais) : titres français ET originaux, films et séries */
async function wget(p){const u=new URL("https://www.wikidata.org/w/api.php");Object.entries(Object.assign({format:"json",origin:"*"},p)).forEach(([a,b])=>u.searchParams.set(a,b));
 return fj(u)}
async function wiki(q,y,kind){const S=kind==="s",
 re=S?/s[ée]rie|television series|tv series|web series|anim[ée]e?|miniseries/i:/film|long.m[ée]trage|t[ée]l[ée]film|movie/i,
 sr=l=>wget({action:"wbsearchentities",search:q,language:l,uselang:l,type:"item",limit:10}).then(j=>j.search||[]);
 const [f,e]=await Promise.all([sr("fr"),sr("en").catch(()=>[])]),seen=new Set(),all=[];
 [...f,...e].forEach(x=>{if(!seen.has(x.id)){seen.add(x.id);all.push(x)}});
 const ids=all.filter(x=>re.test(x.description||"")).map(x=>({x,s:rank(q,y,[x.label,x.match&&x.match.text],((String(x.description||"").match(/\b(?:19|20)\d{2}\b/)||[""])[0]),0,0,false)})).sort((a,b)=>b.s-a.s).slice(0,3).map(z=>z.x.id);
 if(!ids.length)return[];
 const E=(await wget({action:"wbgetentities",ids:ids.join("|"),props:"claims|labels",languages:"fr|en"})).entities||{};
 const val=(c,p)=>(c[p]||[]).map(z=>z.mainsnak&&z.mainsnak.datavalue&&z.mainsnak.datavalue.value).filter(Boolean);
 const qid=(c,p,n)=>val(c,p).filter(v=>v.id).slice(0,n).map(v=>v.id);
 const need=new Set(),rows=ids.filter(id=>E[id]).map(id=>{const e=E[id],c=e.claims||{},dir=S?[...qid(c,"P170",3),...qid(c,"P57",3)].slice(0,3):qid(c,"P57",3),prod=S?[...qid(c,"P449",3),...qid(c,"P272",3)].slice(0,3):qid(c,"P272",3),r={e,dir,gen:qid(c,"P136",3),act:qid(c,"P161",5),prod};
  [...r.dir,...r.gen,...r.act,...r.prod].forEach(i=>need.add(i));return r});
 const L={};if(need.size){const l=(await wget({action:"wbgetentities",ids:[...need].slice(0,50).join("|"),props:"labels",languages:"fr|en"})).entities||{};
  for(const k in l){const lb=l[k].labels||{};L[k]=(lb.fr||lb.en||{}).value||""}}
 const nm=a=>a.map(i=>L[i]).filter(Boolean),num=v=>{const z=v&&v.amount?parseInt(v.amount,10):0;return z>0?z:""};
 return rows.map(r=>{const c=r.e.claims||{},lb=r.e.labels||{},du=val(c,"P2047")[0];
  const yrs=[...val(c,S?"P580":"P577"),...(S?val(c,"P577"):[])].map(t=>t&&t.time?(t.time.match(/\d{4}/)||[""])[0]:"").filter(Boolean).map(Number);
  let min="";if(du&&du.amount){const u=du.unit||"",a=parseFloat(du.amount);min=Math.round(/Q25235$/.test(u)?a*60:/Q11574$/.test(u)?a/60:a)}
  const fr=(lb.fr||{}).value,en=(lb.en||{}).value;
  const o={titre:fr||en||q,titreOriginal:fr&&en&&sk(fr)!==sk(en)?en:"",realisateur:nm(r.dir).join(", "),duree:min,genre:nm(r.gen).join(" / "),annee:yrs.length?String(Math.min(...yrs)):"",acteurs:nm(r.act).join(", "),production:nm(r.prod).join(", ")||"—"};
  if(S){o.saisons=num(val(c,"P2437")[0]);o.episodes=num(val(c,"P1113")[0])}
  return o})}
async function tmdbTv(q,y){const res=(await tget("/search/tv",{query:q,language:"fr-FR",include_adult:"false"})).results||[];
 const top=res.map(m=>({m,s:rank(q,y,[m.name,m.original_name],(m.first_air_date||"").slice(0,4),m.vote_count,m.popularity,m.poster_path)})).sort((a,b)=>b.s-a.s).slice(0,4);
 return Promise.all(top.map(async({m},i)=>{
  try{const d=await tget("/tv/"+m.id,{language:"fr-FR",append_to_response:"credits"}),cr=d.credits||{},pc=d.production_companies&&d.production_companies.length?d.production_companies:(d.networks||[]);
   const reg=(d.seasons||[]).filter(z=>z.season_number>0).sort((a,b)=>a.season_number-b.season_number);
   const seasonEpisodes=await Promise.all(reg.map(async s=>{if(i>1)return{season:s.season_number,episodes:s.episode_count||0};
    try{const sd=await tget("/tv/"+m.id+"/season/"+s.season_number,{language:"fr-FR"});return{season:s.season_number,episodes:(sd.episodes||[]).length}}catch(e){return{season:s.season_number,episodes:s.episode_count||0}}}));
   return{titre:d.name||m.name,titreOriginal:d.original_name||"",realisateur:(d.created_by||[]).map(x=>x.name).join(", "),duree:(d.episode_run_time||[])[0]||(d.last_episode_to_air||{}).runtime||"",genre:(d.genres||[]).slice(0,3).map(x=>x.name).join(" / "),annee:(d.first_air_date||"").slice(0,4),acteurs:(cr.cast||[]).slice(0,5).map(x=>x.name).join(", "),production:pc.slice(0,3).map(x=>x.name).join(", ")||"—",affiche:d.poster_path||"",synopsis:d.overview||"",saisons:d.number_of_seasons||"",episodes:d.number_of_episodes||"",seasonEpisodes}}
  catch(e){return{titre:m.name,titreOriginal:m.original_name||"",realisateur:"",duree:"",genre:"",annee:(m.first_air_date||"").slice(0,4),acteurs:"",production:"—",affiche:m.poster_path||"",synopsis:m.overview||"",saisons:"",episodes:"",seasonEpisodes:null}}}))}
function musicUI(M){SUP=M?SUPM:SUPF;sup.clear();setOptA(!M);const o=a=>a.map(v=>"<option>"+v+"</option>").join("");
 $("su").innerHTML='<option value="">Tous les supports</option>'+o(SUP);$("fS").innerHTML=o(SUP);
 $("s").querySelector("option[value=r]").textContent=M?"Artiste":"Réalisateur";
 $("fr").placeholder=M?"Artiste":"Réalisateur";$("fpr").placeholder=M?"Label":"Maison de production";$("fP").placeholder=$("fpr").placeholder;
 $("fa").hidden=M;$("fA").hidden=M;$("fO").placeholder=M?"Liste des titres, un par ligne (## Disque 2 pour séparer les disques)":"Synopsis";$("syn").textContent=M?"↻ Récupérer les titres":"↻ Récupérer le synopsis";$("synA").style.display=M?"none":"";
 ["sdir","sact"].forEach(i=>{const e=$(i);if(!e)return;const w=e.closest(".clear-wrap,.dd")||e;w.style.display=M?"none":"";if(M)e.value=""});$("bcr").hidden=false;$("fG").placeholder=M?"Style (ex. Rock / Rap / Électro)":"Genre (ex. Comédie / Action)";$("s").querySelector("option[value=g]").textContent=M?"Style":"Genre";$("q").placeholder=M?"Album, artiste ou label":"Titre, réalisateur, acteur ou production";
 $("cam").textContent=M?"📷 Photo pochette":"📷 Photo jaquette";$("sq").placeholder=M?"Cherche par titre ou artiste":"Cherche par titre";
 if(M){$("dice").textContent="🎲 Tire-moi un album";$("sst").options[0].textContent="Pas encore écoutés";$("sst").options[1].textContent="Écoutés ou non";
  $("st").innerHTML='<option value="">Écoutés ou non</option><option value="vu">Écoutés</option><option value="nv">Pas encore écoutés</option><option value="pr">Prêtés</option>'}}

/* ---------- livres : Google Livres (sans clé), Open Library en secours ---------- */
const SDU0=$("sdu").innerHTML;
const GBC={"Fiction":"Fiction","Comics & Graphic Novels":"BD","Juvenile Fiction":"Jeunesse","Juvenile Nonfiction":"Jeunesse","Biography & Autobiography":"Biographie","History":"Histoire","Science":"Science","Humor":"Humour","Poetry":"Poésie","Drama":"Théâtre","Philosophy":"Philosophie","Cooking":"Cuisine","Travel":"Voyage","Art":"Art","Psychology":"Psychologie","Self-Help":"Développement personnel","Business & Economics":"Économie","Fantasy":"Fantasy","Science Fiction":"Science-fiction","Thrillers":"Thriller","Mystery & Detective":"Policier","Romance":"Romance","Horror":"Horreur"};
const htmlTxt=s=>{try{return new DOMParser().parseFromString(String(s||"").replace(/<br\s*\/?>|<\/p>/gi,"\n"),"text/html").body.textContent.replace(/[ \t]+/g," ").replace(/\n\s*\n+/g,"\n").trim()}catch(e){return String(s||"").replace(/<[^>]*>/g," ").trim()}};
const gbMap=v=>{const i=v.volumeInfo||{},cat=(i.categories||[]).join(" / "),low=cat.toLowerCase();
 const gen=[...new Set(cat.split(/\s*\/\s*/).map(c=>GBC[c]).filter(Boolean))].slice(0,3).join(" / ");
 const sup=/manga/.test(low)?"Manga":/comics|graphic/.test(low)?"BD":/juvenile|children/.test(low)?"Jeunesse":/fiction|novel|literary/.test(low)?"Roman":/biograph|history|science|philosoph|psycholog|business|self-help/.test(low)?"Essai":"";
 return{titre:(i.title||"")+(i.subtitle?" : "+i.subtitle:""),realisateur:(i.authors||[]).join(", "),annee:(i.publishedDate||"").slice(0,4),duree:i.pageCount||"",genre:gen,production:i.publisher||"",synopsis:htmlTxt(i.description),affiche:i.imageLinks&&v.id?"gb:"+v.id:"",support:sup,acteurs:""}};
const GBK="mt_gbooks_key";
const gbkey=()=>{try{return(localStorage.getItem(GBK)||"").trim()}catch(e){return""}};
/* Google Livres : avec ta clé si elle existe ; si Google la refuse (400/403), on retente sans clé plutôt que de planter */
async function gbJ(u,ms){const k=gbkey();if(!k)return fj(u,undefined,ms,1);try{return await fj(u+"&key="+encodeURIComponent(k),undefined,ms,1)}catch(e){if(e&&(e.status===400||e.status===403))return fj(u,undefined,ms,1);throw e}}
async function gbSearch(q,n){const j=await gbJ("https://www.googleapis.com/books/v1/volumes?printType=books&country=FR&maxResults="+(n||8)+"&q="+encodeURIComponent(q),9000);return(j.items||[]).map(gbMap).filter(x=>x.titre)}
async function olSearch(p){const j=await fj("https://openlibrary.org/search.json?limit=8&fields=title,author_name,first_publish_year,number_of_pages_median,publisher,cover_i&"+p,undefined,9000,1);
 return(j.docs||[]).map(d=>({titre:d.title||"",realisateur:(d.author_name||[]).slice(0,3).join(", "),annee:d.first_publish_year?String(d.first_publish_year):"",duree:d.number_of_pages_median||"",genre:"",production:(d.publisher||[])[0]||"",synopsis:"",affiche:d.cover_i?"ol:"+d.cover_i:"",support:"",acteurs:""})).filter(x=>x.titre)}
/* doublons : même titre + même auteur (nom de famille) ; on fusionne les infos des deux sources */
const dedupBooks=a=>{const m=new Map();a.forEach(x=>{const pa=sk(String(x.realisateur||"").split(",")[0]).split(" ").filter(Boolean),au=(pa.pop()||"")+(pa.length?pa[0][0]:""),k=sk(x.titre)+"|"+au,o=m.get(k);
 if(!o)m.set(k,Object.assign({},x));else for(const f in x)if(!o[f]&&x[f])o[f]=x[f]});return[...m.values()]};
const rankBooks=(q,a,au)=>{const qt=sk(q+" "+(au||"")).split(" ").filter(Boolean);return a.map((x,i)=>{const hay=sk(x.titre+" "+x.realisateur).split(" "),cov=qt.filter(t=>hay.includes(t)).length/Math.max(1,qt.length);
 return{x,s:cov*60+tmScore(q,[x.titre])*.4+(au?tmScore(au,[x.realisateur])*.2:0)+(x.affiche?3:0)+(x.synopsis?2:0)+(x.duree?1:0)-i*.3}}).sort((p,r)=>r.s-p.s).map(z=>z.x)};
/* q = titre, au = auteur (facultatif) : on interroge « titre » ET « auteur » séparément, puis on élargit si rien */
/* q = titre, au = auteur (facultatif). Google Livres et Open Library sont interrogés EN MÊME TEMPS : si l'un est saturé ou lent, l'autre répond quand même */
async function findBook(q,au){$("sc").innerHTML="";const c=q.replace(/[\s-]/g,"");
 if(!au&&/^(\d{13}|\d{9}[\dXx])$/.test(c)){await lookupISBN(c);return}
 const my=++fseq,Q=q.replace(/"/g," ").replace(/\s+/g," ").trim(),A=String(au||"").replace(/"/g," ").replace(/\s+/g," ").trim();msg("Recherche en cours…");
 const okv=r=>r.status==="fulfilled"?r.value:[],erv=r=>r.status==="rejected"?r.reason:null;
 const both=async(g,o)=>{const rs=await Promise.allSettled([g(),o()]);return{a:okv(rs[0]),o:okv(rs[1]),ge:erv(rs[0]),oe:erv(rs[1])}};
 let r=A?await both(()=>gbSearch('intitle:"'+Q+'" inauthor:"'+A+'"',10),()=>olSearch("title="+encodeURIComponent(Q)+"&author="+encodeURIComponent(A)))
  :await both(()=>gbSearch(Q,10),()=>olSearch("q="+encodeURIComponent(Q)));
 if(A&&!r.a.length&&!r.o.length&&!(r.ge&&r.oe))r=await both(()=>gbSearch(Q+" "+A,10),()=>olSearch("q="+encodeURIComponent(Q+" "+A)));
 if(my!==fseq)return;
 if(r.ge&&r.oe){msg("Recherche impossible ("+netMsg(r.ge)+") : réessaie dans un instant, ou remplis la fiche à la main.");return}
 const src=r.a.length&&r.o.length?"Google Livres + Open Library":r.a.length?"Google Livres":"Open Library";
 show(rankBooks(Q,dedupBooks(r.a.concat(r.o)),A).slice(0,6),src)}
/* ISBN : nettoyage, ISBN-10 <-> ISBN-13, contrôle de la clé */
const isbn13c=d=>{let t=0;for(let i=0;i<12;i++)t+=(+d[i])*(i%2?3:1);return(10-t%10)%10};
const isbn10c=d=>{let t=0;for(let i=0;i<9;i++)t+=(+d[i])*(10-i);const r=(11-t%11)%11;return r===10?"X":String(r)};
function isbnNorm(v){const c=String(v||"").toUpperCase().replace(/[^0-9X]/g,"");
 if(/^\d{9}[\dX]$/.test(c)){let i13="978"+c.slice(0,9);i13+=isbn13c(i13);return{ok:isbn10c(c)===c[9],i10:c,i13}}
 if(/^\d{13}$/.test(c)){const ok=isbn13c(c)===+c[12];const i10=/^978/.test(c)?c.slice(3,12)+isbn10c(c.slice(3,12)):"";return{ok,i10,i13:c}}
 return null}
const gbVol=async id=>{try{return gbMap(await gbJ("https://www.googleapis.com/books/v1/volumes/"+encodeURIComponent(id)+"?country=FR",9000))}catch(e){return null}};
/* source 1 : Google Livres (ISBN-13 puis ISBN-10 ; le résumé complet est pris dans la fiche détaillée si la liste n'en a pas) */
async function isbnGB(n){let out=[],err=null;
 for(const q of [n.i13,n.i10].filter(Boolean)){try{const r=await gbSearch("isbn:"+q,3);if(r.length){out=r;break}}catch(e){err=e}}
 if(!out.length){if(err)throw err;return[]}
 if(!out[0].synopsis&&out[0].affiche){const d=await gbVol(out[0].affiche.slice(3));if(d&&d.synopsis)out[0].synopsis=d.synopsis}
 return out}
/* source 2 : Open Library (fiche de l'édition + fiche de l'œuvre pour le résumé et l'auteur) */
/* source 2 : Open Library (fiche de l'édition + fiche de l'œuvre pour le résumé et l'auteur) ; délai court, pas de relance : on ne bloque plus les autres sources */
async function isbnOL(n){let ed=null,err=null;const f=u=>fj(u,undefined,7000,0);
 for(const q of [n.i13,n.i10].filter(Boolean)){try{ed=await f("https://openlibrary.org/isbn/"+q+".json");if(ed&&ed.title)break}catch(e){if(!(e&&e.status===404))err=e}}
 if(!ed||!ed.title){if(err)throw err;return[]}
 const tx=v=>v?(typeof v==="string"?v:(v.value||"")):"";let syn=tx(ed.description),au="";
 try{const wk=(ed.works||[])[0];if(wk&&wk.key){const w=await f("https://openlibrary.org"+wk.key+".json");if(!syn)syn=tx(w.description);
  const ks=(w.authors||[]).map(z=>z.author&&z.author.key).filter(Boolean).slice(0,2);
  au=(await Promise.all(ks.map(k=>f("https://openlibrary.org"+k+".json").then(z=>z.name||"").catch(()=>"")))).filter(Boolean).join(", ")}}catch(e){}
 const cov=(ed.covers||[]).find(z=>z>0);
 return[{titre:ed.title+(ed.subtitle?" : "+ed.subtitle:""),realisateur:au,annee:((ed.publish_date||"").match(/\d{4}/)||[""])[0],duree:ed.number_of_pages||"",genre:"",production:(ed.publishers||[])[0]||"",synopsis:htmlTxt(syn),affiche:cov?"ol:"+cov:"",support:"",acteurs:""}]}
/* source 3 : Open Library, interface « api/books » : un seul appel (titre, auteurs, éditeur, pages), répond vite même quand la source 2 traîne */
async function isbnOL2(n){const k=[n.i13,n.i10].filter(Boolean).map(v=>"ISBN:"+v).join(","),j=await fj("https://openlibrary.org/api/books?format=json&jscmd=data&bibkeys="+k,undefined,8000,0),d=Object.values(j||{})[0];
 if(!d||!d.title)return[];
 return[{titre:d.title+(d.subtitle?" : "+d.subtitle:""),realisateur:(d.authors||[]).map(a=>a.name).filter(Boolean).join(", "),annee:((d.publish_date||"").match(/\d{4}/)||[""])[0],duree:d.number_of_pages||"",genre:"",production:((d.publishers||[])[0]||{}).name||"",synopsis:"",affiche:"",support:"",acteurs:""}]}
/* un même ISBN = une même édition : les 3 sources partent en parallèle, la fiche s'affiche dès la première réponse, les suivantes complètent seulement les champs encore vides */
const LATE={fT:"titre",fR:"realisateur",fY:"annee",fD:"duree",fG:"genre",fP:"production",fO:"synopsis"};
function lateFill(m){for(const id in LATE){const e=$(id),v=m[LATE[id]];if(e&&v&&!String(e.value).trim()){e.value=v;if(id==="fO"&&cur)cur.ov=v}}if(cur&&!cur.pi&&m.affiche)cur.pi=m.affiche;coverUI()}
async function lookupISBN(raw){const c=String(raw).replace(/[^0-9Xx]/g,""),n=isbnNorm(c);$("sq").value=c;$("sc").innerHTML="";$("ocrl").innerHTML="";
 if(!n){msg("« "+c+" » n'est pas un ISBN valide (10 ou 13 chiffres) : vérifie le code ou cherche par titre.");return false}
 const my=++fseq,warn=n.ok?"":" Attention : la clé de contrôle de cet ISBN est incorrecte, vérifie le code.",acc={},names=[],errs=[];let shown=false;
 const apply=(name,arr)=>{if(my!==fseq||!arr||!arr.length)return;
  for(const f in arr[0])if(!acc[f]&&arr[0][f])acc[f]=arr[0][f];
  acc.isbn=n.i13;if(!names.includes(name))names.push(name);
  if(!shown){shown=true;fill(acc);$("manual").hidden=false;$("manual").open=true;$("sc").innerHTML=""}else lateFill(acc);
  msg("Fiche proposée par "+names.join(" + ")+" (ISBN "+n.i13+") : relis-la avant d'ajouter."+warn)};
 const run=(name,fn)=>fn().then(r=>apply(name,r)).catch(e=>{errs.push(e)});
 msg("ISBN "+n.i13+" : recherche dans Google Livres et Open Library…");
 await Promise.all([run("Google Livres",()=>isbnGB(n)),run("Open Library",()=>isbnOL(n)),run("Open Library",()=>isbnOL2(n))]);
 if(my!==fseq)return shown;
 if(!shown){msg("ISBN "+n.i13+" : deuxième tentative…");
  await Promise.all([run("Google Livres",()=>gbSearch(n.i13,3)),run("Open Library",()=>olSearch("isbn="+n.i13)),run("Open Library",()=>olSearch("q="+n.i13))]);
  if(my!==fseq)return shown}
 if(!shown){cur=Object.assign({},cur,{isbn:n.i13});$("manual").hidden=false;$("manual").open=true;
  msg((errs.length>=4?"Recherche impossible ("+netMsg(errs[0])+")":"ISBN "+n.i13+" introuvable dans Google Livres et Open Library")+" : l'ISBN est déjà noté dans la fiche, tape le titre et l'auteur, ou lance une recherche par titre."+warn);return false}
 return true}
/* résumé d'un livre : ISBN (si connu) d'abord, puis recherche par titre ; plusieurs sources, on garde celles qui ont un texte */
async function bookSyn(t,au,is){const out=[],q=v=>String(v||"").replace(/"/g," ").trim(),jobs=[];
 if(is){jobs.push(isbnGB(is).then(r=>r.map(x=>[x,"Google Livres (ISBN)"])),isbnOL(is).then(r=>r.map(x=>[x,"Open Library (ISBN)"])))}
 jobs.push((async()=>{const r=await gbSearch('intitle:"'+q(t)+'"'+(au?' inauthor:"'+q(au)+'"':""),8),top=rankBooks(t,r,au).filter(x=>tmScore(t,[x.titre])>=50).slice(0,4),res=[];
  for(const x of top){if(!x.synopsis&&x.affiche){const d=await gbVol(x.affiche.slice(3));if(d)x.synopsis=d.synopsis}res.push([x,"Google Livres"])}return res})());
 jobs.push((async()=>{const j=await fj("https://openlibrary.org/search.json?limit=4&fields=key,title,first_publish_year&title="+encodeURIComponent(t)+(au?"&author="+encodeURIComponent(au):"")),res=[];
  for(const d of(j.docs||[]).filter(d=>tmScore(t,[d.title])>=60).slice(0,3)){try{const w=await fj("https://openlibrary.org"+d.key+".json"),v=w.description;res.push([{titre:d.title,annee:d.first_publish_year||"",synopsis:htmlTxt(v&&v.value?v.value:v)},"Open Library"])}catch(e){}}return res})());
 const rs=await Promise.allSettled(jobs);
 rs.forEach(r=>{if(r.status==="fulfilled")r.value.forEach(([x,src])=>{if(x&&x.synopsis&&x.synopsis.length>10&&!out.some(o=>o.synopsis===x.synopsis))out.push({...x,src})})});
 if(!out.length&&rs.every(r=>r.status==="rejected"))throw rs[0].reason;
 return out}
function bookUI(B){const o=a=>a.map(v=>"<option>"+v+"</option>").join(""),ov=a=>a.map(v=>'<option value="'+v+'">'+v+'</option>').join(""),sel=v=>$("s").querySelector("option[value="+v+"]");
 if(B){SUP=SUPB;sup.clear();$("su").innerHTML='<option value="">Tous les types</option>'+o(SUPB);$("fS").innerHTML=o(SUPB);$("su").setAttribute("aria-label","Type");
  sel("r").textContent="Auteur";sel("l").textContent="Pages";sel("s").textContent="Type";sel("p").textContent="Éditeur";setOptA(false)
  $("fr").placeholder="Auteur";$("fpr").placeholder="Éditeur";$("fP").placeholder="Éditeur";$("fa").hidden=true;$("fA").hidden=true;
  $("fO").placeholder="Résumé";$("syn").textContent="↻ Récupérer le résumé";$("synA").style.display="none";
  $("fG").placeholder="Genre (ex. Polar / SF / Fantasy)";$("q").placeholder="Titre, auteur ou éditeur";
  $("cam").textContent="📷 Photo couverture";$("sq").placeholder="Titre, auteur ou ISBN";$("bcr").hidden=false;
  $("dice").textContent="🎲 Tire-moi un livre";$("sst").options[0].textContent="Pas encore lus";$("sst").options[1].textContent="Lus ou non";
  $("st").innerHTML='<option value="">Lus ou non</option><option value="vu">Lus</option><option value="nv">Pas encore lus</option><option value="pr">Prêtés</option>';
  $("du").innerHTML='<option value="">Toutes les longueurs</option>'+ov([...TRB,"Non renseignée"]);
  $("sdu").innerHTML='<option value="">Longueur : peu importe</option><option value="150">Moins de 150 pages</option><option value="300">Moins de 300 pages</option><option value="500">Moins de 500 pages</option>'}
 else{sel("l").textContent="Durée";sel("s").textContent="Support";sel("p").textContent="Production / label";setOptA(typ!=="m")
  $("su").setAttribute("aria-label","Support");$("du").innerHTML='<option value="">Toutes les durées</option>'+ov([...TR,"Non renseignée"]);$("sdu").innerHTML=SDU0}}
/* Scanner de code-barres : BarcodeDetector si dispo, sinon ZXing chargé à la demande */
let bstream=null,bstop=null;
function bsClose(){if(bstop){try{bstop()}catch(e){}bstop=null}if(bstream){bstream.getTracks().forEach(t=>t.stop());bstream=null}$("bv").srcObject=null;$("bs").hidden=true}
const loadZX=()=>window.ZXing?Promise.resolve():new Promise((a,b)=>{const e=document.createElement("script");e.src="https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js";e.onload=a;e.onerror=b;document.head.append(e)});
const chk=c=>{const d=c.split("").map(Number),k=d.pop();let t=0;d.reverse().forEach((v,i)=>t+=v*(i%2?1:3));return(10-t%10)%10===k};
/* UPC-E (8 chiffres : système 0 ou 1 + 6 chiffres + clé) -> UPC-A (12 chiffres) ; "" si la clé ne correspond pas */
const upceToA=c=>{if(!/^[01]\d{7}$/.test(c))return"";const n=c[0],d=c.slice(1,7),k=c[7],m=d[5];let b;if(m<="2")b=d.slice(0,2)+m+"0000"+d.slice(2,5);else if(m==="3")b=d.slice(0,3)+"00000"+d.slice(3,5);else if(m==="4")b=d.slice(0,4)+"00000"+d[4];else b=d.slice(0,5)+"0000"+m;const a=n+b+k;return chk(a)?a:""};
const ean=c=>{c=String(c);if(!/^\d+$/.test(c))return false;if(c.length===13||c.length===12)return chk(c);if(c.length===8)return chk(c)||!!upceToA(c);return false};
const bcVars=c=>{c=String(c).replace(/\D/g,"");const o=[c];if(c.length===8){const a=upceToA(c);if(a){o.push(a);o.push("0"+a)}}if(c.length===12)o.push("0"+c);if(c.length===13&&c[0]==="0")o.push(c.slice(1));return[...new Set(o.filter(Boolean))]};
async function scanCode(){let done=false,last="",hits=0;$("bm").textContent="Vise le code-barres, bien à plat et bien éclairé…";$("bs").hidden=false;
 const ok=c=>{if(done||!ean(c))return;if(c===last)hits++;else{last=c;hits=1}if(hits<2)return;done=true;bsClose();lookupBC(c)};
 try{bstream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"},width:{ideal:1920},height:{ideal:1080}},audio:false});
  const tr=bstream.getVideoTracks()[0];try{const cp=tr.getCapabilities?tr.getCapabilities():{};if(cp.focusMode&&cp.focusMode.includes("continuous"))await tr.applyConstraints({advanced:[{focusMode:"continuous"}]})}catch(e){}
  const v=$("bv");v.srcObject=bstream;await v.play();let on=true;bstop=()=>{on=false};
  if("BarcodeDetector"in window){const d=new BarcodeDetector({formats:["ean_13","ean_8","upc_a","upc_e"]});
   const tick=async()=>{if(!on)return;try{const r=await d.detect(v);if(r.length)ok(r[0].rawValue)}catch(e){}setTimeout(tick,150)};tick()}
  else{await loadZX();const Z=window.ZXing,h=new Map(),rd=new Z.MultiFormatReader(),cv=document.createElement("canvas"),cx=cv.getContext("2d",{willReadFrequently:true});
   h.set(Z.DecodeHintType.POSSIBLE_FORMATS,[Z.BarcodeFormat.EAN_13,Z.BarcodeFormat.EAN_8,Z.BarcodeFormat.UPC_A,Z.BarcodeFormat.UPC_E]);h.set(Z.DecodeHintType.TRY_HARDER,true);rd.setHints(h);
   let n=0;const tick=()=>{if(!on)return;if(v.videoWidth){const W=v.videoWidth,H=v.videoHeight;
     /* on alterne image entière / bande centrale (plus nette et plus rapide) */
     const crop=n++%2===0,sw=crop?W*.8:W,sh=crop?H*.4:H,sx=(W-sw)/2,sy=(H-sh)/2,k=Math.min(1,1280/sw);cv.width=Math.round(sw*k);cv.height=Math.round(sh*k);cx.drawImage(v,sx,sy,sw,sh,0,0,cv.width,cv.height);
     try{ok(rd.decode(new Z.BinaryBitmap(new Z.HybridBinarizer(new Z.HTMLCanvasElementLuminanceSource(cv)))).getText())}catch(e){}}setTimeout(tick,120)};tick()}}
 catch(e){bsClose();msg("Caméra indisponible : autorise-la dans les réglages du navigateur, ou tape le code-barres dans la recherche.")}}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function mbget(u,t=2){return fj(u,undefined,12000,t)}
/* films / séries : code-barres -> titre du produit (UPCitemdb, gratuit sans compte, quota journalier) -> recherche normale */
const cleanVT=v=>String(v).replace(/[\[(][^\])]*[\])]/g," ").replace(/\b(blu[ -]?ray|dvd|4k|uhd|ultra hd|hd|steelbook|coffret|edition|édition|collector|widescreen|import|combo|disc|disque|digital copy)\b/gi," ").replace(/\b(19|20)\d{2}\b\s*$/,"").replace(/[-–:+]+\s*$/,"").replace(/\s+/g," ").trim();
async function lookupBCvideo(c){c=String(c).replace(/\D/g,"");$("sq").value=c;$("sc").innerHTML="";$("ocrl").innerHTML="";msg("Code "+c+" : recherche…");
 const vars=bcVars(c);let items=[],err=null;
 for(const v of vars){try{items=(await fj("https://api.upcitemdb.com/prod/trial/lookup?upc="+v,undefined,12000,0)).items||[];if(items.length)break}catch(e){err=e;if(e&&e.status===429)break}}
 if(!items.length){msg(err?"Recherche par code-barres indisponible ("+(err.status===429?"quota gratuit du jour atteint":netMsg(err))+") : tape le titre dans la recherche.":"Code "+c+" absent des bases gratuites (fréquent sur les DVD / Blu-ray français) : cherche par titre.");return false}
 const raw=String(items[0].title||""),su=/4k|uhd|ultra hd/i.test(raw)?"4K UHD":/blu[ -]?ray/i.test(raw)?"Blu-ray":/dvd/i.test(raw)?"DVD":"",ti=cleanVT(raw),yr=(raw.match(/\b(19|20)\d{2}\b/)||[""])[0];
 if(!ti){msg("Code trouvé mais titre inexploitable : cherche par titre.");return false}
 $("sq").value=ti;await find(ti,yr);if(su&&SUP.includes(su))$("fS").value=su;$("sm").textContent+=" (code "+c+" → « "+raw.slice(0,60)+" »)";return true}
async function lookupBC(c){if(typ==="b")return await lookupISBN(c);if(typ==="f"||typ==="s")return await lookupBCvideo(c);c=String(c).replace(/\D/g,"");$("sq").value=c;$("sc").innerHTML="";msg("Code "+c+" : recherche…");
 /* UPC (12) et EAN (13 avec 0 devant) sont le même code : on essaie les deux écritures */
 const vars=bcVars(c);
 try{let rs=[];
  for(const v of vars){const u=new URL("https://musicbrainz.org/ws/2/release/");u.searchParams.set("query",'barcode:"'+v+'"');u.searchParams.set("fmt","json");u.searchParams.set("limit","8");
   rs=(await mbget(u)).releases||[];if(rs.length)break;await sleep(1100)}
  if(!rs.length){msg("Code "+c+" absent de MusicBrainz (fréquent sur les éditions rares) : cherche par titre.");return false}
  const fm=x=>{const f=((x.media||[])[0]||{}).format||"";return/vinyl|12"|7"|10"/i.test(f)?"Vinyle":/cass/i.test(f)?"K7":/digital/i.test(f)?"MP3":"CD"},seenRG=new Set(),a=[];
  for(const x of rs){const g=x["release-group"]&&x["release-group"].id;if(g&&seenRG.has(g))continue;if(g)seenRG.add(g);
   a.push({titre:x.title,realisateur:(x["artist-credit"]||[]).map(z=>z.name).join(", "),annee:(x.date||"").slice(0,4),affiche:g?"mb:"+g:"",support:fm(x),genre:"",production:((x["label-info"]||[])[0]||{}).label?((x["label-info"]||[])[0].label.name||""):"",duree:"",acteurs:"",synopsis:"",g})}
  for(const c2 of a.slice(0,3)){if(!c2.g)continue;try{await sleep(1100);const t=await mbget("https://musicbrainz.org/ws/2/release-group/"+c2.g+"?inc=tags&fmt=json",1);c2.genre=(t.tags||[]).sort((p,q)=>q.count-p.count).slice(0,3).map(z=>z.name).join(" / ")}catch(e){}}
  show(a.slice(0,3),"MusicBrainz (code-barres)");return true}
 catch(e){msg(navigator.onLine?"MusicBrainz ne répond pas : réessaie dans un instant ou cherche par titre.":"Pas de connexion : remplis la fiche à la main.")}}
$("bc").onclick=scanCode;$("bx").onclick=bsClose;
/* MusicBrainz (sans clé) + pochettes Cover Art Archive */
async function mbTracks(rg){const j=await mbget("https://musicbrainz.org/ws/2/release-group/"+rg+"?inc=releases&fmt=json",1);
 const rs=(j.releases||[]).slice().sort((a,b)=>((a.status==="Official"?0:1)-(b.status==="Official"?0:1))||String(a.date||"9").localeCompare(String(b.date||"9")));
 for(const r of rs.slice(0,3)){await sleep(1100);const d=await mbget("https://musicbrainz.org/ws/2/release/"+r.id+"?inc=recordings&fmt=json",1),md=d.media||[];if(!md.some(m=>(m.tracks||[]).length))continue;
  return md.map((m,i)=>{const t=(m.tracks||[]).map(x=>x.title||(x.recording||{}).title||"").filter(Boolean);return(md.length>1?"## "+(m.title||"Disque "+(i+1))+"\n":"")+t.join("\n")}).join("\n")}
 return""}
const MBX=/live|compilation|soundtrack|remix|demo|mixtape|dj-mix|interview|spokenword|audiobook/i;
async function mbz(q,y,au){const cl=v=>String(v||"").replace(/[+\-&|!(){}\[\]^"~*?:\\\/]/g," ").replace(/\s+/g," ").trim(),c=cl(q),A=cl(au);if(!c)return[];
 const run=async query=>{const u=new URL("https://musicbrainz.org/ws/2/release-group/");u.searchParams.set("query",query+(y?" AND firstreleasedate:"+y:""));u.searchParams.set("fmt","json");u.searchParams.set("limit","15");return(await mbget(u))["release-groups"]||[]};
 let list=[];
 if(A){list=await run('releasegroup:("'+c+'") AND artist:("'+A+'")');if(!list.length)list=await run("(releasegroup:("+c+" "+A+") OR artist:("+c+" "+A+"))")}
 else list=await run("(releasegroup:("+c+") OR artist:("+c+"))");
 const full=(c+" "+A).trim(),qt=sk(full).split(" ").filter(Boolean);
 const rows=list.map(x=>{const art=(x["artist-credit"]||[]).map(a=>a.name).join(", "),hay=sk(x.title+" "+art).split(" "),cov=qt.filter(t=>hay.includes(t)).length/Math.max(1,qt.length),pt=x["primary-type"]||"",st=(x["secondary-types"]||[]).join(" "),yr=(x["first-release-date"]||"").slice(0,4);
  let s=(x.score||0)*.4+cov*50+(sk(x.title)===sk(c)?25:0)+(pt==="Album"?15:pt==="EP"?5:pt==="Single"?-12:0)-(st&&!MBX.test(full)?15:0);
  if(y&&yr)s+=+yr===+y?20:Math.abs(yr-y)===1?6:0;
  return{s,v:{titre:x.title,realisateur:art,annee:yr,genre:(x.tags||[]).sort((a,b)=>b.count-a.count).slice(0,3).map(t=>t.name).join(" / "),affiche:"mb:"+x.id,production:"",duree:"",acteurs:"",synopsis:""}}}).sort((a,b)=>b.s-a.s);
 return dedupC(rows.map(r=>r.v)).slice(0,6)}
async function find(q,y,au){const my=++fseq,ms2=t=>{if(my===fseq)msg(t)},sh2=(a,s)=>{if(my===fseq)show(a,s)};
 if(typ==="f"||typ==="s"){const r=splitYear(q,y);q=r[0];y=r[1]}
 if(typ==="b"||typ==="m"){au=String(au||"").trim();if(!au){const m=q.split(/\s+[·|—]\s+/);if(m.length===2&&m[0].trim()&&m[1].trim()){q=m[0].trim();au=m[1].trim()}}}
 if(typ==="b"){await findBook(q,au);return}
 if((typ==="f"||typ==="s"||typ==="m")&&/^[\d\s-]{8,16}$/.test(q)&&ean(q.replace(/\D/g,""))){await lookupBC(q);return}
 if(view==="w"&&typ==="m"){ms2("Recherche de l’artiste…");const qa=au||q;
  try{const ar=await mbget("https://musicbrainz.org/ws/2/artist/?query="+encodeURIComponent(qa)+"&fmt=json&limit=5"),list=ar.artists||[],artist=list.find(z=>sk(z.name)===sk(qa))||list[0];
   if(artist){const rg=await mbget("https://musicbrainz.org/ws/2/release-group/?artist="+artist.id+"&type="+encodeURIComponent("album|ep")+"&fmt=json&limit=50"),
    works=(rg["release-groups"]||[]).slice().sort((a,b)=>String(b["first-release-date"]||"").localeCompare(String(a["first-release-date"]||""))).map(v=>({titre:v.title,annee:(v["first-release-date"]||"").slice(0,4),realisateur:artist.name,genre:(v.tags||[]).slice(0,3).map(z=>z.name).join(" / "),affiche:"mb:"+v.id,synopsis:"",support:"CD"}));
    if(works.length){sh2(works.slice(0,25),"albums de "+artist.name);return}}}catch(e){}}
 if(view==="w"&&(typ==="f"||typ==="s")){ms2("Recherche du titre ou de la personne…");
  try{const people=(await tget("/search/person",{query:q,language:"fr-FR",include_adult:"false"})).results||[],person=people.find(z=>tmScore(q,[z.name])>=80);
   if(person){const credits=await tget("/person/"+person.id+"/combined_credits",{language:"fr-FR"}),all=[...(credits.cast||[]),...(credits.crew||[])].filter((v,i,a)=>a.findIndex(z=>z.id===v.id)===i).sort((a,b)=>(b.release_date||b.first_air_date||"").localeCompare(a.release_date||a.first_air_date||"")).slice(0,20).map(v=>({titre:v.title||v.name,annee:(v.release_date||v.first_air_date||"").slice(0,4),realisateur:person.name,genre:"",affiche:v.poster_path||"",synopsis:v.overview||"",saisons:"",episodes:""}));
    if(all.length){sh2(all,"Œuvres de "+person.name);return}}}catch(e){}}
 if(typ==="m"&&/^[\d\s-]{8,16}$/.test(q)&&ean(q.replace(/\D/g,""))){lookupBC(q);return}
 ms2("Recherche en cours…");$("sc").innerHTML="";
 if(typ==="m"){let a;try{a=await mbz(q,y,au)}catch(e){ms2("Recherche impossible ("+netMsg(e)+") : remplis la fiche à la main.");return}sh2(a,"MusicBrainz");return}
 let a=[],src="",te=null;
 if(tkey()){try{a=await(typ==="s"?tmdbTv:tmdb)(q,y);src="TMDB"}catch(e){a=[];te=e}}
 if(!a.length){try{a=await wiki(q,y,typ==="s"?"s":"f");src="Wikidata"}catch(e){ms2("Recherche impossible ("+netMsg(e)+") : remplis la fiche à la main.");return}}
 sh2(a,src);
 if(te&&my===fseq)$("sm").textContent+=" (TMDB indisponible : "+netMsg(te)+")"}
/* Scan photo : Gemini ne renvoie que le titre (1 petit appel), la fiche vient de TMDB/Wikidata */
async function scan(blob){const k=localStorage.getItem(KEY);if(!k){await ocrScan(blob);return}
 msg("Lecture de la jaquette…");$("sc").innerHTML="";
 try{const mod=localStorage.getItem(MOD)||DEF_MOD,txt=typ==="b"?"Voici la photo d'une couverture de livre ou de BD. Lis le titre, en général le texte le plus grand (sans le nom de l'auteur, la collection, les bandeaux ni les citations) et le nom de l'auteur (prénom et nom). Réponds uniquement en JSON : {\"titre\":\"titre du livre\",\"artiste\":\"auteur\",\"annee\":0,\"support\":\"Roman, BD, Manga, Comics, Jeunesse ou Essai si évident, sinon vide\"}":typ==="m"?"Voici la photo d'une pochette d'album (vinyle, CD ou K7). Lis le titre de l'album, en général le texte le plus grand (sans le nom de l'artiste ni les mentions techniques) et le nom de l'artiste. Réponds uniquement en JSON : {\"titre\":\"titre de l'album\",\"artiste\":\"artiste\",\"annee\":année si visible sinon 0,\"support\":\"Vinyle, CD ou K7 si visible, sinon vide\"}":"Voici la photo d'une jaquette de DVD ou Blu-ray. Le titre est en général le texte le plus grand ou le plus visible : ignore les noms d'acteurs et de réalisateur, les slogans, critiques, récompenses, logos de studios et mentions techniques. Si le texte est ambigu, aide-toi aussi du visuel de l'affiche pour reconnaître le film ou la série, et donne son titre officiel en français. Réponds uniquement en JSON : {\"titre\":\"titre lu sur la jaquette\",\"annee\":année si visible sinon 0,\"support\":\"DVD ou Blu-ray si visible, sinon vide\"}";
  const r=await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(mod)+":generateContent?key="+encodeURIComponent(k),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{inline_data:{mime_type:"image/jpeg",data:await b64(blob)}},{text:txt+CODEQ}]}],generationConfig:{responseMimeType:"application/json",temperature:0,maxOutputTokens:1024}}),signal:AbortSignal.timeout?AbortSignal.timeout(45000):undefined});
  if(!r.ok){let d="";try{const e=await r.json();d=(e.error&&e.error.message)||""}catch(_){}
   msg((r.status===429?"Quota Google épuisé":"Erreur Google ("+r.status+")")+" : lecture locale de la photo à la place…");await ocrScan(blob);return}
  const j=await r.json(),c=(j.candidates||[])[0];
  let t=c?((c.content||{}).parts||[]).filter(p=>!p.thought).map(p=>p.text||"").join("").replace(/```json|```/g,"").trim():"",o;
  try{o=JSON.parse(t)}catch(_){const i=t.indexOf("{"),e=t.lastIndexOf("}");try{o=JSON.parse(t.slice(i,e+1))}catch(__){o=null}}
  if(Array.isArray(o))o=o[0];
  if(o&&o.code){const cc=String(o.code).replace(/\D/g,"");if(ean(cc)&&await lookupBC(cc))return}
  if(!o||!o.titre){await ocrScan(blob);return}
  const au=(typ==="m"||typ==="b")?String(o.artiste||"").trim():"",ti=String(o.titre).trim();$("sq").value=ti+(au?" · "+au:"");await find(ti,typ==="m"||typ==="b"?"":(parseInt(o.annee,10)||""),au);
  if(SUP.includes(o.support))$("fS").value=o.support}
 catch(e){if(!navigator.onLine){msg("Pas de connexion : remplis la fiche à la main.");return}
  if(e&&(e.name==="TimeoutError"||e.name==="AbortError"||e.name==="TypeError")){msg("Google n'a pas répondu : lecture locale de la photo…");await ocrScan(blob)}else msg("Échec : "+((e&&e.message)||e))}}
const CODEQ=' Si un code-barres (EAN ou ISBN, 8 à 13 chiffres) est visible avec ses chiffres, ajoute aussi le champ "code" (chiffres seulement), sinon "".';
async function bitmapOf(file,max){const u=URL.createObjectURL(file);try{const im=new Image();await new Promise((a,b)=>{im.onload=a;im.onerror=b;im.src=u});const k=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement("canvas");c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext("2d").drawImage(im,0,0,c.width,c.height);return c}finally{URL.revokeObjectURL(u)}}
/* code-barres lisible sur la photo (dos de la boîte) = édition exacte ; BarcodeDetector si dispo, sinon ZXing */
async function readBarcodeImg(file){try{const base=await bitmapOf(file,2000);
 for(const rot of [0,90]){let cv=base;if(rot){cv=document.createElement("canvas");cv.width=base.height;cv.height=base.width;const x=cv.getContext("2d");x.translate(cv.width/2,cv.height/2);x.rotate(Math.PI/2);x.drawImage(base,-base.width/2,-base.height/2)}
  if("BarcodeDetector"in window){try{const d=new BarcodeDetector({formats:["ean_13","ean_8","upc_a","upc_e"]}),h=(await d.detect(cv)).map(z=>z.rawValue).find(ean);if(h)return h}catch(e){}}
  try{await loadZX();const Z=window.ZXing,h=new Map(),rd=new Z.MultiFormatReader();h.set(Z.DecodeHintType.POSSIBLE_FORMATS,[Z.BarcodeFormat.EAN_13,Z.BarcodeFormat.EAN_8,Z.BarcodeFormat.UPC_A,Z.BarcodeFormat.UPC_E]);h.set(Z.DecodeHintType.TRY_HARDER,true);rd.setHints(h);
   const t=rd.decode(new Z.BinaryBitmap(new Z.HybridBinarizer(new Z.HTMLCanvasElementLuminanceSource(cv)))).getText();if(ean(t))return t}catch(e){}}}catch(e){}return""}
/* lecture locale du texte de la photo (Tesseract, gratuit, sans compte, tourne sur l'appareil) */
const loadTess=()=>window.Tesseract?Promise.resolve():new Promise((a,b)=>{const e=document.createElement("script");e.src="https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";e.onload=a;e.onerror=b;document.head.append(e)});
function ocrLines(d){const bad=/^(blu[ -]?ray|dvd|4k|uhd|hd|ultra hd|disc|disque|collector|edition|édition|version|steelbook|import|vf|vostfr|stereo|dolby|dts|cd|lp|vinyl|vinyle|nouveau|new)$/i,
 cl=v=>String(v||"").replace(/[^\p{L}\p{N}'’:!&.,\- ]/gu," ").replace(/\s+/g," ").trim(),
 ok=v=>{const n=(v.match(/\p{L}/gu)||[]).length;return v.length>=3&&n>=3&&n/v.length>=.6&&!bad.test(v)&&!/^(un film de|a film by|avec|starring|réalisé|d'après|présenté)\b|oscars?|césars?|festival|©|www\.|https?:/i.test(v)};
 let ls=(d.lines||[]).map(l=>({s:cl(l.text),h:l.bbox?l.bbox.y1-l.bbox.y0:0,y:l.bbox?l.bbox.y0:0,c:l.confidence||0})).filter(l=>ok(l.s)&&l.c>=35);
 if(!ls.length)ls=String(d.text||"").split(/\r?\n/).map(v=>({s:cl(v),h:0,y:0,c:50})).filter(l=>ok(l.s));
 ls.sort((a,b)=>(b.h*b.h*b.c||b.s.length)-(a.h*a.h*a.c||a.s.length));
 const out=[],a=ls[0];if(a&&a.h){const b=ls.slice(1).find(z=>Math.abs(z.h-a.h)<=a.h*.3&&Math.abs(z.y-a.y)<=a.h*2.2);if(b)out.push(a.y<=b.y?a.s+" "+b.s:b.s+" "+a.s)}
 ls.forEach(l=>out.push(l.s));return[...new Set(out)].slice(0,5)}
async function ocrScan(blob){msg("Lecture locale de la photo (gratuite, sans compte)… la 1ʳᵉ fois, quelques Mo à télécharger.");$("sc").innerHTML="";$("ocrl").innerHTML="";
 try{await loadTess();
  const r=await window.Tesseract.recognize(blob,"fra+eng",{logger:m=>{if(m&&m.status==="recognizing text")msg("Lecture du texte… "+Math.round((m.progress||0)*100)+" %")}}),d=(r&&r.data)||{},L=ocrLines(d);
  if(!L.length){msg("Aucun texte lisible sur la photo : rapproche-toi, évite les reflets, ou tape le titre.");return}
  $("sq").value=L[0];await find(L[0],"");
  if(typ==="f"||typ==="s"){const T=d.text||"",su=/4k|ultra ?hd/i.test(T)?"4K UHD":/blu[ -]?ray/i.test(T)?"Blu-ray":/dvd/i.test(T)?"DVD":"";if(su&&SUP.includes(su))$("fS").value=su}
  if(L.length>1){const o=$("ocrl");o.innerHTML='<div class="hint">Lu sur la photo. Ce n\'est pas le bon titre ? Essaie une autre ligne :</div>';L.slice(1).forEach(v=>{const b=document.createElement("button");b.className="cd";b.textContent=v;b.onclick=()=>{$("sq").value=v;$("sc").innerHTML="";find(v,"")};o.append(b)})}}
 catch(e){msg("Lecture locale impossible ("+(navigator.onLine?"module indisponible":"pas de connexion")+") : tape le titre dans la recherche.")}}
const b64=b=>new Promise((a,r)=>{const f=new FileReader();f.onload=()=>a(String(f.result).split(",")[1]);f.onerror=r;f.readAsDataURL(b)});
async function shrink(file){const u=URL.createObjectURL(file);const im=new Image();await new Promise((a,b)=>{im.onload=a;im.onerror=b;im.src=u});
 const k=Math.min(1,1280/Math.max(im.width,im.height));const c=document.createElement("canvas");c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);
 c.getContext("2d").drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);return new Promise(r=>c.toBlob(r,"image/jpeg",.82))}
$("add").onclick=()=>{if(view==="s"||view==="t")setView("c");editingId=null;cur={};coverUI(true);$("fO").value="";$("synS").textContent="";$("ad").querySelector("h2").textContent=view==="w"?"Ajouter un souhait":"Ajouter un film";$("fok").textContent=view==="w"?"Ajouter à mes souhaits":"Ajouter à ma collection";$("manual").open=false;$("manual").hidden=false;$("cam").hidden=view==="w";$("bcr").hidden=false;$("sq").placeholder=view==="w"?(typ==="b"?"Titre ou auteur":"Titre, réalisateur, artiste ou acteur"):typ==="b"?"Titre, auteur ou ISBN":"Cherche par titre";$("ad").querySelector("h2").textContent=view==="w"?"Ajouter un souhait":typ==="m"?"Ajouter un album":typ==="b"?"Ajouter un livre":typ==="s"?"Ajouter une série":"Ajouter un film";$("fR").placeholder=typ==="s"?"Créateur":typ==="m"?"Artiste":typ==="b"?"Auteur":"Réalisateur";$("fD").placeholder=typ==="s"?"Durée d'un épisode (min)":typ==="b"?"Nombre de pages":"Durée (min)";$("fok").textContent=view==="w"?"Ajouter à mes souhaits":"Ajouter à ma collection";$("ad").hidden=false;msg("");$("sc").innerHTML="";$("ocrl").innerHTML="";ownN=null;setTimeout(ownUI,0);["fT","fR","fY","fD","fG","fA","fP","fNs","fNe","sq"].forEach(i=>$(i).value="");$("fS").selectedIndex=0};
$("ax").onclick=()=>{$("ad").hidden=true;editingId=null;$("fok").textContent="Ajouter à ma collection";$("ad").querySelector("h2").textContent="Ajouter un film"};
$("cam").onclick=()=>$("ph").click();
$("ph").onchange=async()=>{const f=$("ph").files[0];$("ph").value="";if(!f)return;
 try{$("sc").innerHTML="";$("ocrl").innerHTML="";msg("Recherche d'un code-barres sur la photo…");const code=await readBarcodeImg(f);
  if(code){msg("Code-barres lu : "+code+" — recherche de l'édition exacte…");if(await lookupBC(code))return}
  const b=await shrink(f);await scan(b)}catch(e){msg("Photo illisible : réessaie ou cherche par titre.")}};
$("sb").onclick=()=>{const q=$("sq").value.trim();if(q)find(q)};
$("sq").onkeydown=e=>{if(e.key==="Enter")$("sb").click()};
document.querySelectorAll(".clear-wrap input").forEach(i=>{const sync=()=>i.parentElement.classList.toggle("has-value",!!i.value);i.addEventListener("input",sync);sync()});
document.querySelectorAll("[data-clear]").forEach(b=>b.onclick=()=>{const i=$(b.dataset.clear);i.value="";i.dispatchEvent(new Event("input",{bubbles:true}));i.focus()});
["q","fr","fa","fpr","sdir","sact"].forEach(id=>{const el=$(id);if(!el)return;const wrap=document.createElement("span");wrap.className="clear-wrap";el.parentNode.insertBefore(wrap,el);wrap.append(el);const b=document.createElement("button");b.type="button";b.className="clear-search";b.textContent="×";b.setAttribute("aria-label","Effacer");b.onclick=()=>{el.value="";el.dispatchEvent(new Event("input",{bubbles:true}));el.focus()};wrap.append(b);const sync=()=>wrap.classList.toggle("has-value",!!el.value);el.addEventListener("input",sync);sync()});
$("fok").onclick=async()=>{if(view==="w"&&!$("manual").open){$("manual").open=true;return}const t=$("fT").value.trim();if(!t){msg("Il faut au moins un titre.");return}
 const n=v=>{const k=parseInt(v,10);return k>0?k:""};
 const y=n($("fY").value),id=editingId||mkid(typ==="m"||typ==="b"?t+" · "+$("fR").value.trim():t,y)+(typ==="s"?"|s":typ==="m"?"|m":typ==="b"?"|b":"");
 if(!editingId&&D.some(x=>x.id===id)){msg("Ce titre est déjà dans ta collection.");return}
 const nk=q=>sk(String(q).replace(/\s*[,(]\s*(le|la|les|l'|l’|un|une|the)\s*\)?\s*$/i,"")),isS=typ==="s";
 const dup=editingId?null:D.find(x=>(x.k||"f")===typ&&nk(x.t)===nk(t)&&((typ!=="m"&&typ!=="b")||key(x.r)===key($("fR").value))&&(!x.y||!y||Math.abs(x.y-y)<=1));
 if(dup&&!confirm("« "+dup.t+(dup.y?" ("+dup.y+")":"")+" » est déjà "+(dup.wl?"dans tes souhaits":"dans ta collection")+". L'ajouter quand même ?"))return;
 const old=editingId?D.find(x=>x.id===editingId):null;
 const f={...(old||{}),id,t,r:$("fR").value.trim(),y,d:n($("fD").value),g:$("fG").value.trim(),a:$("fA").value.trim(),s:$("fS").value,p:$("fP").value.trim(),v:old?undefined:1};if(!old)f.da=Date.now();if(typ==="s"){f.k="s";const a=n($("fNs").value),b=n($("fNe").value);if(a)f.ns=a;if(b)f.ne=b;if(cur.seasonEpisodes){f.seasonEpisodes=cur.seasonEpisodes;f.episodesTotal=cur.seasonEpisodes.reduce((sum,z)=>sum+z.episodes,0);const selected=[...$("seasonPick").querySelectorAll('input[type="checkbox"]:checked')].map(z=>+z.value);f.seasonsOwned=selected;f.ns=cur.seasonEpisodes.length;f.ne=cur.seasonEpisodes.reduce((sum,z)=>sum+(selected.includes(z.season)?z.episodes:0),0);f.ownedSeasons=selected.length;f.ownedEpisodes=f.ne;}else{const n2=f.ns||0;if(ownN!==null)f.ownedSeasons=n2?Math.min(ownN,n2):ownN;else if(f.ownedSeasons!==undefined&&n2)f.ownedSeasons=Math.min(f.ownedSeasons,n2)}}if(typ==="m")f.k="m";if(typ==="b")f.k="b";if(view==="w")f.wl=1;if(cur.pi)f.pi=cur.pi;else delete f.pi;if(cur.isbn)f.isbn=cur.isbn;{const o=$("fO").value.trim();if(o)f.ov=o;else delete f.ov}
 if(!(await put(f))){msg("Enregistrement impossible (erreur de stockage) : rien n'a été modifié. Ta saisie est toujours là.");return}
 {const o2=D.find(x=>x.id===f.id);if(o2){for(const q of Object.keys(o2))if(!(q in f))delete o2[q];Object.assign(o2,f)}else D.push(f)}editingId=null;lists();$("ad").hidden=true;$("manual").open=false;$("fok").textContent="Ajouter à ma collection";$("ad").querySelector("h2").textContent="Ajouter un film";$("q").value=t;draw();const c=card(id);if(c)c.classList.add("open")};
/* ---------- réglages, export / import CSV ---------- */
function openSettings(m){$("sg").hidden=false;snapUI();$("kk").value=localStorage.getItem(KEY)||"";$("km").value=localStorage.getItem(MOD)||"";$("km").placeholder="Modèle (défaut : "+DEF_MOD+")";$("sgs").textContent=m||"";$("km2").textContent=localStorage.getItem(KEY)?"Clé enregistrée sur cet appareil.":"";$("tk").value=localStorage.getItem(TK)||"";$("tk2").textContent=localStorage.getItem(TK)?"Clé TMDB enregistrée sur cet appareil.":"Pas de clé TMDB : la recherche passe par Wikidata.";$("gbk").value=localStorage.getItem(GBK)||"";$("gbk2").textContent=localStorage.getItem(GBK)?"Clé Google Livres enregistrée sur cet appareil.":"Pas de clé : l'appli utilise le quota partagé de Google (parfois saturé).";if(m){$("acG").open=true;$("kk").focus()}}
function applyGrid(){if(gridOn())document.body.dataset.g="1";else delete document.body.dataset.g;document.body.dataset.gc=String(gcols);document.documentElement.style.setProperty("--gc",gcols);const b=$("gv");if(b)b.setAttribute("aria-pressed",grid?"true":"false")}
{const b=$("gv");if(b)b.onclick=()=>{grid=!grid;try{localStorage.setItem("mt_grid",grid?"1":"0")}catch(e){}applyGrid();draw();window.scrollTo(0,0)}}
applyGrid();
/* zoom / dézoom de la grille : pincer (ou Ctrl + molette) = de 1 à 5 jaquettes par ligne */
(()=>{const L=$("l");let d0=0,lt;
 const flash=n=>{let e=$("gzl");if(!e){e=document.createElement("div");e.id="gzl";document.body.append(e)}e.textContent=n+(n>1?" jaquettes par ligne":" jaquette par ligne");e.classList.add("on");clearTimeout(lt);lt=setTimeout(()=>e.classList.remove("on"),900)};
 const setCols=n=>{n=Math.max(1,Math.min(5,n));if(n===gcols)return;const big=gcols<=2;gcols=n;try{localStorage.setItem("mt_gcols",String(n))}catch(e){}applyGrid();if(big!==(n<=2))draw();flash(n)};
 const dist=t=>Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);
 L.addEventListener("touchstart",e=>{d0=gridOn()&&e.touches.length===2?dist(e.touches):0},{passive:true});
 L.addEventListener("touchmove",e=>{if(!d0||!gridOn()||e.touches.length!==2)return;e.preventDefault();const r=dist(e.touches)/d0;if(r>1.3){setCols(gcols-1);d0=dist(e.touches)}else if(r<.77){setCols(gcols+1);d0=dist(e.touches)}},{passive:false});
 L.addEventListener("touchend",()=>{d0=0},{passive:true});
 document.addEventListener("gesturestart",e=>{if(gridOn()&&e.target.closest&&e.target.closest("#l"))e.preventDefault()});
 L.addEventListener("wheel",e=>{if(!gridOn()||!e.ctrlKey)return;e.preventDefault();const now=Date.now();if(Math.abs(e.deltaY)<2||now-(L._wt||0)<180)return;L._wt=now;setCols(gcols+(e.deltaY>0?1:-1))},{passive:false})})();
document.querySelectorAll("#sg details.acc").forEach(d=>d.addEventListener("toggle",()=>{if(d.open)document.querySelectorAll("#sg details.acc").forEach(o=>{if(o!==d)o.open=false})}));
$("gear").onclick=()=>openSettings();
$("gx").onclick=()=>{$("sg").hidden=true};
$("ks").onclick=()=>{const k=$("kk").value.trim(),m=$("km").value.trim();
 try{k?localStorage.setItem(KEY,k):localStorage.removeItem(KEY);m?localStorage.setItem(MOD,m):localStorage.removeItem(MOD)}catch(e){$("sgs").textContent="Impossible d'enregistrer sur cet appareil.";return}
 $("sgs").textContent=k?"Clé enregistrée.":"Clé retirée.";$("km2").textContent=k?"Clé enregistrée sur cet appareil.":""};
$("tks").onclick=()=>{const k=$("tk").value.trim();
 try{k?localStorage.setItem(TK,k):localStorage.removeItem(TK)}catch(e){$("sgs").textContent="Impossible d'enregistrer sur cet appareil.";return}
 $("sgs").textContent=k?"Clé TMDB enregistrée.":"Clé TMDB retirée.";$("tk2").textContent=k?"Clé TMDB enregistrée sur cet appareil.":"Pas de clé TMDB : la recherche passe par Wikidata."};
$("gbks").onclick=()=>{const k=$("gbk").value.trim();
 try{k?localStorage.setItem(GBK,k):localStorage.removeItem(GBK)}catch(e){$("sgs").textContent="Impossible d'enregistrer sur cet appareil.";return}
 $("sgs").textContent=k?"Clé Google Livres enregistrée.":"Clé Google Livres retirée.";$("gbk2").textContent=k?"Clé Google Livres enregistrée sur cet appareil.":"Pas de clé : l'appli utilise le quota partagé de Google (parfois saturé).";};
$("sh").onclick=async()=>{const base=/^https?:$/.test(location.protocol)?location.origin+location.pathname.replace(/index\.html$/,""):"https://pierremehouas-beep.github.io/Ma-Mediatheque/",
 full="My Mediatheque : catalogue tes films, séries, albums et livres, gratuit et sans compte. Ouvre ce lien sur ton smartphone ou ton PC, puis ajoute l'appli à ton écran d'accueil (iPhone : Partager → « Sur l'écran d'accueil » ; Android et PC : menu du navigateur → « Installer l'application ») :\n"+base;
 try{if(navigator.share){await navigator.share({title:"My Mediatheque",text:full});return}}catch(e){if(e&&e.name==="AbortError")return}
 try{await navigator.clipboard.writeText(full);$("sgs").textContent="Lien copié : colle-le dans un message."}catch(e){$("sgs").textContent="Lien à envoyer : "+base}};
const COLS=["Titre","Réalisateur","Durée (min)","Genre","Année de sortie","Acteurs principaux","Support","Maison de production","Note","Vu le","Prêté à","Prêté le","Commentaire","Liste","Affiche","Synopsis","Type","Saisons","Épisodes","Saisons vues","Saisons possédées","Épisodes possédés","Détail épisodes par saison","Total épisodes","ISBN","Nb saisons possédées","Ajouté le"];
const cell=v=>{v=String(v===undefined||v===null?"":v);return /[;"\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
async function out(name,text){const blob=new Blob(["\uFEFF"+text],{type:"text/csv;charset=utf-8"});const file=new File([blob],name,{type:"text/csv"});
 try{if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:name});return true}}catch(e){if(e&&e.name==="AbortError")return false}
 const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);return true}
$("ex").onclick=async()=>{if(!D.length){$("sgs").textContent="Rien à exporter pour l'instant.";return}
 const rows=[...D].sort((a,b)=>key(a.t).localeCompare(key(b.t),"fr")).map(x=>[x.t,x.r,x.d,x.g,x.y,x.a,x.s,x.p,x.n===undefined?"":String(x.n).replace(".",","),x.vu||"",x.l?x.l.n:"",x.l?x.l.d:"",x.c||"",x.wl?"souhait":"",x.pi||"",x.ov||"",x.k==="s"?"série":x.k==="m"?"musique":x.k==="b"?"livre":"",x.ns||"",x.ne||"",x.sw||"",x.seasonsOwned?x.seasonsOwned.join(","):"",x.ownedEpisodes===undefined?"":x.ownedEpisodes,x.seasonEpisodes?JSON.stringify(x.seasonEpisodes):"",x.episodesTotal||"",x.isbn||"",x.ownedSeasons===undefined?"":x.ownedSeasons,x.da?new Date(x.da).toISOString():""].map(cell).join(";"));
 const stamp=new Date().toISOString().replace(/[:.]/g,"-").slice(0,19);if(await out("mediatheque.csv",[COLS.map(cell).join(";"),...rows].join("\r\n"))){try{localStorage.setItem("mt_bk",new Date().toISOString());localStorage.setItem("mt_chg","0")}catch(e){}$("sgs").textContent=D.length+" lignes exportées. Si iOS propose « Remplacer », choisis-le.";bkCheck()}};
function parseCSV(t){t=t.replace(/^\uFEFF/,"");const first=t.split(/\r?\n/)[0],dl=(first.match(/;/g)||[]).length>=(first.match(/,/g)||[]).length?";":",";
 const rows=[];let r=[],c="",q=false;
 for(let i=0;i<t.length;i++){const ch=t[i];
  if(q){if(ch==='"'){if(t[i+1]==='"'){c+='"';i++}else q=false}else c+=ch}
  else if(ch==='"')q=true;else if(ch===dl){r.push(c);c=""}
  else if(ch==="\n"||ch==="\r"){if(ch==="\r"&&t[i+1]==="\n")i++;r.push(c);c="";rows.push(r);r=[]}else c+=ch}
 if(c!==""||r.length){r.push(c);rows.push(r)}return rows.filter(x=>x.some(v=>v.trim()))}
const hk=s=>key(s).replace(/[^a-z0-9]/g,"");
const pn=v=>{v=String(v||"").trim().replace("½",".5").replace("★","").replace(",",".").trim();if(!v)return undefined;const n=parseFloat(v);return isNaN(n)?undefined:Math.max(0,Math.min(5,Math.round(n*2)/2))};
const pi=v=>{const k=parseInt(v,10);return k>0?k:""};
const cl=v=>{v=String(v||"").trim();return v==="—"||v==="-"?"":v};
$("im").onclick=()=>$("imf").click();
$("imf").onchange=async()=>{const file=$("imf").files[0];$("imf").value="";if(!file)return;
 try{const rows=parseCSV(await file.text());if(rows.length<2)throw 0;if(!(await snap("avant import"))&&!confirm("La copie de secours n'a pas pu être créée. Importer quand même ?"))return;
  const H=rows[0].map(hk),ix=p=>H.findIndex(h=>p.some(q=>h===q||h.startsWith(q)));
  const I={t:ix(["titre"]),r:ix(["realisateur"]),d:ix(["duree"]),g:ix(["genre"]),y:ix(["annee"]),a:ix(["acteurs"]),s:ix(["support"]),p:ix(["maisondeproduction","production"]),n:ix(["note"]),vu:ix(["vule"]),lo:ix(["pretea"]),ld:ix(["pretele"]),c:ix(["commentaire"]),wl:ix(["liste"]),po:ix(["affiche"]),ov:ix(["synopsis"]),k:ix(["type"]),ns:ix(["saisons"]),ne:ix(["episodes"]),sw:ix(["saisonsvues"]),owned:ix(["saisonspossedees"]),oe:ix(["episodespossedes"]),se:ix(["detailepisodesparsaison"]),et:ix(["totalepisodes"]),isbn:ix(["isbn"]),nbo:ix(["nbsaisonspossedees"]),da:ix(["ajoutele"])};
  if(I.t<0)throw 0;
  const g=(r,k)=>I[k]<0?"":(r[I[k]]||"");const byId=new Map(D.map(x=>[x.id,x]));const canonical=x=>[(x.k||"f"),sk(x.t),x.k==="m"||x.k==="b"?key(x.r):"",x.y||""].join("|");const byCanonical=new Map(D.map(x=>[canonical(x),x]));let add=0,upd=0;const batch=[];
  rows.slice(1).forEach(r=>{const t=cl(g(r,"t"));if(!t)return;const y=pi(g(r,"y"));const ks=/s[ée]rie/i.test(g(r,"k")),km=/musique/i.test(g(r,"k")),kb=/livre/i.test(g(r,"k"));let id=mkid(km||kb?t+" · "+cl(g(r,"r")):t,y)+(ks?"|s":km?"|m":kb?"|b":"");
   const f={id,t,r:cl(g(r,"r")),d:pi(g(r,"d")),g:cl(g(r,"g")),y,a:cl(g(r,"a")),s:supOf(g(r,"s")),p:cl(g(r,"p"))};{const vu=cl(g(r,"vu")),lo=cl(g(r,"lo")),ld=cl(g(r,"ld")),cm=g(r,"c").trim(),po=cl(g(r,"po")),ov=g(r,"ov").trim();if(vu)f.vu=vu;if(lo)f.l={n:lo,d:ld||today()};if(cm)f.c=cm;if(/souhait/i.test(g(r,"wl")))f.wl=1;if(po)f.pi=po;{const ib=cl(g(r,"isbn"));if(ib)f.isbn=ib}if(ov)f.ov=ov;{const dd=Date.parse(cl(g(r,"da")));if(dd)f.da=dd}if(ks){f.k="s";const a=pi(g(r,"ns")),b=pi(g(r,"ne")),c=pi(g(r,"sw"));if(a)f.ns=a;if(b)f.ne=b;if(c)f.sw=c;const owned=cl(g(r,"owned")),oe=pi(g(r,"oe")),se=cl(g(r,"se"));if(owned)f.seasonsOwned=owned.split(",").map(Number).filter(Number.isFinite);{const nb=g(r,"nbo").trim();if(nb!==""&&!f.seasonsOwned&&/^\d+$/.test(nb))f.ownedSeasons=+nb}if(oe)f.ownedEpisodes=oe;if(se){try{f.seasonEpisodes=JSON.parse(se)}catch(e){}}const et=pi(g(r,"et"));if(et)f.episodesTotal=et;}if(km)f.k="m";if(kb)f.k="b"}
   const n=pn(g(r,"n")),old=byId.get(id)||byCanonical.get(canonical(f));if(old)f.id=old.id;
   if(old){if(n===undefined&&old.n!==undefined)f.n=old.n;if(old.v)f.v=old.v;const imported=Object.fromEntries(Object.entries(f).filter(([k,v])=>k==="id"||(v!==""&&v!==undefined&&v!==null)));Object.assign(old,imported);if(n!==undefined)old.n=n;batch.push(old);upd++}
   else{if(n!==undefined)f.n=n;D.push(f);byId.set(f.id,f);byCanonical.set(canonical(f),f);batch.push(f);add++}});
  const okW=await putMany(batch);if(!okW){await resyncD();$("sgs").textContent="Import NON enregistré (erreur de stockage) : ta collection est restée telle qu'avant. Libère de l'espace puis réessaie."}else{lists();draw();$("sgs").textContent="Import terminé : "+add+" ajouté"+(add>1?"s":"")+", "+upd+" mis à jour."}}
 catch(e){$("sgs").textContent="Fichier illisible : il faut un CSV avec au moins une colonne « Titre »."}};
$("clr").onclick=async()=>{if(!D.length)return;const sy=!!(window.MTSync&&MTSync.active&&MTSync.active());
 if(!confirm(sy?"Vider toute la collection ? Elle sera AUSSI supprimée sur tes autres appareils synchronisés. Une version de secours est gardée sur cet appareil.":"Vider toute la collection de cet appareil ? Une version de secours sera gardée."))return;
 if(!(await snap("avant vidage"))){$("sgs").textContent="Copie de secours impossible : collection NON vidée.";return}
 try{await idb("readwrite",s=>{s.clear()});D=[];lists();draw();if(sy)MTSync.wipe();$("sgs").textContent="Collection vidée."+(sy?" Suppression en cours sur tes autres appareils.":"")}catch(e){$("sgs").textContent="Impossible de vider la collection (erreur de stockage) : rien n'a été supprimé."}};
{const p=$("spl");if(p){p.addEventListener("animationend",e=>{if(e.animationName==="splo")p.remove()});p.onclick=()=>p.remove();setTimeout(()=>p.remove(),3000)}}
/* ---------- démarrage ---------- */
(async()=>{
 try{db=await openDB()}catch(e){db=null;$("n").textContent="Stockage indisponible";const s=$("sgs");if(s)s.textContent="Attention : le navigateur ne permet pas d’ouvrir le stockage. Les modifications ne pourront pas être sauvegardées. Essaie un navigateur récent en HTTPS."}
 try{D=(await idb("readonly",s=>s.getAll()))||[]}catch(e){D=[];$("n").textContent="Erreur de stockage — données non chargées";alert("Impossible de lire ta collection. Ne vide pas les données du navigateur : vérifie le navigateur ou restaure une sauvegarde.")}
 try{const bad=clean(D);if(bad.length){let ok=0;const sn=((await sdb("readonly",z=>z.getAll()))||[]).sort((p,q)=>p.id-q.id).map(x=>{try{return new Map(JSON.parse(x.data).map(f=>[f.id,f]))}catch(e){return new Map()}});
  bad.forEach(f=>{for(const m of sn){const o=m.get(f.id);if(o&&typeof o.n==="number"&&o.n>=0&&o.n<=5){f.n=o.n;ok++;break}}});
  quiet=1;await putMany(bad);quiet=0;alert("Réparation des notes : "+ok+" notes retrouvées sur "+bad.length+" abîmées."+(ok<bad.length?" Les autres sont à refaire, ou réimporte ton dernier CSV (réglages).":""))}}catch(e){quiet=0}
 try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(e){}
 lists();draw();try{const a=(await sdb("readonly",z=>z.getAll()))||[];if(D.length&&(!a.length||Date.now()-Math.max(...a.map(z=>z.id))>864e5))snap("auto")}catch(e){}})();

/* ---------- installation (Android / PC) : le bouton n'apparaît que si le navigateur la propose ---------- */
let ipr=null;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();ipr=e;const b=$("instr");if(b)b.hidden=false});
window.addEventListener("appinstalled",()=>{ipr=null;const b=$("instr");if(b)b.hidden=true});
{const b=$("inst");if(b)b.onclick=async()=>{if(!ipr)return;try{ipr.prompt();await ipr.userChoice}catch(e){}ipr=null;$("instr").hidden=true}}
if("serviceWorker"in navigator&&location.protocol==="https:")navigator.serviceWorker.register("sw.js").catch(()=>{});

/* ---------- derniers ajouts (stats) ---------- */
function recentHTML(C){const a=C.filter(x=>x.da).sort((p,q)=>q.da-p.da);if(!a.length)return"";const m=a.filter(x=>Date.now()-x.da<2592e6).length;return"<h3>Derniers ajouts</h3><p class=\"m\">"+m+" ajouté"+(m>1?"s":"")+" ces 30 derniers jours</p>"+a.slice(0,5).map(x=>`<p class="m">${esc(x.t)} · <b>${new Date(x.da).toLocaleDateString("fr-FR")}</b></p>`).join("")}
/* ---------- jaquette / pochette / couverture : changer, effacer ou ajouter sa propre image ---------- */
function coverUI(reset){const w=$("covW");if(!w)return;if(reset&&$("covS"))$("covS").textContent="";w.className="covw"+(typ==="m"?" sq":"");w.textContent="";
 if(cur&&cur.pi){const im=document.createElement("img");im.alt="";im.src=pimg(cur.pi,"w342");im.onerror=()=>{im.style.visibility="hidden"};w.append(im);
  const x=document.createElement("button");x.type="button";x.className="covx";x.textContent="×";x.setAttribute("aria-label","Effacer l'image");x.onclick=()=>{cur.pi="";coverUI();$("covS").textContent="Image effacée : elle sera retirée à l'enregistrement."};w.append(x)}
 else{const b=document.createElement("button");b.type="button";b.className="covp";b.textContent="+";b.setAttribute("aria-label","Ajouter une image");b.onclick=()=>$("covI").click();w.append(b)}}
async function coverFromBlob(b){const s=$("covS");if(!b||!/^image\//.test(b.type||"")){s.textContent="Ce n'est pas une image.";return}
 try{s.textContent="Traitement de l'image…";let bm;try{bm=await createImageBitmap(b)}catch(e){bm=await new Promise((res,rej)=>{const u=URL.createObjectURL(b),i=new Image();i.onload=()=>{URL.revokeObjectURL(u);res(i)};i.onerror=()=>{URL.revokeObjectURL(u);rej(new Error("img"))};i.src=u})}
  const W=bm.width||bm.naturalWidth,H=bm.height||bm.naturalHeight;if(!W||!H)throw new Error("size");const k=Math.min(1,480/Math.max(W,H)),cv=document.createElement("canvas");cv.width=Math.max(1,Math.round(W*k));cv.height=Math.max(1,Math.round(H*k));
  const c=cv.getContext("2d");c.fillStyle="#fff";c.fillRect(0,0,cv.width,cv.height);c.drawImage(bm,0,0,cv.width,cv.height);
  const url=cv.toDataURL("image/jpeg",0.8);if(!/^data:image\/jpeg;base64,/.test(url)||url.length>150000)throw new Error("big");
  cur.pi=url;coverUI();s.textContent="Image ajoutée : elle sera enregistrée avec la fiche."}catch(e){s.textContent="Image illisible ou trop lourde : essaie une autre image."}}
{const i=$("covI");if(i)i.onchange=()=>{const f=i.files[0];i.value="";if(f)coverFromBlob(f)}}
{const b=$("covP");if(b)b.onclick=async()=>{const s=$("covS");try{if(!navigator.clipboard||!navigator.clipboard.read)throw 0;const its=await navigator.clipboard.read();for(const it of its){const t=it.types.find(x=>x.startsWith("image/"));if(t){await coverFromBlob(await it.getType(t));return}}s.textContent="Aucune image dans le presse-papiers."}catch(e){s.textContent="Collage impossible ici : utilise « Choisir une image » (ou Ctrl+V sur PC)."}}}
document.addEventListener("paste",e=>{if($("ad").hidden||!$("manual").open)return;const it=[...((e.clipboardData&&e.clipboardData.items)||[])].find(z=>z.type&&z.type.startsWith("image/"));if(!it)return;const f=it.getAsFile();if(f){e.preventDefault();coverFromBlob(f)}});
/* ---------- saisons possédées : compteur + / − quand on n'a pas le détail des saisons ---------- */
function ownUI(){const w=$("ownS");if(!w)return;const has=cur&&cur.seasonEpisodes&&cur.seasonEpisodes.length,ns=parseInt($("fNs").value,10)||0,show=typ==="s"&&!has&&ns>0;w.hidden=!show;if(!show)return;if(ownN!==null)ownN=Math.min(ownN,ns);$("osv").textContent=(ownN===null?ns:ownN)+" / "+ns}
{const step=d=>()=>{const ns=parseInt($("fNs").value,10)||0;ownN=Math.max(0,Math.min(ns,(ownN===null?ns:ownN)+d));ownUI()};$("osm").onclick=step(-1);$("osp").onclick=step(1);$("fNs").addEventListener("input",ownUI)}
/* ---------- durée : cocher plusieurs tranches à la fois ---------- */
function dubRefresh(){const b=$("dub"),sel=$("du");if(!b)return;const v=[...sel.options].slice(1).map(o=>o.value);[...dus].forEach(x=>{if(!v.includes(x))dus.delete(x)});b.textContent=(dus.size?(dus.size===1?[...dus][0]:dus.size+" durées"):sel.options[0].text)+" ▾";b.classList.toggle("on",dus.size>0);const l=$("dul");if(l&&!l.hidden)dubList()}
function dubList(){const l=$("dul");l.innerHTML="";[...$("du").options].slice(1).forEach(o=>{const lb=document.createElement("label"),c=document.createElement("input");lb.className="ddi";c.type="checkbox";c.checked=dus.has(o.value);c.onchange=()=>{c.checked?dus.add(o.value):dus.delete(o.value);dubRefresh();draw()};lb.append(c,document.createTextNode(" "+o.text));l.append(lb)});const z=document.createElement("button");z.type="button";z.className="z0";z.textContent="Tout décocher";z.onclick=()=>{dus.clear();dubRefresh();draw()};l.append(z)}
$("dub").onclick=()=>{const l=$("dul");if(l.hidden){document.querySelectorAll(".ddl").forEach(p=>p.hidden=true);dubList();l.hidden=false}else l.hidden=true};
/* ---------- flèche de liste déroulante sur téléphone (réalisateur, acteur, production) ---------- */
["fr","fa","fpr"].forEach(id=>{const inp=$(id),dl=$(inp.getAttribute("list"));if(!dl)return;const w=document.createElement("span"),b=document.createElement("button"),pop=document.createElement("div");w.className="dd";b.type="button";b.className="ddb";b.textContent="▾";b.setAttribute("aria-label","Voir toute la liste");pop.className="ddl";pop.hidden=true;inp.parentNode.insertBefore(w,inp);w.append(inp,b,pop);
 b.onclick=()=>{if(!pop.hidden){pop.hidden=true;return}document.querySelectorAll(".ddl").forEach(p=>p.hidden=true);pop.innerHTML="";[...dl.options].forEach(o=>{const v=document.createElement("button");v.type="button";v.textContent=o.value;v.onclick=()=>{inp.value=o.value;pop.hidden=true;draw()};pop.append(v)});if(!dl.options.length)pop.innerHTML='<div class="hint" style="padding:8px">Rien à proposer pour l\'instant.</div>';pop.hidden=false}});
document.addEventListener("click",e=>{document.querySelectorAll(".dd").forEach(w=>{const p=w.querySelector(".ddl");if(p&&!w.contains(e.target))p.hidden=true})});
dubRefresh();
