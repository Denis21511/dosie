// Панель юриста: рабочее место с боковым меню, таблицами и карточками.
import { getState, reset } from './store.js';
import * as A from './actions.js';
import { icon } from './icons.js';
import { ui, actions, forms, uploads, go, rerender, toast, draft, ACCEPT } from './ui.js';
import {
  CATEGORIES, category, CASE_STATUS, CASE_STATUS_ORDER, REQ_STATUS, DOC_STATUS, TASK_STATUS, EVENT_TYPES, TASK_TEMPLATES,
  esc, money, plural, fileSize, fmtDate, fmtDateShort, fmtTime, fmtWhen, fmtDayLabel, fmtMonth, fmtWeekday, relTime, deadlineText, dayDiff,
  startOfDay, sameDay, toDateInput, pill, avatar, fileBadge, logo, lawyer, client, caseOf, requestOf, byId, newest,
  threadInfo, threadMessages, allThreads, awaitingReply, upcomingEvents, invoiceStatus, isOverdue, requestRow,
} from './format.js';
import { timeline, chatMessages, empty, docPreview } from './parts.js';
import { composer } from './client.js';

const NAV = [
  ['overview', 'Обзор', 'grid'],
  ['requests', 'Новые обращения', 'inbox'],
  ['clients', 'Клиенты', 'users'],
  ['cases', 'Дела', 'briefcase'],
  ['docs', 'Документы', 'files'],
  ['calendar', 'Календарь', 'calendar'],
  ['messages', 'Сообщения', 'chat'],
  ['payments', 'Оплаты', 'card'],
  ['settings', 'Настройки', 'sliders'],
];

export function renderPanel(route) {
  const s = getState();
  const me = lawyer(s, s.me.lawyerId);
  const [section = 'overview', id, sub] = route;
  const views = {
    overview, requests, request: requestDetail, clients, client: clientDetail, cases, case: caseDetail,
    docs, calendar, messages, payments, settings,
  };
  const v = (views[section] || overview)(s, me, id, sub);
  return `<div class="p-app${ui.navOpen ? ' nav-open' : ''}">
    ${sidebar(s, v.nav || section)}
    <div class="p-main">
      ${topbar(s, me)}
      <main class="p-content${v.full ? ' p-content--full' : ''}" data-section="${section}">${v.html}</main>
    </div>
    <div class="p-scrim" data-act="l.nav"></div>
  </div>${modal(s, me)}`;
}

function sidebar(s, active) {
  const counts = {
    requests: s.requests.filter((r) => r.status === 'new').length,
    docs: s.documents.filter((d) => d.status === 'review').length,
    messages: awaitingReply(s).length,
  };
  return `<aside class="p-side" aria-label="Навигация">
    <a class="p-side__logo" href="#/l/overview">${logo()}<span class="p-side__tag">Рабочее место</span></a>
    <nav class="p-nav">${NAV.map(([id, label, ic]) => `
      <a href="#/l/${id}" class="${active === id ? 'is-active' : ''}"${active === id ? ' aria-current="page"' : ''} title="${label}">
        ${icon(ic)}<span class="p-nav__label">${label}</span>
        ${counts[id] ? `<span class="p-nav__count" data-k="nav:${id}" data-v="${counts[id]}">${counts[id]}</span>` : ''}
      </a>`).join('')}
    </nav>
    <div class="p-side__foot">
      <a href="#/c/home" title="Клиентский кабинет">${icon('smartphone')}<span class="p-nav__label">Клиентский кабинет</span></a>
      <a href="#/demo" title="Демо-режим">${icon('columns')}<span class="p-nav__label">Демо: оба экрана</span></a>
    </div>
  </aside>`;
}

function topbar(s, me) {
  const q = draft('search').trim().toLowerCase();
  let results = '';
  if (q.length >= 2) {
    const hit = (t) => t.toLowerCase().includes(q);
    const rs = [
      ...s.clients.filter((c) => hit(c.name) || hit(c.phone) || hit(c.email) || hit(c.company || '')).map((c) => [`#/l/client/${c.id}`, 'user', c.name, 'Клиент']),
      ...s.cases.filter((c) => hit(c.title) || hit(c.number)).map((c) => [`#/l/case/${c.id}`, 'briefcase', c.title, `Дело ${c.number}`]),
      ...s.requests.filter((r) => hit(String(r.number)) || hit(r.description)).map((r) => [`#/l/request/${r.id}`, 'inbox', `Обращение №${r.number}`, client(s, r.clientId).name]),
    ].slice(0, 8);
    results = `<div class="search-pop" data-popover>${rs.map(([href, ic, t, sub]) => `<a href="${href}" data-act="l.searchGo">${icon(ic)}<span><b>${esc(t)}</b><small>${esc(sub)}</small></span></a>`).join('') || '<p class="muted pad">Ничего не найдено</p>'}</div>`;
  }
  const unreadFeed = s.feed.filter((f) => !f.read).length;
  const feedPop = ui.popover === 'feed' ? `<div class="pop pop--feed" data-popover>
      <div class="pop__head"><b>Уведомления</b>${unreadFeed ? '<button class="link-btn" data-act="l.feedRead">Отметить прочитанными</button>' : ''}</div>
      <div class="pop__list">${[...s.feed].sort(newest).slice(0, 12).map((f) => `<a href="${f.link}" class="feed-item${f.read ? '' : ' is-new'}" data-act="l.popGo">${icon(FEED_ICON[f.kind] || 'bell')}<span><span>${esc(f.text)}</span><small>${relTime(f.at)}</small></span></a>`).join('')}</div>
    </div>` : '';
  const mePop = ui.popover === 'me' ? `<div class="pop pop--me" data-popover>
      <div class="pop__head"><b>Войти как</b></div>
      ${s.lawyers.map((l) => `<button class="pop__row${l.id === me.id ? ' is-active' : ''}" data-act="l.switchLawyer" data-id="${l.id}">${avatar(l, 'sm')}<span><b>${esc(l.name)}</b><small>${esc(l.role)}</small></span>${l.id === me.id ? icon('check') : ''}</button>`).join('')}
    </div>` : '';
  return `<header class="p-top">
    <button class="icon-btn p-top__menu" data-act="l.nav" aria-label="Меню">${icon('menu')}</button>
    <div class="search">
      ${icon('search')}
      <input id="p-search" type="search" placeholder="Поиск клиентов, дел, обращений" data-draft="search" data-live value="${esc(draft('search'))}" autocomplete="off" aria-label="Поиск">
      ${results}
    </div>
    <div class="p-top__right">
      <div class="pop-wrap">
        <button class="icon-btn" data-act="l.pop" data-pop="feed" aria-label="Уведомления">${icon('bell')}${unreadFeed ? `<span class="badge" data-k="feed" data-v="${unreadFeed}">${unreadFeed}</span>` : ''}</button>
        ${feedPop}
      </div>
      <div class="pop-wrap">
        <button class="me-btn" data-act="l.pop" data-pop="me">${avatar(me, 'sm')}<span><b>${esc(me.name)}</b><small>${esc(me.role)}</small></span>${icon('down')}</button>
        ${mePop}
      </div>
    </div>
  </header>`;
}

const FEED_ICON = { request: 'inbox', message: 'chat', doc: 'fileText', docAsk: 'file', payment: 'card' };

const pageHead = (title, sub = '', right = '', crumbs = '') => `
  <div class="p-head">
    <div>${crumbs ? `<div class="crumbs">${crumbs}</div>` : ''}<h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>
    ${right ? `<div class="p-head__actions">${right}</div>` : ''}
  </div>`;

const chips = (key, items, active) => `<div class="chips" role="tablist">${items.map(([k, label, n]) => `
  <button class="chip${active === k ? ' is-active' : ''}" data-act="l.filter" data-key="${key}" data-val="${k}" role="tab" aria-selected="${active === k}">${label}${n !== undefined ? `<span class="chip__n">${n}</span>` : ''}</button>`).join('')}</div>`;

const personCell = (p, sub = '') => `<span class="cell-person">${avatar(p, 'sm')}<span><b>${esc(p?.name || '—')}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span></span>`;

// ——— Обзор ———

function overview(s, me) {
  const now = Date.now();
  const newReqs = s.requests.filter((r) => r.status === 'new');
  const active = s.cases.filter((c) => c.status !== 'done');
  const awaiting = awaitingReply(s);
  const week = upcomingEvents(s, (e) => new Date(e.at).getTime() < now + 7 * 864e5);
  const review = s.documents.filter((d) => d.status === 'review');
  const kpi = (href, label, value, hint, key, tone = '') => `<a class="kpi${tone ? ` kpi--${tone}` : ''}" href="${href}">
      <span class="kpi__label">${label}</span><b class="kpi__value" data-k="kpi:${key}" data-v="${value}">${value}</b><small>${hint}</small></a>`;

  const f = ui.filters.lReq || 'all';
  const rows = [...s.requests].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((r) => requestRow(s, r));
  const cnt = (g) => rows.filter((x) => x.group === g).length;
  const shown = rows.filter((x) => f === 'all' || x.group === f).slice(0, 10);
  const myTasks = s.tasks.filter((t) => t.assigneeId === me.id && t.status !== 'done').sort((a, b) => a.due.localeCompare(b.due));
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';
  const today = new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });

  return {
    html: `${pageHead(`${hello}, ${esc(me.name.split(' ')[0])}`, today[0].toUpperCase() + today.slice(1), `<a class="btn btn--secondary" href="#/l/calendar">${icon('calendar')}Календарь</a><a class="btn btn--primary" href="#/l/requests">${icon('inbox')}Разобрать обращения</a>`)}
    <div class="kpis">
      ${kpi('#/l/requests', 'Новые обращения', newReqs.length, newReqs.length ? `последнее ${relTime(newReqs.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0].createdAt)}` : 'все разобраны', 'new', newReqs.length ? 'accent' : '')}
      ${kpi('#/l/cases', 'Активные дела', active.length, `мои: ${active.filter((c) => c.lawyerId === me.id).length}`, 'active')}
      ${kpi('#/l/messages', 'Требуют ответа', awaiting.length, awaiting.length ? 'клиенты ждут ответа' : 'на всё ответили', 'await', awaiting.length ? 'warn' : '')}
      ${kpi('#/l/calendar', 'Ближайшие события', week.length, week[0] ? `${fmtWhen(week[0].at)}` : 'на неделе пусто', 'events')}
      ${kpi('#/l/docs', 'Документы на проверке', review.length, review.length ? 'нужно проверить' : 'всё проверено', 'review')}
    </div>

    <section class="card">
      <div class="card__head"><h2>Последние обращения</h2><a class="link" href="#/l/requests">Все обращения</a></div>
      <div class="card__tools">${chips('lReq', [['all', 'Все', rows.length], ['new', 'Новые', cnt('new')], ['work', 'В работе', cnt('work')], ['info', 'Нужна информация', cnt('info')], ['done', 'Завершённые', cnt('done')]], f)}</div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Клиент</th><th>Тип дела</th><th>Дата</th><th>Юрист</th><th>Статус</th><th>Следующее действие</th></tr></thead>
        <tbody>${shown.map((x) => requestTr(s, me, x)).join('') || `<tr><td colspan="6" class="muted center">Нет обращений</td></tr>`}</tbody>
      </table></div>
    </section>

    <div class="grid-2">
      <section class="card">
        <div class="card__head"><h2>Мои задачи</h2><span class="muted">${myTasks.length} ${plural(myTasks.length, 'открытая', 'открытые', 'открытых')}</span></div>
        <div class="task-list">${myTasks.slice(0, 6).map((t) => taskRow(s, t, true)).join('') || '<p class="muted pad">Открытых задач нет</p>'}</div>
      </section>
      <section class="card">
        <div class="card__head"><h2>Ближайшие события</h2><a class="link" href="#/l/calendar">Календарь</a></div>
        <div class="agenda-list">${upcomingEvents(s).slice(0, 5).map((e) => agendaRow(s, e)).join('') || '<p class="muted pad">Событий нет</p>'}</div>
      </section>
    </div>`,
  };
}

