/* ====== BANC « LA RÉPONSE S'OUVRE ET SE REFERME » (v337) ======
   « Vérifie l'animation lorsque je clique pour répondre à un message — le
     truc qui s'ouvre où je dois répondre au message en question —, son
     animation et sa fermeture. » Mesuré image par image, à vitesse réelle,
   sur les images vraiment peintes (après le suivi du fil) :
     1. l'ouverture : la barre d'écriture grandit en douceur (plusieurs
        images, jamais un saut), le dernier message monte avec elle sans se
        détacher du bas du fil, la citation entre en fondu ;
     2. la fermeture : de même, en sens inverse ; le tiroir s'en va à la fin ;
     3. répondre à un autre message, le tiroir ouvert : la citation change
        sur place, la barre ne bouge pas ;
     4. refermer puis rouvrir aussitôt : le tiroir repart d'où il en est,
        sans disparaître ni sauter ;
     5. lu plus haut dans le fil : le message auquel on répond, s'il finissait
        sous la barre qui grandit, remonte juste assez pour se voir ;
     6. envoyer la réponse : le tiroir se referme en douceur ;
     7. l'écran redessiné pendant une réponse : le tiroir est là, ouvert, sans
        rejouer son animation ;
     8. aucune erreur.
   Sur la v336 : 1, 2, 4, 5 et 6 rouges — la barre sautait de 56 px d'une
   image à l'autre, à l'ouverture comme à la fermeture, et le message visé,
   lu plus haut, finissait caché sous la barre (49 px) ; 7 aussi, mais
   seulement parce que le tiroir n'existait pas (la citation y était posée
   telle quelle).
   Usage : node banc-essai/reponse-tiroir.js [url] */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8099/index.html';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
