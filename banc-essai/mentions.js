/* ====== LES MENTIONS, ET CE QUE CHACUN VEUT ENTENDRE D'UN GROUPE (v317) ======
   « Le @ et le nom de la personne, ou le @tout le monde pour notifier tout le
     monde — et faire en sorte que les @tout le monde soient réservés à un
     certain grade dans le groupe. »
   « La possibilité de mettre le groupe en muet, et autre, comme par exemple
     choisir de recevoir juste les mentions. »
   Le décor de groupes.js — un VRAI PostgreSQL, les vraies règles. Trois
   personnes dans un groupe privé : Taylor (propriétaire), Benoît et Chloé
   (membres). Deux téléphones : Taylor et Benoît.
   CE QU'IL EXIGE :
     1. taper « @ » propose les AUTRES membres et « @tout le monde » (Taylor
        est propriétaire) — au-dessus du champ, sans que le fil bouge ;
     2. « @Be » ne laisse que Benoît ; le toucher écrit « @Benoît » en entier,
        le champ garde le clavier, la liste se referme ;
     3. le message part avec sa mention : le serveur la garde ; la bulle met
        le nom en gras ;
     4. chez Benoît : la ligne du groupe porte un « @ », la pastille de
        « Messages » compte 1 ; la bulle qui le nomme a un fond doré ;
     5. Benoît choisit « Mentions » dans la page du groupe : le serveur le
        garde ; un message ordinaire ne compte plus dans la pastille (son
        compte reste sur la ligne, en gris) ; « @tout le monde » compte ;
     6. Benoît passe en « Muet » : plus rien ne compte, même une mention ; la
        ligne porte la cloche barrée ;
     7. Benoît, simple membre, tape « @to » : « @tout le monde » lui est dit
        réservé aux admins, et ne s'écrit pas ;
     8. « @Zorro » (personne du groupe) ne nomme personne ;
     9. un serveur d'avant (sans regler_notifs) : le réglage revient en
        arrière, et le mot dit « pas encore disponible », pas « pas de réseau » ;
    10. en anglais, les puces et la mention se disent en anglais ;
    11. aucune erreur.
   Usage : node banc-essai/mentions.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { monter } = require('./faux-serveur-groupes.js');
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Mobile Safari/537.36';
const A = 'aaaaaaaa-0000-4000-8000-0000000000a7', B = 'bbbbbbbb-0000-4000-8000-0000000000b7', C = 'cccccccc-0000-4000-8000-0000000000c7';
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + detail + ')' : '')); if (!bon) ko++; };

(async () => {
  const m = await monter(8372, 5558);
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    for (const [id, mail, nom, couleur] of [[A, 'taylor@essai', 'Taylor', '#4C86E8'], [B, 'benoit@essai', 'Benoît', '#E8734C'], [C, 'chloe@essai', 'Chloé', '#7BC86B']]) {
      await m.compte(id, mail);
      await m.rpc(id, 'poser_profil', { p_nom: nom, p_couleur: couleur });
      await m.rpc(id, 'accepter_regles', { p_version: 1, p_age_ok: true });
    }
    await m.ouvrir(true);
    const g = (await m.rpc(A, 'creer_groupe', { p_nom: 'Les amis du jeudi', p_description: '', p_ouvert: false, p_langue: 'fr', p_teinte: 2 })).data;
    const code = await m.sql(`select code from public.groupes where id = '${g.id}'`);
    await m.rpc(B, 'rejoindre_groupe', { p_groupe: g.id, p_code: code });
    await m.rpc(C, 'rejoindre_groupe', { p_groupe: g.id, p_code: code });
    await m.sql("update public.messages set cree_le = cree_le - interval '5 seconds'");
    const attendre = (p, f, arg, ms) => p.waitForFunction(f, arg, { timeout: ms || 8000 }).then(() => true).catch(() => false);
    const telephone = async (id, nom, couleur, ua) => {
      const ctx = await nav.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: ua, serviceWorkers: 'block' });
      const p = await ctx.newPage();
      p.on('pageerror', e => erreurs.push(nom + ' : ' + e.message));
      await p.addInitScript(([moi, n, c]) => {
        localStorage.setItem('bt_profile', JSON.stringify({ name: n, color: c }));
        localStorage.setItem('bt_fs_hint', '1'); localStorage.setItem('essai_moi', moi); localStorage.setItem('sb-essai-auth-token', '1');
      }, [id, nom, couleur]);
      await p.goto(m.url);
      await p.waitForFunction(() => { try { return state.screen === 'mode' && !!(grp.etat && grp.etat.participe === 'ok'); } catch (e) { return false; } }, null, { timeout: 25000 });
      await p.evaluate(() => allerOnglet('groupes'));
      await attendre(p, () => !!document.querySelector('#grpMes .grp-ligne'), null, 9000);
      return p;
    };
    const pa = await telephone(A, 'Taylor', '#4C86E8', IOS);
    const pb = await telephone(B, 'Benoît', '#E8734C', AND);
    await pa.evaluate((id) => ouvrirGroupe(id), g.id);
    await attendre(pa, () => state.screen === 'groupe' && !!document.getElementById('compoTexte') && (grp.membres[grp.courant] || []).length === 3, null, 9000);
    await pa.waitForTimeout(900);
    const dernier = async () => JSON.parse(await m.sql("select coalesce(to_jsonb(x), 'null') from (select texte, donnees from public.messages where genre = 'texte' order by id desc limit 1) x"));
    const vieillir = () => m.sql("update public.messages set cree_le = cree_le - interval '2 seconds'");

    /* ---- 1 ---- */
    const avant = await pa.evaluate(() => { const f = document.getElementById('fil'); return { top: f.scrollTop, h: Math.round(f.getBoundingClientRect().height) }; });
    await pa.locator('#compoTexte').tap();
    await pa.locator('#compoTexte').pressSequentially('@');
    await pa.waitForTimeout(350);
    const un = await pa.evaluate(() => { const z = document.getElementById('compoNoms'), f = document.getElementById('fil');
      return { vu: !!z && !z.hidden && getComputedStyle(z).display !== 'none', noms: [...z.querySelectorAll('.cn-nom b')].map(b => b.textContent),
        top: f.scrollTop, h: Math.round(f.getBoundingClientRect().height),
        dessus: z.getBoundingClientRect().bottom <= document.getElementById('compo').getBoundingClientRect().top + 1 }; });
    dit('« @ » propose les autres membres et « @tout le monde »', un.vu && JSON.stringify(un.noms) === JSON.stringify(['Benoît', 'Chloé', '@tout le monde']), un.noms.join(', '));
    dit('… au-dessus du champ, sans que le fil bouge', un.dessus && un.top === avant.top && un.h === avant.h, JSON.stringify({ avant, apres: { top: un.top, h: un.h } }));

    /* ---- 2 ---- */
    await pa.locator('#compoTexte').pressSequentially('Be');
    await pa.waitForTimeout(250);
    const deux = await pa.evaluate(() => [...document.querySelectorAll('#compoNoms .cn-nom b')].map(b => b.textContent));
    dit('« @Be » ne laisse que Benoît', JSON.stringify(deux) === JSON.stringify(['Benoît']), deux.join(', '));
    await pa.locator('#compoNoms .cn-nom').first().tap();
    await pa.waitForTimeout(300);
    const pose = await pa.evaluate(() => { const t = document.getElementById('compoTexte'), z = document.getElementById('compoNoms');
      return { v: t.value, focus: document.activeElement === t, curseur: t.selectionStart, cache: z.hidden }; });
    dit('le toucher écrit « @Benoît » en entier, garde le clavier, referme la liste', pose.v === '@Benoît ' && pose.focus && pose.curseur === 8 && pose.cache, JSON.stringify(pose));

    /* ---- 3 ---- */
    await pa.locator('#compoTexte').pressSequentially('on joue ce soir ?');
    await pa.locator('#compoEnvoi').tap();
    let msg = null; for (let i = 0; i < 20; i++) { await pa.waitForTimeout(200); msg = await dernier(); if (msg && /on joue/.test(msg.texte)) break; }
    dit('le message part avec sa mention, gardée par le serveur', msg && msg.texte === '@Benoît on joue ce soir ?' && JSON.stringify(msg.donnees) === JSON.stringify({ mentions: [B] }), JSON.stringify(msg));
    await pa.waitForTimeout(400);
    const gras = await pa.evaluate(() => { const b = [...document.querySelectorAll('#fil .b-moi .b-bulle')].pop(); const x = b && b.querySelector('.mention');
      return { mot: x ? x.textContent : '', poids: x ? getComputedStyle(x).fontWeight : '' }; });
    dit('… et la bulle met le nom en gras', gras.mot === '@Benoît' && +gras.poids >= 700, JSON.stringify(gras));

    /* ---- 4 ---- */
    const ligneB = () => pb.evaluate(() => { const l = document.querySelector('#grpMes .grp-ligne'); const p = document.querySelector('#barreBas .bb-pastille');
      const nls = l ? [...l.querySelectorAll('.grp-nl')] : [];
      return { at: nls.some(x => x.classList.contains('grp-at')), compte: (nls.find(x => !x.classList.contains('grp-at')) || {}).textContent || '',
        gris: nls.some(x => !x.classList.contains('grp-at') && x.classList.contains('calme')), cloche: !!(l && l.querySelector('.grp-mode svg')),
        heure: l && l.querySelector('.grp-droite small') ? l.querySelector('.grp-droite small').textContent : '',
        pastille: p && !p.hidden ? p.textContent : '0' }; });
    const ok4 = await attendre(pb, () => { const l = document.querySelector('#grpMes .grp-ligne .grp-at'); return !!l; }, null, 6000);
    const l4 = await ligneB();
    dit('chez Benoît : un « @ » sur la ligne, la pastille compte 1', ok4 && l4.at && l4.compte === '1' && !l4.gris && l4.pastille === '1', JSON.stringify(l4));
    await pb.evaluate((id) => ouvrirGroupe(id), g.id);
    await attendre(pb, () => state.screen === 'groupe' && !!document.querySelector('#fil .b-eux .b-bulle'), null, 8000);
    await pb.waitForTimeout(500);
    const dore = await pb.evaluate(() => { const b = [...document.querySelectorAll('#fil .b-eux .b-bulle')].pop(); const cs = getComputedStyle(b);
      return { nomme: b.classList.contains('me-nomme'), fond: cs.backgroundColor, bord: cs.borderTopWidth + ' ' + cs.borderLeftWidth, mot: (b.querySelector('.mention') || {}).textContent || '' }; });
    dit('… la bulle qui le nomme : fond doré, nom en gras, aucun trait', dore.nomme && dore.fond === 'rgb(255, 239, 204)' && dore.bord === '0px 0px' && dore.mot === '@Benoît', JSON.stringify(dore));

    /* ---- 5 ---- */
    await pb.evaluate(() => ouvrirInfosGroupe());
    await attendre(pb, () => !!document.querySelector('#grpInfosVeil.posee [data-ngroup="notifs"]'), null, 6000);
    await pb.waitForTimeout(400);
    const puces = await pb.evaluate(() => [...document.querySelectorAll('#grpInfosVeil [data-ngroup="notifs"]')].map(b => b.textContent.trim() + (b.classList.contains('sel') ? '*' : '')));
    dit('la page du groupe offre Tout, Mentions, Muet — Tout choisi', JSON.stringify(puces) === JSON.stringify(['Tout*', 'Mentions', 'Muet']), puces.join(' | '));
    await pb.locator('#grpInfosVeil [data-ngroup="notifs"][data-k="mentions"]').tap();
    let reg = ''; for (let i = 0; i < 20 && reg !== 'mentions'; i++) { await pb.waitForTimeout(200); reg = await m.sql(`select notifs from public.membres where groupe = '${g.id}' and membre = '${B}'`); }
    const aide = await pb.evaluate(() => (document.querySelector('#grpNotifsAide > span.vu') || {}).textContent || '');
    dit('« Mentions » : le serveur le garde, la page le dit', reg === 'mentions' && /te nomment/.test(aide), reg + ' · ' + aide);
    await pb.evaluate(() => { fermerFeuilleGroupe('grpInfosVeil'); });
    await pb.waitForTimeout(600);
    await pb.evaluate(() => retourGroupes());
    await attendre(pb, () => state.screen === 'groupes' && !!document.querySelector('#grpMes .grp-ligne'), null, 6000);
    await pb.waitForTimeout(800);
    await vieillir();
    await pa.locator('#compoTexte').pressSequentially('rien de spécial');
    await pa.locator('#compoEnvoi').tap();
    await attendre(pb, () => { const n = document.querySelector('#grpMes .grp-ligne .grp-nl:not(.grp-at)'); return n && n.textContent === '1'; }, null, 6000);
    await pb.waitForTimeout(300);
    const l5 = await ligneB();
    /* (v339) Le réglage « Mentions » ne met plus de « @ » gris à côté de
       l'heure : un « @ » seul veut dire « on t'a nommé », rien d'autre. */
    dit('un message ordinaire : compté en gris sur la ligne, pas dans la pastille — et pas de « @ » à côté de l\'heure', l5.compte === '1' && l5.gris && !l5.at && l5.pastille === '0' && !/@/.test(l5.heure), JSON.stringify(l5));
    await vieillir();
    await pa.locator('#compoTexte').pressSequentially('@tout');
    await pa.waitForTimeout(250);
    await pa.locator('#compoNoms .cn-nom').first().tap();
    await pa.locator('#compoTexte').pressSequentially('on commence');
    await pa.locator('#compoEnvoi').tap();
    await attendre(pb, () => !!document.querySelector('#grpMes .grp-ligne .grp-at'), null, 6000);
    await pb.waitForTimeout(300);
    const l5b = await ligneB();
    const tous = await dernier();
    dit('« @tout le monde » (propriétaire) : il part, et compte chez Benoît', tous && tous.texte === '@tout le monde on commence' && tous.donnees.tous === true && l5b.at && l5b.pastille === '1' && l5b.compte === '2',
      JSON.stringify({ tous, l5b }));

    /* ---- 6 ---- */
    await pb.evaluate((id) => ouvrirGroupe(id), g.id);
    await attendre(pb, () => state.screen === 'groupe', null, 6000);
    await pb.waitForTimeout(500);
    await pb.evaluate(() => ouvrirInfosGroupe());
    await attendre(pb, () => !!document.querySelector('#grpInfosVeil.posee [data-ngroup="notifs"]'), null, 6000);
    await pb.waitForTimeout(400);
    await pb.locator('#grpInfosVeil [data-ngroup="notifs"][data-k="rien"]').tap();
    reg = ''; for (let i = 0; i < 20 && reg !== 'rien'; i++) { await pb.waitForTimeout(200); reg = await m.sql(`select notifs from public.membres where groupe = '${g.id}' and membre = '${B}'`); }
    await pb.evaluate(() => { fermerFeuilleGroupe('grpInfosVeil'); });
    await pb.waitForTimeout(600);
    await pb.evaluate(() => retourGroupes());
    await attendre(pb, () => state.screen === 'groupes' && !!document.querySelector('#grpMes .grp-ligne'), null, 6000);
    await pb.waitForTimeout(800);
    await vieillir();
    await pa.locator('#compoTexte').pressSequentially('@Be');
    await pa.waitForTimeout(250);
    await pa.locator('#compoNoms .cn-nom').first().tap();
    await pa.locator('#compoTexte').pressSequentially('tu dors ?');
    await pa.locator('#compoEnvoi').tap();
    await attendre(pb, () => { const n = document.querySelector('#grpMes .grp-ligne .grp-nl:not(.grp-at)'); return n && n.textContent === '1'; }, null, 6000);
    await pb.waitForTimeout(300);
    const l6 = await ligneB();
    dit('« Muet » : même une mention ne compte plus ; la ligne porte la cloche barrée', reg === 'rien' && l6.pastille === '0' && !l6.at && l6.gris && l6.cloche, JSON.stringify(Object.assign({ reg }, l6)));

    /* ---- 7 ---- */
    await pb.evaluate((id) => ouvrirGroupe(id), g.id);
    await attendre(pb, () => state.screen === 'groupe' && !!document.getElementById('compoTexte') && (grp.membres[grp.courant] || []).length === 3, null, 6000);
    await pb.waitForTimeout(500);
    await pb.locator('#compoTexte').tap();
    await pb.locator('#compoTexte').pressSequentially('@to');
    await pb.waitForTimeout(300);
    const sept = await pb.evaluate(() => [...document.querySelectorAll('#compoNoms .cn-nom')].map(b => ({ t: b.textContent.trim(), off: b.classList.contains('off') })));
    dit('Benoît (membre) tape « @to » : « @tout le monde » lui est dit réservé', sept.length === 1 && sept[0].off && /Réservé aux admins/.test(sept[0].t), JSON.stringify(sept));
    await pb.evaluate(() => { window.__mots = []; const v = showMiniToast; showMiniToast = (t) => { window.__mots.push(t); return v(t); }; });
    await pb.locator('#compoNoms .cn-nom').first().tap();
    await pb.waitForTimeout(300);
    const sept2 = await pb.evaluate(() => ({ v: document.getElementById('compoTexte').value, mot: window.__mots.join(' | ') }));
    dit('… le toucher le dit, et n\'écrit rien', sept2.v === '@to' && /Seuls les admins/.test(sept2.mot), JSON.stringify(sept2));

    /* ---- 8 ---- */
    await pb.evaluate(() => { const t = document.getElementById('compoTexte'); t.value = ''; surSaisie(t); });
    await vieillir();
    await pb.locator('#compoTexte').pressSequentially('salut @Zorro et @Chloé');
    await pb.waitForTimeout(200);
    await pb.locator('#compoEnvoi').tap();
    let huit = null; for (let i = 0; i < 20; i++) { await pb.waitForTimeout(200); huit = await dernier(); if (huit && /Zorro/.test(huit.texte)) break; }
    dit('« @Zorro » ne nomme personne ; « @Chloé » nomme Chloé', huit && JSON.stringify(huit.donnees) === JSON.stringify({ mentions: [C] }), JSON.stringify(huit));

    /* ---- 9 ---- */
    await pb.evaluate(() => ouvrirInfosGroupe());
    await attendre(pb, () => !!document.querySelector('#grpInfosVeil.posee [data-ngroup="notifs"]'), null, 6000);
    await pb.waitForTimeout(400);
    await pb.evaluate(() => { const o = window.appelGroupe; window.appelGroupe = async function(nom, a){ if(nom === 'regler_notifs') return { ok:false, erreur:'reseau', error:{ code:'PGRST202', message:'fonction inconnue' } }; return o.apply(this, arguments); }; });
    await pb.locator('#grpInfosVeil [data-ngroup="notifs"][data-k="tout"]').tap();
    await pb.waitForTimeout(1300);
    const neuf = await pb.evaluate(() => ({ sel: (document.querySelector('#grpInfosVeil [data-ngroup="notifs"].sel') || {}).dataset.k, mot: (document.querySelector('#grpInfosVeil .grp-mot') || {}).textContent || '', mode: modeNotifs(groupeCourant()) }));
    dit('un serveur d\'avant : le réglage revient, et le mot dit « pas encore disponible »', neuf.sel === 'rien' && neuf.mode === 'rien' && /Pas encore disponible/.test(neuf.mot), JSON.stringify(neuf));

    /* ---- 10 ---- */
    await pb.evaluate(() => { fermerFeuilleGroupe('grpInfosVeil'); });
    await pb.waitForTimeout(600);
    await pb.evaluate(() => { LANGUE = 'en'; render(); });
    await pb.waitForTimeout(600);
    await pb.evaluate(() => ouvrirInfosGroupe());
    await attendre(pb, () => !!document.querySelector('#grpInfosVeil.posee [data-ngroup="notifs"]'), null, 6000);
    await pb.waitForTimeout(400);
    const dix = await pb.evaluate(() => ({ puces: [...document.querySelectorAll('#grpInfosVeil [data-ngroup="notifs"]')].map(b => b.textContent.trim()),
      titre: [...document.querySelectorAll('#grpInfosVeil .gb-h')].map(h => h.textContent.trim())[0], tous: T('@tout le monde') }));
    dit('en anglais : All, Mentions, Muted ; « @everyone »', JSON.stringify(dix.puces) === JSON.stringify(['All', 'Mentions', 'Muted']) && dix.titre === 'Notifications' && dix.tous === '@everyone', JSON.stringify(dix));

    dit('aucune erreur dans les pages', erreurs.length === 0, erreurs.slice(0, 3).join(' | '));
  } catch (e) {
    console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 600)); ko++;
  } finally {
    await nav.close().catch(() => {});
    await m.arreter().catch(() => {});
  }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — on nomme, on prévient tout le monde (les admins), et chacun choisit ce qu\'il entend');
  process.exit(ko ? 1 : 0);
})();
