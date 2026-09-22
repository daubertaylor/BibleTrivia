/* Sortir les 1545 questions telles qu'elles sont écrites, sans les interpréter.
   On évalue le littéral BANK dans un bac à sable — c'est du JS pur, et c'est
   la seule façon de ne pas se tromper d'une virgule sur 1545 entrées. On
   délimite le bloc en COMPTANT les accolades, pas en cherchant un motif de
   fin : un motif se trompe dès qu'une chaîne en contient un morceau. */
const fs = require('fs'), vm = require('vm');
const s = fs.readFileSync(process.argv[3] || 'index.html', 'utf8');
const d = s.indexOf('const BANK = ') + 'const BANK = '.length;
let i = d, prof = 0;
for(; i < s.length; i++){
  const c = s[i];
  if(c === '"' || c === "'"){                    // sauter la chaîne en entier
    const q = c; i++;
    while(i < s.length && s[i] !== q){ if(s[i] === '\\') i++; i++; }
    continue;
  }
  if(c === '{' || c === '[') prof++;
  else if(c === '}' || c === ']'){ prof--; if(prof === 0){ i++; break; } }
}
const BANK = vm.runInNewContext('(' + s.slice(d, i) + ')');
const sortie = [];
let nc = 0;
for(const tier of Object.keys(BANK))
  for(const q of BANK[tier]){
    nc += 1 + q.options.length + (q.fact ? 1 : 0);
    sortie.push({ tier, q:q.q, options:q.options, correct:q.correct, fact:q.fact || "" });
  }
fs.writeFileSync(process.argv[2] || 'questions.json', JSON.stringify(sortie, null, 1));
console.log('niveaux   : ' + Object.keys(BANK).map(t=>t+' '+BANK[t].length).join(', '));
console.log('questions : ' + sortie.length);
console.log('chaînes   : ' + nc);
const o = sortie.reduce((a,x)=>a + Buffer.byteLength(x.q + x.options.join('') + x.fact, 'utf8'), 0);
console.log('poids     : ' + Math.round(o/1024) + ' Ko de français');
