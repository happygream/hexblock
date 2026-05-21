/* HexBlock — hexblock.js — loaded on every page */
'use strict';

function togglePw(id, btn) {
  const inp = document.getElementById(id);
  if (!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
  btn.style.color = inp.type === 'text' ? 'var(--accent)' : 'var(--muted)';
}
