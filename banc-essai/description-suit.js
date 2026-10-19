/* ====== BANC « LA DESCRIPTION SUIT CE QU'ON ÉCRIT » (v329) ======
   « Sur la description, si j'écris trop, le texte ne suit plus. » C'était
   un champ d'une ligne : passé sa largeur, le texte filait hors de vue. Le
   décor de groupes.js — un VRAI PostgreSQL. Sur iPhone puis sur Android :
     1. vide, la description a la hauteur exacte du nom, et la photo du
        groupe reste alignée sur les deux champs ;
     2. tapée jusqu'au bout (160 signes) : le champ va à la ligne et grandit,
        rien n'est caché (ni à droite, ni en bas) ;
     3. effacée : il redevient d'une ligne, à la hauteur du nom ;
     4. « OK » au clavier (Entrée) : pas de retour à la ligne, le clavier se
        referme ;
     5. un texte collé avec des retours à la ligne : ils deviennent des
        espaces ;
     6. « Modifier le groupe » d'un groupe à longue description : elle
        s'ouvre entière, et « Enregistrer » l'enregistre telle quelle ;
     7. mêmes hauteurs sur iPhone et sur Android ;
     8. aucune erreur.
   Usage : node banc-essai/description-suit.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { monter } = require('./faux-serveur-groupes.js');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const A = 'aaaaaaaa-0000-4000-8000-0000000000c1';
const LONGUE = 'Un groupe pour lire la Bible ensemble chaque soir à vingt heures, partager ce qui nous a touchés et prier les uns pour les autres. Bienvenue à chacun !';
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + String(detail).slice(0, 240) + ')' : '')); if (!bon) ko++; };

(async () => {
  const m = await monter(8491, 5693);
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    await m.compte(A, 'taylor@essai');
    await m.rpc(A, 'poser_profil', { p_nom: 'Taylor', p_couleur: '#4C86E8' });
    await m.rpc(A, 'accepter_regles', { p_version: 1, p_age_ok: true });
    await m.ouvrir(true);
    const g = (await m.rpc(A, 'creer_groupe', { p_nom: 'Les amis', p_description: LONGUE, p_ouvert: false, p_langue: 'fr', p_teinte: 2 })).data;
    const attendre = (p, f, arg, ms) => p.waitForFunction(f, arg, { timeout: ms || 8000, polling: 100 }).then(() => true).catch(() => false);
    const hauteurs = {};
    /* Le même écran pour les deux : seule la plateforme change. */
    for (const [tel, ua, vue] of [['iPhone', IOS, { width: 393, height: 852 }], ['Android', AND, { width: 393, height: 852 }]]) {
      console.log('  — ' + tel);
      const ctx = await nav.newContext({ viewport: vue, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: ua, serviceWorkers: 'block' });
      const p = await ctx.newPage();
      p.on('pageerror', e => erreurs.push(tel + ' : ' + e.message));
      await p.addInitScript((moi) => {
        localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' }));
        localStorage.setItem('bt_fs_hint', '1'); localStorage.setItem('essai_moi', moi); localStorage.setItem('sb-essai-auth-token', '1');
      }, A);
      await p.goto(m.url);
      await p.waitForFunction(() => { try { return state.screen === 'mode' && !!(grp.etat && grp.etat.participe === 'ok'); } catch (e) { return false; } }, null, { timeout: 25000 });
      await p.evaluate(() => allerOnglet('groupes'));
      await attendre(p, () => !!document.getElementById('grpMes'), null, 9000);
      await p.evaluate(() => ouvrirCreation());
      await attendre(p, () => !!document.getElementById('grpDesc'), null, 4000);
      await p.waitForTimeout(700);
      const mesure = () => p.evaluate(() => {
        const d = document.getElementById('grpDesc'), n = document.getElementById('grpNom'), a = document.getElementById('grpFormAv');
        const rd = d.getBoundingClientRect(), rn = n.getBoundingClientRect(), ra = a ? a.getBoundingClientRect() : null;
        return { h: Math.round(rd.height * 10) / 10, nom: Math.round(rn.height * 10) / 10, cache: d.scrollHeight - d.clientHeight, gauche: d.scrollLeft,
          photoHaut: ra ? Math.abs(ra.top - rn.top) : 0, photoBas: ra ? Math.abs(ra.bottom - rd.bottom) : 0, valeur: d.value, focus: document.activeElement === d };
      });

      /* 1 */
      let r = await mesure();
      dit('1. vide : la hauteur du nom, la photo alignée sur les deux champs', Math.abs(r.h - r.nom) < 0.6 && r.photoHaut < 1 && r.photoBas < 1, JSON.stringify(r));
      hauteurs[tel] = [r.h];

      /* 2 */
      await p.tap('#grpDesc');
      await p.keyboard.type(LONGUE + ' Et encore un peu de texte pour aller au bout.', { delay: 2 });
      await p.waitForTimeout(300);
      r = await mesure();
      dit('2. tapée jusqu\'au bout : le champ va à la ligne et grandit, rien de caché', r.valeur.length === 160 && r.h > r.nom * 2 && r.cache <= 1 && r.gauche === 0, r.valeur.length + ' signes · ' + JSON.stringify({ h: r.h, nom: r.nom, cache: r.cache, gauche: r.gauche }));
      hauteurs[tel].push(r.h);

      /* 3 */
      await p.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
      await p.keyboard.press('Backspace');
      await p.waitForTimeout(200);
      r = await mesure();
      dit('3. effacée : une ligne, à la hauteur EXACTE du nom (la photo reste alignée)', r.valeur === '' && Math.abs(r.h - r.nom) < 0.05 && r.photoBas < 0.05, JSON.stringify({ h: r.h, nom: r.nom, photoBas: r.photoBas }));

      /* 4 */
      await p.keyboard.type('Bonjour');
      await p.keyboard.press('Enter');
      await p.waitForTimeout(200);
      r = await mesure();
      dit('4. « OK » au clavier : pas de retour à la ligne, le clavier se referme', r.valeur === 'Bonjour' && !r.focus, JSON.stringify({ valeur: r.valeur, focus: r.focus }));

      /* 5 */
      await p.tap('#grpDesc');
      await p.evaluate(() => { const d = document.getElementById('grpDesc'); d.setRangeText(' à tous\nles amis\r\n de Yada', d.value.length, d.value.length, 'end'); d.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertFromPaste' })); });
      await p.waitForTimeout(150);
      r = await mesure();
      dit('5. collé avec des retours à la ligne : ils deviennent des espaces', r.valeur === 'Bonjour à tous les amis de Yada', JSON.stringify(r.valeur));
      await p.evaluate(() => { const v = document.getElementById('grpCreerVeil'); if (v) fermerFeuilleGroupe('grpCreerVeil'); });
      await p.waitForTimeout(700);

      /* 6 */
      await p.evaluate((id) => ouvrirGroupe(id), g.id);
      await attendre(p, () => state.screen === 'groupe', null, 8000);
      await p.waitForTimeout(800);
      await p.evaluate(() => ouvrirInfosGroupe());
      await p.waitForTimeout(900);
      await p.evaluate(() => ouvrirModifGroupe());
      await attendre(p, () => !!document.querySelector('#grpModifVeil #grpDesc'), null, 4000);
      await p.waitForTimeout(700);
      r = await mesure();
      /* (Le jeu met une espace insécable devant « ! », « ? », « : » — la
         typographie française, pour que la ponctuation ne parte jamais seule
         à la ligne : elle est la même à l'œil.) */
      const tel6 = r.valeur.replace(/\u00a0/g, ' ');
      dit('6. « Modifier le groupe » : la longue description s\'ouvre entière', tel6 === LONGUE && r.cache <= 1 && r.h > r.nom * 2, JSON.stringify({ h: r.h, cache: r.cache }) + (tel6 === LONGUE ? '' : ' · valeur ' + JSON.stringify(r.valeur)));
      hauteurs[tel].push(r.h);
      if (tel === 'iPhone') {
        await p.tap('#grpDesc');
        await p.keyboard.press('Control+End');   // (« End » seul va au bout de la LIGNE)
        await p.keyboard.type(' Amen.');
        await p.evaluate(() => { const b = document.querySelector('#grpModifVeil .btn-primary'); if (b) b.click(); });
        const enregistre = await (async () => { for (let i = 0; i < 40; i++) { if ((await m.sql("select description from public.groupes where id = '" + g.id + "'")).replace(/\u00a0/g, ' ') === LONGUE + ' Amen.') return true; await p.waitForTimeout(150); } return false; })();
        dit('   « Enregistrer » l\'enregistre telle quelle', enregistre, await m.sql("select description from public.groupes where id = '" + g.id + "'"));
        await m.sql("update public.groupes set description = '" + LONGUE.replace(/'/g, "''") + "' where id = '" + g.id + "'");
      }
      await ctx.close();
    }

    /* 7 */
    dit('7. mêmes hauteurs sur iPhone et sur Android', hauteurs.iPhone.every((h, i) => Math.abs(h - hauteurs.Android[i]) < 0.6),
      'iPhone ' + hauteurs.iPhone.join(' / ') + ' · Android ' + hauteurs.Android.join(' / '));
    dit('8. aucune erreur', !erreurs.length, erreurs.slice(0, 3).join(' | '));
  } catch (e) {
    console.error(e); ko++;
  } finally {
    await nav.close();
    await m.arreter();
  }
  console.log(ko === 0 ? '\n  OK — la description va à la ligne et grandit : tout ce qu\'on écrit reste sous les yeux' : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
