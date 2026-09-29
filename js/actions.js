// Бизнес-действия сервиса. Каждое действие меняет общее состояние и оставляет
// следы для второй стороны: системное сообщение в чате, уведомление клиенту,
// запись в ленте юристов, строку в истории дела.
import { mutate } from './store.js';
import { CASE_STATUS, category, lawyer, client, caseOf, requestOf, money, fmtWhen, EVENT_TYPES, shortName } from './format.js';

export const uid = (p) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const now = () => new Date().toISOString();

function message(s, { threadId, clientId, from, text, lawyerId = null, docId = null, kind = null }) {
  const m = {
    id: uid('m'), threadId, clientId, from, lawyerId, text, docId, kind, at: now(),
    readByClient: from === 'client',
    readByLawyer: from !== 'client',
  };
  s.messages.push(m);
  return m;
}

function notify(s, clientId, kind, title, text, link) {
  s.notifications.push({ id: uid('n'), clientId, kind, title, text, link, at: now(), read: false });
}

function feed(s, kind, text, link) {
  s.feed.push({ id: uid('f'), kind, text, link, at: now(), read: false });
}

function touch(kase, text) {
  kase.updatedAt = now();
  if (text) kase.activity.push({ id: uid('a'), at: now(), text });
}

const threadOf = (s, { caseId, requestId }) => (caseId ? caseOf(s, caseId)?.threadId : requestOf(s, requestId)?.threadId);
const linkOf = ({ caseId, requestId }, side, tab = '') =>
  side === 'client' ? (caseId ? `#/c/case/${caseId}` : `#/c/request/${requestId}`) : caseId ? `#/l/case/${caseId}${tab ? `/${tab}` : ''}` : `#/l/request/${requestId}`;
const titleOf = (s, { caseId, requestId }) => (caseId ? `«${caseOf(s, caseId).title}»` : `обращение №${requestOf(s, requestId).number}`);

function docRecord(s, file, base) {
  const d = {
    id: uid('d'), name: file.name, type: file.type, size: file.size, thumb: file.thumb || null,
    clientId: base.clientId, caseId: base.caseId || null, requestId: base.requestId || null,
    by: base.by, lawyerId: base.lawyerId || null, at: now(), status: base.status, comment: base.comment || '', requestedAt: null,
  };
  s.documents.push(d);
  return d;
}

// ——— Клиент ———

export function submitRequest({ category: cat, description, files, contact }) {
  return mutate((s) => {
    const me = client(s, s.me.clientId);
    Object.assign(me, { name: contact.name, phone: contact.phone, email: contact.email });
    const number = s.seq.request++;
    const r = {
      id: `r${number}`, number, clientId: me.id, category: cat, description, createdAt: now(),
      status: 'new', lawyerId: null, caseId: null, threadId: `t${number}`, source: 'Клиентский кабинет',
    };
    s.requests.push(r);
    message(s, { threadId: r.threadId, clientId: me.id, from: 'system', kind: 'request', text: `Обращение №${number} принято. Юрист изучит информацию и свяжется с вами.` }).readByClient = true;
    for (const f of files) docRecord(s, f, { clientId: me.id, requestId: r.id, by: 'client', status: 'review' });
    feed(s, 'request', `Новое обращение №${number} — ${me.name}`, `#/l/request/${r.id}`);
    return r;
  });
}

