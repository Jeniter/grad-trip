// 目的地：按每人出发地算真实花费，投票 + 匹配分
const MAX_VOTES = 2;

function viewDest() {
  const mine = me();
  const myVotes = Object.entries(S.votes).filter(([, v]) => v.includes(mine.id)).length;
  const list = DESTS.map(d => ({ d, st: destStats(d) })).sort((a, b) => b.st.score - a.st.score);
  const chosen = S.dest ? destOf(S.dest) : null;
  return `
  <section class="card hl sec">
    <div class="row sb wr">
      <div class="grow">
        <h2 class="h2">${chosen ? `已定：${chosen.emoji} ${chosen.name}` : '目的地投票'}</h2>
        <p class="sub">${chosen ? '想换的话，组织者可以改选，日期与行程会重置。' : `每人最多投 ${MAX_VOTES} 票（你已投 ${myVotes} 票）。匹配分 = 预算 50 + 兴趣 30 + 票数 20。`}</p>
      </div>
    </div>
  </section>
  <section class="grid g2 sec">${list.map(({ d, st }, i) => destCard(d, st, i, mine)).join('')}</section>`;
}

function destCard(d, st, rank, mine) {
  const voted = (S.votes[d.id] || []).includes(mine.id);
  const voters = (S.votes[d.id] || []).map(mem).filter(Boolean);
  const over = st.rows.filter(r => r.total > r.m.budget);
  const picked = S.dest === d.id;
  const myCost = memberCost(mine, d);
  return `<article class="card${picked ? ' hl' : ''}">
    <div class="row sb">
      <h3 style="font-size:18px">${d.emoji} ${d.name} ${rank === 0 && !S.dest ? '<span class="chip gold">匹配最高</span>' : ''}${picked ? ' <span class="chip ok">已选定</span>' : ''}</h3>
      <div style="text-align:right"><b class="num" style="font-size:22px;color:var(--brand)">${st.score}</b><div class="sub" style="line-height:1">匹配分</div></div>
    </div>
    <p class="sub" style="margin:4px 0 10px">${esc(d.blurb)}</p>
    <div class="row wr" style="margin-bottom:8px">${d.tags.map(t => `<span class="chip gray">${t}</span>`).join('')}<span class="sub">${esc(d.best)}</span></div>
    <div class="kv"><span>人均总花费（${S.trip.days} 天）</span><b class="num">${yuan(st.avg)}</b></div>
    <div class="kv"><span>我从${esc(mine.city)}出发（${myCost.mode}）</span><b class="num ${myCost.total <= mine.budget ? 'pos' : 'neg'}">${yuan(myCost.total)}</b></div>
    <div class="kv"><span>预算够用</span><b class="num">${st.ok} / ${st.n} 人</b></div>
    ${bar(st.ok / st.n * 100, st.ok / st.n >= .7 ? 'ok' : 'warn')}
    ${over.length ? `<p class="sub" style="margin-top:6px">超预算：${over.map(r => `${esc(r.m.name)} +${yuan(r.total - r.m.budget)}`).join('、')}</p>` : '<p class="sub" style="margin-top:6px">所有人都在预算内</p>'}
    <div class="row sb" style="margin-top:12px">
      <div class="row">${voters.length ? avatars(voters) : ''}<span class="sub">${voters.length} 票</span></div>
      <div class="row">
        <button class="btn sm" data-act="destDetail" data-id="${d.id}">花费明细</button>
        <button class="btn sm${voted ? ' on' : ''}" data-act="vote" data-id="${d.id}" aria-pressed="${voted}">${voted ? '已投票' : '投一票'}</button>
        ${isOrg() && !picked ? `<button class="btn sm pri" data-act="pickDest" data-id="${d.id}">定这里</button>` : ''}
      </div>
    </div>
  </article>`;
}

ACT.vote = el => {
  const id = el.dataset.id, mine = me().id;
  const arr = S.votes[id] || (S.votes[id] = []);
  const at = arr.indexOf(mine);
  if (at >= 0) arr.splice(at, 1);
  else {
    const used = Object.values(S.votes).filter(v => v.includes(mine)).length;
    if (used >= MAX_VOTES) { toast(`每人最多 ${MAX_VOTES} 票，先取消一个再投`); return; }
    arr.push(mine);
  }
  save(); render();
};
ACT.pickDest = el => {
  const d = destOf(el.dataset.id);
  if (S.dest && S.dest !== d.id && (S.plan || S.start) && !confirm(`改选 ${d.name} 会清空已生成的行程，确定吗？`)) return;
  if (S.dest !== d.id) { S.plan = null; S.planLocked = false; }
  S.dest = d.id; save();
  toast(`目的地定为 ${d.name}`); render();
};
ACT.destDetail = el => {
  const d = destOf(el.dataset.id), st = destStats(d);
  openModal(`<h2>${d.emoji} ${d.name} · 每人花费明细</h2>
    <p class="sub" style="margin-bottom:8px">交通为往返估价（${S.trip.days} 天食宿按日均 ${yuan(d.daily)} 计），仅供参考。</p>
    <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead><tr style="text-align:left;color:var(--sub)"><th>成员</th><th>交通</th><th>食宿</th><th>合计</th><th>预算差</th></tr></thead>
      <tbody>${st.rows.map(r => {
        const diff = r.m.budget - r.total;
        return `<tr style="border-top:1px solid var(--line)"><td style="padding:7px 0">${esc(r.m.name)}<div class="sub">${esc(r.m.city)}</div></td>
          <td class="num">${yuan(r.cost)}<div class="sub">${r.mode}</div></td><td class="num">${yuan(r.stay)}</td>
          <td class="num"><b>${yuan(r.total)}</b></td><td class="num ${diff >= 0 ? 'pos' : 'neg'}">${diff >= 0 ? '余 ' : '超 '}${yuan(Math.abs(diff))}</td></tr>`;
      }).join('')}</tbody></table></div>
    <div class="acts"><button class="btn pri" data-act="closeModal">知道了</button></div>`);
};
