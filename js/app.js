// 路由、渲染与事件委托
const TABS = [
  { k: 'home', t: '总览', i: '🏠', v: viewOverview },
  { k: 'team', t: '组队', i: '👥', v: viewTeam },
  { k: 'dest', t: '目的地', i: '🧭', v: viewDest },
  { k: 'plan', t: '日期行程', i: '🗓️', v: viewPlan },
  { k: 'cost', t: '费用', i: '💰', v: viewCost },
];
let tab = 'home';

function render() {
  if (!mem(S.me)) S.me = S.organizer;
  const cur = TABS.find(t => t.k === tab) || TABS[0];
  $('#tripName').textContent = S.trip.name;
  $('#meSel').innerHTML = S.members.map(m => `<option value="${m.id}"${m.id === S.me ? ' selected' : ''}>${esc(m.name)}${m.id === S.organizer ? '（组织者）' : ''}</option>`).join('');
  $('#tabs').innerHTML = TABS.map(t => `<button class="tab" data-go="${t.k}"${t.k === cur.k ? ' aria-current="page"' : ''}><i aria-hidden="true">${t.i}</i><span>${t.t}</span></button>`).join('');
  $('#view').innerHTML = cur.v();
  document.title = `${cur.t} · 毕业旅行拼团`;
}

function go(k) {
  if (!TABS.some(t => t.k === k)) k = 'home';
  tab = k;
  if (location.hash !== '#' + k) history.replaceState(null, '', '#' + k);
  render();
  window.scrollTo(0, 0);
}

document.addEventListener('click', e => {
  const goEl = e.target.closest('[data-go]');
  if (goEl) { go(goEl.dataset.go); return; }
  const actEl = e.target.closest('[data-act]');
  if (actEl && ACT[actEl.dataset.act]) ACT[actEl.dataset.act](actEl);
});
document.addEventListener('change', e => {
  if (e.target.id === 'meSel') { S.me = e.target.value; save(); render(); return; }
  const c = e.target.closest('[data-chg]');
  if (c && CHG[c.dataset.chg]) CHG[c.dataset.chg](c);
});
ACT.resetDemo = () => {
  if (!confirm('重置后会清空你在本机的所有改动，恢复演示数据。确定吗？')) return;
  resetAll(); tab = 'home'; history.replaceState(null, '', '#home'); toast('已恢复演示数据'); render();
};

// 前进/后退或手动改地址时同步页签
window.addEventListener('hashchange', () => {
  const k = location.hash.slice(1) || 'home';
  if (k !== tab) { tab = TABS.some(t => t.k === k) ? k : 'home'; render(); }
});

tab = location.hash.slice(1) || 'home';
if (!TABS.some(t => t.k === tab)) tab = 'home';
render();
