/* My Mediatheque — synchronisation facultative entre appareils (Firebase, API REST, sans SDK).
   L'appli fonctionne exactement pareil sans elle : la base locale (IndexedDB) reste la référence. */
(() => {
"use strict";
const KEY = "AIzaSyDXZB4DOCGrqFDYAEAjUrMjDccJYR43quI", PRJ = "my-mediatheque";
const DOCS = "projects/" + PRJ + "/databases/(default)/documents", FS = "https://firestore.googleapis.com/v1/" + DOCS;
const AUTH = "https://identitytoolkit.googleapis.com/v1/accounts:", TOK = "https://securetoken.googleapis.com/v1/token?key=" + KEY;
const ls = {
  get: k => { try { return localStorage.getItem(k) } catch (e) { return null } },
  set: (k, v) => { try { localStorage.setItem(k, v) } catch (e) {} },
  del: k => { try { localStorage.removeItem(k) } catch (e) {} }
};
const g = i => document.getElementById(i), sleep = ms => new Promise(r => setTimeout(r, ms));
let idTok = "", idExp = 0, lastU = 0, skew = 0;
/* u = horloge corrigée sur celle du serveur (µs) ; les 3 derniers chiffres identifient l'appareil : deux appareils ne produisent jamais le même u */
const SLOT = (() => { let v = +ls.get("mt_sync_slot"); if (!(v >= 0 && v < 1000)) { v = Math.floor(Math.random() * 1000); ls.set("mt_sync_slot", String(v)) } return v })();
const nextU = () => (lastU = Math.max(Math.floor(Date.now() + skew) * 1000 + SLOT, lastU + 1000));
const OVER = 300e6;  /* recouvrement de 5 min à chaque lecture : rattrape les envois arrivés en retard d'un autre appareil */

/* ---------- empreinte d'une fiche (pour savoir si elle a changé) ---------- */
const canon = o => JSON.stringify(o, (k, v) => v && typeof v === "object" && !Array.isArray(v) ? Object.keys(v).sort().reduce((a, c) => (a[c] = v[c], a), {}) : v);
function h53(s) { let a = 0xdeadbeef, b = 0x41c6ce57; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); a = Math.imul(a ^ c, 2654435761); b = Math.imul(b ^ c, 1597334677) }
  a = Math.imul(a ^ (a >>> 16), 2246822507) ^ Math.imul(b ^ (b >>> 13), 3266489909); b = Math.imul(b ^ (b >>> 16), 2246822507) ^ Math.imul(a ^ (a >>> 13), 3266489909);
  return (4294967296 * (2097151 & b) + (a >>> 0)).toString(36) }