export function uploadDocuments({ files, caseId = null, requestId = null, fulfillId = null, asMessage = false }) {
  return mutate((s) => {
    const me = client(s, s.me.clientId);
    const threadId = threadOf(s, { caseId, requestId });
    const added = [];
    files.forEach((f, i) => {
      let d;
      const target = i === 0 && fulfillId ? s.documents.find((x) => x.id === fulfillId) : null;
      if (target) {
        // Запрошенный документ: сохраняем название из запроса, добавляем файл.
        const ext = f.type;
        Object.assign(target, {
          name: target.name.includes('.') ? f.name : `${target.name}.${ext}`,
          type: ext, size: f.size, thumb: f.thumb || null, at: now(), status: 'review', by: 'client',
        });
        d = target;
      } else {
        d = docRecord(s, f, { clientId: me.id, caseId, requestId, by: 'client', status: 'review' });
      }
      added.push(d);
      if (threadId && asMessage) message(s, { threadId, clientId: me.id, from: 'client', docId: d.id, text: '' });
      else if (threadId) message(s, { threadId, clientId: me.id, from: 'system', kind: 'doc', docId: d.id, text: `Документ загружен: ${d.name}` }).readByClient = true;
      const kase = caseId && caseOf(s, caseId);
      if (kase) touch(kase, `Клиент загрузил документ «${d.name}»`);
      feed(s, 'doc', `${shortName(me.name)} загрузила «${d.name}»`, linkOf({ caseId, requestId }, 'lawyer', 'docs'));
    });
    return added;
  });
}

export function askLawyerForDocument({ caseId, requestId, name, comment }) {
  return mutate((s) => {
    const me = client(s, s.me.clientId);
    const threadId = threadOf(s, { caseId, requestId });
    message(s, { threadId, clientId: me.id, from: 'client', kind: 'docAsk', text: `Прошу подготовить документ: ${name}${comment ? `. ${comment}` : ''}` });
    feed(s, 'docAsk', `${shortName(me.name)} запросила документ «${name}»`, `#/l/messages/${threadId}`);
    if (caseId) touch(caseOf(s, caseId), `Клиент запросил документ «${name}»`);
  });
}

export function sendClientMessage({ threadId, text, docId = null }) {
  return mutate((s) => {
    const me = client(s, s.me.clientId);
    message(s, { threadId, clientId: me.id, from: 'client', text, docId });
    feed(s, 'message', `Сообщение от ${me.name}`, `#/l/messages/${threadId}`);
    const kase = s.cases.find((c) => c.threadId === threadId);
    if (kase) kase.updatedAt = now();
  });
}

export function markThreadReadByClient(threadId) {
  mutate((s) => {
    s.messages.forEach((m) => { if (m.threadId === threadId) m.readByClient = true; });
    s.notifications.forEach((n) => { if (n.clientId === s.me.clientId && n.kind === 'message' && n.link?.endsWith(threadId)) n.read = true; });
  });
}

export function markNotificationsRead() {
  mutate((s) => s.notifications.forEach((n) => { if (n.clientId === s.me.clientId) n.read = true; }));
}

export function payInvoice(id, method) {
  mutate((s) => {
    const inv = s.invoices.find((x) => x.id === id);
    inv.status = 'paid';
    inv.paidAt = now();
    inv.method = method;
    const c = client(s, inv.clientId);
    feed(s, 'payment', `Оплачен счёт ${inv.number}: ${money(inv.amount)} — ${c.name}`, '#/l/payments');
    notify(s, inv.clientId, 'invoice', 'Оплата получена', `${inv.service} — ${money(inv.amount)}`, '#/c/payments');
    const kase = inv.caseId && caseOf(s, inv.caseId);
    if (kase) touch(kase, `Клиент оплатил счёт ${inv.number}`);
  });
}

export function updateClientProfile(data) {
  mutate((s) => Object.assign(client(s, s.me.clientId), data));
}

// ——— Юрист ———

export function assignLawyer(requestId, lawyerId) {
  mutate((s) => {
    const r = requestOf(s, requestId);
    const l = lawyer(s, lawyerId);
    r.lawyerId = lawyerId;
    if (r.status === 'new') r.status = 'review';
    message(s, { threadId: r.threadId, clientId: r.clientId, from: 'system', kind: 'assign', text: `Ответственный юрист: ${l.name}` });
    notify(s, r.clientId, 'assign', 'Юрист изучает обращение', `№${r.number}: ответственный юрист — ${l.name}`, `#/c/request/${r.id}`);
    if (r.caseId) {
      const kase = caseOf(s, r.caseId);
      kase.lawyerId = lawyerId;
      touch(kase, `Ответственный юрист: ${l.name}`);
    }
  });
}

