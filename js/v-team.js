// 组队：成员、定金、邀请
function viewTeam() {
  const n = S.members.length, paid = paidCount(), min = S.trip.minSize;
  const formed = paid >= min;
  const mine = me();
  return `
  <section class="card hl sec">
    <div class="row sb wr">
      <div class="grow">
        <h2 class="h2">${formed ? '已成团' : '组队中'}：${n} 人报名 · ${paid} 人已交定金</h2>
        <p class="sub">${formed ? '定金人数已达成团线，可以放心订票订房' : `再有 ${min - paid} 人交定金即成团（成团线 ${min} 人）`}。定金每人 ${yuan(S.trip.deposit)}，统一由组织者保管。</p>
      </div>
      <div class="row wr">
        <button class="btn" data-act="invite">复制邀请文案</button>
        <button class="btn pri" data-act="addMember">+ 邀请同学加入</button>
      </div>
    </div>
    <div style="margin-top:12px">${bar(paid / min * 100, formed ? 'ok' : '')}</div>
  </section>

  <section class="card sec">
    <div class="sec-h"><h2 class="h2">成员（${n}）</h2><span class="sub">预算越分散，越需要先看目的地页的匹配结果</span></div>
    ${S.members.map(m => memberRow(m, mine)).join('')}
  </section>

  <section class="card flat sec">
    <h3>组织者设置</h3>
    <div class="two" style="margin-top:8px">
      <div class="fld"><label for="f-days">旅行天数</label>
        <select id="f-days" data-chg="setDays" ${isOrg() ? '' : 'disabled'}>${[3, 4, 5, 6, 7].map(d => `<option value="${d}"${d === S.trip.days ? ' selected' : ''}>${d} 天</option>`).join('')}</select></div>
      <div class="fld"><label for="f-min">成团人数线</label>
        <select id="f-min" data-chg="setMin" ${isOrg() ? '' : 'disabled'}>${[3, 4, 5, 6, 8, 10].map(d => `<option value="${d}"${d === S.trip.minSize ? ' selected' : ''}>${d} 人</option>`).join('')}</select></div>
    </div>
    ${isOrg() ? '' : '<p class="sub">仅组织者（' + esc(mem(S.organizer).name) + '）可修改。右上角切换身份可体验。</p>'}
  </section>`;
}

function memberRow(m, mine) {
  const self = m.id === mine.id;
  return `<div class="li">
    ${avatar(m)}
    <div class="grow">
      <div class="t">${esc(m.name)} ${m.id === S.organizer ? '<span class="chip gold">组织者</span>' : ''}${self ? ' <span class="chip gray">我</span>' : ''}</div>
      <div class="sub">${esc(m.city)}出发 · 预算 ${yuan(m.budget)} · ${m.tags.map(esc).join(' / ') || '未选偏好'}</div>
    </div>
    <div class="row wr" style="justify-content:flex-end">
      ${m.paid ? '<span class="chip ok">已交定金</span>' : self ? `<button class="btn sm pri" data-act="payDeposit" data-id="${m.id}">交定金 ${yuan(S.trip.deposit)}</button>` : '<span class="chip warn">未交定金</span>'}
      ${self ? `<button class="btn sm" data-act="editMe">编辑</button>` : ''}
      ${isOrg() && m.id !== S.organizer ? `<button class="btn sm danger" data-act="removeMember" data-id="${m.id}">移出</button>` : ''}
    </div>
  </div>`;
}

function profileForm(m) {
  return `
    <div class="fld"><label for="p-name">昵称</label><input id="p-name" value="${esc(m.name)}" maxlength="8" required></div>
    <div class="two">
      <div class="fld"><label for="p-city">出发城市</label><select id="p-city">${cityOptions(m.city)}</select></div>
      <div class="fld"><label for="p-budget">总预算（元）</label><input id="p-budget" type="number" min="500" max="20000" step="100" value="${m.budget}"></div>
    </div>
    <div class="fld"><span>旅行偏好（可多选）</span>${tagPicker('p-tag', m.tags)}</div>`;
}
function readProfile(box) {
  const name = $('#p-name', box).value.trim();
  const budget = Number($('#p-budget', box).value);
  if (!name) { toast('请填写昵称'); return null; }
  if (!(budget >= 500)) { toast('预算至少 500 元'); return null; }
  return { name, city: $('#p-city', box).value, budget,
    tags: [...box.querySelectorAll('input[name=p-tag]:checked')].map(i => i.value) };
}

ACT.addMember = () => {
  const box = openModal(`<h2>邀请同学加入</h2>
    <p class="sub" style="margin-bottom:12px">真实场景里同学通过链接自己填写，这里用表单模拟。</p>
    ${profileForm({ name: '', city: '北京', budget: 2000, tags: [] })}
    <div class="acts"><button class="btn" data-act="closeModal">取消</button><button class="btn pri" id="ok">加入</button></div>`);
  $('#ok', box).onclick = () => {
    const p = readProfile(box);
    if (!p) return;
    addMember(p);
    closeModal();
    toast(`${p.name} 已加入，可在右上角切换到 TA`);
    render();
  };
};
ACT.editMe = () => {
  const m = me();
  const box = openModal(`<h2>编辑我的信息</h2>${profileForm(m)}
    <div class="acts"><button class="btn" data-act="closeModal">取消</button><button class="btn pri" id="ok">保存</button></div>`);
  $('#ok', box).onclick = () => {
    const p = readProfile(box);
    if (!p) return;
    Object.assign(m, p);
    save(); closeModal(); toast('已保存'); render();
  };
};
ACT.payDeposit = el => {
  const m = mem(el.dataset.id);
  m.paid = true; save();
  toast(`定金已收，${paidCount() >= S.trip.minSize ? '已达成团线' : '还差 ' + (S.trip.minSize - paidCount()) + ' 人'}`);
  render();
};
ACT.removeMember = el => {
  const m = mem(el.dataset.id);
  const used = S.expenses.some(e => e.payer === m.id || e.split.includes(m.id));
  if (used) { toast(`${m.name} 已参与记账，无法移出`); return; }
  if (!confirm(`确定把 ${m.name} 移出队伍？`)) return;
  S.members = S.members.filter(x => x.id !== m.id);
  Object.keys(S.votes).forEach(k => { S.votes[k] = S.votes[k].filter(v => v !== m.id); });
  if (S.me === m.id) S.me = S.organizer;
  save(); render();
};
ACT.invite = () => {
  const d = S.dest ? destOf(S.dest) : null;
  copyText(`【${S.trip.name}】\n${d ? '目的地：' + d.name : '目的地投票中'}，${S.trip.days} 天，成团线 ${S.trip.minSize} 人\n定金 ${S.trip.deposit} 元占位，先到先得。\n点链接加入：${location.href.split('#')[0]}`, '邀请文案已复制');
};
CHG.setDays = el => {
  S.trip.days = Number(el.value);
  S.plan = null; S.planLocked = false; S.start = null;
  save(); toast('天数已改，日期与行程需重新确定'); render();
};
CHG.setMin = el => { S.trip.minSize = Number(el.value); save(); render(); };
ACT.closeModal = closeModal;
