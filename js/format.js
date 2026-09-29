// Справочники, форматирование и выборки из состояния — общие для обоих интерфейсов.
import { icon } from './icons.js';

export const CATEGORIES = [
  { id: 'family', title: 'Семейные вопросы', hint: 'Развод, алименты, раздел имущества', icon: 'family' },
  { id: 'inherit', title: 'Наследство', hint: 'Вступление, завещание, споры', icon: 'key' },
  { id: 'realty', title: 'Недвижимость', hint: 'Сделки, регистрация, споры', icon: 'building' },
  { id: 'labor', title: 'Трудовые споры', hint: 'Увольнение, зарплата, компенсации', icon: 'badge' },
  { id: 'contracts', title: 'Договоры', hint: 'Составление, проверка, претензии', icon: 'pen' },
  { id: 'debts', title: 'Долги', hint: 'Взыскание, кредиты, банкротство', icon: 'wallet' },
  { id: 'court', title: 'Судебные споры', hint: 'Иски и представительство в суде', icon: 'landmark' },
  { id: 'consumer', title: 'Защита прав потребителей', hint: 'Возврат, гарантия, некачественные услуги', icon: 'bag' },
];
export const category = (id) => CATEGORIES.find((c) => c.id === id) || { id, title: 'Другое', hint: '', icon: 'file' };

export const CASE_STATUS = {
  new: { label: 'Новое', tone: 'blue' },
  review: { label: 'На рассмотрении', tone: 'slate' },
  work: { label: 'В работе', tone: 'navy' },
  docs: { label: 'Нужны документы', tone: 'amber' },
  court: { label: 'Ожидание суда', tone: 'violet' },
  done: { label: 'Завершено', tone: 'green' },
};
export const CASE_STATUS_ORDER = ['new', 'review', 'work', 'docs', 'court', 'done'];

export const REQ_STATUS = {
  new: { label: 'Новое', tone: 'blue' },
  review: { label: 'На рассмотрении', tone: 'slate' },
  info: { label: 'Нужна информация', tone: 'amber' },
  case: { label: 'Дело открыто', tone: 'navy' },
  closed: { label: 'Завершено', tone: 'green' },
};
// Клиент видит обращение проще: пока юрист изучает — «На рассмотрении».
export const REQ_STATUS_CLIENT = {
  new: { label: 'На рассмотрении', tone: 'slate' },
  review: { label: 'На рассмотрении', tone: 'slate' },
  info: { label: 'Нужны документы', tone: 'amber' },
  case: { label: 'Открыто дело', tone: 'navy' },
  closed: { label: 'Завершено', tone: 'green' },
};

export const DOC_STATUS = {
  requested: { label: 'Запрошен', tone: 'amber' },
  review: { label: 'На проверке', tone: 'blue' },
  accepted: { label: 'Принят', tone: 'green' },
  rejected: { label: 'Отклонён', tone: 'red' },
  ready: { label: 'От юриста', tone: 'navy' },
};
export const DOC_STATUS_CLIENT = {
  ...DOC_STATUS,
  requested: { label: 'Нужно загрузить', tone: 'amber' },
  rejected: { label: 'Нужна новая копия', tone: 'red' },
};

export const TASK_STATUS = {
  todo: { label: 'К выполнению', tone: 'slate' },
  progress: { label: 'В работе', tone: 'blue' },
  done: { label: 'Готово', tone: 'green' },
};

export const EVENT_TYPES = {
  consultation: { label: 'Консультация', tone: 'blue' },
  meeting: { label: 'Встреча', tone: 'navy' },
  court: { label: 'Судебное заседание', tone: 'violet' },
  date: { label: 'Важная дата', tone: 'slate' },
  deadline: { label: 'Срок подачи документов', tone: 'amber' },
};

export const TASK_TEMPLATES = ['Подготовить договор', 'Позвонить клиенту', 'Запросить документы', 'Подготовить иск', 'Проверить материалы'];

// ——— Текст и числа ———

export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function plural(n, one, few, many) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}

const nf = new Intl.NumberFormat('ru-RU');
export const money = (n) => `${nf.format(n)} ₽`;

