/* ====== BANC « LE DIRECT SE PERD, LA DISCUSSION SUIT QUAND MÊME » (v328) ======
   « Lorsque je reçois les messages, je les vois — mais pas lorsque je suis à
     l'intérieur d'un groupe. » Le serveur diffusait bien (sondé le
   18/10/2026). C'est le téléphone qui perdait son canal du direct et ne le
   rouvrait jamais ; une discussion ouverte, rien d'autre ne la relisait.
   Le décor de groupes.js — un VRAI PostgreSQL, les vraies règles. Taylor
   (iPhone) a la discussion ouverte ; Benoît écrit depuis le serveur. On
   coupe le direct de Taylor de trois façons, comme un vrai téléphone le perd :
     1. le direct marche : le message arrive en moins de 3 s ;
     2. EN SILENCE (le canal se croit ouvert, ne reçoit plus rien — le pire
        cas) : le message arrive quand même, en 12 s au plus (la relève), et
        le canal muet est remplacé — le message d'après arrive en direct ;
     3. COMME UNE VRAIE COUPURE (CHANNEL_ERROR) : un canal neuf, sous un
        autre nom, est ouvert en quelques secondes ; le message écrit pendant
        la coupure arrive, celui d'après arrive en direct ;
     4. AU RETOUR DU RÉSEAU (« online », canal en erreur sans avoir rien
        dit) : un canal neuf tout de suite, et le message arrive en direct ;
     5. aucun message en double, aucun non-lu pour la discussion qu'on lit ;
     6. la discussion quittée, la relève s'arrête : plus une requête ;
     7. aucune erreur de page.
   Usage : node banc-essai/direct-perdu.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { monter } = require('./faux-serveur-groupes.js');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const A = 'aaaaaaaa-0000-4000-8000-0000000000d8', B = 'bbbbbbbb-0000-4000-8000-0000000000d8';
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + detail + ')' : '')); if (!bon) ko++; };

(async () => {
  const m = await monter(8462, 5662);
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    for (const [id, mail, nom, couleur] of [[A, 'taylor@essai', 'Taylor', '#4C86E8'], [B, 'benoit@essai', 'Benoît', '#E8734C']]) {
      await m.compte(id, mail);
      await m.rpc(id, 'poser_profil', { p_nom: nom, p_couleur: couleur });
      await m.rpc(id, 'accepter_regles', { p_version: 1, p_age_ok: true });
    }
    await m.ouvrir(true);
    const g = (await m.rpc(A, 'creer_groupe', { p_nom: 'Le direct', p_description: '', p_ouvert: false, p_langue: 'fr', p_teinte: 3 })).data;
    const code = await m.sql(`select code from public.groupes where id = '${g.id}'`);
    await m.rpc(B, 'rejoindre_groupe', { p_groupe: g.id, p_code: code });
    const attendre = (p, f, arg, ms) => p.waitForFunction(f, arg, { timeout: ms || 8000, polling: 100 }).then(() => true).catch(() => false);

    const ctx = await nav.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    p.on('pageerror', e => erreurs.push(e.message));
    await p.addInitScript((moi) => {
      localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
      localStorage.setItem('bt_fs_hint', '1'); localStorage.setItem('essai_moi', moi); localStorage.setItem('sb-essai-auth-token', '1');
      /* Les relèves : les lectures de « messages » qui demandent ce qui suit
         un identifiant (gt). */
      window.__releves = 0;
      const f0 = window.fetch;
      window.fetch = function(u, o){
        try{ if(String(u).indexOf('/faux/select') >= 0 && o && o.body){ const b = JSON.parse(o.body);
          if(b.table === 'messages' && (b.filtres || []).some(x => x[1] === 'gt')) window.__releves++; } }catch(e){}
        return f0.apply(this, arguments);
      };
    }, A);
    await p.goto(m.url);
    await p.waitForFunction(() => { try { return state.screen === 'mode' && !!(grp.etat && grp.etat.participe === 'ok'); } catch (e) { return false; } }, null, { timeout: 25000 });
    await p.evaluate((id) => ouvrirGroupe(id), g.id);
    await attendre(p, () => state.screen === 'groupe' && !!document.getElementById('compoTexte'), null, 9000);
    const ouvert = () => attendre(p, () => (window.__canauxDirect || []).some(c => c.state === 'joined'), null, 8000);
    await ouvert();
    await p.waitForTimeout(600);

    /* Benoît écrit. Le serveur refuse deux messages à moins d'une seconde
       d'écart (« trop_vite ») : on espace, et on exige qu'il accepte. */
    let dernierEnvoi = 0;
    const ecrire = async (texte) => {
      const reste = 1150 - (Date.now() - dernierEnvoi);
      if (reste > 0) await new Promise(r => setTimeout(r, reste));
      const r = await m.rpc(B, 'envoyer_message', { p_groupe: g.id, p_texte: texte, p_genre: 'texte', p_donnees: {} });
      dernierEnvoi = Date.now();
      if (!(r && r.data && r.data.ok)) throw new Error('le serveur refuse « ' + texte + ' » : ' + JSON.stringify(r));
    };
    const arrive = async (texte, ms) => {
      const t0 = Date.now();
      const ok = await attendre(p, (t) => [...document.querySelectorAll('#fil .b-bulle')].some(b => b.textContent.includes(t)), texte, ms);
      return { ok, ms: Date.now() - t0 };
    };
    /* Pour prouver qu'un message arrive PAR LE DIRECT, on l'écrit juste après
       une relève : la suivante est loin (10 s), il ne peut venir que du canal. */
    const apresUneReleve = async () => {
      const n = await p.evaluate(() => window.__releves);
      await attendre(p, (n) => window.__releves > n, n, 13000);
      await p.waitForTimeout(400);
    };
    const canaux = () => p.evaluate(() => (window.__canauxDirect || []).map(c => c.__nom + ':' + c.state));

    /* ---- 1 ---- */
    await ecrire('Message un');
    let r = await arrive('Message un', 3000);
    dit('1. le direct marche : le message arrive', r.ok, r.ms + ' ms');

    /* ---- 2 ---- */
    const coupes = await p.evaluate(() => window.__couperDirect('silence'));
    const nomAvant = (await canaux()).join(' ');
    await ecrire('Message deux');
    r = await arrive('Message deux', 12500);
    dit('2. direct coupé EN SILENCE : le message arrive quand même (la relève)', coupes === 1 && r.ok, r.ms + ' ms, canaux coupés : ' + coupes);
    await ouvert();
    const nomApres = (await canaux()).join(' ');
    dit('   … et le canal muet est remplacé par un neuf', nomApres !== nomAvant && /:joined/.test(nomApres), nomAvant + ' → ' + nomApres);
    await apresUneReleve();
    await ecrire('Message deux bis');
    r = await arrive('Message deux bis', 2500);
    dit('   … le message d\'après arrive en direct', r.ok, r.ms + ' ms');

    /* ---- 3 ---- */
    const avant3 = (await canaux()).join(' ');
    await p.evaluate(() => window.__couperDirect('erreur'));
    await ecrire('Message trois');
    r = await arrive('Message trois', 6000);
    dit('3. vraie coupure (CHANNEL_ERROR) : le message écrit pendant la coupure arrive', r.ok, r.ms + ' ms');
    const rouvert3 = await ouvert();
    const apres3 = (await canaux()).join(' ');
    dit('   … un canal neuf, sous un autre nom, est ouvert', rouvert3 && apres3 !== avant3 && /:joined/.test(apres3), avant3 + ' → ' + apres3);
    await apresUneReleve();
    await ecrire('Message quatre');
    r = await arrive('Message quatre', 2500);
    dit('   … et le suivant arrive en direct', r.ok, r.ms + ' ms');

    /* ---- 4 ---- */
    await apresUneReleve();
    const avant4 = (await canaux()).join(' ');
    await p.evaluate(() => { window.__couperDirect('etat'); window.dispatchEvent(new Event('online')); });
    const rouvert4 = await ouvert();
    const apres4 = (await canaux()).join(' ');
    await ecrire('Message cinq');
    r = await arrive('Message cinq', 2500);
    dit('4. au retour du réseau, un canal en erreur est rouvert tout de suite, le message arrive en direct',
      rouvert4 && apres4 !== avant4 && r.ok, r.ms + ' ms · ' + avant4 + ' → ' + apres4);

    /* ---- 5 ---- */
    await p.waitForTimeout(800);
    const bilan = await p.evaluate((gid) => {
      const textes = [...document.querySelectorAll('#fil .b-bulle')].map(b => b.textContent.trim());
      const compte = {};
      textes.forEach(t => { compte[t] = (compte[t] || 0) + 1; });
      const g = (grp.liste || []).find(x => x.id === gid) || {};
      return { doubles: Object.keys(compte).filter(t => compte[t] > 1), n: textes.length, nonLus: +g.non_lus || 0, pastille: grp.nonLus || 0 };
    }, g.id);
    dit('5. aucun message en double, aucun non-lu pour la discussion qu\'on lit', !bilan.doubles.length && bilan.nonLus === 0,
      JSON.stringify(bilan));

    /* ---- 6 ---- */
    await p.evaluate(() => retourGroupes());
    await p.waitForTimeout(300);
    await p.evaluate(() => { window.__releves = 0; });
    await p.waitForTimeout(11000);
    const apresSortie = await p.evaluate(() => window.__releves);
    dit('6. la discussion quittée, la relève s\'arrête', apresSortie === 0, apresSortie + ' requête(s) en 11 s');

    dit('7. aucune erreur de page', !erreurs.length, erreurs.slice(0, 3).join(' | '));
    await ctx.close();
  } catch (e) {
    console.error(e); ko++;
  } finally {
    await nav.close();
    await m.arreter();
  }
  console.log(ko === 0 ? '\n  OK — une discussion ouverte suit ses messages, même quand le direct se perd' : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