export function setCaseLawyer(caseId, lawyerId) {
  mutate((s) => {
    const kase = caseOf(s, caseId);
    const l = lawyer(s, lawyerId);
    kase.lawyerId = lawyerId;
    touch(kase, `Ответственный юрист: ${l.name}`);
    message(s, { threadId: kase.threadId, clientId: kase.clientId, from: 'system', kind: 'assign', text: `Ответственный юрист: ${l.name}` });
  });
}

export function createCase(requestId, { title, deadline, lawyerId, summary }) {
  return mutate((s) => {
    const r = requestOf(s, requestId);
    const l = lawyer(s, lawyerId || r.lawyerId || s.me.lawyerId);
    const number = `Д-26/${String(s.seq.case++).padStart(3, '0')}`;
    const kase = {
      id: uid('k'), number, title, category: r.category, clientId: r.clientId, lawyerId: l.id,
      status: 'review', openedAt: now(), deadline: deadline || null, updatedAt: now(), requestId: r.id, threadId: r.threadId,
      summary: summary || r.description,
      timeline: [
        { id: uid('st'), title: 'Обращение принято', state: 'done', at: r.createdAt, note: '' },
        { id: uid('st'), title: 'Документы получены', state: 'current', at: null, note: '' },
        { id: uid('st'), title: 'Юрист изучил ситуацию', state: 'upcoming', at: null, note: '' },
        { id: uid('st'), title: 'Подготовлены документы', state: 'upcoming', at: null, note: '' },
        { id: uid('st'), title: 'Следующий этап', state: 'upcoming', at: null, note: 'Определим после изучения документов' },
      ],
      activity: [{ id: uid('a'), at: now(), text: `Дело открыто по обращению №${r.number}` }],
    };
    s.cases.push(kase);
    r.caseId = kase.id;
    r.status = 'case';
    r.lawyerId = l.id;
    s.documents.forEach((d) => { if (d.requestId === r.id) d.caseId = kase.id; });
    message(s, { threadId: r.threadId, clientId: r.clientId, from: 'system', kind: 'case', text: `Открыто дело ${number} «${title}». Ответственный юрист — ${l.name}` });
    notify(s, r.clientId, 'case', 'Открыто дело', `${number} «${title}» · ${l.name}`, `#/c/case/${kase.id}`);
    return kase;
  });
}

export function requestDocument({ caseId = null, requestId = null, name, comment, setStatus = true }) {
  mutate((s) => {
    const kase = caseId && caseOf(s, caseId);
    const r = requestId && requestOf(s, requestId);
    const clientId = kase?.clientId || r.clientId;
    const d = {
      id: uid('d'), name, type: null, size: 0, thumb: null, clientId, caseId, requestId, by: 'client', lawyerId: s.me.lawyerId,
      at: now(), status: 'requested', comment: comment || '', requestedAt: now(),
    };
    s.documents.push(d);
    const threadId = kase?.threadId || r.threadId;
    message(s, { threadId, clientId, from: 'system', kind: 'docRequest', text: `Юрист запросил дополнительный документ: ${name}` });
    notify(s, clientId, 'docs', 'Необходимо загрузить документ', `${name} — ${titleOf(s, { caseId, requestId })}`, '#/c/docs');
    if (kase) {
      touch(kase, `Запрошен документ «${name}»`);
      if (setStatus && kase.status !== 'docs') changeStatusIn(s, kase, 'docs');
    } else if (r && r.status !== 'case') {
      r.status = 'info';
    }
  });
}

function changeStatusIn(s, kase, status) {
  kase.status = status;
  touch(kase, `Статус изменён: ${CASE_STATUS[status].label}`);
  message(s, { threadId: kase.threadId, clientId: kase.clientId, from: 'system', kind: 'status', text: `Статус дела изменён: ${CASE_STATUS[status].label}` });
  if (status === 'done') kase.timeline.forEach((t) => { if (t.state !== 'done') { t.state = 'done'; t.at = now(); } });
  notify(s, kase.clientId, 'status', 'Изменился статус дела', `«${kase.title}»: ${CASE_STATUS[status].label}`, `#/c/case/${kase.id}`);
}

