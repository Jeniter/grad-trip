// 状态与持久化（localStorage），所有数据只在本机
const KEY = 'gradtrip.v1';
const COLORS = ['#3b5bdb', '#e8590c', '#2b8a5e', '#c2255c', '#7048e8', '#0c8599', '#d9480f', '#5c940d'];
const WD = ['日', '一', '二', '三', '四', '五', '六'];
const uid = () => Math.random().toString(36).slice(2, 8);
const pad = n => String(n).padStart(2, '0');
const dkey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return dkey(d); };
const dlabel = k => { const d = parseKey(k); return `${d.getMonth() + 1}/${d.getDate()} 周${WD[d.getDay()]}`; };

function seed() {
  const start = addDays(dkey(new Date()), 10);
  let i = 0;
  const mk = (name, city, budget, tags, free, paid) => ({
    id: 'u' + (++i), name, city, budget, tags, paid,
    free: free.map(n => addDays(start, n)), color: COLORS[(i - 1) % COLORS.length],
  });
  const R = (a, b) => Array.from({ length: b - a + 1 }, (_, k) => a + k);
  const members = [
    mk('林小满', '北京', 2500, ['美食', '拍照', '轻松'], R(2, 9), true),
    mk('周子豪', '上海', 3000, ['海边', '特种兵', '都市'], [...R(3, 8), 12, 13], true),
    mk('陈雨桐', '成都', 2000, ['美食', '古城', '轻松'], R(0, 8), true),
    mk('王可', '武汉', 1800, ['山野', '古城'], R(4, 11), true),
    mk('李思远', '广州', 3500, ['海边', '拍照'], R(3, 10), true),
    mk('赵一鸣', '杭州', 2200, ['美食', '都市'], [...R(2, 6), 9, 10, 11], false),
    mk('张若晴', '西安', 1500, ['古城', '特种兵'], R(4, 10), false),
    mk('刘嘉怡', '长沙', 2400, ['美食', '拍照', '轻松'], R(1, 8), false),
  ];
  const all = members.map(m => m.id);
  return {
    v: 1, me: 'u1', organizer: 'u1',
    trip: { name: `${new Date().getFullYear()} 毕业旅行 · 同学拼团`, days: 4, deposit: 200, minSize: 6, winStart: start, winLen: 14 },
    members,
    votes: { xm: ['u1', 'u5', 'u8'], dl: ['u3', 'u4'], xa: ['u7'], qd: ['u2'] },
    dest: null, start: null, plan: null, planLocked: false,
    expenses: [
      { id: uid(), title: '民宿定金', cents: 80000, payer: 'u1', split: all, cat: '住宿' },
      { id: uid(), title: '毕业 T 恤定制', cents: 24000, payer: 'u2', split: all, cat: '其他' },
      { id: uid(), title: '包车预订', cents: 36000, payer: 'u3', split: all.slice(0, 6), cat: '交通' },
    ],
    settles: [],
  };
}

let S = load();
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const s = JSON.parse(raw); if (s && s.v === 1 && s.members) return s; }
  } catch (e) { /* 存储不可用时退回内存态 */ }
  return seed();
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* 忽略 */ } }
function resetAll() { S = seed(); save(); }

const mem = id => S.members.find(m => m.id === id);
const me = () => mem(S.me) || S.members[0];
const isOrg = () => S.me === S.organizer;
const destOf = id => DESTS.find(d => d.id === id);
const paidCount = () => S.members.filter(m => m.paid).length;
const tripDates = () => S.start ? Array.from({ length: S.trip.days }, (_, k) => addDays(S.start, k)) : [];

function genPlan(destId, days) {
  const T = destOf(destId).days;
  const mids = T.slice(0, -1);
  const free = [['09:30', '自由活动，按兴趣分组', 50], ['19:00', '集体晚餐 + 毕业回忆夜', 80]];
  const out = [];
  for (let i = 0; i < days - 1; i++) out.push(mids[i] || free);
  out.push(T[T.length - 1]);
  return out.map(day => day.map(([time, text, cost]) => ({ id: uid(), time, text, cost })));
}

function addMember(p) {
  const id = 'u' + uid();
  S.members.push({ id, name: p.name, city: p.city, budget: p.budget, tags: p.tags, paid: false,
    free: [], color: COLORS[S.members.length % COLORS.length] });
  save();
  return id;
}