const hash = o => h53(canon(o));
const did = id => "i" + btoa(String.fromCharCode(...new TextEncoder().encode(id))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/* fiche reçue du cloud = donnée non fiable : on garde la forme attendue, sans jamais supprimer de champ inconnu (compatibilité) */
function sane(rec) {
  for (const k of ["t", "r", "g", "a", "p", "s", "pi", "ov", "c", "vu", "isbn"]) if (k in rec && typeof rec[k] !== "string") rec[k] = typeof rec[k] === "number" && isFinite(rec[k]) ? String(rec[k]) : "";
  if ("k" in rec && !["f", "s", "m", "b"].includes(rec.k)) delete rec.k;
  if ("n" in rec && !(typeof rec.n === "number" && rec.n >= 0 && rec.n <= 5)) delete rec.n;
  if ("l" in rec) { const l = rec.l; if (!l || typeof l !== "object" || Array.isArray(l) || typeof l.n !== "string" || !l.n) delete rec.l; else rec.l = { n: l.n, d: typeof l.d === "string" ? l.d : "" } }
  return rec }

/* ---------- réseau : connexion + Firestore ---------- */
async function post(url, body, headers, form) {
  const ac = typeof AbortController !== "undefined" ? new AbortController() : null, tmo = ac ? setTimeout(() => ac.abort(), 25000) : 0;
  try {
    const r = await fetch(url, { method: "POST", signal: ac ? ac.signal : undefined, headers: Object.assign({ "Content-Type": form ? "application/x-www-form-urlencoded" : "application/json" }, headers || {}), body: form ? body : JSON.stringify(body) });
    let j = null, ok = true; try { j = await r.json() } catch (e) { ok = false }
    if (!r.ok) { const e = new Error((j && j.error && (j.error.message || j.error.status)) || "HTTP " + r.status); e.code = r.status; throw e }
    if (!ok) throw new Error("Réponse du serveur illisible : réessaie dans un moment.");
    return j;
  } catch (e) { if (e && e.name === "AbortError") throw new Error("Failed to fetch (délai dépassé)"); throw e }
  finally { clearTimeout(tmo) } }
function keep(t, rt, uid, exp) { idTok = t; idExp = Date.now() + (+exp || 3600) * 1000 - 60000; ls.set("mt_sync_rt", rt); ls.set("mt_sync_uid", uid) }
async function login(mail, pw, create) {
  const j = await post(AUTH + (create ? "signUp" : "signInWithPassword") + "?key=" + KEY, { email: mail, password: pw, returnSecureToken: true });
  ls.del("mt_sync_meta"); ls.del("mt_sync_pull"); ls.del("mt_sync_wipe"); keep(j.idToken, j.refreshToken, j.localId, j.expiresIn); ls.set("mt_sync_mail", mail) }
async function token() {
  if (idTok && Date.now() < idExp) return idTok;
  const rt = ls.get("mt_sync_rt"); if (!rt) throw new Error("NOLOGIN");
  try { const j = await post(TOK, "grant_type=refresh_token&refresh_token=" + encodeURIComponent(rt), null, true); keep(j.id_token, j.refresh_token, j.user_id, j.expires_in); return idTok }
  catch (e) { if (e.code === 400) { logout(true); throw new Error("NOLOGIN") } throw e } }
const fs = async (url, body) => post(url, body, { Authorization: "Bearer " + await token() });
function logout(keepMail) { ["mt_sync_rt", "mt_sync_uid", "mt_sync_meta", "mt_sync_pull", "mt_sync_snap", "mt_sync_wipe"].forEach(ls.del); if (!keepMail) ls.del("mt_sync_mail"); idTok = ""; ui() }

async function pull(uid, last) {
  const out = [];
  for (;;) {
    const j = await fs(FS + "/users/" + uid + ":runQuery", { structuredQuery: { from: [{ collectionId: "items" }],
      where: { fieldFilter: { field: { fieldPath: "u" }, op: "GREATER_THAN", value: { integerValue: String(last) } } },
      orderBy: [{ field: { fieldPath: "u" }, direction: "ASCENDING" }], limit: 300 } });
    if (!Array.isArray(j)) throw new Error("Réponse du serveur illisible : réessaie dans un moment.");
    const rt = j.length && j[0].readTime ? Date.parse(j[0].readTime) : NaN; if (isFinite(rt)) skew = rt - Date.now();
    const docs = j.filter(x => x.document).map(x => x.document.fields || {});
    docs.forEach(f => out.push({ i: f.i && f.i.stringValue, u: +((f.u && f.u.integerValue) || 0), d: !!(f.d && f.d.booleanValue), j: f.j && f.j.stringValue }));
    if (docs.length < 300) return out;
    const nl = out[out.length - 1].u; if (!(nl > last)) throw new Error("Lecture bloquée (horodatage inattendu) : réessaie plus tard.");
    last = nl } }

/* ---------- synchronisation ---------- */
const readAll = async () => (await idb("readonly", s => s.getAll())) || [];
const saveMeta = m => ls.set("mt_sync_meta", JSON.stringify(m));
let stat = { up: 0, down: 0, bad: 0, big: 0 };
/* écrit les fiches distantes dans la base locale, dans UNE transaction, et seulement si la fiche locale n'a pas changé depuis la lecture */
async function applyRemote(puts, dels) {
  const skipped = new Set();
  await idb("readwrite", s => {
    puts.forEach(p => { const q = s.get(p.rec.id); q.onsuccess = () => { const c = q.result; if ((c ? hash(c) : "x") === p.lh) s.put(p.rec); else skipped.add(p.rec.id) } });
    dels.forEach(d => { const q = s.get(d.id); q.onsuccess = () => { const c = q.result; if (c) { if (hash(c) === d.lh) s.delete(d.id); else skipped.add(d.id) } } });
  }, true);
  return skipped }
async function core() {
  const uid = ls.get("mt_sync_uid"); if (!uid) throw new Error("NOLOGIN");
  if (!db) throw new Error("Stockage local indisponible");
  let meta = JSON.parse(ls.get("mt_sync_meta") || "null"); const first = !meta; meta = meta || {};
  const wipe = ls.get("mt_sync_wipe") === "1";
  let loc = new Map((await readAll()).map(f => [f.id, f]));
  /* base locale vide alors qu'on avait déjà synchronisé (sauf « vider la collection » voulu) : on repart du cloud, sans rien y supprimer */
  if (!loc.size && Object.keys(meta).length && !wipe) { meta = {}; ls.del("mt_sync_pull") }
  if (first && loc.size && !ls.get("mt_sync_snap")) {
    for (let i = 0; i < 30 && D.length !== loc.size; i++) await sleep(200);
    if (!(await snap("avant synchro"))) throw new Error("Copie de secours impossible : synchro suspendue pour protéger tes fiches.");
    ls.set("mt_sync_snap", "1") }
  let last = +ls.get("mt_sync_pull") || 0, bad = 0;
  const rem = await pull(uid, Math.max(0, last - OVER)), puts = [], dels0 = [];
  for (const r of rem) {
    last = Math.max(last, r.u); lastU = Math.max(lastU, r.u);             /* le curseur avance aussi pour les documents ignorés ; nos prochains envois seront toujours plus récents que tout ce qu'on a vu */
    if (!r.i) { bad++; continue }
    const m = meta[r.i]; if (m && r.u <= m[1]) continue;
    const l = loc.get(r.i), lh = l ? hash(l) : "x", chg = m ? lh !== m[0] : false;
    if (r.d) {
      if (l && (chg || !m)) meta[r.i] = ["?", r.u];                       /* modifiée ici : la version locale repart dans le cloud */
      else if (l) dels0.push({ id: r.i, lh, u: r.u });
      else meta[r.i] = ["x", r.u]
    } else {
      let rec; try { rec = JSON.parse(r.j); if (!rec || typeof rec !== "object" || Array.isArray(rec) || typeof rec.t !== "string" || !rec.t) throw 0 } catch (e) { bad++; continue }
      sane(rec); if (typeof rec.g !== "string") rec.g = "";
      rec.id = r.i; const rh = hash(rec);
      if (l && chg) meta[r.i] = ["?", r.u];                               /* modifiée des deux côtés : la locale gagne */
      else if (!l || lh !== rh) puts.push({ rec, lh, rh, u: r.u });
      else meta[r.i] = [rh, r.u] } }
  if (puts.length || dels0.length) {
    let sk; try { sk = await applyRemote(puts, dels0) } catch (e) { throw new Error("Écriture locale impossible : rien n'a été modifié ici.") }
    puts.forEach(p => { meta[p.rec.id] = sk.has(p.rec.id) ? ["?", p.u] : [p.rh, p.u] });   /* modifiée pendant la synchro : la locale gagne */
    dels0.forEach(d => { meta[d.id] = sk.has(d.id) ? ["?", d.u] : ["x", d.u] });
    const all = await readAll(); D.length = 0; all.forEach(f => D.push(f)); lists(); draw() }
  ls.set("mt_sync_pull", String(last)); saveMeta(meta);
  loc = new Map((await readAll()).map(f => [f.id, f]));                   /* état local à jour juste avant l'envoi */
  const ups = [], dels = [];
  for (const [id, f] of loc) { const h = hash(f); if (!meta[id] || meta[id][0] !== h) ups.push([id, h, f]) }
  for (const id of Object.keys(meta)) if (meta[id][0] !== "x" && !loc.has(id)) dels.push(id);
  if (!wipe && dels.length > Math.max(10, 0.2 * Object.keys(meta).length) && !confirm("Tu as supprimé " + dels.length + " fiches sur cet appareil. Les supprimer aussi sur tes autres appareils ?\n\nAnnuler = on les récupère depuis le cloud.")) {
    dels.forEach(id => { delete meta[id] }); dels.length = 0; saveMeta(meta); ls.set("mt_sync_pull", "0"); setTimeout(run, 500) }
  const ops = [...ups.map(([id, h, f]) => ({ id, h, d: false, j: JSON.stringify(f) })), ...dels.map(id => ({ id, h: "x", d: true, j: "{}" }))];
  let big = 0; for (let i = ops.length - 1; i >= 0; i--) if (!ops[i].d && ops[i].j.length > 950000) { ops.splice(i, 1); big++ }   /* limite Firestore : 1 Mo par document */
  const chunks = []; let cc = [], sz = 0;                                 /* lots de 200 fiches max, et 1,5 Mo max (images perso) */
  for (const o of ops) { const w = o.j.length + 300; if (cc.length && (cc.length >= 200 || sz + w > 1.5e6)) { chunks.push(cc); cc = []; sz = 0 } cc.push(o); sz += w }
  if (cc.length) chunks.push(cc);
  for (const ch of chunks) {
    ch.forEach(o => o.u = nextU());
    await fs("https://firestore.googleapis.com/v1/" + DOCS + ":commit", { writes: ch.map(o => ({ update: { name: DOCS + "/users/" + uid + "/items/" + did(o.id),
      fields: { i: { stringValue: o.id }, u: { integerValue: String(o.u) }, d: { booleanValue: o.d }, j: { stringValue: o.j } } } })) });
    ch.forEach(o => { meta[o.id] = [o.h, o.u] }); saveMeta(meta) }
  if (wipe) ls.del("mt_sync_wipe");
  stat = { up: ops.length, down: puts.length + dels0.length, bad, big } }

/* ---------- déclencheurs et affichage ---------- */
const FR = { EMAIL_EXISTS: "Ce compte existe déjà : utilise « Se connecter ».", INVALID_LOGIN_CREDENTIALS: "Email ou mot de passe incorrect.", INVALID_PASSWORD: "Mot de passe incorrect.",
  EMAIL_NOT_FOUND: "Compte introuvable : utilise « Créer un compte ».", INVALID_EMAIL: "Adresse email invalide.", MISSING_PASSWORD: "Entre ton mot de passe.", WEAK_PASSWORD: "Mot de passe trop court (6 caractères minimum).",
  OPERATION_NOT_ALLOWED: "La connexion par email n'est pas activée dans Firebase.", TOO_MANY_ATTEMPTS: "Trop d'essais : réessaie dans quelques minutes." };
const msg = e => { const m = String((e && e.message) || e); for (const k in FR) if (m.includes(k)) return FR[k];
  if (e && e.code === 403) return "Accès refusé : vérifie les règles Firestore."; if (/Failed to fetch|NetworkError|Load failed/.test(m)) return "Pas de connexion."; return m };
const say = t => { const s = g("sys"); if (s) s.textContent = t };
function ui() { const on = !!ls.get("mt_sync_rt"); if (g("syl")) { g("syl").hidden = on; g("syo").hidden = !on; if (!on && g("sym") && !g("sym").value) g("sym").value = ls.get("mt_sync_mail") || "" } }
let busy = false, again = false, tm = 0;
async function run(manual) {
  if (!ls.get("mt_sync_rt")) return;
  if (busy) { again = true; return }
  if (navigator.onLine === false) { say("Hors ligne : la synchro reprendra toute seule."); return }
  busy = true; say("Synchronisation…");
  try { await core(); const t = new Date(); say("Synchronisé à " + t.getHours() + "h" + String(t.getMinutes()).padStart(2, "0") + " (" + stat.up + " envoyée" + (stat.up > 1 ? "s" : "") + ", " + stat.down + " reçue" + (stat.down > 1 ? "s" : "") + ")" + (stat.bad ? " — " + stat.bad + " fiche(s) distante(s) illisible(s) ignorée(s)" : "") + (stat.big ? " — " + stat.big + " fiche(s) trop volumineuse(s) (image perso ?) non envoyée(s)" : "")) }
  catch (e) { if (e.message === "NOLOGIN") say("Session expirée : reconnecte-toi."); else say("Synchro impossible : " + msg(e)) }
  finally { busy = false; if (again) { again = false; later(1500) } } }
const later = ms => { clearTimeout(tm); tm = setTimeout(run, ms) };
function wire() {
  ui(); if (!g("syi")) return;
  const go = create => async () => { const m = g("sym").value.trim(), p = g("syp").value; if (!m || !p) { say("Entre ton email et ton mot de passe."); return }
    say("Connexion…"); try { await login(m, p, create); g("syp").value = ""; ui(); run() } catch (e) { say(msg(e)) } };
  g("syi").onclick = go(false); g("syc").onclick = go(true);
  g("syf").onclick = async () => { const m = g("sym").value.trim(); if (!m) { say("Entre ton email dans le champ ci-dessus, puis touche « Mot de passe oublié »."); return }
    say("Envoi…"); try { await post(AUTH + "sendOobCode?key=" + KEY, { requestType: "PASSWORD_RESET", email: m }); say("Si ce compte existe, un mail de réinitialisation vient d'être envoyé (regarde aussi dans les spams).") } catch (e) { say(msg(e)) } };
  g("syn").onclick = () => run(true); g("syx").onclick = () => { logout(); say("Déconnecté. Ta collection reste sur cet appareil.") };
  if (ls.get("mt_sync_rt")) { const t = ls.get("mt_sync_mail"); say(t ? "Connecté : " + t : "Connecté.") } }
wire();
let seen = ls.get("mt_chg");
setInterval(() => { const c = ls.get("mt_chg"); if (c !== seen) { seen = c; later(4000) } }, 2500);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") later(800) });
window.addEventListener("online", () => later(800));
setInterval(() => { if (document.visibilityState === "visible") later(0) }, 120000);
later(2500);
/* « vider la collection » voulu sur cet appareil : les suppressions sont envoyées aux autres appareils (la confirmation a déjà eu lieu côté appli) */
const wipe = () => { ls.set("mt_sync_wipe", "1"); if (ls.get("mt_sync_wipe") !== "1") { say("Impossible de mémoriser la suppression : elle ne sera pas envoyée aux autres appareils."); return } later(300) };
window.MTSync = { run, login, logout, wipe, active: () => !!ls.get("mt_sync_rt") };
})();
