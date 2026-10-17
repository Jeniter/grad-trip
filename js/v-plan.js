// 日期与行程：空档热力表 -> 推荐档期 -> 生成/编辑/锁定行程
function viewPlan() {
  return `${viewDates()}${viewItinerary()}`;
}

function viewDates() {
  const t = S.trip, mine = me();
  const days = Array.from({ length: t.winLen }, (_, k) => addDays(t.winStart, k));
  const wins = windows().slice(0, 3);
  const n = S.members.length;
  const inPick = k => S.start && k >= S.start && k <= addDays(S.start, t.days - 1);
  return `
  <section class="card sec">
    <div class="sec-h"><h2 class="h2">1. 标出你有空的日子</h2><span class="sub">当前身份：${esc(mine.name)}，点格子切换</span></div>
    <div class="heatbox"><table class="heat">
      <thead><tr><th class="nm"></th>${days.map(k => `<th>${parseKey(k).getDate()}<br>${WD[parseKey(k).getDay()]}</th>`).join('')}</tr></thead>
      <tbody>
        ${S.members.map(m => `<tr class="${m.id === mine.id ? 'me-row' : ''}"><th class="nm">${esc(m.name)}</th>${days.map(k => {
          const on = m.free.includes(k), pick = inPick(k) ? ' pick' : '';
          return m.id === mine.id
            ? `<td><button class="${on ? 'on' : ''}${pick}" data-act="toggleFree" data-day="${k}" aria-pressed="${on}" aria-label="${dlabel(k)} ${on ? '有空' : '没空'}"></button></td>`
            : `<td><span class="cell ${on ? 'on' : ''}${pick}"></span></td>`;
        }).join('')}</tr>`).join('')}
        <tr><th class="nm">有空人数</th>${days.map(k => `<td class="tot">${S.members.filter(m => m.free.includes(k)).length}</td>`).join('')}</tr>
      </tbody></table></div>
  </section>

  <section class="card sec">
    <div class="sec-h"><h2 class="h2">2. 推荐档期（连续 ${t.days} 天）</h2><span class="sub">按能到场的人数排序</span></div>
    ${wins.map((w, i) => {
      const picked = S.start === w.start;
      return `<div class="li">
        <div class="grow"><div class="t">${dlabel(w.start)} → ${dlabel(w.end)} ${i === 0 ? '<span class="chip gold">到场最多</span>' : ''}${picked ? ' <span class="chip ok">已选定</span>' : ''}</div>
          <div class="sub">${w.ok.length} / ${n} 人能去${w.miss.length ? '，缺席：' + w.miss.map(m => esc(m.name)).join('、') : '，全员到齐'}</div></div>
        ${avatars(w.ok, 4)}
        ${isOrg() && !picked ? `<button class="btn sm pri" data-act="pickStart" data-day="${w.start}">定这档</button>` : ''}
      </div>`;
    }).join('') || empty('没有可用档期', '把候选日期窗口放宽，或减少旅行天数')}
    ${isOrg() ? '' : '<p class="sub" style="margin-top:8px">由组织者拍板，右上角切换成组织者可体验。</p>'}
  </section>`;
}

function viewItinerary() {
  if (!S.dest || !S.start) {
    return `<section class="card sec">${empty('3. 行程', `${!S.dest ? '先在「目的地」页选定去哪' : '先定出发档期'}，这里会自动生成可编辑的行程`)}</section>`;
  }
  const d = destOf(S.dest), dates = tripDates();
  if (!S.plan) {
    return `<section class="card sec"><div class="row sb wr"><div class="grow"><h2 class="h2">3. 行程</h2>
      <p class="sub">${d.name} · ${dlabel(dates[0])} → ${dlabel(dates[dates.length - 1])}，用模板生成后可以随意增删改。</p></div>
      <button class="btn pri" data-act="genPlan">生成 ${d.name} ${S.trip.days} 天行程</button></div></section>`;
  }
  const locked = S.planLocked;
  const mine = me();
  const sum = planSum();
  const per = S.members.map(m => ({ m, c: planCostFor(m) }));
  return `
  <section class="card sec">
    <div class="sec-h"><h2 class="h2">3. ${d.emoji} ${d.name} ${S.trip.days} 天行程 ${locked ? '<span class="chip ok">已锁定</span>' : ''}</h2>
      <div class="row">
        <button class="btn sm" data-act="copyPlan">复制行程</button>
        ${isOrg() ? `<button class="btn sm ${locked ? '' : 'pri'}" data-act="lockPlan">${locked ? '解锁修改' : '锁定行程'}</button>` : ''}
      </div></div>
    ${S.plan.map((day, di) => `<div class="stack" style="margin-bottom:14px">
      <div class="row sb"><b>Day ${di + 1} · ${dlabel(dates[di])}</b>${locked ? '' : `<button class="btn sm" data-act="addItem" data-day="${di}">+ 添加</button>`}</div>
      ${day.map((it, ii) => `<div class="li">
        <b class="num" style="width:48px">${esc(it.time)}</b>
        <span class="grow">${esc(it.text)}</span>
        <span class="num sub">${it.cost ? yuan(it.cost) : '免费'}</span>
        ${locked ? '' : `<button class="btn sm" data-act="editItem" data-day="${di}" data-i="${ii}" aria-label="编辑">改</button><button class="btn sm danger" data-act="delItem" data-day="${di}" data-i="${ii}" aria-label="删除">删</button>`}
      </div>`).join('') || '<p class="sub">这天还没安排</p>'}
    </div>`).join('')}
  </section>

  <section class="card sec">
    <h3>每人预估花费</h3>
    <p class="sub" style="margin-bottom:8px">= 往返交通（按各自出发地）+ ${S.trip.days - 1} 晚住宿 + 行程里的活动餐饮 ${yuan(sum)}。与预算对比：</p>
    ${per.map(({ m, c }) => `<div class="li">${avatar(m, true)}<span class="grow">${esc(m.name)}<span class="sub"> · ${esc(m.city)}</span></span>
      <span class="num">${yuan(c)}</span><span class="chip ${c <= m.budget ? 'ok' : 'warn'}">${c <= m.budget ? '预算内' : '超 ' + yuan(c - m.budget)}</span></div>`).join('')}
    <p class="sub" style="margin-top:8px">${esc(mine.name)} 的预算 ${yuan(mine.budget)}。</p>
  </section>`;
}

