/* ====== L'INVITATION QUE PERSONNE N'A PRISE NE SAUTE PLUS HORS DU FIL (v318) ======
   « Ici, lorsque je lance une partie puis reviens en arrière sans jouer, le
     message de la partie disparaît brusquement. » (capture de Taylor : la
     bulle « Tu lances une partie · Code 9WZS · Rejoindre la partie » dans la
     discussion de « La Modération ».)
   Personne n'étant venu, l'invitation est retirée (v314). Elle attendait la
   réponse du serveur : on revenait dans la discussion, elle y était encore,
   et elle sautait hors du fil une demi-seconde plus tard.
   Le décor de partie-groupe.js — un VRAI PostgreSQL, et deux téléphones :
   Taylor lance la partie, Benoît regarde la discussion.
     1. Taylor revenu dans la discussion : l'invitation n'y est à AUCUNE image ;
     2. chez Benoît, elle se replie : sa place se referme sur plusieurs images,
        sans marche brutale, et elle s'efface ;
     3. … avec la date « Aujourd'hui », qui n'a plus rien à dater ;
     4. … et le reste du fil ne saute pas, ni pendant le pli ni au redessin ;
     5. un message supprimé au milieu d'une suite se replie aussi, et la
        bulle d'après glisse au lieu de sauter ;
     6. le serveur a bien retiré l'invitation ;
     7. aucune erreur.
   Usage : node banc-essai/invitation-douce.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { monter } = require('./faux-serveur-groupes.js');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const A = 'aaaaaaaa-0000-4000-8000-0000000000c1', B = 'bbbbbbbb-0000-4000-8000-0000000000c2';
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + detail + ')' : '')); if (!bon) ko++; };

(async () => {
  const m = await monter(8402, 5588);
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    for (const [id, mail, nom] of [[A, 'taylor@essai', 'Taylor'], [B, 'benoit@essai', 'Benoît']]) {
      await m.compte(id, mail);
      await m.rpc(id, 'poser_profil', { p_nom: nom, p_couleur: '#4C86E8' });
      await m.rpc(id, 'accepter_regles', { p_version: 1, p_age_ok: true });
    }
    await m.ouvrir(true);
    const g = (await m.rpc(A, 'creer_groupe', { p_nom: 'La Modération', p_description: '', p_ouvert: false, p_langue: 'fr', p_teinte: 2 })).data;
    const code = await m.sql(`select code from public.groupes where id = '${g.id}'`);
    await m.rpc(B, 'rejoindre_groupe', { p_groupe: g.id, p_code: code });
    /* Une journée d'hier, pour que « Aujourd'hui » n'existe que par l'invitation. */
    await m.sql("update public.messages set cree_le = cree_le - interval '1 day'");
    const attendre = (p, f, arg, ms) => p.waitForFunction(f, arg, { timeout: ms || 8000 }).then(() => true).catch(() => false);
    const telephone = async (moi, nom) => {
      const ctx = await nav.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
      const p = await ctx.newPage();
      p.on('pageerror', e => erreurs.push(nom + ' : ' + e.message));
      await p.addInitScript(([moi, nom]) => {
        localStorage.setItem('bt_profile', JSON.stringify({ name: nom, color: '#4C86E8' }));
        localStorage.setItem('bt_fs_hint', '1'); localStorage.setItem('essai_moi', moi); localStorage.setItem('sb-essai-auth-token', '1');
      }, [moi, nom]);
      await p.goto(m.url);
      await p.waitForFunction(() => { try { return state.screen === 'mode' && !!(grp.etat && grp.etat.participe === 'ok'); } catch (e) { return false; } }, null, { timeout: 25000 });
      await p.evaluate(() => allerOnglet('groupes'));
      await attendre(p, () => !!document.getElementById('grpMes'), null, 9000);
      await p.evaluate((id) => ouvrirGroupe(id), g.id);
      await attendre(p, () => state.screen === 'groupe' && !!document.querySelector('#fil .b-sys'), null, 9000);
      await p.waitForTimeout(900);
      return p;
    };
    const ta = await telephone(A, 'Taylor');
    const be = await telephone(B, 'Benoît');

    /* Le film d'un fil, image par image : la hauteur et l'opacité de ce qui
       part, et la place de tout ce qui reste. */
    const filmer = (p, quoi) => p.evaluate((quoi) => {
      window.__film = [];
      const t0 = performance.now();
      const tic = () => {
        const z = document.getElementById('fil');
        const img = { t: Math.round(performance.now() - t0), ecran: state.screen };
        if (z) {
          const cible = quoi ? z.querySelector(quoi) : null;
          const b = cible ? (cible.closest('#fil > .b') && cible.closest('#fil > .b').querySelectorAll('[data-m]').length === 1 ? cible.closest('#fil > .b') : cible) : null;
          img.cible = b ? { h: +b.getBoundingClientRect().height.toFixed(2), op: +getComputedStyle(b).opacity } : null;
          img.jour = [...z.querySelectorAll(':scope > .b-jour')].map(j => j.textContent.trim());
          img.partie = !!z.querySelector('.b-partie');
          img.places = [...z.querySelectorAll(':scope > .b-sys, :scope > .b-jour, [data-m]')]
            .map(e => [(e.getAttribute('data-m') || ('j' + e.getAttribute('data-j'))), +e.getBoundingClientRect().top.toFixed(2)]);
        }
        window.__film.push(img);
        if (performance.now() - t0 < 2600) requestAnimationFrame(tic);
      };
      requestAnimationFrame(tic);
    }, quoi);
    const film = (p) => p.waitForFunction(() => window.__film && window.__film.length && window.__film[window.__film.length - 1].t >= 2500, null, { timeout: 8000 })
      .then(() => p.evaluate(() => window.__film));
    /* Ce qui reste ne saute pas : entre deux images, aucun élément commun ne
       bouge de plus de « pas » pixels. */
    const sauts = (images, pas, sauf) => {
      let pire = 0, ou = '';
      for (let i = 1; i < images.length; i++) {
        const a = new Map((images[i - 1].places || [])), b = new Map((images[i].places || []));
        for (const [k, y] of b) {
          if (sauf && sauf.has(k)) continue;
          if (!a.has(k)) continue;
          const d = Math.abs(y - a.get(k));
          if (d > pire) { pire = d; ou = k + ' à ' + images[i].t + ' ms'; }
        }
      }
      return { pire: +pire.toFixed(2), ou, ok: pire <= pas };
    };

    /* ---- 1 à 4 : Taylor lance, puis revient sans jouer ---- */
    await ta.evaluate(() => document.querySelector('.compo-jeu').click());
    const lancee = await attendre(ta, () => state.screen === 'online-room' && !!(net.partieGroupe && net.partieGroupe.message), null, 9000);
    const vue = await attendre(be, () => !!document.querySelector('#fil .b-partie'), null, 9000);
    const idPartie = await ta.evaluate(() => net.partieGroupe && net.partieGroupe.message);
    await be.waitForTimeout(700);
    await filmer(ta, null);
    await filmer(be, '.b-partie');
    await ta.evaluate(() => document.querySelector('.app-header [onclick*="leaveRoomToOnline"]').click());
    const [fa, fb] = await Promise.all([film(ta), film(be)]);
    const chezTaylor = fa.filter(x => x.ecran === 'groupe' && x.places);
    const vuChezTaylor = chezTaylor.filter(x => x.partie);
    dit('1. Taylor revenu dans la discussion : l\'invitation n\'y est à aucune image', lancee && chezTaylor.length > 30 && vuChezTaylor.length === 0,
      (lancee ? 'partie lancée' : 'partie PAS lancée') + ', ' + chezTaylor.length + ' images dans la discussion, ' + vuChezTaylor.length + ' avec l\'invitation');
    const avec = fb.filter(x => x.cible);
    const h0 = avec.length ? avec[0].cible.h : 0;
    let marche = 0;
    for (let i = 1; i < fb.length; i++) {
      const a = fb[i - 1].cible ? fb[i - 1].cible.h : 0, b = fb[i].cible ? fb[i].cible.h : 0;
      if (fb[i - 1].cible) marche = Math.max(marche, a - b);
    }
    const enRoute = avec.filter(x => x.cible.h > 1 && x.cible.h < h0 - 1).length;
    const effacee = avec.some(x => x.cible.op < 0.05);
    dit('2. chez Benoît, l\'invitation se replie au lieu de sauter', vue && h0 > 60 && enRoute >= 8 && marche <= 0.3 * h0 && effacee && !fb[fb.length - 1].partie,
      'hauteur ' + h0 + ' px, ' + enRoute + ' images en route, plus grande marche ' + marche.toFixed(1) + ' px, ' + (effacee ? 's\'efface' : 'ne s\'efface pas'));
    const jourAvant = (fb.find(x => x.jour) || {}).jour || [], jourApres = fb[fb.length - 1].jour || [];
    dit('3. … avec la date « Aujourd\'hui », qui n\'a plus rien à dater', jourAvant.some(j => /Aujourd/.test(j)) && !jourApres.some(j => /Aujourd/.test(j)), jourAvant.join(' + ') + ' -> ' + (jourApres.join(' + ') || 'aucune'));
    const s4 = sauts(fb, 1, new Set([String(idPartie)]));
    dit('4. … et le reste du fil ne saute pas, ni pendant le pli ni au redessin', s4.ok, 'plus grand déplacement d\'une image à l\'autre : ' + s4.pire + ' px' + (s4.ou ? ' (' + s4.ou + ')' : ''));

    /* ---- 5 : un message supprimé au milieu d'une suite ---- */
    /* Le serveur veut une seconde entre deux messages d'une même personne :
       on recule l'horloge des messages déjà là plutôt que d'attendre. */
    for (const t of ['Premier message', 'Deuxième message', 'Troisième message']) {
      await m.sql("update public.messages set cree_le = cree_le - interval '2 seconds'");
      await m.rpc(B, 'envoyer_message', { p_groupe: g.id, p_texte: t, p_genre: 'texte', p_donnees: null });
      await be.waitForTimeout(250);
    }
    await attendre(be, () => [...document.querySelectorAll('#fil [data-m]')].filter(e => /message$/.test(e.textContent.trim())).length === 3, null, 9000);
    await be.waitForTimeout(800);
    const trois = await be.evaluate(() => [...document.querySelectorAll('#fil [data-m]')].filter(e => /message$/.test(e.textContent.trim())).map(e => e.getAttribute('data-m')));
    const milieu = trois.length === 3 ? +trois[1] : 0;
    await filmer(be, '[data-m="' + milieu + '"]');
    await m.rpc(B, 'supprimer_message', { p_message: milieu });
    const f5 = await film(be);
    const av5 = f5.filter(x => x.cible), hb = av5.length ? av5[0].cible.h : 0;
    const route5 = av5.filter(x => x.cible.h > 1 && x.cible.h < hb - 1).length;
    const s5 = sauts(f5, Math.max(6, hb * 0.3), new Set([String(milieu)]));
    /* Le fil tient en haut quand il est court, au bas quand il déborde : selon
       le cas, c'est la bulle d'après ou celle d'avant qui glisse. On prend
       celle des deux qui bouge. */
    const positions = (k) => new Set(f5.map(x => (new Map(x.places || [])).get(k)).filter(v => v !== undefined).map(v => Math.round(v))).size;
    const glisse = Math.max(positions(trois[0]), positions(trois[2]));
    dit('5. un message supprimé au milieu se replie, la bulle d\'après glisse', milieu > 0 && hb > 20 && route5 >= 8 && s5.ok && glisse >= 6 && !f5[f5.length - 1].places.some(([k]) => k === String(milieu)),
      'bulle de ' + hb + ' px, ' + route5 + ' images en route ; la suivante passe par ' + glisse + ' positions, plus grand pas ' + s5.pire + ' px');

    /* ---- 6-7 ---- */
    const etat = await m.sql(`select case when supprime_le is not null then 'supprimee' else 'presente' end from public.messages where id = ${+idPartie || 0}`);
    dit('6. le serveur a bien retiré l\'invitation', /supprimee/.test(etat), 'message ' + idPartie + ' : ' + (etat || 'introuvable'));
    dit('7. aucune erreur', erreurs.length === 0, erreurs.slice(0, 3).join(' | '));
  } catch (e) {
    console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 500)); ko++;
  } finally {
    await nav.close().catch(() => {});
    await m.arreter().catch(() => {});
  }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — l\'invitation que personne n\'a prise s\'en va en douceur');
  process.exit(ko ? 1 : 0);
})();