export function changeCaseStatus(caseId, status) {
  mutate((s) => changeStatusIn(s, caseOf(s, caseId), status));
}

export function reviewDocument(docId, verdict, reason = '') {
  mutate((s) => {
    const d = s.documents.find((x) => x.id === docId);
    d.status = verdict;
    d.reviewedAt = now();
    if (reason) d.comment = reason;
    const kase = d.caseId && caseOf(s, d.caseId);
    const threadId = kase?.threadId || (d.requestId && requestOf(s, d.requestId)?.threadId);
    if (verdict === 'accepted') {
      if (threadId) message(s, { threadId, clientId: d.clientId, from: 'system', kind: 'doc', text: `Документ проверен и принят: ${d.name}` });
      if (kase) {
        touch(kase, `Документ «${d.name}» принят`);
        // Все запрошенные документы получены — этап «Документы получены» закрывается сам.
        const stage = kase.timeline.find((t) => t.state === 'current');
        const pending = s.documents.some((x) => x.caseId === kase.id && (x.status === 'requested' || x.status === 'review'));
        if (stage && stage.title === 'Документы получены' && !pending) advanceIn(s, kase);
      }
    } else {
      if (threadId) message(s, { threadId, clientId: d.clientId, from: 'system', kind: 'doc', text: `Нужна новая копия документа: ${d.name}${reason ? `. ${reason}` : ''}` });
      notify(s, d.clientId, 'docs', 'Нужна новая копия документа', `${d.name}${reason ? ` — ${reason}` : ''}`, '#/c/docs');
      if (kase) touch(kase, `Документ «${d.name}» отклонён`);
    }
  });
}

function advanceIn(s, kase) {
  const i = kase.timeline.findIndex((t) => t.state === 'current');
  if (i < 0) return;
  const cur = kase.timeline[i];
  cur.state = 'done';
  cur.at = now();
  const next = kase.timeline[i + 1];
  if (next) next.state = 'current';
  touch(kase, `Этап «${cur.title}» завершён`);
  message(s, { threadId: kase.threadId, clientId: kase.clientId, from: 'system', kind: 'timeline', text: `Этап завершён: ${cur.title}` });
  notify(s, kase.clientId, 'timeline', 'Обновлён ход дела', `«${kase.title}»: ${cur.title}${next ? ` → ${next.title}` : ''}`, `#/c/case/${kase.id}`);
}

export function advanceTimeline(caseId) {
  mutate((s) => advanceIn(s, caseOf(s, caseId)));
}

export function updateStageNote(caseId, stageId, note) {
  mutate((s) => {
    const kase = caseOf(s, caseId);
    const st = kase.timeline.find((t) => t.id === stageId);
    st.note = note;
    touch(kase, `Обновлён этап «${st.title}»`);
  });
}

export function sendLawyerMessage({ threadId, text, docId = null }) {
  mutate((s) => {
    const l = lawyer(s, s.me.lawyerId);
    const m = s.messages.find((x) => x.threadId === threadId);
    message(s, { threadId, clientId: m.clientId, from: 'lawyer', lawyerId: l.id, text, docId });
    s.messages.forEach((x) => { if (x.threadId === threadId) x.readByLawyer = true; });
    const preview = text.length > 70 ? `${text.slice(0, 70)}…` : text;
    notify(s, m.clientId, 'message', 'Юрист ответил на сообщение', `${l.name}: ${preview}`, `#/c/chat/${threadId}`);
    const kase = s.cases.find((c) => c.threadId === threadId);
    if (kase) kase.updatedAt = now();
  });
}

export function markThreadReadByLawyer(threadId) {
  mutate((s) => {
    s.messages.forEach((m) => { if (m.threadId === threadId) m.readByLawyer = true; });
    s.feed.forEach((f) => { if (f.link?.endsWith(threadId)) f.read = true; });
  });
}