export function fileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} МБ`;
}

export const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
export const shortName = (name = '') => {
  const [first, last] = name.split(' ');
  return last ? `${first[0]}. ${last}` : name;
};

// ——— Даты ———

const dtDay = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });
const dtDayShort = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });
const dtDayYear = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
const dtTime = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });
const dtWeekday = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' });
const dtWeekdayLong = new Intl.DateTimeFormat('ru-RU', { weekday: 'long' });
const dtMonth = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' });

export const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
export const dayDiff = (iso) => Math.round((startOfDay(iso) - startOfDay(Date.now())) / 864e5);
export const sameDay = (a, b) => startOfDay(a).getTime() === startOfDay(b).getTime();

export const fmtTime = (iso) => dtTime.format(new Date(iso));
export const fmtDate = (iso) => {
  const d = new Date(iso);
  return d.getFullYear() === new Date().getFullYear() ? dtDay.format(d) : dtDayYear.format(d);
};
export const fmtDateShort = (iso) => dtDayShort.format(new Date(iso)).replace('.', '');
export const fmtDateFull = (iso) => dtDayYear.format(new Date(iso));
export const fmtWeekday = (d) => dtWeekday.format(d);
export const fmtMonth = (d) => { const s = dtMonth.format(d).replace(' г.', ''); return s[0].toUpperCase() + s.slice(1); };

export function fmtDayLabel(iso) {
  const diff = dayDiff(iso);
  if (diff === 0) return 'Сегодня';
  if (diff === 1) return 'Завтра';
  if (diff === -1) return 'Вчера';
  const wd = dtWeekdayLong.format(new Date(iso));
  return `${fmtDate(iso)}, ${wd}`;
}

export function fmtWhen(iso) {
  const diff = dayDiff(iso);
  const t = fmtTime(iso);
  if (diff === 0) return `сегодня, ${t}`;
  if (diff === 1) return `завтра, ${t}`;
  if (diff === -1) return `вчера, ${t}`;
  return `${fmtDate(iso)}, ${t}`;
}

export function relTime(iso) {
  const sec = (Date.now() - new Date(iso).getTime()) / 1000;
  if (sec < 60) return 'только что';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} мин назад`;
  const diff = dayDiff(iso);
  if (diff === 0) return `сегодня, ${fmtTime(iso)}`;
  if (diff === -1) return `вчера, ${fmtTime(iso)}`;
  return fmtDate(iso);
}

export function deadlineText(iso) {
  if (!iso) return '—';
  const diff = dayDiff(iso);
  if (diff < 0) return `просрочено на ${-diff} ${plural(-diff, 'день', 'дня', 'дней')}`;
  if (diff === 0) return 'сегодня';
  if (diff === 1) return 'завтра';
  return `через ${diff} ${plural(diff, 'день', 'дня', 'дней')}`;
}

export const toDateInput = (d) => {
  const x = new Date(d);
  const pad = (v) => String(v).padStart(2, '0');
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
};

// ——— Маленькие элементы разметки ———

export const pill = (st, key) =>
  `<span class="pill pill--${st.tone}"${key ? ` data-k="${esc(key)}" data-v="${esc(st.label)}"` : ''}>${esc(st.label)}</span>`;

export function avatar(person, size = 'md') {
  if (!person) return `<span class="avatar avatar--${size} avatar--empty">${icon('user')}</span>`;
  const tone = person.tone || ((person.name || '').length % 3) + 4;
  return `<span class="avatar avatar--${size} avatar--t${tone}" aria-hidden="true">${esc(initials(person.name))}</span>`;
}

export function fileBadge(type) {
  const t = (type || '').toUpperCase();
  if (!t) return `<span class="fbadge fbadge--empty">${icon('upload')}</span>`;
  return `<span class="fbadge fbadge--${esc(type)}">${esc(t === 'JPEG' ? 'JPG' : t)}</span>`;
}

// Знак — папка-досье с ярлыком: всё по делу собрано в одном месте.
export const logoMark = (cls = '') =>
  `<svg class="logo-mark ${cls}" viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h7l2.5 3h11.5A1.5 1.5 0 0 1 28 11.5v13a1.5 1.5 0 0 1-1.5 1.5h-21A1.5 1.5 0 0 1 4 24.5Z"/><path d="M4 13.5h24"/><rect class="accent" x="10.5" y="17.5" width="11" height="4.5" rx=".6"/></svg>`;

export const logo = (withTagline = false) =>
  `<span class="logo">${logoMark()}<span class="logo__text"><span class="logo__name">Досье</span>${withTagline ? '<span class="logo__tag">Юридическая помощь в одном месте</span>' : ''}</span></span>`;

// ——— Выборки ———

export const byId = (list, id) => list.find((x) => x.id === id);
export const lawyer = (s, id) => byId(s.lawyers, id);
export const client = (s, id) => byId(s.clients, id);
export const caseOf = (s, id) => byId(s.cases, id);
export const requestOf = (s, id) => byId(s.requests, id);
export const newest = (a, b) => (b.at || b.createdAt || '').localeCompare(a.at || a.createdAt || '');