ACT.toggleFree = el => {
  const m = me(), k = el.dataset.day, at = m.free.indexOf(k);
  if (at >= 0) m.free.splice(at, 1); else m.free.push(k);
  save(); render();
};
ACT.pickStart = el => {
  S.start = el.dataset.day; S.plan = null; S.planLocked = false;
  save(); toast(`出发日定为 ${dlabel(S.start)}`); render();
};
ACT.genPlan = () => {
  S.plan = genPlan(S.dest, S.trip.days); S.planLocked = false;
  save(); toast('行程已生成，可以继续调整'); render();
};
ACT.lockPlan = () => { S.planLocked = !S.planLocked; save(); toast(S.planLocked ? '行程已锁定，可以订票了' : '已解锁'); render(); };

function itemForm(it) {
  return `<div class="two"><div class="fld"><label for="i-time">时间</label><input id="i-time" type="time" value="${esc(it.time)}" required></div>
    <div class="fld"><label for="i-cost">人均花费（元）</label><input id="i-cost" type="number" min="0" step="10" value="${it.cost}"></div></div>
    <div class="fld"><label for="i-text">安排</label><input id="i-text" value="${esc(it.text)}" maxlength="30" required></div>`;
}
function readItem(box) {
  const text = $('#i-text', box).value.trim(), time = $('#i-time', box).value;
  if (!text || !time) { toast('请填写时间和安排'); return null; }
  return { time, text, cost: Math.max(0, Number($('#i-cost', box).value) || 0) };
}
ACT.addItem = el => {
  const di = Number(el.dataset.day);
  const box = openModal(`<h2>Day ${di + 1} 添加安排</h2>${itemForm({ time: '10:00', text: '', cost: 0 })}
    <div class="acts"><button class="btn" data-act="closeModal">取消</button><button class="btn pri" id="ok">添加</button></div>`);
  $('#ok', box).onclick = () => {
    const v = readItem(box);
    if (!v) return;
    S.plan[di].push({ id: uid(), ...v });
    S.plan[di].sort((a, b) => a.time.localeCompare(b.time));
    save(); closeModal(); render();
  };
};
ACT.editItem = el => {
  const di = Number(el.dataset.day), it = S.plan[di][Number(el.dataset.i)];
  const box = openModal(`<h2>修改安排</h2>${itemForm(it)}
    <div class="acts"><button class="btn" data-act="closeModal">取消</button><button class="btn pri" id="ok">保存</button></div>`);
  $('#ok', box).onclick = () => {
    const v = readItem(box);
    if (!v) return;
    Object.assign(it, v);
    S.plan[di].sort((a, b) => a.time.localeCompare(b.time));
    save(); closeModal(); render();
  };
};
ACT.delItem = el => {
  S.plan[Number(el.dataset.day)].splice(Number(el.dataset.i), 1);
  save(); render();
};
ACT.copyPlan = () => {
  const d = destOf(S.dest), dates = tripDates();
  const txt = [`【${S.trip.name}】${d.name} ${S.trip.days} 天`,
    ...S.plan.map((day, i) => `\nDay ${i + 1} ${dlabel(dates[i])}\n` + day.map(it => `${it.time} ${it.text}${it.cost ? `（${it.cost} 元）` : ''}`).join('\n'))].join('\n');
  copyText(txt, '行程已复制，可直接发到群里');
};
