/* ====== BANC « TOUCHER UN MESSAGE POUR Y RÉPONDRE » (v332) ======
   « Je veux la possibilité de cliquer sur un message et que ça fasse en sorte
     de répondre au message directement. Et lorsqu'on reste appuyé, on
     affiche les informations pour supprimer, etc. » Le décor de groupes.js —
   un VRAI PostgreSQL, le vrai groupes/table.sql. Taylor (iPhone) répond ;
   Benoît (Android) a la discussion ouverte ; Chloé écrit depuis le serveur.
     1. Taylor touche le message de Benoît : il se cite au-dessus de la barre
        d'écriture (le nom, le texte), la barre prend le clavier, aucun menu ;
     2. la citation est entière dans la barre, au-dessus de tout, sans trait ;
     3. « × » la retire ;
     4. la réponse part : le serveur garde la référence, la bulle de Taylor
        porte la citation en tête ;
     5. chez Benoît, la réponse arrive avec sa citation ;
     6. toucher la citation ramène au message d'origine, qui s'éclaire ;
     7. l'appui long ouvre le menu, et ne prépare aucune réponse ;
     8. une réponse à un message trop ancien pour être chargé : il est cherché,
        et la citation se remplit ;
     9. le message d'origine supprimé ensuite : « Message supprimé » ;
    10. le serveur refuse de citer un message masqué (le message part sans
        la citation) ;
    11. une réponse refusée (une insulte) : le texte ET la citation reviennent ;
    12. en sourdine, le toucher ouvre le menu (on ne peut pas écrire) ;
    13. un serveur d'avant (sans les réponses) : le toucher ouvre le menu ;
    14. en anglais, les mots de l'anglais ;
    15. aucune erreur.
   Usage : node banc-essai/reponse-message.js [dossier des captures] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { monter } = require('./faux-serveur-groupes.js');
const CAPT = process.argv[2] || null;
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const A = 'aaaaaaaa-0000-4000-8000-0000000000a5', B = 'bbbbbbbb-0000-4000-8000-0000000000b5', C = 'cccccccc-0000-4000-8000-0000000000c5';
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + String(detail).slice(0, 240) + ')' : '')); if (!bon) ko++; };

(async () => {
  const m = await monter(8485, 5687);
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    for (const [id, mail, nom, couleur] of [[A, 'taylor@essai', 'Taylor', '#4C86E8'], [B, 'benoit@essai', 'Benoît', '#E8734C'], [C, 'chloe@essai', 'Chloé', '#7BC86B']]) {
      await m.compte(id, mail);
      await m.rpc(id, 'poser_profil', { p_nom: nom, p_couleur: couleur });
      await m.rpc(id, 'accepter_regles', { p_version: 1, p_age_ok: true });
    }
    await m.ouvrir(true);
    const g = (await m.rpc(A, 'creer_groupe', { p_nom: 'Les amis', p_description: '', p_ouvert: false, p_langue: 'fr', p_teinte: 2 })).data;
    const code = await m.sql(`select code from public.groupes where id = '${g.id}'`);
    await m.rpc(B, 'rejoindre_groupe', { p_groupe: g.id, p_code: code });
    await m.rpc(C, 'rejoindre_groupe', { p_groupe: g.id, p_code: code });
    const recule = () => m.sql("update public.messages set cree_le = cree_le - interval '3 seconds'");
    const ecrit = async (qui, texte, donnees) => { await recule(); const r = await m.rpc(qui, 'envoyer_message', { p_groupe: g.id, p_texte: texte, p_genre: 'texte', p_donnees: donnees || {} }); return r.data; };
    /* Un message ancien (il sera hors de ce qui se charge : 50 derniers), puis du monde. */
    const ancien = (await ecrit(C, 'Le tout premier message du groupe')).id;
    await m.sql(`insert into public.messages (groupe, auteur, genre, texte, donnees, cree_le)
      select '${g.id}', '${C}', 'texte', 'Message ' || i, '{}'::jsonb, now() - interval '2 hours' + (i || ' seconds')::interval from generate_series(1, 55) i`);
    const original = (await ecrit(B, 'On se voit jeudi ?')).id;
    await m.sql("update public.messages set cree_le = cree_le - interval '1 minute'; update public.membres set rejoint_le = rejoint_le - interval '3 hours'");
    const attendre = (p, f, arg, ms) => p.waitForFunction(f, arg, { timeout: ms || 8000, polling: 50 }).then(() => true).catch(() => false);
    const telephone = async (id, nom, couleur, ua, langue) => {
      const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: ua, serviceWorkers: 'block' });
      const p = await ctx.newPage();
      p.on('pageerror', e => erreurs.push(nom + ' : ' + e.message));
      await p.addInitScript(([moi, n, c, l]) => {
        localStorage.setItem('bt_profile', JSON.stringify({ name: n, color: c }));
        localStorage.setItem('bt_fs_hint', '1'); localStorage.setItem('essai_moi', moi); localStorage.setItem('sb-essai-auth-token', '1');
        if (l) localStorage.setItem('bt_langue', l);
      }, [id, nom, couleur, langue || '']);
      await p.goto(m.url);
      await p.waitForFunction(() => { try { return state.screen === 'mode' && !!(grp.etat && grp.etat.participe === 'ok'); } catch (e) { return false; } }, null, { timeout: 25000 });
      await p.evaluate((gid) => ouvrirGroupe(gid), g.id);
      await attendre(p, () => state.screen === 'groupe' && !!document.getElementById('compoTexte') && document.querySelectorAll('#fil .b-bulle').length > 5, null, 9000);
      await p.waitForTimeout(800);
      return { ctx, p, cdp: await ctx.newCDPSession(p) };
    };
    const bulle = (p, re) => p.evaluate((re) => { const b = [...document.querySelectorAll('#fil .b-bulle')].reverse().find(x => new RegExp(re).test(x.textContent)); if (!b) return null;
      b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect();
      /* Le TEXTE de la bulle : sa citation, en tête, ramène au message d'origine. */
      return { x: r.left + r.width / 2, y: r.bottom - 14, id: b.getAttribute('data-m') }; }, re);
    const touche = async (p, cdp, re, tenir) => { const b = await bulle(p, re); await p.waitForTimeout(150); const b2 = await bulle(p, re);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b2.x, y: b2.y }] }); await p.waitForTimeout(tenir || 70);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(450); return b2; };
    const cite = (p) => p.evaluate(() => { const q = document.querySelector('#compo .compo-cite'); if (!q) return null;
      const r = q.getBoundingClientRect(), c = document.getElementById('compo').getBoundingClientRect(), s = getComputedStyle(q);
      const x = r.left + r.width / 2, y = r.top + r.height / 2, e = document.elementFromPoint(x, y);
      return { nom: q.querySelector('b').textContent, texte: q.querySelector('.cc-t > span').textContent.replace(/\u00a0/g, ' '), dedans: r.left >= c.left - 0.5 && r.right <= c.right + 0.5 && r.top >= c.top - 0.5 && r.bottom <= c.bottom + 0.5,
        dessus: !!e && q.contains(e), trait: s.borderTopWidth + ' ' + s.borderLeftWidth, focus: document.activeElement && document.activeElement.id, menu: !!document.querySelector('#grpActionsVeil:not(.closing)') }; });
    const menu = (p) => p.evaluate(() => !!document.querySelector('#grpActionsVeil:not(.closing)'));
    const fermerMenu = async (p) => { await p.evaluate(() => { try { fermerFeuilleGroupe('grpActionsVeil'); } catch (e) {} }); await p.waitForTimeout(600); };

    const { ctx: ca, p: pa, cdp: cdpa } = await telephone(A, 'Taylor', '#4C86E8', IOS);
    const { p: pb } = await telephone(B, 'Benoît', '#E8734C', AND);

    /* 1 */
    await touche(pa, cdpa, 'On se voit jeudi');
    const c1 = await cite(pa);
    dit('1. toucher le message de Benoît : il se cite au-dessus de la barre, la barre prend le clavier, aucun menu', c1 && c1.nom === 'Benoît' && c1.texte === 'On se voit jeudi ?' && c1.focus === 'compoTexte' && !c1.menu, JSON.stringify(c1));
    /* 2 */
    dit('2. la citation est entière dans la barre, au-dessus de tout, sans trait', c1 && c1.dedans && c1.dessus && c1.trait === '0px 0px', JSON.stringify(c1));
    if (CAPT) await pa.screenshot({ path: CAPT + '/reponse-barre.png' });
    /* 3 */
    await pa.evaluate(() => document.querySelector('#compo .cc-x').click());
    await pa.waitForTimeout(300);
    dit('3. « × » la retire', !(await cite(pa)));

    /* 4 */
    await touche(pa, cdpa, 'On se voit jeudi');
    await recule();
    await pa.locator('#compoTexte').fill('Oui, à 20 h !');
    await pa.evaluate(() => { const z = document.getElementById('compoTexte'); surSaisie(z); envoyerMessageGroupe(); });
    const parti = await attendre(pa, () => [...document.querySelectorAll('#fil .b-moi .b-bulle')].some(b => +b.getAttribute('data-m') > 0 && /20 h/.test(b.textContent) && !!b.querySelector('.b-cite')), null, 6000);
    const enBase = await m.sql("select donnees->>'reponse' from public.messages where texte like 'Oui, à 20 h%'");
    const b4 = await pa.evaluate(() => { const b = [...document.querySelectorAll('#fil .b-moi .b-bulle')].find(x => /20 h/.test(x.textContent)); const q = b && b.querySelector('.b-cite');
      return q ? { nom: q.querySelector('b').textContent, texte: q.querySelector('span').textContent, enTete: b.firstElementChild === q, barre: !!document.querySelector('#compo .compo-cite') } : null; });
    dit('4. la réponse part : le serveur garde la référence, la bulle porte la citation en tête', parti && enBase === String(original) && b4 && b4.nom === 'Benoît' && b4.enTete && !b4.barre, enBase + ' · ' + JSON.stringify(b4));
    if (CAPT) await pa.screenshot({ path: CAPT + '/reponse-bulle.png' });

    /* 5 */
    const chezB = await attendre(pb, () => { const b = [...document.querySelectorAll('#fil .b-eux .b-bulle')].find(x => /20 h/.test(x.textContent)); const q = b && b.querySelector('.b-cite');
      return !!q && /Toi/.test(q.textContent) && /jeudi/.test(q.textContent); }, null, 8000);
    dit('5. chez Benoît, la réponse arrive avec sa citation (« Toi » : c\'est son message)', chezB);

    /* 6 */
    await pa.evaluate(() => { const z = document.getElementById('fil'); z.scrollTop = z.scrollHeight; });
    await pa.waitForTimeout(400);
    await pa.evaluate(() => [...document.querySelectorAll('#fil .b-moi .b-cite')].pop().click());
    const eclat = await attendre(pa, (id) => { const b = document.querySelector('#fil [data-m="' + id + '"]'); return !!b && b.classList.contains('eclat'); }, String(original), 2000);
    await pa.waitForTimeout(700);
    const vue6 = await pa.evaluate((id) => { const b = document.querySelector('#fil [data-m="' + id + '"]'), z = document.getElementById('fil'); const rb = b.getBoundingClientRect(), rz = z.getBoundingClientRect();
      return rb.top >= rz.top - 1 && rb.bottom <= rz.bottom + 1; }, String(original));
    dit('6. toucher la citation ramène au message d\'origine, qui s\'éclaire', eclat && vue6, 'éclat ' + eclat + ' · visible ' + vue6);

    /* 7 */
    await touche(pa, cdpa, 'On se voit jeudi', 650);
    const m7 = await menu(pa), c7 = await cite(pa);
    dit('7. l\'appui long ouvre le menu, et ne prépare aucune réponse', m7 && !c7, 'menu ' + m7 + ' · citation ' + JSON.stringify(c7));
    await fermerMenu(pa);

    /* 8 — (le décor renvoie tout le fil quand le banc vieillit les dates
       d'un coup : on retire l'ancien message de ce que Taylor a chargé, et
       la réponse de Chloé part sans rien vieillir.) */
    await pa.evaluate((id) => { const f = grp.fils[grp.courant]; f.messages = f.messages.filter(x => x.id !== id); delete citesConnus[id]; majFil(); }, ancien);
    await m.rpc(C, 'envoyer_message', { p_groupe: g.id, p_texte: 'Je réponds au tout début', p_genre: 'texte', p_donnees: { reponse: ancien } });
    const rempli = await attendre(pa, () => { const b = [...document.querySelectorAll('#fil .b-eux .b-bulle')].find(x => /tout début/.test(x.textContent)); const q = b && b.querySelector('.b-cite');
      return !!q && !q.classList.contains('attente') && /tout premier message/.test(q.textContent); }, null, 8000);
    const cherche = await pa.evaluate((id) => !!citesConnus[id] && !grp.fils[grp.courant].messages.some(x => x.id === id), ancien);
    dit('8. une réponse à un message trop ancien pour être chargé : il est cherché, la citation se remplit', rempli && cherche, 'rempli ' + rempli + ' · cherché au serveur ' + cherche);

    /* 9 */
    await m.rpc(B, 'supprimer_message', { p_message: original });
    await pa.waitForTimeout(400);
    const dit9 = await attendre(pa, () => { const b = [...document.querySelectorAll('#fil .b-moi .b-bulle')].find(x => /20 h/.test(x.textContent)); const q = b && b.querySelector('.b-cite');
      return !!q && /Message supprimé/.test(q.textContent); }, null, 12000);
    dit('9. le message d\'origine supprimé ensuite : « Message supprimé »', dit9);

    /* 10 */
    const aMasquer = (await ecrit(B, 'Un message qui sera masqué')).id;
    await m.sql(`update public.messages set masque = true where id = ${aMasquer}`);
    await ecrit(C, 'Je cite un masqué', { reponse: aMasquer });
    const sans = await m.sql("select coalesce(donnees->>'reponse', 'aucune') from public.messages where texte = 'Je cite un masqué'");
    dit('10. le serveur refuse de citer un message masqué (le message part sans la citation)', sans === 'aucune', sans);

    /* 11 */
    await pa.waitForTimeout(600);
    await touche(pa, cdpa, 'Je réponds au tout début');
    await recule();
    await pa.locator('#compoTexte').fill('espèce de connard');
    await pa.evaluate(() => { const z = document.getElementById('compoTexte'); surSaisie(z); envoyerMessageGroupe(); });
    const revient = await attendre(pa, () => document.getElementById('compoTexte').value === 'espèce de connard' && !!document.querySelector('#compo .compo-cite'), null, 6000);
    const c11 = await cite(pa);
    dit('11. une réponse refusée (une insulte) : le texte ET la citation reviennent', revient && c11 && c11.nom === 'Chloé', JSON.stringify(c11));
    await pa.evaluate(() => { annulerReponse(); const z = document.getElementById('compoTexte'); z.value = ''; surSaisie(z); });
    await pa.waitForTimeout(300);

    /* 12 */
    await m.sql(`update public.membres set muet_jusqu = now() + interval '1 hour' where groupe = '${g.id}' and membre = '${A}'`);
    await pa.evaluate((gid) => chargerMembres(gid), g.id);
    await attendre(pa, () => !!document.querySelector('#compo .compo-muet'), null, 4000);
    await touche(pa, cdpa, 'Je réponds au tout début');
    const m12 = await menu(pa), c12 = await cite(pa);
    dit('12. en sourdine, le toucher ouvre le menu (on ne peut pas écrire)', m12 && !c12, 'menu ' + m12);
    await fermerMenu(pa);
    await m.sql(`update public.membres set muet_jusqu = null where groupe = '${g.id}' and membre = '${A}'`);
    await pa.evaluate((gid) => chargerMembres(gid), g.id);
    await attendre(pa, () => !!document.getElementById('compoTexte'), null, 4000);

    /* 13 */
    await pa.evaluate(() => { grp.etat.reponses = false; });
    await touche(pa, cdpa, 'Je réponds au tout début');
    const m13 = await menu(pa), c13 = await cite(pa);
    dit('13. un serveur d\'avant (sans les réponses) : le toucher ouvre le menu', m13 && !c13, 'menu ' + m13);
    await fermerMenu(pa);
    await ca.close();

    /* 14 */
    const { ctx: ce, p: pe, cdp: cdpe } = await telephone(A, 'Taylor', '#4C86E8', IOS, 'en');
    await touche(pe, cdpe, 'Je réponds au tout début');
    const e14 = await pe.evaluate(() => { const x = document.querySelector('#compo .cc-x'); const b = [...document.querySelectorAll('#fil .b-moi .b-bulle')].find(y => /20 h/.test(y.textContent));
      return { x: x && x.getAttribute('aria-label'), sup: b && b.querySelector('.b-cite') ? b.querySelector('.b-cite').textContent : null }; });
    dit('14. en anglais : « ' + e14.x + ' », « ' + (e14.sup || '').replace(/^Benoît/, '') + ' »', e14.x === 'Cancel reply' && /Message deleted/.test(e14.sup || ''), JSON.stringify(e14));
    await ce.close();

    dit('15. aucune erreur', !erreurs.length, erreurs.slice(0, 3).join(' | '));
  } catch (e) {
    console.error(e); ko++;
  } finally {
    await nav.close();
    await m.arreter();
  }
  console.log(ko === 0 ? '\n  OK — toucher un message y répond, l\'appui long ouvre le menu, et la citation suit le message partout' : '\n  ' + ko + ' défaut(s)');
  process.exit(ko === 0 ? 0 : 1);
})();
