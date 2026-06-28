'use strict';

const CHARSETS = {
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower: 'abcdefghijklmnopqrstuvwxyz',
  num:   '0123456789',
  sym:   '!@#$%^&*()-_=+[]{}|;:,.<>?',
};

/**
 * Gera uma senha aleatória usando a Web Crypto API.
 * @param {number} length - Comprimento desejado.
 * @param {string} charset - Conjunto de caracteres permitidos.
 * @param {string[]} guaranteed - Pelo menos um caractere de cada grupo obrigatório.
 * @returns {string} Senha gerada.
 */
function generatePassword(length, charset, guaranteed) {
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);

  const pool = guaranteed.map((c) => c);

  for (let i = pool.length; i < length; i++) {
    pool.push(charset[arr[i] % charset.length]);
  }

  // Embaralha com Fisher-Yates
  const shuffleArr = new Uint32Array(pool.length);
  crypto.getRandomValues(shuffleArr);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = shuffleArr[i] % (i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.join('');
}

/**
 * Calcula a entropia da senha em bits.
 * @param {number} charsetSize - Tamanho do conjunto de caracteres.
 * @param {number} length - Comprimento da senha.
 * @returns {number} Entropia em bits.
 */
function calcEntropy(charsetSize, length) {
  return Math.log2(Math.pow(charsetSize, length));
}

/**
 * Retorna rótulo e cor para a barra de força com base na entropia.
 * @param {number} entropy
 * @returns {{ label: string, pct: number, color: string }}
 */
function strengthInfo(entropy) {
  if (entropy < 28)  return { label: 'Muito fraca',  pct: 12,  color: '#ef4444' };
  if (entropy < 40)  return { label: 'Fraca',        pct: 30,  color: '#f97316' };
  if (entropy < 60)  return { label: 'Razoável',     pct: 55,  color: '#eab308' };
  if (entropy < 90)  return { label: 'Forte',        pct: 78,  color: '#22c55e' };
  return               { label: 'Muito forte',  pct: 100, color: '#16a34a' };
}

// ─── DOM helpers ────────────────────────────────────────────────────────────

const el = (id) => document.getElementById(id);

function generate() {
  const length   = parseInt(el('lenRange').value, 10);
  const useUpper = el('optUpper').checked;
  const useLower = el('optLower').checked;
  const useNum   = el('optNum').checked;
  const useSym   = el('optSym').checked;

  let charset = '';
  const guaranteed = [];

  const addGroup = (key, chars) => {
    charset += chars;
    const randIdx = new Uint32Array(1);
    crypto.getRandomValues(randIdx);
    guaranteed.push(chars[randIdx[0] % chars.length]);
  };

  if (useUpper) addGroup('upper', CHARSETS.upper);
  if (useLower) addGroup('lower', CHARSETS.lower);
  if (useNum)   addGroup('num',   CHARSETS.num);
  if (useSym)   addGroup('sym',   CHARSETS.sym);

  if (!charset) {
    el('pwd').textContent = 'Selecione ao menos uma opção';
    resetStrength();
    return;
  }

  const pwd = generatePassword(length, charset, guaranteed);
  el('pwd').textContent = pwd;

  const entropy = calcEntropy(charset.length, length);
  const info    = strengthInfo(entropy);

  el('sfill').style.width           = info.pct + '%';
  el('sfill').style.backgroundColor = info.color;
  el('slabel').textContent = `Força: ${info.label} (${Math.round(entropy)} bits de entropia)`;

  const bar = el('strengthBar');
  bar.setAttribute('aria-valuenow', info.pct);
  bar.setAttribute('aria-label', `Força da senha: ${info.label}`);
}

function resetStrength() {
  el('sfill').style.width = '0%';
  el('slabel').textContent = 'Selecione ao menos uma opção';
}

let toastTimer = null;

function copyPwd() {
  const pwd = el('pwd').textContent;
  if (!pwd || pwd === '—' || pwd.includes('Selecione')) return;

  navigator.clipboard.writeText(pwd).then(() => {
    const toast = el('toast');
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2000);
  });
}

// Gera uma senha ao carregar a página
generate();