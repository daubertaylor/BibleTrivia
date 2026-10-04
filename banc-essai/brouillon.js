/* OÙ LES BANCS POSENT CE QU'ILS FABRIQUENT — captures, mesures, la copie de
   supabase-js que cinq bancs servent au jeu.

   BANC_TMP si on le donne ; sinon un dossier à eux dans le dossier temporaire
   de la machine (/tmp/yada-bancs sous Linux et macOS). Jusqu'à la v303,
   quatorze bancs écrivaient en dur le brouillon d'UNE session de travail :
   sur un autre ordinateur, ou à la session suivante, ce dossier n'existait
   pas, et le banc tombait pour une raison qui n'avait rien à voir avec le
   jeu. tous.sh pose BANC_TMP au même endroit pour tout le monde. */
const os = require('os'), path = require('path'), fs = require('fs');
const D = process.env.BANC_TMP || path.join(os.tmpdir(), 'yada-bancs');
fs.mkdirSync(D, { recursive:true });
module.exports = D;