export function threadInfo(s, threadId) {
  const kase = s.cases.find((c) => c.threadId === threadId);
  const rq = s.requests.find((r) => r.threadId === threadId);
  const clientId = kase?.clientId || rq?.clientId;
  const lawyerId = kase?.lawyerId || rq?.lawyerId || null;
  return {
    threadId, kase, request: rq, clientId, lawyerId,
    title: kase ? kase.title : rq ? `Обращение №${rq.number}` : 'Переписка',
    subtitle: kase ? `Дело ${kase.number}` : rq ? category(rq.category).title : '',
  };
}

export const threadMessages = (s, threadId) =>
  s.messages.filter((m) => m.threadId === threadId).sort((a, b) => a.at.localeCompare(b.at));

export function threadsOfClient(s, clientId) {
  const ids = new Set(s.messages.filter((m) => m.clientId === clientId).map((m) => m.threadId));
  return [...ids]
    .map((t) => ({ ...threadInfo(s, t), last: threadMessages(s, t).at(-1) }))
    .filter((t) => t.last)
    .sort((a, b) => b.last.at.localeCompare(a.last.at));
}

export function allThreads(s) {
  const ids = new Set(s.messages.map((m) => m.threadId));
  return [...ids]
    .map((t) => {
      const msgs = threadMessages(s, t);
      const lastHuman = [...msgs].reverse().find((m) => m.from !== 'system');
      return {
        ...threadInfo(s, t),
        last: msgs.at(-1),
        unread: msgs.filter((m) => m.from === 'client' && !m.readByLawyer).length,
        awaiting: lastHuman?.from === 'client',
      };
    })
    .sort((a, b) => b.last.at.localeCompare(a.last.at));
}

export const clientUnread = (s, clientId) =>
  s.messages.filter((m) => m.clientId === clientId && m.from !== 'client' && !m.readByClient).length;

export const threadUnreadClient = (s, threadId) =>
  s.messages.filter((m) => m.threadId === threadId && m.from !== 'client' && !m.readByClient).length;

export const awaitingReply = (s) => allThreads(s).filter((t) => t.awaiting && t.unread > 0);

export const isOverdue = (inv) => inv.status === 'unpaid' && inv.dueAt && new Date(inv.dueAt) < new Date();
export const invoiceStatus = (inv) =>
  inv.status === 'paid' ? { label: 'Оплачен', tone: 'green' } : isOverdue(inv) ? { label: 'Просрочен', tone: 'red' } : { label: 'Ожидает оплаты', tone: 'amber' };

export const activeCases = (s, clientId) =>
  s.cases.filter((c) => (!clientId || c.clientId === clientId) && c.status !== 'done');

export const upcomingEvents = (s, filter = () => true) =>
  s.events.filter((e) => new Date(e.at).getTime() + (e.duration || 0) * 6e4 >= Date.now() - 36e5 && filter(e)).sort((a, b) => a.at.localeCompare(b.at));

// Строка обращения в CRM: статус с учётом открытого дела, группа фильтра, следующий шаг.
export function requestRow(s, r) {
  const kase = r.caseId ? caseOf(s, r.caseId) : null;
  const st = kase ? CASE_STATUS[kase.status] : REQ_STATUS[r.status];
  let group = 'work';
  if (r.status === 'new') group = 'new';
  if (r.status === 'info' || kase?.status === 'docs') group = 'info';
  if (r.status === 'closed' || kase?.status === 'done') group = 'done';
  let next = '—';
  if (r.status === 'new' && !r.lawyerId) next = 'Назначить юриста';
  else if (r.status === 'new' || r.status === 'review') next = 'Создать дело';
  else if (r.status === 'info') next = 'Ждём документы от клиента';
  else if (kase) {
    const task = s.tasks.filter((t) => t.caseId === kase.id && t.status !== 'done').sort((a, b) => a.due.localeCompare(b.due))[0];
    if (kase.status === 'done') next = 'Дело закрыто';
    else if (kase.status === 'docs') next = 'Ждём документы от клиента';
    else if (task) next = task.title;
    else {
      const cur = kase.timeline.find((x) => x.state === 'current');
      next = cur ? cur.note || `Этап: ${cur.title.toLowerCase()}` : 'Закрыть дело';
    }
  } else if (r.status === 'closed') next = 'Консультация проведена';
  return { r, kase, st, group, next, lawyerId: kase?.lawyerId || r.lawyerId };
}