export function uploadForClient({ files, caseId = null, requestId = null }) {
  mutate((s) => {
    const kase = caseId && caseOf(s, caseId);
    const r = !kase && requestOf(s, requestId);
    const clientId = kase?.clientId || r.clientId;
    const threadId = kase?.threadId || r.threadId;
    const l = lawyer(s, s.me.lawyerId);
    for (const f of files) {
      const d = docRecord(s, f, { clientId, caseId, requestId, by: 'lawyer', lawyerId: l.id, status: 'ready' });
      message(s, { threadId, clientId, from: 'system', kind: 'doc', docId: d.id, text: `Юрист загрузил документ: ${d.name}` });
      notify(s, clientId, 'docs', 'Юрист подготовил документ', `${d.name} — ${titleOf(s, { caseId, requestId })}`, '#/c/docs');
      if (kase) touch(kase, `Юрист загрузил документ «${d.name}»`);
    }
  });
}

export function addTask({ caseId, title, assigneeId, due }) {
  mutate((s) => {
    s.tasks.push({ id: uid('tk'), caseId, title, assigneeId, due, status: 'todo', createdAt: now() });
    const kase = caseOf(s, caseId);
    if (kase) touch(kase, `Создана задача «${title}»`);
  });
}

export function setTaskStatus(id, status) {
  mutate((s) => {
    const t = s.tasks.find((x) => x.id === id);
    t.status = status;
    const kase = caseOf(s, t.caseId);
    if (kase && status === 'done') touch(kase, `Задача выполнена: «${t.title}»`);
  });
}

export function addEvent(ev) {
  mutate((s) => {
    const e = { id: uid('e'), duration: 60, ...ev };
    s.events.push(e);
    if (e.clientId) {
      const type = EVENT_TYPES[e.type].label;
      notify(s, e.clientId, 'event', `Запланировано: ${type.toLowerCase()}`, `${e.title} — ${fmtWhen(e.at)}`, '#/c/calendar');
      const kase = e.caseId && caseOf(s, e.caseId);
      if (kase) {
        touch(kase, `Запланировано: ${e.title}`);
        message(s, { threadId: kase.threadId, clientId: kase.clientId, from: 'system', kind: 'event', text: `${type}: ${e.title}, ${fmtWhen(e.at)}` });
      }
    }
  });
}

export function createInvoice({ clientId, caseId, service, amount, dueAt }) {
  mutate((s) => {
    const inv = { id: uid('i'), number: `С-0${s.seq.invoice++}`, clientId, caseId: caseId || null, service, amount, issuedAt: now(), dueAt, status: 'unpaid', paidAt: null };
    s.invoices.push(inv);
    notify(s, clientId, 'invoice', 'Выставлен счёт', `${service} — ${money(amount)}`, '#/c/payments');
    const kase = caseId && caseOf(s, caseId);
    if (kase) touch(kase, `Выставлен счёт ${inv.number} на ${money(amount)}`);
  });
}

export function markInvoicePaid(id) {
  mutate((s) => {
    const inv = s.invoices.find((x) => x.id === id);
    inv.status = 'paid';
    inv.paidAt = now();
    inv.method = 'Отмечено вручную';
    notify(s, inv.clientId, 'invoice', 'Оплата получена', `${inv.service} — ${money(inv.amount)}`, '#/c/payments');
  });
}

export function closeRequest(requestId) {
  mutate((s) => {
    const r = requestOf(s, requestId);
    r.status = 'closed';
    message(s, { threadId: r.threadId, clientId: r.clientId, from: 'system', kind: 'status', text: `Обращение №${r.number} закрыто` });
    notify(s, r.clientId, 'status', 'Обращение закрыто', `№${r.number} · ${category(r.category).title}`, `#/c/request/${r.id}`);
  });
}

export function markFeedRead() {
  mutate((s) => s.feed.forEach((f) => { f.read = true; }));
}

export function setCurrentLawyer(id) {
  mutate((s) => { s.me.lawyerId = id; });
}

export function saveCompany(data) {
  mutate((s) => Object.assign(s.company, data));
}