let ko = 0;
const dit = (quoi, bon, detail) => { console.log('  ' + (bon ? 'OK  ' : 'KO  ') + quoi + (detail ? '  (' + String(detail).slice(0, 360) + ')' : '')); if (!bon) ko++; };

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const erreurs = [];
  try {
    const ctx = await nav.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IOS, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    p.on('pageerror', e => erreurs.push(e.message));
    await p.addInitScript(() => { localStorage.setItem('bt_profile', JSON.stringify({ name: 'Taylor', color: '#4C86E8' })); localStorage.setItem('bt_fs_hint', '1'); });
    await p.goto(URL);
    await p.waitForFunction(() => { try { return state.screen === 'mode'; } catch (e) { return false; } }, null, { timeout: 20000 });
    await p.waitForTimeout(900);
    await p.evaluate(() => {
      const il = (h) => new Date(Date.now() - h * 3600000).toISOString();
      compte.dispo = true; compte.session = { user: { id: 'moi-0', email: 't@e.net' } }; compte.etape = 'connecte';
      grp.installe = true; grp.ouverts = true;
      grp.etat = { participe: 'ok', moderateur: false, ouverts: true, reponses: true };
      grp.profils = { 'moi-0': { nom: 'Taylor', couleur: '#4C86E8' }, 'u-2': { nom: 'Chloé', couleur: '#7BC86B' } };
      grp.liste = [{ id: 'g-1', nom: 'Le club', teinte: 2, ouvert: false, code: 'ABC234', nb_membres: 2, non_lus: 0, dernier_message: il(0.1) }];
      grp.membres = { 'g-1': [{ membre: 'moi-0', role: 'membre', rejoint_le: il(5) }, { membre: 'u-2', role: 'proprietaire', rejoint_le: il(6) }] };
      const m = (id, auteur, texte, h) => ({ id, groupe: 'g-1', auteur, genre: 'texte', texte, donnees: {}, cree_le: il(h), masque: false, supprime_le: null });
      const l = []; for (let i = 1; i <= 14; i++) l.push(m(i, i % 2 ? 'u-2' : 'moi-0', 'Message numéro ' + i + ' pour remplir la discussion', 3 - i * 0.1));
      l.push(m(15, 'u-2', 'On se retrouve jeudi pour la partie ?', 0.2));
      grp.fils = { 'g-1': { charge: true, tout: false, messages: l } };
      grp.courant = 'g-1'; state.screen = 'groupe'; render();
    });
    await p.waitForTimeout(1200);

    /* Les images PEINTES : un message posté depuis le rAF s'exécute après le
       rendu de l'image (le suivi du fil compris). Un relevé avant le geste. */
    const film = (geste, ms) => p.evaluate(([geste, ms]) => new Promise(res => {
      const out = []; const t0 = performance.now();
      const fil = document.getElementById('fil');
      const ch = new MessageChannel();
      const snap = () => {
        const c = document.getElementById('compo'), b = [...document.querySelectorAll('#fil .b-bulle')].pop();
        const z = document.querySelector('.compo-cite-z') || document.querySelector('.compo-cite'), q = document.querySelector('.compo-cite');
        out.push({ t: Math.round(performance.now() - t0), h: +c.getBoundingClientRect().height.toFixed(1),
          ecart: +(fil.getBoundingClientRect().bottom - b.getBoundingClientRect().bottom).toFixed(1),
          tiroir: !!z, op: q ? +(+getComputedStyle(q).opacity).toFixed(2) : null, texte: q ? q.textContent : '' });
      };
      ch.port1.onmessage = snap;
      snap();
      new Function(geste)();
      const boucle = () => { ch.port2.postMessage(0); if (performance.now() - t0 < ms) requestAnimationFrame(boucle); else setTimeout(() => res(out), 60); };
      requestAnimationFrame(boucle);
    }), [geste, ms || 760]);
    const pas = (r) => Math.max(...r.slice(1).map((x, i) => Math.abs(x.h - r[i].h)));
    const hauteurs = (r) => new Set(r.map(x => x.h)).size;
    const ecarts = (r) => { const e = r.map(x => x.ecart); return Math.max(...e) - Math.min(...e); };

    /* 1 */
    const r1 = await film("toucherMessage('15')");
    const ouverte = r1[r1.length - 1].h, fermee = r1[0].h;
    const ops = r1.map(x => x.op).filter(x => x !== null);
    dit('1. l\'ouverture : la barre grandit en douceur, le dernier message monte avec elle, la citation entre en fondu',
      ouverte - fermee > 40 && pas(r1) <= 20 && hauteurs(r1) >= 8 && ecarts(r1) <= 1.5 && ops[0] < 0.4 && ops[ops.length - 1] === 1,
      JSON.stringify({ de: fermee, a: ouverte, plusGrandPas: pas(r1), hauteurs: hauteurs(r1), ecartDuFil: ecarts(r1), opacite: [ops[0], ops[ops.length - 1]] }));

    /* 3 : un autre message, le tiroir ouvert */
    const r3 = await film("toucherMessage('13')", 400);
    dit('3. répondre à un autre message, tiroir ouvert : la citation change sur place, la barre ne bouge pas',
      pas(r3) <= 0.5 && /Message numéro 13/.test(r3[r3.length - 1].texte), JSON.stringify({ plusGrandPas: pas(r3), texte: r3[r3.length - 1].texte.slice(0, 60) }));

    /* 2 : la fermeture */
    const r2 = await film("annulerReponse()");
    const fin2 = r2[r2.length - 1];
    dit('2. la fermeture : la barre rapetisse en douceur, le dernier message descend avec elle, le tiroir s\'en va à la fin',
      Math.abs(fin2.h - fermee) <= 0.5 && pas(r2) <= 20 && hauteurs(r2) >= 6 && ecarts(r2) <= 1.5 && !fin2.tiroir,
      JSON.stringify({ a: fin2.h, plusGrandPas: pas(r2), hauteurs: hauteurs(r2), ecartDuFil: ecarts(r2), tiroir: fin2.tiroir }));
    await p.waitForTimeout(400);

    /* 4 : refermer puis rouvrir aussitôt */
    await film("toucherMessage('15')");
    const r4 = await film("annulerReponse(); setTimeout(() => toucherMessage('14'), 90)", 900);
    const min4 = Math.min(...r4.map(x => x.h)), fin4 = r4[r4.length - 1];
    dit('4. refermer puis rouvrir aussitôt : le tiroir repart d\'où il en est — ni disparu, ni saut — et finit ouvert sur le nouveau message',
      r4.every(x => x.tiroir) && min4 > fermee + 5 && pas(r4) <= 20 && Math.abs(fin4.h - ouverte) <= 0.5 && /Message numéro 14/.test(fin4.texte),
      JSON.stringify({ plusBas: min4, fermee, plusGrandPas: pas(r4), fin: fin4.h, texte: fin4.texte.slice(0, 40) }));
    await film("annulerReponse()");
    await p.waitForTimeout(300);

    /* 5 : lu plus haut — le message visé finit au bord bas du fil */
    const v5 = await p.evaluate(async () => {
      const z = document.getElementById('fil');
      const b = document.querySelector('#fil .b-bulle[data-m="9"]');
      z.scrollTop += b.getBoundingClientRect().bottom - (z.getBoundingClientRect().bottom - 6);
      z._enBas = false;
      await new Promise(r => setTimeout(r, 300));
      const avant = z.getBoundingClientRect().bottom - b.getBoundingClientRect().bottom;
      toucherMessage('9');
      await new Promise(r => setTimeout(r, 1300));
      return { avant: +avant.toFixed(1), apres: +(z.getBoundingClientRect().bottom - b.getBoundingClientRect().bottom).toFixed(1) };
    });
    dit('5. lu plus haut : le message visé, au bord bas, remonte juste assez pour se voir au-dessus de la barre qui a grandi',
      v5.apres >= 4 && v5.apres <= 30, JSON.stringify(v5));
    await film("annulerReponse()");
    await p.evaluate(() => { const z = document.getElementById('fil'); z.scrollTop = z.scrollHeight; z._enBas = true; });
    await p.waitForTimeout(400);

    /* 6 : envoyer la réponse */
    await film("toucherMessage('15')");
    await p.evaluate(() => { window.appelGroupe = async (nom) => { await new Promise(r => setTimeout(r, 60)); return nom === 'envoyer_message' ? { ok: true, id: 99 } : { ok: true }; };
      const t = document.getElementById('compoTexte'); t.value = 'Oui, jeudi !'; surSaisie(t); });
    const r6 = await film("envoyerMessageGroupe()", 900);
    const fin6 = r6[r6.length - 1];
    dit('6. envoyer la réponse : le tiroir se referme en douceur, puis s\'en va',
      pas(r6) <= 20 && hauteurs(r6) >= 6 && !fin6.tiroir && Math.abs(fin6.h - fermee) <= 0.5, JSON.stringify({ plusGrandPas: pas(r6), hauteurs: hauteurs(r6), fin: fin6.h, tiroir: fin6.tiroir }));

    /* 7 : l'écran redessiné pendant une réponse */
    await film("toucherMessage('15')");
    const v7 = await p.evaluate(() => new Promise(res => {
      render();
      const z = document.querySelector('.compo-cite-z');
      const h0 = document.getElementById('compo').getBoundingClientRect().height;
      requestAnimationFrame(() => res({ tiroir: !!z, ouverte: !!(z && z.classList.contains('ouverte')), anims: z ? z.getAnimations({ subtree: true }).length : -1,
        h0: +h0.toFixed(1), h1: +document.getElementById('compo').getBoundingClientRect().height.toFixed(1) }));
    }));
    dit('7. l\'écran redessiné pendant une réponse : le tiroir est là, ouvert, sans rejouer son animation',
      v7.tiroir && v7.ouverte && v7.anims === 0 && Math.abs(v7.h0 - ouverte) <= 0.5 && Math.abs(v7.h1 - ouverte) <= 0.5, JSON.stringify(v7));

    await ctx.close();
    dit('8. aucune erreur dans la page', erreurs.length === 0, erreurs.slice(0, 3).join(' | '));
  } catch (e) {
    console.log('  KO  le banc s\'est arrêté : ' + (e.stack || e).toString().slice(0, 600)); ko++;
  } finally {
    await nav.close().catch(() => {});
  }
  console.log(ko ? '\n  ' + ko + ' KO' : '\n  OK — la réponse s\'ouvre et se referme en douceur, le fil l\'accompagne');
  process.exit(ko ? 1 : 0);
})();