function requestTr(s, me, { r, kase, st, next, lawyerId }) {
  const c = client(s, r.clientId);
  const l = lawyer(s, lawyerId);
  let action = `<span class="next">${esc(next)}</span>`;
  if (r.status === 'new' && !r.lawyerId) action = `<button class="btn btn--secondary btn--sm" data-act="l.assignMe" data-id="${r.id}">${icon('user')}Взять себе</button>`;
  else if (r.status === 'new' || r.status === 'review') action = `<button class="btn btn--secondary btn--sm" data-act="l.modal" data-type="createCase" data-id="${r.id}">${icon('plus')}Создать дело</button>`;
  const href = kase ? `#/l/case/${kase.id}` : `#/l/request/${r.id}`;
  return `<tr data-go="${href}" data-k="rq:${r.id}" tabindex="0">
    <td data-label="Клиент">${personCell(c, `№${r.number}`)}</td>
    <td data-label="Тип дела">${category(r.category).title}</td>
    <td data-label="Дата" class="nowrap">${relTime(r.createdAt)}</td>
    <td data-label="Юрист" class="nowrap">${l ? esc(l.name) : '<span class="muted">Не назначен</span>'}</td>
    <td data-label="Статус">${pill(st, `rqs:${r.id}`)}</td>
    <td data-label="Следующее действие">${action}</td>
  </tr>`;
}

function taskRow(s, t, withCase = false) {
  const kase = caseOf(s, t.caseId);
  const l = lawyer(s, t.assigneeId);
  const d = dayDiff(t.due);
  const dueCls = t.status !== 'done' && d < 0 ? ' is-late' : t.status !== 'done' && d === 0 ? ' is-today' : '';
  return `<div class="task${t.status === 'done' ? ' is-done' : ''}" data-k="tk:${t.id}" data-v="${t.status}">
    <button class="task__check" data-act="l.taskToggle" data-id="${t.id}" aria-label="${t.status === 'done' ? 'Вернуть в работу' : 'Отметить выполненной'}">${icon(t.status === 'done' ? 'checkSquare' : 'square')}</button>
    <div class="task__main">
      <b>${esc(t.title)}</b>
      <small>${withCase && kase ? `<a href="#/l/case/${kase.id}/tasks">${esc(kase.title)}</a> · ` : ''}${esc(l?.name || '')}</small>
    </div>
    <span class="task__due${dueCls}">${icon('clock')}${t.status === 'done' ? fmtDateShort(t.due) : dayDiff(t.due) === 0 ? `сегодня, ${fmtTime(t.due)}` : deadlineText(t.due)}</span>
    <button class="pill pill--${TASK_STATUS[t.status].tone} pill--btn" data-act="l.taskCycle" data-id="${t.id}" title="Изменить статус" data-k="tks:${t.id}" data-v="${t.status}">${TASK_STATUS[t.status].label}</button>
  </div>`;
}

function agendaRow(s, e) {
  const t = EVENT_TYPES[e.type];
  const c = client(s, e.clientId);
  const l = lawyer(s, e.lawyerId);
  return `<div class="agenda-row agenda-row--${t.tone}" data-k="ag:${e.id}">
    <span class="agenda-row__when"><b>${fmtDayLabel(e.at).split(',')[0]}</b><small>${e.duration ? fmtTime(e.at) : 'срок'}</small></span>
    <span class="agenda-row__body"><small>${t.label}</small><b>${esc(e.title)}</b><span>${[c?.name, l?.name, e.place].filter(Boolean).map(esc).join(' · ')}</span></span>
  </div>`;
}

// ——— Обращения ———

function requests(s, me) {
  const f = ui.filters.lReqList || 'open';
  const list = [...s.requests].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const groups = {
    open: list.filter((r) => ['new', 'review', 'info'].includes(r.status)),
    new: list.filter((r) => r.status === 'new'),
    review: list.filter((r) => r.status === 'review'),
    info: list.filter((r) => r.status === 'info'),
    all: list,
  };
  const shown = groups[f];
  return {
    nav: 'requests',
    html: `${pageHead('Новые обращения', 'Заявки из клиентского кабинета. Назначьте юриста и откройте дело — клиент сразу увидит изменения.')}
    ${chips('lReqList', [['open', 'Открытые', groups.open.length], ['new', 'Новые', groups.new.length], ['review', 'На рассмотрении', groups.review.length], ['info', 'Нужна информация', groups.info.length], ['all', 'Все', list.length]], f)}
    <div class="req-grid">${shown.map((r) => {
      const c = client(s, r.clientId);
      const l = lawyer(s, r.lawyerId);
      const docsN = s.documents.filter((d) => d.requestId === r.id && d.status !== 'requested').length;
      const kase = r.caseId && caseOf(s, r.caseId);
      return `<article class="req-card${r.status === 'new' ? ' is-new' : ''}" data-k="rqc:${r.id}">
        <div class="req-card__top"><span class="req-card__num">№${r.number}</span>${pill(REQ_STATUS[r.status], `rqcs:${r.id}`)}<time>${relTime(r.createdAt)}</time></div>
        <a class="req-card__title" href="#/l/request/${r.id}">${personCell(c, category(r.category).title)}</a>
        <p class="req-card__text clamp-3">${esc(r.description)}</p>
        <div class="req-card__meta"><span>${icon('clip')}${docsN} ${plural(docsN, 'файл', 'файла', 'файлов')}</span><span>${icon('user')}${l ? esc(l.name) : 'Юрист не назначен'}</span></div>
        <div class="req-card__actions">
          ${kase ? `<a class="btn btn--secondary btn--sm" href="#/l/case/${kase.id}">Открыть дело</a>`
            : r.status === 'closed' ? '' : !r.lawyerId ? `<button class="btn btn--primary btn--sm" data-act="l.assignMe" data-id="${r.id}">${icon('user')}Взять себе</button>`
            : `<button class="btn btn--primary btn--sm" data-act="l.modal" data-type="createCase" data-id="${r.id}">${icon('plus')}Создать дело</button>`}
          <a class="btn btn--ghost btn--sm" href="#/l/request/${r.id}">Подробнее</a>
        </div>
      </article>`;
    }).join('') || `<div class="card">${empty('inbox', 'Обращений нет', 'Новые заявки из клиентского кабинета появятся здесь.')}</div>`}</div>`,
  };
}

function requestDetail(s, me, id) {
  const r = requestOf(s, id);
  if (!r) return requests(s, me);
  const c = client(s, r.clientId);
  const l = lawyer(s, r.lawyerId);
  const kase = r.caseId && caseOf(s, r.caseId);
  const docs = s.documents.filter((d) => d.requestId === r.id).sort(newest);
  const hasUnread = threadMessages(s, r.threadId).some((m) => m.from === 'client' && !m.readByLawyer);
  if (hasUnread) queueMicrotask(() => A.markThreadReadByLawyer(r.threadId));
  const assignPop = ui.popover === `assign:${r.id}` ? lawyerPop(s, 'l.assign', r.id, r.lawyerId) : '';

  return {
    nav: 'requests',
    html: `${pageHead(`Обращение №${r.number}`, `${category(r.category).title} · ${fmtWhen(r.createdAt)} · ${esc(r.source)}`, pill(REQ_STATUS[r.status], `rqd:${r.id}`), '<a href="#/l/requests">Новые обращения</a>')}
    <div class="detail">
      <div class="detail__main">
        <section class="card card--pad">
          <h2 class="h2">Описание проблемы</h2>
          <p class="prose">${esc(r.description)}</p>
        </section>
        <section class="card">
          <div class="card__head"><h2>Загруженные документы</h2><span class="muted">${docs.length}</span></div>
          ${docsTable(s, docs, { compact: true })}
        </section>
        <section class="card chat-card">
          <div class="card__head"><h2>История сообщений</h2></div>
          <div class="chat chat--panel" data-chat data-scroll="chat-${r.threadId}">${chatMessages(s, r.threadId, 'lawyer')}</div>
          ${quickReplies(r.threadId)}
          ${composer('l.send', r.threadId, `lchat:${r.threadId}`, `Ответить клиенту: ${c.name.split(' ')[0]}`)}
        </section>
      </div>
      <aside class="detail__side">
        <section class="card card--pad">
          <div class="side-person">${avatar(c, 'lg')}<span><b>${esc(c.name)}</b>${c.company ? `<small>${esc(c.company)}</small>` : ''}<a class="link" href="#/l/client/${c.id}">Профиль клиента</a></span></div>
          <div class="kv"><span>${icon('phone')}</span><a href="tel:${c.phone.replace(/[^\d+]/g, '')}">${esc(c.phone)}</a></div>
          <div class="kv"><span>${icon('mail')}</span><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></div>
        </section>
        <section class="card card--pad actions-card">
          ${kase ? `<a class="btn btn--primary btn--block" href="#/l/case/${kase.id}">${icon('briefcase')}Открыть дело ${kase.number}</a>`
            : `<button class="btn btn--primary btn--block" data-act="l.modal" data-type="createCase" data-id="${r.id}" ${r.status === 'closed' ? 'disabled' : ''}>${icon('plus')}Создать дело</button>`}
          <div class="pop-wrap">
            <button class="btn btn--secondary btn--block" data-act="l.pop" data-pop="assign:${r.id}">${icon('user')}${l ? 'Сменить юриста' : 'Назначить юриста'}</button>
            ${assignPop}
          </div>
          <button class="btn btn--secondary btn--block" data-act="l.modal" data-type="requestDoc" data-request="${r.id}" data-case="${kase?.id || ''}">${icon('file')}Запросить документ</button>
          <button class="btn btn--secondary btn--block" data-act="l.focusReply" data-thread="${r.threadId}">${icon('chat')}Ответить клиенту</button>
          ${!kase && r.status !== 'closed' ? `<button class="btn btn--ghost btn--block" data-act="l.closeRequest" data-id="${r.id}">Закрыть без дела</button>` : ''}
        </section>
        <section class="card card--pad">
          <dl class="facts">
            <div><dt>Категория</dt><dd>${category(r.category).title}</dd></div>
            <div><dt>Дата обращения</dt><dd>${fmtDate(r.createdAt)}, ${fmtTime(r.createdAt)}</dd></div>
            <div><dt>Ответственный юрист</dt><dd data-k="rql:${r.id}" data-v="${r.lawyerId || ''}">${l ? esc(l.name) : '<span class="muted">Не назначен</span>'}</dd></div>
            <div><dt>Источник</dt><dd>${esc(r.source)}</dd></div>
          </dl>
        </section>
      </aside>
    </div>`,
  };
}

