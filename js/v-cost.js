// 费用：公共账本 -> 每人余额 -> 最少转账
const CATS = ['交通', '住宿', '餐饮', '门票', '其他'];

function viewCost() {
  const b = balances(), tf = transfers(), mine = me();
  const total = totalCents(), n = S.members.length;
  const myBal = b[mine.id];
  return `
  <section class="card hl sec">
    <div class="row sb wr">
      <div class="grow">
        <h2 class="h2">公共账本 ${yuanC(total)}</h2>
        <p class="sub">人均 ${yuanC(n ? total / n : 0)}。${esc(mine.name)}：${myBal === 0 ? '已结清' : myBal > 0 ? `<b class="pos">待收回 ${yuanC(myBal)}</b>` : `<b class="neg">需转出 ${yuanC(-myBal)}</b>`}</p>
      </div>
      <button class="btn pri" data-act="addExpense">+ 记一笔</button>
    </div>
  </section>

  <div class="split">
    <div>
      <section class="card sec">
        <div class="sec-h"><h2 class="h2">账目（${S.expenses.length}）</h2></div>
        ${S.expenses.length ? S.expenses.slice().reverse().map(e => `<div class="li">
          <div class="grow"><div class="t">${esc(e.title)} <span class="chip gray">${esc(e.cat)}</span></div>
            <div class="sub">${esc(mem(e.payer)?.name || '已离队')} 垫付 · ${e.split.length === n ? '全员均摊' : e.split.length + ' 人均摊'}，每人约 ${yuanC(e.cents / e.split.length)}</div></div>
          <div class="amt">${yuanC(e.cents)}</div>
          <button class="btn sm danger" data-act="delExpense" data-id="${e.id}" aria-label="删除 ${esc(e.title)}">删</button>
        </div>`).join('') : empty('还没有账目', '谁垫付谁记一笔，系统会自动算清')}
      </section>
      ${S.settles.length ? `<section class="card flat sec"><h3>已转账记录</h3>${S.settles.map(s => `<div class="li"><span class="grow">${esc(mem(s.from)?.name)} → ${esc(mem(s.to)?.name)}</span><b class="num">${yuanC(s.cents)}</b></div>`).join('')}</section>` : ''}
    </div>

    <aside class="sticky">
      <section class="card sec">
        <h3>最少转账方案 ${tf.length ? `<span class="chip">${tf.length} 笔</span>` : ''}</h3>
        ${tf.length ? tf.map((t, i) => `<div class="li">
          <div class="grow">${esc(mem(t.from).name)} <span class="sub">转给</span> ${esc(mem(t.to).name)}<div class="num"><b>${yuanC(t.cents)}</b></div></div>
          ${t.from === mine.id || isOrg() ? `<button class="btn sm" data-act="settle" data-i="${i}">已转</button>` : ''}
        </div>`).join('') : empty('已全部结清', '没有待转账的款项')}
      </section>
      <section class="card flat">
        <h3>每人余额</h3>
        ${S.members.map(m => `<div class="kv"><span>${esc(m.name)}</span><b class="num ${b[m.id] > 0 ? 'pos' : b[m.id] < 0 ? 'neg' : ''}">${b[m.id] > 0 ? '+' : ''}${yuanC(b[m.id])}</b></div>`).join('')}
        <p class="sub" style="margin-top:6px">正数表示别人欠 TA，负数表示 TA 欠别人。</p>
      </section>
    </aside>
  </div>`;
}

ACT.addExpense = () => {
  const box = openModal(`<h2>记一笔</h2>
    <div class="fld"><label for="e-title">用途</label><input id="e-title" maxlength="20" placeholder="例如：民宿尾款" required></div>
    <div class="two">
      <div class="fld"><label for="e-amt">金额（元）</label><input id="e-amt" type="number" min="0.01" step="0.01" inputmode="decimal" required></div>
      <div class="fld"><label for="e-cat">类别</label><select id="e-cat">${CATS.map(c => `<option>${c}</option>`).join('')}</select></div>
    </div>
    <div class="fld"><label for="e-payer">谁垫付</label><select id="e-payer">${S.members.map(m => `<option value="${m.id}"${m.id === S.me ? ' selected' : ''}>${esc(m.name)}</option>`).join('')}</select></div>
    <div class="fld"><span>谁来分摊 <button class="link" type="button" id="e-all">全选</button></span>
      <div class="tagpick">${S.members.map(m => `<label><input type="checkbox" name="e-split" value="${m.id}" checked><span>${esc(m.name)}</span></label>`).join('')}</div></div>
    <div class="acts"><button class="btn" data-act="closeModal">取消</button><button class="btn pri" id="ok">保存</button></div>`);
  $('#e-all', box).onclick = () => box.querySelectorAll('input[name=e-split]').forEach(i => { i.checked = true; });
  $('#ok', box).onclick = () => {
    const title = $('#e-title', box).value.trim();
    const cents = toCents($('#e-amt', box).value);
    const split = [...box.querySelectorAll('input[name=e-split]:checked')].map(i => i.value);
    if (!title) return toast('请填写用途');
    if (!(cents > 0)) return toast('请填写正确的金额');
    if (!split.length) return toast('至少选一位分摊的人');
    S.expenses.push({ id: uid(), title, cents, cat: $('#e-cat', box).value, payer: $('#e-payer', box).value, split });
    save(); closeModal(); toast('已记账'); render();
  };
};
ACT.delExpense = el => {
  const e = S.expenses.find(x => x.id === el.dataset.id);
  if (!e || !confirm(`删除「${e.title}」这笔账？`)) return;
  S.expenses = S.expenses.filter(x => x.id !== e.id);
  save(); render();
};
ACT.settle = el => {
  const t = transfers()[Number(el.dataset.i)];
  if (!t) return;
  S.settles.push({ from: t.from, to: t.to, cents: t.cents });
  save(); toast('已记录转账'); render();
};
