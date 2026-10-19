/* ====== BANC « UNE INSULTE NE PART PAS — ET ON SAIT POURQUOI » (v331) ======
   « Pour les mots qui contiennent des insultes, affiche un petit message
     comme quoi c'est une insulte et qu'on ne peut pas l'envoyer, plutôt que
     de juste effacer le message sans faire comprendre à la personne. » La
   raison partait dans le petit message du bas de l'écran — derrière le
   clavier ouvert, deux secondes : on ne voyait que la bulle s'effacer.
   Le décor de groupes.js — un VRAI PostgreSQL, le vrai filtre du serveur.
     1. une insulte : rien sur le serveur, le texte revient dans la barre, la
        bulle se replie comme un message qui s'en va (plus d'effacement sec) ;
     2. la raison s'écrit JUSTE AU-DESSUS de la barre d'écriture, entière sur
        l'écran : « Ce message contient une insulte ou un mot grossier : il
        ne peut pas être envoyé. » ;
     3. elle reste le temps de la lire, et s'efface dès qu'on corrige ;
     4. corrigé, le message part ;
     5. un numéro dans un groupe public : sa raison à lui, au même endroit ;
     6. en anglais, les mots de l'anglais ;
     7. clavier ouvert, un petit message du jeu se pose en haut de la zone
        visible (plus sous le clavier) ;
     8. aucune erreur.
   Usage : node banc-essai/refus-insulte.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { monter } = require('./faux-serveur-groupes.js');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const A = 'aaaaaaaa-0000-4000-8000-0000000000a7', B = 'bbbbbbbb-0000-4000-8000-0000000000b7';
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + String(detail).slice(0, 240) + ')' : '')); if (!bon) ko++; };

(async () => {
  const m = await monter(8489, 5691);
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    for (const [id, mail, nom, couleur] of [[A, 'taylor@essai', 'Taylor', '#4C86E8'], [B, 'benoit@essai', 'Benoît', '#E8734C']]) {
      await m.compte(id, mail);
      await m.rpc(id, 'poser_profil', { p_nom: nom, p_couleur: couleur });
      await m.rpc(id, 'accepter_regles', { p_version: 1, p_age_ok: true });
    }
    await m.ouvrir(true);
    const prive = (await m.rpc(A, 'creer_groupe', { p_nom: 'Les amis', p_description: '', p_ouvert: false, p_langue: 'fr', p_teinte: 2 })).data;
    const public_ = (await m.rpc(A, 'creer_groupe', { p_nom: 'Bible ensemble', p_description: '', p_ouvert: true, p_langue: 'fr', p_teinte: 4 })).data;
    await m.sql("update public.messages set cree_le = cree_le - interval '1 minute'");
    const attendre = (p, f, arg, ms) => p.waitForFunction(f, arg, { timeout: ms || 8000, polling: 50 }).then(() => true).catch(() => false);
    const telephone = async (langue) => {
      const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
      const p = await ctx.newPage();
      p.on('pageerror', e => erreurs.push(e.message));
      await p.addInitScript(([moi, l]) => {
        localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
        localStorage.setItem('bt_fs_hint', '1'); localStorage.setItem('essai_moi', moi); localStorage.setItem('sb-essai-auth-token', '1');
        if (l) localStorage.setItem('bt_langue', l);
      }, [A, langue || '']);
      await p.goto(m.url);
      await p.waitForFunction(() => { try { return state.screen === 'mode' && !!(grp.etat && grp.etat.participe === 'ok'); } catch (e) { return false; } }, null, { timeout: 25000 });
      return { ctx, p };
    };
    const ouvrir = async (p, id) => { await p.evaluate((id) => ouvrirGroupe(id), id); return attendre(p, () => state.screen === 'groupe' && !!document.getElementById('compoTexte'), null, 9000); };
    const envoyer = (p, texte) => p.evaluate((t) => {
      window.__plis = [];
      const vrai = replierDansLeFil;
      replierDansLeFil = function(z, els){ window.__plis.push(...els.map(e => (e.querySelector('[data-m]') || e).getAttribute('data-m'))); return vrai(z, els); };
      const z = document.getElementById('compoTexte'); z.value = t; surSaisie(z); envoyerMessageGroupe();
    }, texte);
    /* VISIBLE POUR DE VRAI : ce qui est au-dessus de tout, à ses quatre coins
       et en son milieu, c'est elle — une surface qui la couperait (la capsule
       de verre de la barre, en v331 d'abord) la cacherait sans changer sa
       place. (Le temps de la mesure, elle se laisse toucher.) */
    const alerte = (p) => p.evaluate(() => {
      const a = document.querySelector('.fil-carte .compo-alerte'), c = document.getElementById('compo');
      if (!a) return null;
      const r = a.getBoundingClientRect(), rc = c.getBoundingClientRect(), s = getComputedStyle(a);
      a.style.pointerEvents = 'auto';
      const points = [[r.left + 6, r.top + 6], [r.right - 6, r.top + 6], [r.left + 6, r.bottom - 6], [r.right - 6, r.bottom - 6], [r.left + r.width / 2, r.top + r.height / 2]];
      const dessus = points.every(([x, y]) => { const e = document.elementFromPoint(x, y); return !!e && (e === a || a.contains(e)); });
      a.style.pointerEvents = '';
      return { texte: a.textContent.trim(), vue: a.classList.contains('vue'), op: +s.opacity, haut: Math.round(r.top), bas: Math.round(r.bottom), gauche: Math.round(r.left), droite: Math.round(r.right),
        barre: Math.round(rc.top), largeur: innerWidth, bord: s.borderTopWidth + ' ' + s.borderTopStyle, dessus };
    });

    const { ctx, p } = await telephone();
    await ouvrir(p, prive.id);
    await p.waitForTimeout(800);

    /* 1 */
    await envoyer(p, 'espèce de connard');
    const revenu = await attendre(p, () => document.getElementById('compoTexte').value === 'espèce de connard', null, 6000);
    /* Le pli prend son temps (la bulle part en se repliant), puis elle n'est plus là. */
    await attendre(p, () => ![...document.querySelectorAll('#fil .b-bulle')].some(b => /connard/.test(b.textContent)), null, 2000);
    const r1 = await p.evaluate(() => ({ plis: window.__plis.slice(), bulle: [...document.querySelectorAll('#fil .b-bulle')].some(b => /connard/.test(b.textContent)) }));
    const serveur = await m.sql("select count(*) from public.messages where texte like '%connard%'");
    dit('1. une insulte : rien sur le serveur, le texte revient dans la barre', revenu && serveur === '0', 'serveur ' + serveur);
    dit('   la bulle se replie comme un message qui s\'en va (plus d\'effacement sec)', r1.plis.some(k => +k < 0) && !r1.bulle, JSON.stringify(r1));

    /* 2 */
    const vue = await attendre(p, () => { const a = document.querySelector('.fil-carte .compo-alerte'); return !!a && a.classList.contains('vue') && +getComputedStyle(a).opacity > 0.95; }, null, 3000);
    const a2 = await alerte(p);
    dit('2. la raison s\'écrit juste au-dessus de la barre d\'écriture, entière sur l\'écran, rien par-dessus', vue && a2 && a2.bas <= a2.barre && a2.barre - a2.bas < 24 && a2.haut > 0 && a2.gauche >= 0 && a2.droite <= a2.largeur && a2.dessus,
      JSON.stringify(a2));
    dit('   « Ce message contient une insulte ou un mot grossier : il ne peut pas être envoyé. » — sans trait', a2 && a2.texte === 'Ce message contient une insulte ou un mot grossier : il ne peut pas être envoyé.' && /^0px/.test(a2.bord),
      a2 && a2.texte);

    /* 3 */
    await p.waitForTimeout(2500);
    const a3 = await alerte(p);
    dit('3. elle reste le temps de la lire (2,5 s après, toujours là)', a3 && a3.vue && a3.op > 0.95);
    await p.locator('#compoTexte').press('End');
    await p.keyboard.press('Backspace');
    const partie = await attendre(p, () => { const a = document.querySelector('.fil-carte .compo-alerte'); return !a || !a.classList.contains('vue'); }, null, 1500);
    dit('   elle s\'efface dès qu\'on corrige le texte', partie);

    /* 4 */
    await m.sql("update public.messages set cree_le = cree_le - interval '10 seconds'");
    await p.evaluate(() => { const z = document.getElementById('compoTexte'); z.value = 'Bonsoir à tous'; surSaisie(z); envoyerMessageGroupe(); });
    const parti = await attendre(p, () => [...document.querySelectorAll('#fil .b-moi [data-m]')].some(b => +b.getAttribute('data-m') > 0 && /Bonsoir à tous/.test(b.textContent)), null, 6000);
    dit('4. corrigé, le message part', parti && (await m.sql("select count(*) from public.messages where texte = 'Bonsoir à tous'")) === '1');

    /* 5 */
    await p.evaluate(() => retourGroupes());
    await p.waitForTimeout(600);
    await ouvrir(p, public_.id);
    await p.waitForTimeout(700);
    await m.sql("update public.messages set cree_le = cree_le - interval '10 seconds'");
    await envoyer(p, 'appelle-moi au 06 12 34 56 78');
    await attendre(p, () => { const a = document.querySelector('.fil-carte .compo-alerte'); return !!a && a.classList.contains('vue'); }, null, 4000);
    const a5 = await alerte(p);
    dit('5. un numéro dans un groupe public : sa raison à lui, au même endroit', a5 && a5.texte === 'Pas d\'adresse, de numéro ni de lien dans un groupe public.' && a5.bas <= a5.barre && a5.dessus,
      a5 && a5.texte);

    /* 7 */
    const t7 = await p.evaluate(() => {
      document.documentElement.classList.add('kb');
      document.documentElement.style.setProperty('--vvh', '480px');
      showMiniToast('Essai');
      return new Promise(r => setTimeout(() => { const e = document.querySelector('.mini-toast'); const b = e.getBoundingClientRect();
        document.documentElement.classList.remove('kb'); r({ haut: Math.round(b.top), bas: Math.round(b.bottom) }); }, 400));
    });
    dit('7. clavier ouvert, un petit message se pose en haut de la zone visible (plus sous le clavier)', t7.bas < 140, JSON.stringify(t7));
    await ctx.close();

    /* 6 */
    const { ctx: c6, p: p6 } = await telephone('en');
    await ouvrir(p6, prive.id);
    await p6.waitForTimeout(700);
    await m.sql("update public.messages set cree_le = cree_le - interval '10 seconds'");
    await envoyer(p6, 'what a bitch');
    await attendre(p6, () => { const a = document.querySelector('.fil-carte .compo-alerte'); return !!a && a.classList.contains('vue'); }, null, 4000);
    const a6 = await alerte(p6);
    dit('6. en anglais : « ' + (a6 && a6.texte) + ' »', a6 && a6.texte === 'This message contains an insult or a rude word, so it can\'t be sent.');
    await c6.close();

    dit('8. aucune erreur', !erreurs.length, erreurs.slice(0, 3).join(' | '));
  } catch (e) {
    console.error(e); ko++;
  } finally {
    await nav.close();
    await m.arreter();
  }
  console.log(ko === 0 ? '\n  OK — une insulte ne part pas, et la raison se lit au-dessus de la barre d\'écriture' : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