const lawyerPop = (s, act, id, current) => `<div class="pop pop--menu" data-popover>${s.lawyers.map((l) => `
  <button class="pop__row${l.id === current ? ' is-active' : ''}" data-act="${act}" data-id="${id}" data-lawyer="${l.id}">${avatar(l, 'sm')}<span><b>${esc(l.name)}</b><small>${esc(l.area)}</small></span>${l.id === current ? icon('check') : ''}</button>`).join('')}</div>`;

const QUICK = ['Добрый день! Получили, изучаем — вернусь с ответом сегодня.', 'Пожалуйста, загрузите документ в личный кабинет.', 'Документы получили, спасибо!'];
const quickReplies = (threadId) => `<div class="quick">${QUICK.map((q, i) => `<button class="chip chip--sm" data-act="l.quick" data-thread="${threadId}" data-i="${i}">${esc(q.length > 38 ? `${q.slice(0, 36)}…` : q)}</button>`).join('')}</div>`;

// ——— Клиенты ———

function clients(s) {
  const q = draft('clientSearch').trim().toLowerCase();
  const list = s.clients.filter((c) => !q || `${c.name} ${c.phone} ${c.email} ${c.company || ''}`.toLowerCase().includes(q))
    .map((c) => {
      const reqs = s.requests.filter((r) => r.clientId === c.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const act = s.cases.filter((k) => k.clientId === c.id && k.status !== 'done');
      const due = s.invoices.filter((i) => i.clientId === c.id && i.status === 'unpaid').reduce((a, i) => a + i.amount, 0);
      return { c, reqs, act, due, last: reqs[0]?.createdAt || c.since };
    })
    .sort((a, b) => b.last.localeCompare(a.last));
  return {
    html: `${pageHead('Клиенты', `${s.clients.length} ${plural(s.clients.length, 'клиент', 'клиента', 'клиентов')} в базе`)}
    <section class="card">
      <div class="card__tools"><div class="search search--inline">${icon('search')}<input id="client-search" type="search" placeholder="Имя, телефон или email" data-draft="clientSearch" data-live value="${esc(draft('clientSearch'))}" aria-label="Поиск клиента"></div></div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Клиент</th><th>Телефон</th><th>Email</th><th>Активные дела</th><th>Последнее обращение</th><th class="right">К оплате</th></tr></thead>
        <tbody>${list.map(({ c, reqs, act, due }) => `<tr data-go="#/l/client/${c.id}" tabindex="0">
          <td data-label="Клиент">${personCell(c, c.company || `клиент с ${fmtDate(c.since)}`)}</td>
          <td data-label="Телефон" class="nowrap">${esc(c.phone)}</td>
          <td data-label="Email">${esc(c.email)}</td>
          <td data-label="Активные дела">${act.length ? act.map((k) => esc(k.title)).join(', ') : '<span class="muted">—</span>'}</td>
          <td data-label="Последнее обращение" class="nowrap">${reqs[0] ? `№${reqs[0].number} · ${relTime(reqs[0].createdAt)}` : '—'}</td>
          <td data-label="К оплате" class="right nowrap">${due ? `<b>${money(due)}</b>` : '<span class="muted">—</span>'}</td>
        </tr>`).join('') || '<tr><td colspan="6" class="muted center">Никого не нашли</td></tr>'}</tbody>
      </table></div>
    </section>`,
  };
}

function clientDetail(s, me, id) {
  const c = client(s, id);
  if (!c) return clients(s);
  const reqs = s.requests.filter((r) => r.clientId === c.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const cs = s.cases.filter((k) => k.clientId === c.id);
  const docs = s.documents.filter((d) => d.clientId === c.id).sort(newest);
  const invs = s.invoices.filter((i) => i.clientId === c.id).sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  const msgs = s.messages.filter((m) => m.clientId === c.id && m.from !== 'system').sort(newest).slice(0, 8);
  const paid = invs.filter((i) => i.status === 'paid').reduce((a, i) => a + i.amount, 0);
  const due = invs.filter((i) => i.status !== 'paid').reduce((a, i) => a + i.amount, 0);
  const lastThread = [...s.messages].filter((m) => m.clientId === c.id).sort(newest)[0]?.threadId;
  return {
    nav: 'clients',
    html: `${pageHead(esc(c.name), [c.company, `клиент с ${fmtDate(c.since)}`].filter(Boolean).map(esc).join(' · '),
      `${lastThread ? `<a class="btn btn--secondary" href="#/l/messages/${lastThread}">${icon('chat')}Написать</a>` : ''}
       <button class="btn btn--secondary" data-act="l.modal" data-type="event" data-client="${c.id}">${icon('calendar')}Запланировать</button>
       <button class="btn btn--primary" data-act="l.modal" data-type="invoice" data-client="${c.id}">${icon('card')}Выставить счёт</button>`, '<a href="#/l/clients">Клиенты</a>')}
    <div class="detail">
      <div class="detail__main">
        <section class="card">
          <div class="card__head"><h2>Активные дела</h2><span class="muted">${cs.filter((k) => k.status !== 'done').length}</span></div>
          <div class="table-wrap"><table class="table">
            <thead><tr><th>Дело</th><th>Юрист</th><th>Статус</th><th>Срок</th></tr></thead>
            <tbody>${cs.map((k) => `<tr data-go="#/l/case/${k.id}" tabindex="0">
              <td data-label="Дело"><b>${esc(k.title)}</b><small class="block muted">${k.number}</small></td>
              <td data-label="Юрист">${esc(lawyer(s, k.lawyerId)?.name)}</td>
              <td data-label="Статус">${pill(CASE_STATUS[k.status])}</td>
              <td data-label="Срок" class="nowrap">${k.deadline && k.status !== 'done' ? deadlineText(k.deadline) : '—'}</td></tr>`).join('') || '<tr><td colspan="4" class="muted center">Дел нет</td></tr>'}</tbody>
          </table></div>
        </section>
        <section class="card">
          <div class="card__head"><h2>История обращений</h2></div>
          <div class="table-wrap"><table class="table">
            <thead><tr><th>№</th><th>Тема</th><th>Дата</th><th>Статус</th></tr></thead>
            <tbody>${reqs.map((r) => `<tr data-go="#/l/request/${r.id}" tabindex="0">
              <td data-label="№">${r.number}</td><td data-label="Тема">${category(r.category).title}</td><td data-label="Дата">${fmtDate(r.createdAt)}</td>
              <td data-label="Статус">${pill(r.caseId ? CASE_STATUS[caseOf(s, r.caseId).status] : REQ_STATUS[r.status])}</td></tr>`).join('')}</tbody>
          </table></div>
        </section>
        <section class="card">
          <div class="card__head"><h2>История общения</h2></div>
          <div class="history">${msgs.map((m) => {
            const t = threadInfo(s, m.threadId);
            const who = m.from === 'client' ? c.name : lawyer(s, m.lawyerId)?.name;
            return `<a class="history__item" href="#/l/messages/${m.threadId}"><span class="history__who">${esc(who)}<small>${relTime(m.at)} · ${esc(t.title)}</small></span><span class="clamp-2">${esc(m.text || 'Документ')}</span></a>`;
          }).join('') || '<p class="muted pad">Переписки пока нет</p>'}</div>
        </section>
      </div>
      <aside class="detail__side">
        <section class="card card--pad">
          <div class="side-person">${avatar(c, 'lg')}<span><b>${esc(c.name)}</b>${c.company ? `<small>${esc(c.company)}</small>` : ''}</span></div>
          <div class="kv"><span>${icon('phone')}</span><a href="tel:${c.phone.replace(/[^\d+]/g, '')}">${esc(c.phone)}</a></div>
          <div class="kv"><span>${icon('mail')}</span><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></div>
        </section>
        <section class="card">
          <div class="card__head"><h2>Платежи</h2></div>
          <div class="money-row"><div><small>Оплачено</small><b>${money(paid)}</b></div><div><small>К оплате</small><b class="${due ? 'text-amber' : ''}">${money(due)}</b></div></div>
          <div class="mini-list">${invs.map((i) => `<div class="mini-row"><span><b>${esc(i.service)}</b><small>${i.number} · ${fmtDateShort(i.issuedAt)}</small></span><span class="right"><b>${money(i.amount)}</b>${pill(invoiceStatus(i), `ci:${i.id}`)}</span></div>`).join('') || '<p class="muted pad">Счетов нет</p>'}</div>
        </section>
        <section class="card">
          <div class="card__head"><h2>Документы</h2><span class="muted">${docs.length}</span></div>
          <div class="mini-list">${docs.slice(0, 8).map((d) => `<button class="mini-row mini-row--btn" data-act="l.openDoc" data-id="${d.id}">${fileBadge(d.type)}<span><b>${esc(d.name)}</b><small>${fmtDateShort(d.at)}</small></span>${pill(DOC_STATUS[d.status], `cd:${d.id}`)}</button>`).join('') || '<p class="muted pad">Документов нет</p>'}</div>
        </section>
      </aside>
    </div>`,
  };
}

// ——— Дела ———

function cases(s, me) {
  const f = ui.filters.lCases || 'active';
  const mine = ui.filters.lCasesMine || false;
  const base = s.cases.filter((c) => !mine || c.lawyerId === me.id);
  const count = (k) => base.filter((c) => (k === 'active' ? c.status !== 'done' : k === 'all' ? true : c.status === k)).length;
  const list = base.filter((c) => (f === 'active' ? c.status !== 'done' : f === 'all' ? true : c.status === f)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return {
    html: `${pageHead('Дела', `${s.cases.filter((c) => c.status !== 'done').length} активных`, `<label class="switch"><input type="checkbox" data-act="l.toggleMine" ${mine ? 'checked' : ''}><span></span>Только мои</label>`)}
    ${chips('lCases', [['active', 'Активные', count('active')], ...CASE_STATUS_ORDER.map((k) => [k, CASE_STATUS[k].label, count(k)]), ['all', 'Все', count('all')]], f)}
    <section class="card">
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Дело</th><th>Клиент</th><th>Юрист</th><th>Статус</th><th>Срок</th><th>Последняя активность</th></tr></thead>
        <tbody>${list.map((k) => {
          const d = k.deadline ? dayDiff(k.deadline) : null;
          return `<tr data-go="#/l/case/${k.id}" tabindex="0" data-k="kr:${k.id}">
          <td data-label="Дело"><b>${esc(k.title)}</b><small class="block muted">${k.number} · ${category(k.category).title}</small></td>
          <td data-label="Клиент">${esc(client(s, k.clientId).name)}</td>
          <td data-label="Юрист">${personCell(lawyer(s, k.lawyerId))}</td>
          <td data-label="Статус">${pill(CASE_STATUS[k.status], `ks:${k.id}`)}</td>
          <td data-label="Срок" class="nowrap${d !== null && d <= 3 && k.status !== 'done' ? ' text-amber' : ''}">${k.deadline && k.status !== 'done' ? `${fmtDateShort(k.deadline)} · ${deadlineText(k.deadline)}` : '—'}</td>
          <td data-label="Активность" class="nowrap">${relTime(k.updatedAt)}</td></tr>`;
        }).join('') || '<tr><td colspan="6" class="muted center">Дел нет</td></tr>'}</tbody>
      </table></div>
    </section>`,
  };
}

const CASE_TABS = [['overview', 'Обзор'], ['docs', 'Документы'], ['messages', 'Сообщения'], ['tasks', 'Задачи'], ['timeline', 'Timeline'], ['payments', 'Оплаты']];

function caseDetail(s, me, id, tab = 'overview') {
  const k = caseOf(s, id);
  if (!k) return cases(s, me);
  const c = client(s, k.clientId);
  const l = lawyer(s, k.lawyerId);
  const docs = s.documents.filter((d) => d.caseId === k.id).sort(newest);
  const tasks = s.tasks.filter((t) => t.caseId === k.id);
  const invs = s.invoices.filter((i) => i.caseId === k.id);
  const unread = threadMessages(s, k.threadId).filter((m) => m.from === 'client' && !m.readByLawyer).length;
  const counts = {
    docs: docs.filter((d) => d.status === 'review').length || '',
    messages: unread || '',
    tasks: tasks.filter((t) => t.status !== 'done').length || '',
    payments: invs.filter((i) => i.status !== 'paid').length || '',
  };
  const statusPop = ui.popover === `status:${k.id}` ? `<div class="pop pop--menu pop--right" data-popover>${CASE_STATUS_ORDER.map((st) => `
    <button class="pop__row${k.status === st ? ' is-active' : ''}" data-act="l.setStatus" data-id="${k.id}" data-status="${st}">${pill(CASE_STATUS[st])}${k.status === st ? icon('check') : ''}</button>`).join('')}</div>` : '';
  const lawyerPopHtml = ui.popover === `caseLawyer:${k.id}` ? lawyerPop(s, 'l.caseLawyer', k.id, k.lawyerId) : '';

  let body = '';
  if (tab === 'overview') body = caseOverview(s, k, c, docs, tasks, invs);
  if (tab === 'docs') body = `<section class="card">
      <div class="card__head"><h2>Документы дела</h2>
        <div class="btn-row"><button class="btn btn--secondary btn--sm" data-act="l.modal" data-type="requestDoc" data-case="${k.id}">${icon('file')}Запросить документ</button>
        <label class="btn btn--primary btn--sm"><input type="file" accept="${ACCEPT}" multiple data-upload="lcase:${k.id}" class="sr-only">${icon('upload')}Загрузить для клиента</label></div></div>
      ${docsTable(s, docs)}
    </section>`;
  if (tab === 'messages') {
    if (unread) queueMicrotask(() => A.markThreadReadByLawyer(k.threadId));
    body = `<section class="card chat-card chat-card--tall">
      <div class="card__head"><h2>Переписка с клиентом</h2><span class="muted">${esc(c.name)}</span></div>
      <div class="chat chat--panel" data-chat data-scroll="chat-${k.threadId}">${chatMessages(s, k.threadId, 'lawyer')}</div>
      ${quickReplies(k.threadId)}
      ${composer('l.send', k.threadId, `lchat:${k.threadId}`, 'Сообщение клиенту')}
    </section>`;
  }
  if (tab === 'tasks') {
    const order = { todo: 0, progress: 1, done: 2 };
    body = `<section class="card">
      <div class="card__head"><h2>Задачи</h2></div>
      <form class="task-form" data-form="l.task" data-case="${k.id}">
        <input class="input" name="title" id="task-title" placeholder="Новая задача" required data-draft="task:${k.id}" value="${esc(draft(`task:${k.id}`))}" aria-label="Название задачи">
        <select class="input" name="assignee" aria-label="Ответственный">${s.lawyers.map((x) => `<option value="${x.id}"${x.id === k.lawyerId ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
        <input class="input" type="date" name="due" value="${toDateInput(Date.now() + 2 * 864e5)}" aria-label="Дедлайн" required>
        <button class="btn btn--primary" type="submit">${icon('plus')}Добавить</button>
      </form>
      <div class="quick quick--tpl"><span class="muted">Шаблоны:</span>${TASK_TEMPLATES.map((t) => `<button class="chip chip--sm" data-act="l.taskTpl" data-case="${k.id}" data-val="${t}">${t}</button>`).join('')}</div>
      <div class="task-list">${[...tasks].sort((a, b) => order[a.status] - order[b.status] || a.due.localeCompare(b.due)).map((t) => taskRow(s, t)).join('') || '<p class="muted pad">Задач пока нет</p>'}</div>
    </section>`;
  }
  if (tab === 'timeline') {
    const cur = k.timeline.find((t) => t.state === 'current');
    body = `<div class="grid-2 grid-2--wide">
      <section class="card">
        <div class="card__head"><h2>Ход дела</h2>${cur ? `<button class="btn btn--primary btn--sm" data-act="l.advance" data-id="${k.id}">${icon('check')}Завершить этап «${esc(cur.title)}»</button>` : '<span class="muted">Все этапы завершены</span>'}</div>
        <div class="card__body">${timeline(k, { controls: true })}</div>
        <p class="hint pad">Клиент видит те же этапы и описания в своём кабинете.</p>
      </section>
      <section class="card">
        <div class="card__head"><h2>История действий</h2></div>
        <ol class="activity">${[...k.activity].reverse().map((a) => `<li data-k="act:${a.id}"><span>${esc(a.text)}</span><time>${relTime(a.at)}</time></li>`).join('')}</ol>
      </section>
    </div>`;
  }
  if (tab === 'payments') {
    const paid = invs.filter((i) => i.status === 'paid').reduce((a, i) => a + i.amount, 0);
    const due = invs.filter((i) => i.status !== 'paid').reduce((a, i) => a + i.amount, 0);
    body = `<section class="card">
      <div class="card__head"><h2>Счета и оплаты</h2><button class="btn btn--primary btn--sm" data-act="l.modal" data-type="invoice" data-client="${c.id}" data-case="${k.id}">${icon('plus')}Выставить счёт</button></div>
      <div class="money-row"><div><small>Оплачено</small><b>${money(paid)}</b></div><div><small>Ожидает оплаты</small><b class="${due ? 'text-amber' : ''}">${money(due)}</b></div></div>
      ${invoiceTable(s, invs, false)}
    </section>`;
  }

  return {
    nav: 'cases',
    html: `<div class="p-head">
      <div>
        <div class="crumbs"><a href="#/l/cases">Дела</a><span>/</span>${k.number}</div>
        <h1>${esc(k.title)}</h1>
      </div>
      <div class="p-head__actions">
        ${pill(CASE_STATUS[k.status], `kd:${k.id}`)}
        <div class="pop-wrap"><button class="btn btn--primary" data-act="l.pop" data-pop="status:${k.id}">${icon('refresh')}Изменить статус${icon('down')}</button>${statusPop}</div>
      </div>
    </div>
    <div class="case-meta">
      <div><small>Номер</small><b>${k.number}</b></div>
      <div><small>Клиент</small><a href="#/l/client/${c.id}"><b>${esc(c.name)}</b></a></div>
      <div class="pop-wrap"><small>Ответственный юрист</small><button class="link-btn link-btn--strong" data-act="l.pop" data-pop="caseLawyer:${k.id}">${esc(l.name)}${icon('down')}</button>${lawyerPopHtml}</div>
      <div><small>Статус</small><b>${CASE_STATUS[k.status].label}</b></div>
      <div><small>Срок</small><b class="${k.deadline && dayDiff(k.deadline) <= 3 && k.status !== 'done' ? 'text-amber' : ''}">${k.deadline ? `${fmtDate(k.deadline)}` : '—'}</b>${k.deadline && k.status !== 'done' ? `<small>${deadlineText(k.deadline)}</small>` : ''}</div>
      <div><small>Последняя активность</small><b>${relTime(k.updatedAt)}</b></div>
    </div>
    <nav class="tabs" aria-label="Разделы дела">${CASE_TABS.map(([t, label]) => `<a href="#/l/case/${k.id}/${t}" class="${tab === t ? 'is-active' : ''}"${tab === t ? ' aria-current="page"' : ''}>${label}${counts[t] ? `<span class="tabs__n">${counts[t]}</span>` : ''}</a>`).join('')}</nav>
    ${body}`,
  };
}

function caseOverview(s, k, c, docs, tasks, invs) {
  const cur = k.timeline.find((t) => t.state === 'current');
  const open = tasks.filter((t) => t.status !== 'done').sort((a, b) => a.due.localeCompare(b.due));
  const evs = upcomingEvents(s, (e) => e.caseId === k.id);
  const due = invs.filter((i) => i.status !== 'paid').reduce((a, i) => a + i.amount, 0);
  const need = docs.filter((d) => d.status === 'requested');
  const review = docs.filter((d) => d.status === 'review');
  return `<div class="detail">
    <div class="detail__main">
      <section class="card card--pad">
        <h2 class="h2">Суть дела</h2>
        <p class="prose">${esc(k.summary)}</p>
      </section>
      <section class="card card--pad stage-card">
        <div class="stage-card__head">
          <span><small>Текущий этап</small><b>${cur ? esc(cur.title) : 'Все этапы завершены'}</b>${cur?.note ? `<span class="muted">${esc(cur.note)}</span>` : ''}</span>
          ${cur ? `<button class="btn btn--secondary btn--sm" data-act="l.advance" data-id="${k.id}">${icon('check')}Завершить этап</button>` : ''}
        </div>
        <div class="stage-bar">${k.timeline.map((t) => `<span class="stage-bar__i stage-bar__i--${t.state}" title="${esc(t.title)}"></span>`).join('')}</div>
      </section>
      ${need.length || review.length ? `<section class="card">
        <div class="card__head"><h2>Документы</h2><a class="link" href="#/l/case/${k.id}/docs">Все документы</a></div>
        ${docsTable(s, [...review, ...need], { compact: true })}
      </section>` : ''}
      <section class="card">
        <div class="card__head"><h2>Открытые задачи</h2><a class="link" href="#/l/case/${k.id}/tasks">Все задачи</a></div>
        <div class="task-list">${open.map((t) => taskRow(s, t)).join('') || '<p class="muted pad">Открытых задач нет</p>'}</div>
      </section>
    </div>
    <aside class="detail__side">
      <section class="card card--pad">
        <div class="side-person">${avatar(c, 'lg')}<span><b>${esc(c.name)}</b>${c.company ? `<small>${esc(c.company)}</small>` : ''}<a class="link" href="#/l/client/${c.id}">Профиль клиента</a></span></div>
        <div class="kv"><span>${icon('phone')}</span><a href="tel:${c.phone.replace(/[^\d+]/g, '')}">${esc(c.phone)}</a></div>
        <div class="kv"><span>${icon('mail')}</span><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></div>
        <a class="btn btn--secondary btn--block btn--sm" href="#/l/case/${k.id}/messages">${icon('chat')}Написать клиенту</a>
      </section>
      <section class="card">
        <div class="card__head"><h2>События</h2><button class="link-btn" data-act="l.modal" data-type="event" data-client="${c.id}" data-case="${k.id}">${icon('plus')}Добавить</button></div>
        <div class="agenda-list">${evs.map((e) => agendaRow(s, e)).join('') || '<p class="muted pad">Нет запланированных событий</p>'}</div>
      </section>
      <section class="card card--pad">
        <div class="money-row money-row--flush"><div><small>Счетов</small><b>${invs.length}</b></div><div><small>К оплате</small><b class="${due ? 'text-amber' : ''}">${money(due)}</b></div></div>
      </section>
    </aside>
  </div>`;
}

function docsTable(s, docs, { compact = false, withClient = false } = {}) {
  if (!docs.length) return '<p class="muted pad">Документов нет</p>';
  return `<div class="table-wrap"><table class="table table--docs">
    <thead><tr><th>Документ</th>${withClient ? '<th>Клиент</th>' : ''}${compact ? '' : '<th>Загрузил</th>'}<th>Дата</th><th>Тип</th><th>Статус</th><th class="right">Действия</th></tr></thead>
    <tbody>${docs.map((d) => {
      const c = client(s, d.clientId);
      const kase = d.caseId && caseOf(s, d.caseId);
      const rq = d.requestId && requestOf(s, d.requestId);
      const who = d.status === 'requested' ? `запрошен у клиента` : d.by === 'lawyer' ? (lawyer(s, d.lawyerId)?.name || 'Юрист') : c.name;
      let act = `<button class="btn btn--ghost btn--sm" data-act="l.openDoc" data-id="${d.id}">${icon('eye')}Открыть</button>`;
      if (d.status === 'review') act = `<button class="btn btn--secondary btn--sm" data-act="l.docAccept" data-id="${d.id}">${icon('check')}Принять</button><button class="btn btn--ghost btn--sm" data-act="l.modal" data-type="reject" data-id="${d.id}">Отклонить</button>`;
      if (d.status === 'requested') act = `<button class="btn btn--ghost btn--sm" data-act="l.remind" data-id="${d.id}">${icon('bell')}Напомнить</button>`;
      return `<tr data-k="dr:${d.id}" data-v="${d.status}">
        <td data-label="Документ"><button class="doc-cell" data-act="l.openDoc" data-id="${d.id}">${d.thumb ? `<img src="${d.thumb}" alt="">` : fileBadge(d.type)}<span><b>${esc(d.name)}</b>${withClient ? `<small>${esc(kase ? kase.title : rq ? `Обращение №${rq.number}` : '')}</small>` : d.size ? `<small>${fileSize(d.size)}</small>` : ''}</span></button></td>
        ${withClient ? `<td data-label="Клиент">${esc(c.name)}</td>` : ''}
        ${compact ? '' : `<td data-label="Загрузил">${esc(who)}</td>`}
        <td data-label="Дата" class="nowrap">${relTime(d.status === 'requested' ? d.requestedAt || d.at : d.at)}</td>
        <td data-label="Тип">${d.type ? d.type.toUpperCase() : '—'}</td>
        <td data-label="Статус">${pill(DOC_STATUS[d.status], `drs:${d.id}`)}</td>
        <td data-label="Действия" class="right"><div class="row-actions">${act}</div></td>
      </tr>`;
    }).join('')}</tbody>
  </table></div>`;
}

// ——— Документы ———

function docs(s) {
  const f = ui.filters.lDocs || 'review';
  const all = [...s.documents].sort(newest);
  const groups = {
    review: all.filter((d) => d.status === 'review'),
    requested: all.filter((d) => d.status === 'requested'),
    accepted: all.filter((d) => d.status === 'accepted'),
    ready: all.filter((d) => d.status === 'ready'),
    all,
  };
  return {
    html: `${pageHead('Документы', 'Всё, что загрузили клиенты и подготовили юристы, в одном месте')}
    ${chips('lDocs', [['review', 'На проверке', groups.review.length], ['requested', 'Запрошены', groups.requested.length], ['accepted', 'Принятые', groups.accepted.length], ['ready', 'От юристов', groups.ready.length], ['all', 'Все', all.length]], f)}
    <section class="card">${docsTable(s, groups[f], { withClient: true })}</section>`,
  };
}

// ——— Календарь ———

function calendar(s, me) {
  const off = ui.filters.calOffset || 0;
  const mine = ui.filters.calMine || false;
  const month = new Date();
  month.setDate(1);
  month.setMonth(month.getMonth() + off);
  month.setHours(0, 0, 0, 0);
  const start = new Date(month);
  start.setDate(1 - ((month.getDay() + 6) % 7));
  const lastOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const weeks = Math.ceil((((month.getDay() + 6) % 7) + lastOfMonth.getDate()) / 7);
  const sel = ui.filters.calDay ? new Date(ui.filters.calDay) : startOfDay(Date.now());
  const evs = s.events.filter((e) => !mine || e.lawyerId === me.id).sort((a, b) => a.at.localeCompare(b.at));
  const cells = Array.from({ length: weeks * 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const items = evs.filter((e) => sameDay(e.at, d));
    const cls = [d.getMonth() !== month.getMonth() && 'is-out', sameDay(d, Date.now()) && 'is-today', sameDay(d, sel) && 'is-sel'].filter(Boolean).join(' ');
    return `<button class="cal__cell ${cls}" data-act="l.calDay" data-day="${d.toISOString()}">
      <span class="cal__num">${d.getDate()}</span>
      ${items.slice(0, 3).map((e) => `<span class="cal__ev cal__ev--${EVENT_TYPES[e.type].tone}">${e.duration ? `<b>${fmtTime(e.at)}</b> ` : ''}${esc(e.title)}</span>`).join('')}
      ${items.length > 3 ? `<span class="cal__more">ещё ${items.length - 3}</span>` : ''}
      ${items.length ? `<span class="cal__dots">${items.slice(0, 4).map((e) => `<i class="dot--${EVENT_TYPES[e.type].tone}"></i>`).join('')}</span>` : ''}
    </button>`;
  }).join('');
  const dayEvents = evs.filter((e) => sameDay(e.at, sel));
  return {
    html: `${pageHead('Календарь', 'Консультации, встречи, заседания и сроки', `<label class="switch"><input type="checkbox" data-act="l.toggleCalMine" ${mine ? 'checked' : ''}><span></span>Только мои</label><button class="btn btn--primary" data-act="l.modal" data-type="event">${icon('plus')}Добавить событие</button>`)}
    <div class="cal-layout">
      <section class="card cal">
        <div class="cal__head">
          <button class="icon-btn" data-act="l.calMove" data-d="-1" aria-label="Предыдущий месяц">${icon('left')}</button>
          <h2>${fmtMonth(month)}</h2>
          <button class="icon-btn" data-act="l.calMove" data-d="1" aria-label="Следующий месяц">${icon('right')}</button>
          ${off ? '<button class="btn btn--ghost btn--sm" data-act="l.calMove" data-d="0">Сегодня</button>' : ''}
        </div>
        <div class="cal__week">${['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d) => `<span>${d}</span>`).join('')}</div>
        <div class="cal__grid">${cells}</div>
        <div class="legend legend--pad">${Object.values(EVENT_TYPES).map((t) => `<span class="legend__i legend__i--${t.tone}">${t.label}</span>`).join('')}</div>
      </section>
      <section class="card">
        <div class="card__head"><h2>${fmtDayLabel(sel.toISOString())}</h2><button class="link-btn" data-act="l.modal" data-type="event" data-day="${sel.toISOString()}">${icon('plus')}Добавить</button></div>
        <div class="agenda-list">${dayEvents.map((e) => agendaRow(s, e)).join('') || '<p class="muted pad">В этот день событий нет</p>'}</div>
      </section>
    </div>`,
  };
}

// ——— Сообщения ———

function messages(s, me, threadId) {
  const f = ui.filters.lMsg || 'all';
  const threads = allThreads(s).filter((t) => f === 'all' || (t.awaiting && t.unread));
  const active = threadId || (window.innerWidth > 900 ? threads[0]?.threadId : null);
  const t = active ? threadInfo(s, active) : null;
  if (t && threadMessages(s, active).some((m) => m.from === 'client' && !m.readByLawyer)) queueMicrotask(() => A.markThreadReadByLawyer(active));
  const c = t && client(s, t.clientId);
  return {
    full: true,
    html: `<div class="inbox${threadId ? ' has-thread' : ''}">
      <aside class="inbox__list">
        <div class="inbox__head"><h1>Сообщения</h1>${chips('lMsg', [['all', 'Все'], ['await', 'Требуют ответа', awaitingReply(s).length]], f)}</div>
        <div class="inbox__threads">${threads.map((x) => {
          const cl = client(s, x.clientId);
          const lastText = x.last.from === 'system' ? x.last.text : `${x.last.from === 'lawyer' ? 'Вы: ' : ''}${x.last.text || 'Документ'}`;
          return `<a class="thread-row${x.threadId === active ? ' is-active' : ''}${x.unread ? ' is-unread' : ''}" href="#/l/messages/${x.threadId}" data-k="lth:${x.threadId}" data-v="${x.last.id}">
            ${avatar(cl)}
            <span class="thread-row__main">
              <span class="thread-row__top"><b>${esc(cl?.name)}</b><time>${relTime(x.last.at)}</time></span>
              <span class="thread-row__sub">${esc(x.title)}</span>
              <span class="thread-row__last">${esc(lastText)}</span>
            </span>
            ${x.unread ? `<span class="badge badge--inline">${x.unread}</span>` : ''}
          </a>`;
        }).join('') || '<p class="muted pad">Нет переписок</p>'}</div>
      </aside>
      <section class="inbox__thread">${t ? `
        <header class="inbox__thread-head">
          <a class="icon-btn inbox__back" href="#/l/messages" aria-label="К списку">${icon('left')}</a>
          ${avatar(c, 'sm')}
          <span><b>${esc(c.name)}</b><small>${esc(t.title)}${t.lawyerId ? ` · ${esc(lawyer(s, t.lawyerId).name)}` : ''}</small></span>
          <a class="btn btn--secondary btn--sm" href="${t.kase ? `#/l/case/${t.kase.id}` : `#/l/request/${t.request.id}`}">${t.kase ? 'Карточка дела' : 'Обращение'}</a>
        </header>
        <div class="chat chat--panel chat--grow" data-chat data-scroll="chat-${active}">${chatMessages(s, active, 'lawyer')}</div>
        ${quickReplies(active)}
        ${composer('l.send', active, `lchat:${active}`, 'Сообщение клиенту')}` : `<div class="inbox__empty">${empty('chat', 'Выберите переписку')}</div>`}
      </section>
    </div>`,
  };
}

// ——— Оплаты ———

function invoiceTable(s, invs, withClient = true) {
  if (!invs.length) return '<p class="muted pad">Счетов нет</p>';
  return `<div class="table-wrap"><table class="table">
    <thead><tr><th>Услуга</th>${withClient ? '<th>Клиент</th>' : ''}<th class="right">Сумма</th><th>Дата</th><th>Статус</th><th class="right"></th></tr></thead>
    <tbody>${[...invs].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)).map((i) => {
      const c = client(s, i.clientId);
      const kase = i.caseId && caseOf(s, i.caseId);
      return `<tr data-k="ir:${i.id}" data-v="${i.status}">
        <td data-label="Услуга"><b>${esc(i.service)}</b><small class="block muted">${i.number}${kase ? ` · ${esc(kase.title)}` : ''}</small></td>
        ${withClient ? `<td data-label="Клиент"><a href="#/l/client/${c.id}">${esc(c.name)}</a></td>` : ''}
        <td data-label="Сумма" class="right nowrap"><b>${money(i.amount)}</b></td>
        <td data-label="Дата" class="nowrap">${fmtDateShort(i.issuedAt)}${i.status === 'paid' ? `<small class="block muted">оплачен ${fmtDateShort(i.paidAt)}</small>` : `<small class="block ${isOverdue(i) ? 'text-red' : 'muted'}">до ${fmtDateShort(i.dueAt)}</small>`}</td>
        <td data-label="Статус">${pill(invoiceStatus(i), `irs:${i.id}`)}</td>
        <td class="right">${i.status === 'paid' ? '' : `<button class="btn btn--ghost btn--sm" data-act="l.markPaid" data-id="${i.id}">Отметить оплату</button>`}</td>
      </tr>`;
    }).join('')}</tbody>
  </table></div>`;
}

function payments(s) {
  const f = ui.filters.lPay || 'all';
  const paid = s.invoices.filter((i) => i.status === 'paid');
  const unpaid = s.invoices.filter((i) => i.status !== 'paid');
  const overdue = unpaid.filter(isOverdue);
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const paidMonth = paid.filter((i) => new Date(i.paidAt) >= monthStart).reduce((a, i) => a + i.amount, 0);
  const sum = (l) => l.reduce((a, i) => a + i.amount, 0);
  const list = f === 'paid' ? paid : f === 'unpaid' ? unpaid : f === 'overdue' ? overdue : s.invoices;
  return {
    html: `${pageHead('Оплаты', 'Счета клиентов и поступления', `<button class="btn btn--primary" data-act="l.modal" data-type="invoice">${icon('plus')}Выставить счёт</button>`)}
    <div class="kpis kpis--3">
      <div class="kpi"><span class="kpi__label">Получено в этом месяце</span><b class="kpi__value" data-k="pk:m" data-v="${paidMonth}">${money(paidMonth)}</b><small>${paid.length} ${plural(paid.length, 'оплата', 'оплаты', 'оплат')} всего</small></div>
      <div class="kpi"><span class="kpi__label">Ожидает оплаты</span><b class="kpi__value" data-k="pk:u" data-v="${sum(unpaid)}">${money(sum(unpaid))}</b><small>${unpaid.length} ${plural(unpaid.length, 'счёт', 'счёта', 'счетов')}</small></div>
      <div class="kpi${overdue.length ? ' kpi--warn' : ''}"><span class="kpi__label">Просрочено</span><b class="kpi__value">${money(sum(overdue))}</b><small>${overdue.length ? `${overdue.length} ${plural(overdue.length, 'счёт', 'счёта', 'счетов')}` : 'просрочек нет'}</small></div>
    </div>
    ${chips('lPay', [['all', 'Все', s.invoices.length], ['unpaid', 'Ожидают', unpaid.length], ['overdue', 'Просрочены', overdue.length], ['paid', 'Оплачены', paid.length]], f)}
    <section class="card">${invoiceTable(s, list)}</section>`,
  };
}

// ——— Настройки ———

function settings(s, me) {
  const co = s.company;
  return {
    html: `${pageHead('Настройки', 'Профиль компании, команда и уведомления клиентов')}
    <div class="grid-2 grid-2--wide">
      <section class="card">
        <div class="card__head"><h2>Компания</h2></div>
        <form class="form-grid card__body" data-form="l.company">
          <div class="field"><label for="co-name">Название</label><input class="input" id="co-name" name="name" value="${esc(co.name)}"></div>
          <div class="field"><label for="co-tag">Подпись</label><input class="input" id="co-tag" name="tagline" value="${esc(co.tagline)}"></div>
          <div class="field"><label for="co-phone">Телефон</label><input class="input" id="co-phone" name="phone" data-mask="phone" value="${esc(co.phone)}"></div>
          <div class="field"><label for="co-email">Email</label><input class="input" id="co-email" name="email" type="email" value="${esc(co.email)}"></div>
          <div class="field field--wide"><label for="co-addr">Адрес</label><input class="input" id="co-addr" name="address" value="${esc(co.address)}"></div>
          <div class="field"><label for="co-hours">Часы работы</label><input class="input" id="co-hours" name="hours" value="${esc(co.hours)}"></div>
          <div class="field"><label for="co-sla">Срок первого ответа, часов</label><input class="input" id="co-sla" name="replySla" type="number" min="1" max="48" value="${co.replySla}"></div>
          <div class="field field--wide"><button class="btn btn--primary" type="submit">Сохранить</button></div>
        </form>
      </section>
      <div class="stack-col">
        <section class="card">
          <div class="card__head"><h2>Команда</h2></div>
          <div class="mini-list">${s.lawyers.map((l) => {
            const n = s.cases.filter((k) => k.lawyerId === l.id && k.status !== 'done').length;
            return `<div class="mini-row">${avatar(l, 'sm')}<span><b>${esc(l.name)}${l.id === me.id ? ' <small class="muted">— вы</small>' : ''}</b><small>${esc(l.role)} · ${esc(l.area)}</small></span><span class="right muted">${n} ${plural(n, 'дело', 'дела', 'дел')}</span></div>`;
          }).join('')}</div>
        </section>
        <section class="card">
          <div class="card__head"><h2>Уведомления клиентов</h2></div>
          <div class="card__body toggles">
            ${[['notifyEmail', 'Дублировать уведомления на email'], ['notifySms', 'SMS о смене статуса и новых сроках'], ['autoAssign', 'Автоматически назначать юриста по категории']].map(([k, label]) => `
              <label class="switch switch--row"><span>${label}</span><input type="checkbox" data-act="l.toggleSetting" data-key="${k}" ${co[k] ? 'checked' : ''}><span></span></label>`).join('')}
          </div>
        </section>
        <section class="card">
          <div class="card__head"><h2>Демо-данные</h2></div>
          <div class="card__body"><p class="muted">Вернуть сервис к исходному набору клиентов, дел и документов. Изменения во всех открытых вкладках сбросятся.</p>
          <button class="btn btn--secondary" data-act="app.reset">${icon('refresh')}Сбросить демо-данные</button></div>
        </section>
      </div>
    </div>`,
  };
}

// ——— Модальные окна ———

const DOC_SUGGEST = ['Паспорт', 'Выписка из ЕГРН', 'Договор', 'Трудовой договор', 'Кассовый чек', 'Свидетельство о браке'];

function modal(s, me) {
  const m = ui.modal;
  if (!m) return '';
  let title = '';
  let body = '';
  let wide = false;
  if (m.type === 'createCase') {
    const r = requestOf(s, m.id);
    const c = client(s, r.clientId);
    title = `Создать дело по обращению №${r.number}`;
    const suggested = { family: 'Семейный спор', inherit: 'Наследственное дело', realty: 'Сделка с недвижимостью', labor: 'Трудовой спор', contracts: 'Спор по договору', debts: 'Взыскание долга', court: 'Судебный спор', consumer: 'Защита прав потребителя' }[r.category];
    body = `<form class="form-stack" data-form="l.createCase" data-id="${r.id}">
      <div class="modal__ctx">${avatar(c, 'sm')}<span><b>${esc(c.name)}</b><small>${category(r.category).title}</small></span></div>
      <div class="field"><label for="cc-title">Название дела</label><input class="input" id="cc-title" name="title" required value="${esc(suggested)}"></div>
      <div class="form-row">
        <div class="field"><label for="cc-lawyer">Ответственный юрист</label><select class="input" id="cc-lawyer" name="lawyerId">${s.lawyers.map((l) => `<option value="${l.id}"${l.id === (r.lawyerId || me.id) ? ' selected' : ''}>${esc(l.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="cc-deadline">Срок</label><input class="input" id="cc-deadline" name="deadline" type="date" value="${toDateInput(Date.now() + 30 * 864e5)}"></div>
      </div>
      <div class="field"><label for="cc-summary">Суть дела <span class="muted">— увидит клиент</span></label><textarea class="textarea" id="cc-summary" name="summary" rows="4">${esc(r.description)}</textarea></div>
      <div class="modal__foot"><button type="button" class="btn btn--ghost" data-act="l.closeModal">Отмена</button><button class="btn btn--primary" type="submit">Создать дело</button></div>
    </form>`;
  }
  if (m.type === 'requestDoc') {
    const kase = m.caseId && caseOf(s, m.caseId);
    title = 'Запросить документ у клиента';
    body = `<form class="form-stack" data-form="l.requestDoc">
      <div class="field"><label for="rd-name">Какой документ нужен</label><input class="input" id="rd-name" name="name" required data-draft="rd-name" value="${esc(draft('rd-name'))}" placeholder="Например, выписка из ЕГРН">
        <div class="chips chips--wrap chips--sm">${DOC_SUGGEST.map((x) => `<button type="button" class="chip" data-act="l.fill" data-key="rd-name" data-val="${x}">${x}</button>`).join('')}</div></div>
      <div class="field"><label for="rd-comment">Пояснение для клиента</label><textarea class="textarea" id="rd-comment" name="comment" rows="3" data-draft="rd-comment" placeholder="Где взять документ, какие страницы нужны">${esc(draft('rd-comment'))}</textarea></div>
      ${kase ? `<label class="check"><input type="checkbox" name="setStatus" ${kase.status === 'docs' ? 'disabled' : 'checked'}><span>Перевести дело в статус «Нужны документы»</span></label>` : ''}
      <p class="hint">Клиент получит уведомление и сможет загрузить документ одной кнопкой — в том числе сфотографировать его телефоном.</p>
      <div class="modal__foot"><button type="button" class="btn btn--ghost" data-act="l.closeModal">Отмена</button><button class="btn btn--primary" type="submit">Отправить запрос</button></div>
    </form>`;
  }
  if (m.type === 'reject') {
    const d = byId(s.documents, m.id);
    title = 'Отклонить документ';
    body = `<form class="form-stack" data-form="l.reject" data-id="${d.id}">
      <p class="muted">${esc(d.name)}</p>
      <div class="field"><label for="rj-reason">Что не так</label><input class="input" id="rj-reason" name="reason" required data-draft="rj-reason" value="${esc(draft('rj-reason'))}">
        <div class="chips chips--wrap chips--sm">${['Плохо читается', 'Не все страницы', 'Не тот документ', 'Истёк срок действия'].map((x) => `<button type="button" class="chip" data-act="l.fill" data-key="rj-reason" data-val="${x}">${x}</button>`).join('')}</div></div>
      <div class="modal__foot"><button type="button" class="btn btn--ghost" data-act="l.closeModal">Отмена</button><button class="btn btn--danger" type="submit">Отклонить и запросить заново</button></div>
    </form>`;
  }
  if (m.type === 'event') {
    const day = m.day ? new Date(m.day) : new Date(Date.now() + 864e5);
    title = 'Новое событие';
    const casesList = s.cases.filter((k) => k.status !== 'done');
    body = `<form class="form-stack" data-form="l.event">
      <div class="form-row">
        <div class="field"><label for="ev-type">Тип</label><select class="input" id="ev-type" name="type">${Object.entries(EVENT_TYPES).map(([k, t]) => `<option value="${k}">${t.label}</option>`).join('')}</select></div>
        <div class="field"><label for="ev-lawyer">Юрист</label><select class="input" id="ev-lawyer" name="lawyerId">${s.lawyers.map((l) => `<option value="${l.id}"${l.id === me.id ? ' selected' : ''}>${esc(l.name)}</option>`).join('')}</select></div>
      </div>
      <div class="field"><label for="ev-title">Название</label><input class="input" id="ev-title" name="title" required placeholder="Например, консультация по проекту договора"></div>
      <div class="form-row">
        <div class="field"><label for="ev-date">Дата</label><input class="input" id="ev-date" type="date" name="date" required value="${toDateInput(day)}"></div>
        <div class="field"><label for="ev-time">Время</label><input class="input" id="ev-time" type="time" name="time" value="11:00"></div>
      </div>
      <div class="form-row">
        <div class="field"><label for="ev-client">Клиент</label><select class="input" id="ev-client" name="clientId"><option value="">Без клиента</option>${s.clients.map((c) => `<option value="${c.id}"${c.id === m.clientId ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="ev-case">Дело</label><select class="input" id="ev-case" name="caseId"><option value="">Без дела</option>${casesList.map((k) => `<option value="${k.id}"${k.id === m.caseId ? ' selected' : ''}>${esc(k.title)}</option>`).join('')}</select></div>
      </div>
      <div class="field"><label for="ev-place">Место</label><input class="input" id="ev-place" name="place" placeholder="Офис, суд или ссылка на видеозвонок" value="${esc(s.company.address)}"></div>
      <p class="hint">Если выбран клиент, событие появится в его календаре, и он получит уведомление.</p>
      <div class="modal__foot"><button type="button" class="btn btn--ghost" data-act="l.closeModal">Отмена</button><button class="btn btn--primary" type="submit">Добавить</button></div>
    </form>`;
  }
  if (m.type === 'invoice') {
    title = 'Выставить счёт';
    body = `<form class="form-stack" data-form="l.invoice">
      <div class="form-row">
        <div class="field"><label for="in-client">Клиент</label><select class="input" id="in-client" name="clientId" required>${s.clients.map((c) => `<option value="${c.id}"${c.id === m.clientId ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="in-case">Дело</label><select class="input" id="in-case" name="caseId"><option value="">Без дела</option>${s.cases.map((k) => `<option value="${k.id}"${k.id === m.caseId ? ' selected' : ''}>${esc(k.title)} — ${esc(client(s, k.clientId).name)}</option>`).join('')}</select></div>
      </div>
      <div class="field"><label for="in-service">Услуга</label><input class="input" id="in-service" name="service" required placeholder="Например, подготовка искового заявления">
        <div class="chips chips--wrap chips--sm">${['Консультация', 'Подготовка претензии', 'Подготовка искового заявления', 'Представительство в суде'].map((x) => `<button type="button" class="chip" data-act="l.fillInput" data-target="in-service" data-val="${x}">${x}</button>`).join('')}</div></div>
      <div class="form-row">
        <div class="field"><label for="in-amount">Сумма, ₽</label><input class="input" id="in-amount" name="amount" type="number" min="100" step="100" required placeholder="5000"></div>
        <div class="field"><label for="in-due">Оплатить до</label><input class="input" id="in-due" name="due" type="date" required value="${toDateInput(Date.now() + 7 * 864e5)}"></div>
      </div>
      <p class="hint">Клиент увидит счёт в кабинете с кнопкой «Оплатить».</p>
      <div class="modal__foot"><button type="button" class="btn btn--ghost" data-act="l.closeModal">Отмена</button><button class="btn btn--primary" type="submit">Выставить</button></div>
    </form>`;
  }
  if (m.type === 'stage') {
    const k = caseOf(s, m.caseId);
    const st = k.timeline.find((t) => t.id === m.stageId);
    title = `Этап «${st.title}»`;
    body = `<form class="form-stack" data-form="l.stage" data-case="${k.id}" data-stage="${st.id}">
      <div class="field"><label for="st-note">Описание для клиента</label><textarea class="textarea" id="st-note" name="note" rows="3">${esc(st.note)}</textarea></div>
      <div class="modal__foot"><button type="button" class="btn btn--ghost" data-act="l.closeModal">Отмена</button><button class="btn btn--primary" type="submit">Сохранить</button></div>
    </form>`;
  }
  if (m.type === 'doc') {
    const d = byId(s.documents, m.id);
    if (!d) { ui.modal = null; return ''; }
    const c = client(s, d.clientId);
    const kase = d.caseId && caseOf(s, d.caseId);
    const rq = d.requestId && requestOf(s, d.requestId);
    wide = true;
    title = d.name;
    body = `<div class="doc-modal">
      ${docPreview(d)}
      <div>
        <dl class="facts">
          <div><dt>Статус</dt><dd>${pill(DOC_STATUS[d.status], `md:${d.id}`)}</dd></div>
          <div><dt>Клиент</dt><dd><a href="#/l/client/${c.id}" data-act="l.closeModalGo">${esc(c.name)}</a></dd></div>
          <div><dt>${kase ? 'Дело' : 'Обращение'}</dt><dd>${kase ? `<a href="#/l/case/${kase.id}/docs" data-act="l.closeModalGo">${esc(kase.title)}</a>` : rq ? `<a href="#/l/request/${rq.id}" data-act="l.closeModalGo">№${rq.number}</a>` : '—'}</dd></div>
          <div><dt>Загрузил</dt><dd>${d.status === 'requested' ? '—' : d.by === 'lawyer' ? esc(lawyer(s, d.lawyerId)?.name || 'Юрист') : esc(c.name)}</dd></div>
          <div><dt>Дата</dt><dd>${fmtWhen(d.at)}</dd></div>
          <div><dt>Тип и размер</dt><dd>${d.type ? d.type.toUpperCase() : '—'}${d.size ? ` · ${fileSize(d.size)}` : ''}</dd></div>
        </dl>
        ${d.comment ? `<p class="note">${icon('info')}${esc(d.comment)}</p>` : ''}
        <div class="btn-row">
          ${d.status === 'review' ? `<button class="btn btn--primary" data-act="l.docAccept" data-id="${d.id}">${icon('check')}Принять</button><button class="btn btn--secondary" data-act="l.modal" data-type="reject" data-id="${d.id}">Отклонить</button>` : ''}
          ${d.status === 'requested' ? `<button class="btn btn--secondary" data-act="l.remind" data-id="${d.id}">${icon('bell')}Напомнить клиенту</button>` : ''}
          ${d.status !== 'requested' ? `<button class="btn btn--ghost" data-act="c.download">${icon('download')}Скачать</button>` : ''}
        </div>
      </div>
    </div>`;
  }
  return `<div class="modal" data-k="modal:${m.type}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="modal__backdrop" data-act="l.closeModal"></div>
    <div class="modal__panel${wide ? ' modal__panel--wide' : ''}">
      <div class="modal__head"><h2>${esc(title)}</h2><button class="icon-btn" data-act="l.closeModal" aria-label="Закрыть">${icon('x')}</button></div>
      <div class="modal__body">${body}</div>
    </div>
  </div>`;
}

// ——— Действия ———

const closeModal = () => { ui.modal = null; rerender(); };
const TASK_NEXT = { todo: 'progress', progress: 'done', done: 'todo' };

Object.assign(actions, {
  'l.nav': () => { ui.navOpen = !ui.navOpen; rerender(); },
  'l.filter': (el) => { ui.filters[el.dataset.key] = el.dataset.val; rerender(); },
  'l.pop': (el) => { ui.popover = ui.popover === el.dataset.pop ? null : el.dataset.pop; rerender(); if (ui.popover === 'feed') setTimeout(() => { if (ui.popover === 'feed') A.markFeedRead(); }, 1500); },
  'l.popGo': () => { ui.popover = null; },
  'l.searchGo': () => { delete ui.drafts.search; },
  'l.feedRead': () => A.markFeedRead(),
  'l.switchLawyer': (el) => { ui.popover = null; A.setCurrentLawyer(el.dataset.id); toast(`Вы вошли как ${lawyer(getState(), el.dataset.id).name}`, { iconName: 'user' }); },
  'l.assignMe': (el) => { A.assignLawyer(el.dataset.id, getState().me.lawyerId); toast('Вы назначены ответственным. Клиент получил уведомление', { iconName: 'user' }); },
  'l.assign': (el) => { ui.popover = null; A.assignLawyer(el.dataset.id, el.dataset.lawyer); toast(`Ответственный: ${lawyer(getState(), el.dataset.lawyer).name}`, { iconName: 'user' }); },
  'l.caseLawyer': (el) => { ui.popover = null; A.setCaseLawyer(el.dataset.id, el.dataset.lawyer); toast('Ответственный юрист изменён', { iconName: 'user' }); },
  'l.setStatus': (el) => {
    ui.popover = null;
    const k = caseOf(getState(), el.dataset.id);
    if (k.status === el.dataset.status) { rerender(); return; }
    A.changeCaseStatus(el.dataset.id, el.dataset.status);
    toast(`Статус: ${CASE_STATUS[el.dataset.status].label}. Клиент уведомлён`, { iconName: 'refresh' });
  },
  'l.modal': (el) => {
    ui.popover = null;
    const d = el.dataset;
    ui.modal = { type: d.type, id: d.id, caseId: d.case || null, requestId: d.request || null, clientId: d.client || null, day: d.day || null };
    rerender();
  },
  'l.closeModal': closeModal,
  'l.closeModalGo': () => { ui.modal = null; },
  'l.openDoc': (el) => { ui.modal = { type: 'doc', id: el.dataset.id }; rerender(); },
  'l.docAccept': (el) => { A.reviewDocument(el.dataset.id, 'accepted'); if (ui.modal?.type === 'doc') ui.modal = null; toast('Документ принят', { iconName: 'check' }); },
  'l.remind': (el) => {
    const s = getState();
    const d = byId(s.documents, el.dataset.id);
    const threadId = d.caseId ? caseOf(s, d.caseId).threadId : requestOf(s, d.requestId).threadId;
    A.sendLawyerMessage({ threadId, text: `Напоминаю: загрузите, пожалуйста, документ «${d.name}» в личный кабинет. Это можно сделать с телефона — достаточно сфотографировать.` });
    ui.modal = null;
    toast('Напоминание отправлено клиенту', { iconName: 'bell' });
  },
  'l.closeRequest': (el) => { A.closeRequest(el.dataset.id); toast('Обращение закрыто'); },
  'l.focusReply': (el) => document.getElementById(`msg-${el.dataset.thread}`)?.focus(),
  'l.quick': (el) => {
    const key = `msg:${el.dataset.thread}`;
    ui.drafts[key] = QUICK[Number(el.dataset.i)];
    rerender();
    queueMicrotask(() => document.getElementById(`msg-${el.dataset.thread}`)?.focus());
  },
  'l.fill': (el) => { ui.drafts[el.dataset.key] = el.dataset.val; rerender(); },
  'l.fillInput': (el) => { const i = document.getElementById(el.dataset.target); if (i) { i.value = el.dataset.val; i.focus(); } },
  'l.taskTpl': (el) => { ui.drafts[`task:${el.dataset.case}`] = el.dataset.val; rerender(); queueMicrotask(() => document.getElementById('task-title')?.focus()); },
  'l.taskToggle': (el) => { const t = byId(getState().tasks, el.dataset.id); A.setTaskStatus(t.id, t.status === 'done' ? 'todo' : 'done'); },
  'l.taskCycle': (el) => { const t = byId(getState().tasks, el.dataset.id); A.setTaskStatus(t.id, TASK_NEXT[t.status]); },
  'l.advance': (el) => { A.advanceTimeline(el.dataset.id); toast('Этап завершён. Клиент видит обновлённый ход дела', { iconName: 'check' }); },
  'l.editStage': (el) => { ui.modal = { type: 'stage', caseId: el.dataset.case, stageId: el.dataset.stage }; rerender(); },
  'l.markPaid': (el) => { A.markInvoicePaid(el.dataset.id); toast('Оплата отмечена', { iconName: 'card' }); },
  'l.calDay': (el) => { ui.filters.calDay = el.dataset.day; rerender(); },
  'l.calMove': (el) => { const d = Number(el.dataset.d); ui.filters.calOffset = d === 0 ? 0 : (ui.filters.calOffset || 0) + d; if (d === 0) ui.filters.calDay = null; rerender(); },
  'l.toggleMine': (el) => { ui.filters.lCasesMine = el.checked; rerender(); },
  'l.toggleCalMine': (el) => { ui.filters.calMine = el.checked; rerender(); },
  'l.toggleSetting': (el) => { A.saveCompany({ [el.dataset.key]: el.checked }); toast('Настройка сохранена'); },
  'app.reset': () => {
    if (!confirm('Сбросить демо-данные? Все изменения будут потеряны.')) return;
    Object.assign(ui, { drafts: {}, wizard: null, sheet: null, modal: null, popover: null, filters: {}, notifSnapshot: null });
    reset();
    toast('Демо-данные восстановлены', { iconName: 'refresh' });
  },
});

// Чекбоксы и переключатели не должны отменять своё действие по умолчанию.
actions['l.toggleMine'].keepDefault = true;
actions['l.toggleCalMine'].keepDefault = true;
actions['l.toggleSetting'].keepDefault = true;
actions['l.popGo'].keepDefault = true;
actions['l.searchGo'].keepDefault = true;
actions['l.closeModalGo'].keepDefault = true;

Object.assign(forms, {
  'l.send': (form, data) => {
    const text = String(data.get('text') || '').trim();
    if (!text) return;
    A.sendLawyerMessage({ threadId: form.dataset.thread, text });
    delete ui.drafts[`msg:${form.dataset.thread}`];
  },
  'l.createCase': (form, data) => {
    const k = A.createCase(form.dataset.id, {
      title: String(data.get('title')).trim(),
      lawyerId: data.get('lawyerId'),
      deadline: data.get('deadline') ? new Date(`${data.get('deadline')}T18:00`).toISOString() : null,
      summary: String(data.get('summary')).trim(),
    });
    ui.modal = null;
    toast(`Дело ${k.number} создано. Клиент получил уведомление`, { iconName: 'briefcase' });
    go(`#/l/case/${k.id}`);
  },
  'l.requestDoc': (form, data) => {
    const m = ui.modal;
    A.requestDocument({ caseId: m.caseId || null, requestId: m.caseId ? null : m.requestId, name: String(data.get('name')).trim(), comment: String(data.get('comment') || '').trim(), setStatus: data.get('setStatus') === 'on' });
    delete ui.drafts['rd-name'];
    delete ui.drafts['rd-comment'];
    ui.modal = null;
    toast('Запрос отправлен. Клиент получил уведомление', { iconName: 'file' });
  },
  'l.reject': (form, data) => {
    A.reviewDocument(form.dataset.id, 'rejected', String(data.get('reason')).trim());
    delete ui.drafts['rj-reason'];
    ui.modal = null;
    toast('Документ отклонён. Клиент получил просьбу загрузить новую копию', { iconName: 'refresh' });
  },
  'l.task': (form, data) => {
    const title = String(data.get('title')).trim();
    if (!title) return;
    A.addTask({ caseId: form.dataset.case, title, assigneeId: data.get('assignee'), due: new Date(`${data.get('due')}T18:00`).toISOString() });
    delete ui.drafts[`task:${form.dataset.case}`];
    toast('Задача добавлена', { iconName: 'checkSquare' });
  },
  'l.event': (form, data) => {
    const s = getState();
    const type = data.get('type');
    const caseId = data.get('caseId') || null;
    const clientId = data.get('clientId') || (caseId ? caseOf(s, caseId).clientId : null);
    const allDay = type === 'deadline' || type === 'date';
    const time = allDay ? '18:00' : data.get('time') || '10:00';
    A.addEvent({
      type, title: String(data.get('title')).trim(), at: new Date(`${data.get('date')}T${time}`).toISOString(),
      duration: allDay ? 0 : 60, clientId, caseId, lawyerId: data.get('lawyerId'), place: String(data.get('place') || '').trim(),
    });
    ui.modal = null;
    ui.filters.calDay = new Date(`${data.get('date')}T12:00`).toISOString();
    toast(clientId ? 'Событие добавлено, клиент уведомлён' : 'Событие добавлено', { iconName: 'calendar' });
  },
  'l.invoice': (form, data) => {
    A.createInvoice({
      clientId: data.get('clientId'), caseId: data.get('caseId') || null, service: String(data.get('service')).trim(),
      amount: Number(data.get('amount')), dueAt: new Date(`${data.get('due')}T23:00`).toISOString(),
    });
    ui.modal = null;
    toast('Счёт выставлен. Клиент увидит его в кабинете', { iconName: 'card' });
  },
  'l.stage': (form, data) => {
    A.updateStageNote(form.dataset.case, form.dataset.stage, String(data.get('note')).trim());
    ui.modal = null;
    toast('Этап обновлён');
  },
  'l.company': (form, data) => {
    A.saveCompany({ ...Object.fromEntries(data), replySla: Number(data.get('replySla')) || 2 });
    toast('Изменения сохранены');
  },
});

Object.assign(uploads, {
  lcase: (files, id) => { A.uploadForClient({ files, caseId: id }); toast('Документ отправлен клиенту', { iconName: 'upload' }); },
  lchat: (files, id) => {
    const t = threadInfo(getState(), id);
    A.uploadForClient({ files, caseId: t.kase?.id || null, requestId: t.kase ? null : t.request?.id });
    toast('Документ отправлен клиенту', { iconName: 'upload' });
  },
});

