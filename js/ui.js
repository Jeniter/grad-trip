// 通用 UI 工具：转义、弹窗、提示、小组件
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (sel, root = document) => root.querySelector(sel);
const yuan = n => '¥' + Math.round(n).toLocaleString('zh-CN');
const yuanC = c => '¥' + (c / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const avatar = (m, sm) => `<span class="av${sm ? ' sm' : ''}" style="background:${m.color}" title="${esc(m.name)}">${esc(m.name[0])}</span>`;
const avatars = (list, max = 5) => `<span class="avs">${list.slice(0, max).map(m => avatar(m, true)).join('')}${list.length > max ? `<span class="av sm" style="background:#8a93b2">+${list.length - max}</span>` : ''}</span>`;
const bar = (pct, cls = '') => `<div class="bar ${cls}" role="progressbar" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></div>`;
const empty = (t, s) => `<div class="empty"><b>${t}</b>${s || ''}</div>`;

// 事件注册表：视图往里挂处理函数，app.js 统一委托 click / change
const ACT = {}, CHG = {};

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), 2200);
}

// 弹窗：返回关闭函数；Esc 或点遮罩关闭，关闭后焦点回到触发元素
let lastFocus = null;
function openModal(html, onMount) {
  const box = $('#modal');
  lastFocus = document.activeElement;
  box.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
  box.hidden = false;
  const first = box.querySelector('input,select,textarea,button');
  if (first) first.focus();
  box.onclick = e => { if (e.target === box) closeModal(); };
  box.onkeydown = e => { if (e.key === 'Escape') closeModal(); };
  if (onMount) onMount(box);
  return box;
}
function closeModal() {
  const box = $('#modal');
  box.hidden = true;
  box.innerHTML = '';
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}

function tagPicker(name, selected) {
  return `<div class="tagpick">${TAGS.map(t => `<label><input type="checkbox" name="${name}" value="${t}"${selected.includes(t) ? ' checked' : ''}><span>${t}</span></label>`).join('')}</div>`;
}
const cityOptions = sel => Object.keys(CITIES).map(c => `<option${c === sel ? ' selected' : ''}>${c}</option>`).join('');

function copyText(text, okMsg) {
  const done = () => toast(okMsg);
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
  } else fallbackCopy(text, done);
}
function fallbackCopy(text, done) {
  const t = document.createElement('textarea');
  t.value = text; t.style.position = 'fixed'; t.style.opacity = '0';
  document.body.appendChild(t); t.select();
  try { document.execCommand('copy'); done(); } catch (e) { toast('复制失败，请手动选择文字'); }
  t.remove();
}
