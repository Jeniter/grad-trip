// 总览：进度条 + 下一步建议 + 关键数据
function stageInfo() {
  const n = S.members.length;
  const d = S.dest ? destOf(S.dest) : null;
  const stages = [
    { k: 'team', t: '组队', done: n >= S.trip.minSize && paidCount() >= S.trip.minSize, tip: `已有 ${n} 人，已交定金 ${paidCount()} 人，凑够 ${S.trip.minSize} 人定金即成团` },
    { k: 'dest', t: '选地', done: !!d, tip: d ? `已定 ${d.name}` : '去目的地页投票，组织者确认' },
    { k: 'plan', t: '定日期', done: !!S.start, tip: S.start ? `${dlabel(S.start)} 出发` : '标出各自有空的日子，系统推荐最佳档期' },
    { k: 'itin', t: '排行程', done: S.planLocked, tip: S.planLocked ? '行程已锁定' : S.plan ? '行程已生成，调整后锁定' : '确定日期后一键生成行程' },
    { k: 'cost', t: '分摊', done: totalCents() > 0 && transfers().length === 0, tip: transfers().length ? `还有 ${transfers().length} 笔转账待结清` : '暂无待结清款项' },
  ];
  const now = stages.findIndex(s => !s.done);
  return { stages, now: now < 0 ? stages.length : now };
}

function viewOverview() {
  const { stages, now } = stageInfo();
  const d = S.dest ? destOf(S.dest) : null;
  const n = S.members.length;
  const nextTab = ['team', 'dest', 'plan', 'plan', 'cost'][Math.min(now, 4)];
  const nextTxt = now >= stages.length ? '全部完成，出发吧' : `下一步：${stages[now].t}`;
  const avgBudget = n ? S.members.reduce((s, m) => s + m.budget, 0) / n : 0;
  const minBudget = Math.min(...S.members.map(m => m.budget));
  const mine = me();

  return `
  <section class="card hl sec">
    <div class="row sb wr">
      <div class="grow"><h2 class="h2">${esc(S.trip.name)}</h2>
        <p class="sub">${d ? `${d.emoji} ${d.name}` : '目的地待定'} · ${S.trip.days} 天${S.start ? ` · ${dlabel(S.start)} 出发` : ''}</p></div>
      <button class="btn pri" data-go="${nextTab}">${nextTxt} →</button>
    </div>
    <div class="steps" style="margin-top:14px">
      ${stages.map((s, i) => `<div class="step ${s.done ? 'done' : i === now ? 'now' : ''}"><i>${s.done ? '✓' : i + 1}</i>${s.t}</div>`).join('')}
    </div>
    ${now < stages.length ? `<p class="sub" style="margin-top:12px">${esc(stages[now].tip)}</p>` : ''}
  </section>

  <section class="grid g4 sec">
    <div class="card stat"><small>报名同学</small><b>${n} 人</b><small>成团线 ${S.trip.minSize} 人</small></div>
    <div class="card stat"><small>已交定金</small><b>${paidCount()} / ${n}</b><small>每人 ${yuan(S.trip.deposit)}</small></div>
    <div class="card stat"><small>人均预算</small><b>${yuan(avgBudget)}</b><small>最低 ${yuan(minBudget)}，以最低线选地</small></div>
    <div class="card stat"><small>公共账本</small><b>${yuanC(totalCents())}</b><small>${S.expenses.length} 笔 · 待结 ${transfers().length} 笔</small></div>
  </section>

  <div class="grid g2">
    <section class="card">
      <h3>为什么做这个工具</h3>
      <ul class="stack sub">
        <li><b style="color:var(--ink)">人多嘴杂</b>：群里聊 200 条还没定地方 → 投票 + 匹配分，一屏看结论</li>
        <li><b style="color:var(--ink)">预算不一</b>：有人 1500 有人 3500 → 按每人出发地算真实花费，超预算的人一眼可见</li>
        <li><b style="color:var(--ink)">时间对不上</b>：毕业季各有各的事 → 标有空日期，自动找到到场人数最多的档期</li>
        <li><b style="color:var(--ink)">钱账难算</b>：垫付来垫付去 → 记账后一键算出最少转账笔数</li>
      </ul>
    </section>
    <section class="card">
      <h3>${esc(mine.name)} 的待办</h3>
      <ul class="stack">${todoList(mine).map(t => `<li class="row"><span class="chip ${t.ok ? 'ok' : 'warn'}">${t.ok ? '完成' : '待办'}</span><span class="grow">${t.text}</span>${t.go ? `<button class="btn sm" data-go="${t.go}">去处理</button>` : ''}</li>`).join('')}</ul>
    </section>
  </div>`;
}

function todoList(m) {
  const t = [];
  t.push({ ok: m.paid, text: m.paid ? '定金已交' : `交 ${yuan(S.trip.deposit)} 定金占位`, go: m.paid ? '' : 'team' });
  const voted = Object.values(S.votes).some(v => v.includes(m.id));
  t.push({ ok: voted, text: voted ? '已投票' : '为意向目的地投票', go: voted ? '' : 'dest' });
  t.push({ ok: m.free.length > 0, text: m.free.length ? `已标 ${m.free.length} 天有空` : '标出有空的日期', go: m.free.length ? '' : 'plan' });
  const owed = balances()[m.id];
  if (owed < 0) t.push({ ok: false, text: `需转出 ${yuanC(-owed)}`, go: 'cost' });
  return t;
}
