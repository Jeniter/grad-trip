// 纯计算：交通估价、目的地匹配、日期窗口、费用分摊
const rad = x => x * Math.PI / 180;
function distKm(a, b) {
  const dLat = rad(b[0] - a[0]), dLon = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
const round10 = n => Math.round(n / 10) * 10;

// 往返交通：1200km 内按学生票高铁，超过按特价机票，同城忽略
function transport(city, d) {
  const km = distKm(CITIES[city] || CITIES['北京'], d.geo);
  if (km < 60) return { cost: 0, mode: '本地', km };
  if (km <= 1200) return { cost: round10(km * 0.38 * 2), mode: '高铁', km };
  return { cost: round10((220 + km * 0.2) * 2), mode: '飞机', km };
}
const lodging = d => round10(d.daily * 0.45); // 每晚住宿占日均花费的比例

function memberCost(m, d) {
  const t = transport(m.city, d);
  return { ...t, stay: d.daily * S.trip.days, total: t.cost + d.daily * S.trip.days };
}

// 目的地匹配分 = 预算 50 + 兴趣 30 + 票数 20，三项都可解释
function destStats(d) {
  const n = S.members.length || 1;
  const rows = S.members.map(m => ({ m, ...memberCost(m, d) }));
  const ok = rows.filter(r => r.total <= r.m.budget).length;
  const likes = S.members.filter(m => m.tags.some(t => d.tags.includes(t))).length;
  const votes = (S.votes[d.id] || []).length;
  const avg = rows.reduce((s, r) => s + r.total, 0) / n;
  return { rows, ok, likes, votes, avg, n,
    score: Math.round(ok / n * 50 + likes / n * 30 + Math.min(votes / n * 2, 1) * 20) };
}
const votesUsed = id => Object.values(S.votes).filter(v => v.includes(id)).length;

// 行程预估：往返交通 + 住宿 + 行程里的活动/餐饮
const planSum = () => (S.plan || []).flat().reduce((s, it) => s + (Number(it.cost) || 0), 0);
function planCostFor(m) {
  const d = destOf(S.dest);
  return transport(m.city, d).cost + lodging(d) * (S.trip.days - 1) + planSum();
}

// 在候选日期里滑窗，找到能到场人数最多的连续 N 天
function windows() {
  const N = S.trip.days;
  const days = Array.from({ length: S.trip.winLen }, (_, k) => addDays(S.trip.winStart, k));
  const out = [];
  for (let s = 0; s + N <= days.length; s++) {
    const span = days.slice(s, s + N);
    const ok = S.members.filter(m => span.every(d => m.free.includes(d)));
    out.push({ start: span[0], end: span[N - 1], ok, miss: S.members.filter(m => !ok.includes(m)) });
  }
  return out.sort((a, b) => b.ok.length - a.ok.length || (a.start < b.start ? -1 : 1));
}

// 金额统一用「分」做整数运算，避免浮点误差
const toCents = v => Math.round(Number(v) * 100);
function balances() {
  const b = Object.fromEntries(S.members.map(m => [m.id, 0]));
  S.expenses.forEach(e => {
    const base = Math.floor(e.cents / e.split.length), rest = e.cents - base * e.split.length;
    b[e.payer] += e.cents;
    e.split.forEach((id, i) => { b[id] -= base + (i < rest ? 1 : 0); });
  });
  S.settles.forEach(s => { b[s.from] += s.cents; b[s.to] -= s.cents; });
  return b;
}
// 贪心配对，转账笔数最多 n-1 笔
function transfers() {
  const b = balances();
  const owe = [], get = [];
  Object.entries(b).forEach(([id, c]) => { if (c < 0) owe.push([id, -c]); else if (c > 0) get.push([id, c]); });
  owe.sort((x, y) => y[1] - x[1]); get.sort((x, y) => y[1] - x[1]);
  const out = [];
  let i = 0, j = 0;
  while (i < owe.length && j < get.length) {
    const pay = Math.min(owe[i][1], get[j][1]);
    out.push({ from: owe[i][0], to: get[j][0], cents: pay });
    owe[i][1] -= pay; get[j][1] -= pay;
    if (!owe[i][1]) i++;
    if (!get[j][1]) j++;
  }
  return out;
}
const totalCents = () => S.expenses.reduce((s, e) => s + e.cents, 0);
