// Клиентское приложение: мобильный интерфейс с нижней навигацией.
import { getState } from './store.js';
import * as A from './actions.js';
import { icon } from './icons.js';
import { ui, actions, forms, changes, uploads, go, rerender, toast, draft, ACCEPT } from './ui.js';
import {
  CATEGORIES, category, CASE_STATUS, REQ_STATUS_CLIENT, DOC_STATUS_CLIENT, EVENT_TYPES,
  esc, money, fileSize, plural, fmtDate, fmtDateShort, fmtTime, fmtWhen, fmtDayLabel, fmtWeekday, relTime, deadlineText,
  startOfDay, sameDay, pill, avatar, fileBadge, logo, lawyer, client, caseOf, requestOf, byId,
  threadInfo, threadsOfClient, threadUnreadClient, clientUnread, activeCases, upcomingEvents, invoiceStatus, isOverdue, newest,
} from './format.js';
import { timeline, chatMessages, empty, docPreview } from './parts.js';

const firstName = (name) => name.split(' ')[0];

// ——— Каркас ———

export function renderClient(route) {
  const s = getState();
  const me = client(s, s.me.clientId);
  const [screen = 'home', id] = route;
  const views = {
    home, new: wizard, cases, case: caseScreen, request: requestScreen, chat: id ? thread : chats,
    docs, profile, notifications, calendar, payments, history,
  };
  const v = (views[screen] || home)(s, me, id, route);
  return `<div class="m-app${v.bare ? ' is-bare' : ''}${v.footer ? ' has-cta' : ''}">
    <main class="m-screen" data-screen="${screen}">${v.html}</main>
    ${v.footer || ''}
    ${v.bare ? '' : tabbar(s, me, v.tab)}
  </div>${sheet(s, me)}`;
}

function tabbar(s, me, active) {
  const unread = clientUnread(s, me.id);
  const needDocs = s.documents.filter((d) => d.clientId === me.id && (d.status === 'requested' || d.status === 'rejected')).length;
  const tabs = [
    ['home', 'Главная', 'home', 0],
    ['cases', 'Дела', 'briefcase', 0],
    ['chat', 'Сообщения', 'chat', unread],
    ['docs', 'Документы', 'file', needDocs],
    ['profile', 'Профиль', 'user', 0],
  ];
  return `<nav class="tabbar" aria-label="Разделы">${tabs.map(([id, label, ic, badge]) => `
    <a class="tabbar__item${active === id ? ' is-active' : ''}" href="#/c/${id}"${active === id ? ' aria-current="page"' : ''}>
      <span class="tabbar__icon">${icon(ic)}${badge ? `<span class="badge" data-k="tb:${id}" data-v="${badge}">${badge}</span>` : ''}</span>
      <span>${label}</span>
    </a>`).join('')}</nav>`;
}

const bar = ({ back, title = '', right = '', sub = '' }) => `
  <header class="m-bar">
    ${back ? `<a class="icon-btn" href="${back}" aria-label="Назад">${icon('left')}</a>` : '<span class="m-bar__gap"></span>'}
    <div class="m-bar__title">${title}${sub ? `<small>${sub}</small>` : ''}</div>
    <div class="m-bar__right">${right || '<span class="m-bar__gap"></span>'}</div>
  </header>`;

function bell(s, me) {
  const n = s.notifications.filter((x) => x.clientId === me.id && !x.read).length;
  return `<a class="icon-btn" href="#/c/notifications" aria-label="Уведомления${n ? `: ${n} новых` : ''}">${icon('bell')}${n ? `<span class="badge" data-k="bell" data-v="${n}">${n}</span>` : ''}</a>`;
}

const topbar = (s, me) => `
  <header class="m-top">
    <a href="#/c/home" class="m-top__logo" aria-label="Мотив — на главную">${logo()}</a>
    <div class="m-top__right">
      <a class="icon-btn" href="#/c/calendar" aria-label="Календарь">${icon('calendar')}</a>
      ${bell(s, me)}
    </div>
  </header>`;

// ——— Главная ———

function home(s, me) {
  const requested = s.documents.filter((d) => d.clientId === me.id && (d.status === 'requested' || d.status === 'rejected'));
  const next = upcomingEvents(s, (e) => e.clientId === me.id)[0];
  const cards = myItems(s, me).slice(0, 4);

  return {
    tab: 'home',
    html: `${topbar(s, me)}
    <section class="m-hero">
      <p class="m-hello">Здравствуйте, ${esc(firstName(me.name))}</p>
      <h1 class="m-h1">Чем можем помочь?</h1>
    </section>
    <div class="cat-grid">${CATEGORIES.map((c) => `
      <button class="cat" data-act="c.start" data-cat="${c.id}">
        <span class="cat__icon">${icon(c.icon)}</span>
        <span class="cat__title">${c.title}</span>
      </button>`).join('')}
    </div>
    <button class="m-link-row" data-act="c.start">${icon('pen')}<span>Не знаю, что выбрать — опишу своими словами</span>${icon('right')}</button>

    ${requested.length ? `<section class="m-section">
      <div class="alert-card" data-k="need-docs" data-v="${requested.length}">
        <div class="alert-card__head">${icon('alert')}<b>${requested.length === 1 ? 'Юрист ждёт документ' : `Юрист ждёт ${requested.length} ${plural(requested.length, 'документ', 'документа', 'документов')}`}</b></div>
        <p>${requested.map((d) => esc(d.name)).join(', ')}</p>
        <a class="btn btn--primary btn--block" href="#/c/docs">${icon('upload')}Загрузить</a>
      </div>
    </section>` : ''}

    ${next ? `<section class="m-section">
      <div class="m-section__head"><h2>Ближайшее</h2><a href="#/c/calendar">Календарь</a></div>
      ${eventCard(s, next)}
    </section>` : ''}

    <section class="m-section">
      <div class="m-section__head"><h2>Мои дела</h2>${cards.length ? '<a href="#/c/cases">Все</a>' : ''}</div>
      ${cards.length ? `<div class="stack">${cards.map((x) => (x.isRequest ? requestCard(s, x) : caseCard(s, x))).join('')}</div>`
        : empty('briefcase', 'Пока нет дел', 'Выберите категорию выше, чтобы отправить первое обращение.')}
    </section>`,
  };
}

function myItems(s, me, { done = false } = {}) {
  const reqs = s.requests.filter((r) => r.clientId === me.id && !r.caseId && (done ? r.status === 'closed' : r.status !== 'closed'));
  const cs = s.cases.filter((c) => c.clientId === me.id && (done ? c.status === 'done' : c.status !== 'done'));
  return [...reqs.map((r) => ({ ...r, isRequest: true, sort: r.createdAt })), ...cs.map((c) => ({ ...c, sort: c.updatedAt }))].sort((a, b) => b.sort.localeCompare(a.sort));
}

function caseCard(s, c) {
  const l = lawyer(s, c.lawyerId);
  const cat = category(c.category);
  return `<a class="case-card" href="#/c/case/${c.id}" data-k="cc:${c.id}">
    <div class="case-card__top"><span class="case-card__cat">${icon(cat.icon)}${cat.title}</span>${pill(CASE_STATUS[c.status], `ccs:${c.id}`)}</div>
    <h3 class="case-card__title">${esc(c.title)}</h3>
    <div class="case-card__person">${avatar(l, 'sm')}<span><b>${esc(l?.name || '—')}</b><small>Ответственный юрист</small></span></div>
    <div class="case-card__foot"><span>Обновлено ${relTime(c.updatedAt)}</span><span class="btn btn--secondary btn--sm">Открыть дело</span></div>
  </a>`;
}

function requestCard(s, r) {
  const l = lawyer(s, r.lawyerId);
  const cat = category(r.category);
  return `<a class="case-card" href="#/c/request/${r.id}" data-k="rc:${r.id}">
    <div class="case-card__top"><span class="case-card__cat">${icon(cat.icon)}${cat.title}</span>${pill(REQ_STATUS_CLIENT[r.status], `rcs:${r.id}`)}</div>
    <h3 class="case-card__title">Моё обращение №${r.number}</h3>
    <div class="case-card__person">${avatar(l, 'sm')}<span><b>${l ? esc(l.name) : 'Юрист будет назначен'}</b><small>${l ? 'Ответственный юрист' : 'Обычно в течение 2 часов'}</small></span></div>
    <div class="case-card__foot"><span>Отправлено ${relTime(r.createdAt)}</span><span class="btn btn--secondary btn--sm">Открыть</span></div>
  </a>`;
}

function eventCard(s, e) {
  const t = EVENT_TYPES[e.type];
  const l = lawyer(s, e.lawyerId);
  const d = new Date(e.at);
  return `<a class="event-card event-card--${t.tone}" href="#/c/calendar" data-k="ev:${e.id}">
    <span class="event-card__date"><b>${d.getDate()}</b><small>${fmtWeekday(d)}</small></span>
    <span class="event-card__body">
      <span class="event-card__type">${t.label} · ${fmtDayLabel(e.at).toLowerCase()}${e.duration ? `, ${fmtTime(e.at)}` : ''}</span>
      <b>${esc(e.title)}</b>
      <small>${[l?.name, e.place].filter(Boolean).map(esc).join(' · ')}</small>
    </span>
  </a>`;
}

// ——— Новое обращение ———

function startWizard(cat = null) {
  const s = getState();
  const me = client(s, s.me.clientId);
  ui.wizard = { category: cat, description: '', files: [], name: me.name, phone: me.phone, email: me.email, error: '' };
}

function wizard(s, me, step) {
  if (step === 'done') return wizardDone(s, me, location.hash.split('/')[4]);
  if (!ui.wizard) startWizard();
  const w = ui.wizard;
  const n = Math.min(4, Math.max(1, Number(step) || 1));
  if (n > 1 && !w.category) { queueMicrotask(() => go('#/c/new/1')); return { bare: true, html: '' }; }
  const cat = category(w.category);
  const back = n === 1 ? '#/c/home' : `#/c/new/${n - 1}`;
  const progress = `<div class="stepper" aria-label="Шаг ${n} из 4">${[1, 2, 3, 4].map((i) => `<span class="${i <= n ? 'is-on' : ''}"></span>`).join('')}</div>`;
  const head = `${bar({ back, title: 'Новое обращение', sub: `Шаг ${n} из 4`, right: `<a class="icon-btn" href="#/c/home" aria-label="Закрыть">${icon('x')}</a>` })}${progress}`;
  const err = w.error ? `<p class="field-error" role="alert">${esc(w.error)}</p>` : '';

  if (n === 1) {
    return {
      bare: true,
      html: `${head}<div class="m-pad"><h1 class="m-h1">Что у вас произошло?</h1><p class="m-lead">Выберите тему — так обращение сразу попадёт к профильному юристу.</p>
        <div class="opt-list">${CATEGORIES.map((c) => `
          <button class="opt${w.category === c.id ? ' is-selected' : ''}" data-act="c.pickCat" data-cat="${c.id}">
            <span class="opt__icon">${icon(c.icon)}</span>
            <span class="opt__text"><b>${c.title}</b><small>${c.hint}</small></span>
            ${icon(w.category === c.id ? 'check' : 'right', 'opt__chev')}
          </button>`).join('')}
        </div></div>`,
    };
  }

  if (n === 2) {
    const len = w.description.trim().length;
    return {
      bare: true,
      html: `${head}<div class="m-pad">
        <button class="chip chip--static" data-go="#/c/new/1">${icon(cat.icon)}${cat.title}<span class="chip__edit">Изменить</span></button>
        <h1 class="m-h1">Кратко опишите ситуацию</h1>
        <p class="m-lead">Что случилось, когда и что вы хотите получить в итоге. Достаточно нескольких предложений — детали юрист уточнит сам.</p>
        <div class="field">
          <label class="sr-only" for="wiz-desc">Описание ситуации</label>
          <textarea class="textarea textarea--lg" id="wiz-desc" data-wiz="description" maxlength="2000" placeholder="Например: в марте заключила договор подряда на ремонт квартиры. Срок сорван на два месяца, подрядчик требует доплату…">${esc(w.description)}</textarea>
          <div class="field__foot"><span>${err}</span><span class="counter" id="wiz-count">${len} / 2000</span></div>
        </div>
      </div>`,
      footer: `<div class="m-cta"><button class="btn btn--primary btn--lg btn--block" data-act="c.wizNext" data-step="2">Далее</button></div>`,
    };
  }

  if (n === 3) {
    return {
      bare: true,
      html: `${head}<div class="m-pad">
        <h1 class="m-h1">Добавьте документы</h1>
        <p class="m-lead">Договоры, переписка, фото — всё, что поможет юристу быстрее разобраться. Шаг можно пропустить.</p>
        ${uploadTiles('wizard')}
        <p class="hint">PDF, JPG, PNG, DOCX · до 20 МБ каждый</p>
        <div class="file-list">${w.files.map((f) => `
          <div class="file-row" data-k="wf:${f.id}">
            ${f.thumb ? `<img class="file-row__thumb" src="${f.thumb}" alt="">` : fileBadge(f.type)}
            <span class="file-row__main"><b>${esc(f.name)}</b><small>${fileSize(f.size)}</small><span class="progress"><i></i></span></span>
            <span class="file-row__ok">${icon('check')}</span>
            <button class="icon-btn icon-btn--sm" data-act="c.wizRemove" data-id="${f.id}" aria-label="Удалить ${esc(f.name)}">${icon('x')}</button>
          </div>`).join('')}
        </div>
      </div>`,
      footer: `<div class="m-cta"><button class="btn btn--primary btn--lg btn--block" data-go="#/c/new/4">${w.files.length ? `Далее · ${w.files.length} ${plural(w.files.length, 'файл', 'файла', 'файлов')}` : 'Пропустить'}</button></div>`,
    };
  }

  return {
    bare: true,
    html: `${head}<div class="m-pad">
      <h1 class="m-h1">Контакты</h1>
      <p class="m-lead">Юрист свяжется с вами удобным способом. Статус и ответы будут приходить сюда, в личный кабинет.</p>
      <div class="form-stack">
        <div class="field"><label for="wiz-name">Имя</label><input class="input" id="wiz-name" data-wiz="name" autocomplete="name" value="${esc(w.name)}"></div>
        <div class="field"><label for="wiz-phone">Телефон</label><input class="input" id="wiz-phone" data-wiz="phone" data-mask="phone" type="tel" inputmode="tel" autocomplete="tel" value="${esc(w.phone)}" placeholder="+7 (___) ___-__-__"></div>
        <div class="field"><label for="wiz-email">Email</label><input class="input" id="wiz-email" data-wiz="email" type="email" inputmode="email" autocomplete="email" value="${esc(w.email)}"></div>
      </div>
      ${err}
      <div class="summary">
        <div class="summary__row"><span>Тема</span><b>${cat.title}</b></div>
        <div class="summary__row"><span>Ситуация</span><b class="clamp-2">${esc(w.description)}</b></div>
        <div class="summary__row"><span>Документы</span><b>${w.files.length ? `${w.files.length} ${plural(w.files.length, 'файл', 'файла', 'файлов')}` : 'Не добавлены'}</b></div>
      </div>
      <p class="hint">Нажимая «Отправить обращение», вы соглашаетесь на обработку персональных данных. Данные видят только юристы «Мотива».</p>
    </div>`,
    footer: `<div class="m-cta"><button class="btn btn--primary btn--lg btn--block" data-act="c.submit">Отправить обращение</button></div>`,
  };
}

function wizardDone(s, me, reqId) {
  const r = requestOf(s, reqId);
  if (!r) return home(s, me);
  return {
    bare: true,
    html: `<div class="done">
      <span class="done__mark" data-k="done-mark">${icon('check')}</span>
      <h1 class="m-h1">Обращение принято</h1>
      <p class="done__num">№${r.number}</p>
      <p class="m-lead">Юрист изучит информацию и свяжется с вами.</p>
      <div class="done__info">${icon('clock')}<span>В рабочее время отвечаем в течение ${s.company.replySla} часов. Статус обращения и сообщения юриста появятся в разделе «Дела».</span></div>
      <div class="done__actions">
        <a class="btn btn--primary btn--lg btn--block" href="#/c/request/${r.id}">Открыть обращение</a>
        <a class="btn btn--ghost btn--lg btn--block" href="#/c/home">На главную</a>
      </div>
    </div>`,
  };
}

const uploadTiles = (ctx) => `
  <div class="upload-tiles">
    <label class="upload-tile">
      <input type="file" accept="image/*" capture="environment" data-upload="${ctx}" class="sr-only">
      <span class="upload-tile__icon">${icon('camera')}</span><b>Сфотографировать</b><small>Камера телефона</small>
    </label>
    <label class="upload-tile">
      <input type="file" accept="${ACCEPT}" multiple data-upload="${ctx}" class="sr-only">
      <span class="upload-tile__icon">${icon('upload')}</span><b>Выбрать файл</b><small>PDF, JPG, PNG, DOCX</small>
    </label>
  </div>`;

// ——— Дела ———

function cases(s, me) {
  const f = ui.filters.cCases || 'active';
  const items = myItems(s, me, { done: f === 'done' });
  return {
    tab: 'cases',
    html: `${topbar(s, me)}<div class="m-pad-x"><h1 class="m-h1 m-h1--page">Дела</h1>
      <div class="segmented" role="tablist">
        <button role="tab" aria-selected="${f === 'active'}" class="${f === 'active' ? 'is-active' : ''}" data-act="c.filter" data-key="cCases" data-val="active">Активные</button>
        <button role="tab" aria-selected="${f === 'done'}" class="${f === 'done' ? 'is-active' : ''}" data-act="c.filter" data-key="cCases" data-val="done">Завершённые</button>
      </div></div>
      <div class="m-section">${items.length ? `<div class="stack">${items.map((x) => (x.isRequest ? requestCard(s, x) : caseCard(s, x))).join('')}</div>`
        : empty('briefcase', f === 'done' ? 'Завершённых дел нет' : 'Активных дел нет', f === 'done' ? '' : 'Отправьте обращение — юрист откроет дело.', f === 'done' ? '' : '<button class="btn btn--primary" data-act="c.start">Новое обращение</button>')}</div>`,
  };
}

function caseScreen(s, me, id) {
  const c = caseOf(s, id);
  if (!c || c.clientId !== me.id) return cases(s, me);
  const l = lawyer(s, c.lawyerId);
  const cat = category(c.category);
  const docs = s.documents.filter((d) => d.caseId === c.id).sort(newest);
  const need = docs.filter((d) => d.status === 'requested' || d.status === 'rejected');
  const evs = upcomingEvents(s, (e) => e.caseId === c.id);
  const invs = s.invoices.filter((i) => i.caseId === c.id).sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  const unread = threadUnreadClient(s, c.threadId);

  return {
    tab: 'cases',
    html: `${bar({ back: '#/c/cases', title: 'Дело', right: `<a class="icon-btn" href="#/c/chat/${c.threadId}" aria-label="Сообщения">${icon('chat')}${unread ? `<span class="badge">${unread}</span>` : ''}</a>` })}
    <div class="m-pad">
      <div class="case-head">
        <span class="case-card__cat">${icon(cat.icon)}${cat.title}</span>
        <h1 class="m-h1">${esc(c.title)}</h1>
        ${pill(CASE_STATUS[c.status], `cs:${c.id}`)}
      </div>
      <dl class="facts">
        <div><dt>Номер дела</dt><dd>${c.number}</dd></div>
        <div><dt>Дата открытия</dt><dd>${fmtDate(c.openedAt)}</dd></div>
        ${c.deadline && c.status !== 'done' ? `<div><dt>Ближайший срок</dt><dd>${fmtDate(c.deadline)} <small>${deadlineText(c.deadline)}</small></dd></div>` : ''}
        <div><dt>Обновлено</dt><dd>${relTime(c.updatedAt)}</dd></div>
      </dl>
      <div class="person-card">
        ${avatar(l, 'lg')}<span><small>Ответственный юрист</small><b>${esc(l.name)}</b><small>${esc(l.area)}</small></span>
      </div>
      <div class="btn-row">
        <a class="btn btn--primary" href="#/c/chat/${c.threadId}">${icon('chat')}Написать юристу</a>
        <button class="btn btn--secondary" data-act="c.sheet" data-type="upload" data-target="case:${c.id}">${icon('upload')}Документ</button>
      </div>
    </div>

    ${need.length ? `<section class="m-section">${need.map((d) => requestedCard(d)).join('')}</section>` : ''}

    <section class="m-section">
      <div class="m-section__head"><h2>Ход дела</h2></div>
      <div class="card card--pad">${timeline(c)}</div>
    </section>

    ${evs.length ? `<section class="m-section"><div class="m-section__head"><h2>Ближайшие события</h2></div><div class="stack">${evs.slice(0, 3).map((e) => eventCard(s, e)).join('')}</div></section>` : ''}

    <section class="m-section">
      <div class="m-section__head"><h2>Документы</h2><a href="#/c/docs">Все</a></div>
      <div class="list">${docs.filter((d) => d.status !== 'requested').slice(0, 5).map((d) => docRow(s, d)).join('') || '<p class="muted pad">Документов пока нет</p>'}</div>
    </section>

    ${invs.length ? `<section class="m-section"><div class="m-section__head"><h2>Оплаты</h2></div><div class="list">${invs.map((i) => invoiceRow(i)).join('')}</div></section>` : ''}
    <div class="m-space"></div>`,
  };
}

function requestScreen(s, me, id) {
  const r = requestOf(s, id);
  if (!r || r.clientId !== me.id) return cases(s, me);
  if (r.caseId) { queueMicrotask(() => go(`#/c/case/${r.caseId}`)); return { html: '' }; }
  const l = lawyer(s, r.lawyerId);
  const cat = category(r.category);
  const docs = s.documents.filter((d) => d.requestId === r.id).sort(newest);
  const need = docs.filter((d) => d.status === 'requested' || d.status === 'rejected');
  const steps = [
    { title: 'Обращение принято', state: 'done', at: r.createdAt },
    { title: 'Юрист изучает обращение', state: r.lawyerId ? 'done' : 'current', note: l ? l.name : 'Назначим профильного юриста' },
    { title: 'Открытие дела', state: r.lawyerId ? 'current' : 'upcoming', note: 'Юрист предложит план работы и стоимость' },
  ];
  return {
    tab: 'cases',
    html: `${bar({ back: '#/c/cases', title: 'Обращение', right: `<a class="icon-btn" href="#/c/chat/${r.threadId}" aria-label="Сообщения">${icon('chat')}</a>` })}
    <div class="m-pad">
      <div class="case-head">
        <span class="case-card__cat">${icon(cat.icon)}${cat.title}</span>
        <h1 class="m-h1">Обращение №${r.number}</h1>
        ${pill(REQ_STATUS_CLIENT[r.status], `rs:${r.id}`)}
      </div>
      <div class="card card--pad quote">${esc(r.description)}</div>
      <div class="person-card">${avatar(l, 'lg')}<span><small>Ответственный юрист</small><b>${l ? esc(l.name) : 'Назначается'}</b><small>${l ? esc(l.area) : 'Обычно в течение 2 часов в рабочее время'}</small></span></div>
      <div class="btn-row">
        <a class="btn btn--primary" href="#/c/chat/${r.threadId}">${icon('chat')}Написать</a>
        <button class="btn btn--secondary" data-act="c.sheet" data-type="upload" data-target="request:${r.id}">${icon('upload')}Документ</button>
      </div>
    </div>
    ${need.length ? `<section class="m-section">${need.map((d) => requestedCard(d)).join('')}</section>` : ''}
    <section class="m-section"><div class="m-section__head"><h2>Статус</h2></div>
      <div class="card card--pad">${timeline({ id: r.id, timeline: steps })}</div></section>
    <section class="m-section"><div class="m-section__head"><h2>Документы</h2></div>
      <div class="list">${docs.filter((d) => d.status !== 'requested').map((d) => docRow(s, d)).join('') || '<p class="muted pad">Документы не добавлены</p>'}</div></section>
    <div class="m-space"></div>`,
  };
}

// ——— Сообщения ———

function chats(s, me) {
  const list = threadsOfClient(s, me.id);
  return {
    tab: 'chat',
    html: `${topbar(s, me)}<div class="m-pad-x"><h1 class="m-h1 m-h1--page">Сообщения</h1></div>
    <div class="list list--flush">${list.map((t) => {
      const l = lawyer(s, t.lawyerId);
      const unread = threadUnreadClient(s, t.threadId);
      const lastText = t.last.from === 'system' ? t.last.text : `${t.last.from === 'client' ? 'Вы: ' : ''}${t.last.text || 'Документ'}`;
      return `<a class="thread-row${unread ? ' is-unread' : ''}" href="#/c/chat/${t.threadId}" data-k="th:${t.threadId}" data-v="${t.last.id}">
        ${l ? avatar(l) : `<span class="avatar avatar--md avatar--brand">${icon('chat')}</span>`}
        <span class="thread-row__main">
          <span class="thread-row__top"><b>${esc(t.title)}</b><time>${relTime(t.last.at)}</time></span>
          <span class="thread-row__sub">${l ? esc(l.name) : 'Юридическая компания «Мотив»'}</span>
          <span class="thread-row__last">${esc(lastText)}</span>
        </span>
        ${unread ? `<span class="badge badge--inline">${unread}</span>` : ''}
      </a>`;
    }).join('') || empty('chat', 'Сообщений пока нет', 'Переписка с юристом появится после первого обращения.')}</div>`,
  };
}

function thread(s, me, threadId) {
  const t = threadInfo(s, threadId);
  if (!t.clientId || t.clientId !== me.id) return chats(s, me);
  const l = lawyer(s, t.lawyerId);
  if (threadUnreadClient(s, threadId)) queueMicrotask(() => A.markThreadReadByClient(threadId));
  const back = t.kase ? `#/c/case/${t.kase.id}` : '#/c/chat';
  return {
    bare: true,
    html: `<header class="m-bar m-bar--chat">
        <a class="icon-btn" href="#/c/chat" aria-label="Назад">${icon('left')}</a>
        <a class="chat-head" href="${back}">
          ${l ? avatar(l, 'sm') : `<span class="avatar avatar--sm avatar--brand">${icon('chat')}</span>`}
          <span><b>${l ? esc(l.name) : 'Юрист назначается'}</b><small>${l ? 'Ответственный юрист' : ''} · ${esc(t.title)}</small></span>
        </a>
        <span class="m-bar__gap"></span>
      </header>
      <div class="chat" data-chat>${chatMessages(s, threadId, 'client')}</div>`,
    footer: composer(`c.send`, threadId, `chat:${threadId}`, 'Сообщение юристу'),
  };
}

export const composer = (form, threadId, uploadCtx, placeholder) => `
  <form class="composer" data-form="${form}" data-thread="${threadId}">
    <label class="icon-btn composer__attach" aria-label="Прикрепить документ">
      ${icon('clip')}<input type="file" accept="${ACCEPT}" multiple data-upload="${uploadCtx}" class="sr-only">
    </label>
    <textarea class="composer__input" id="msg-${threadId}" name="text" rows="1" data-draft="msg:${threadId}" data-enter-submit placeholder="${placeholder}">${esc(draft(`msg:${threadId}`))}</textarea>
    <button class="composer__send" type="submit" aria-label="Отправить">${icon('send')}</button>
  </form>`;

// ——— Документы ———

function docs(s, me) {
  const all = s.documents.filter((d) => d.clientId === me.id).sort(newest);
  const need = all.filter((d) => d.status === 'requested' || d.status === 'rejected');
  const f = ui.filters.cDocs || 'all';
  const list = all.filter((d) => d.status !== 'requested' && (f === 'all' || (f === 'mine' ? d.by === 'client' : d.by === 'lawyer')));
  return {
    tab: 'docs',
    html: `${topbar(s, me)}<div class="m-pad-x"><h1 class="m-h1 m-h1--page">Документы</h1>
      <div class="btn-row">
        <button class="btn btn--primary" data-act="c.sheet" data-type="upload">${icon('upload')}Загрузить документ</button>
        <button class="btn btn--secondary" data-act="c.sheet" data-type="ask">${icon('fileText')}Запросить у юриста</button>
      </div></div>
    ${need.length ? `<section class="m-section"><div class="m-section__head"><h2>Нужно загрузить</h2></div>${need.map((d) => requestedCard(d)).join('')}</section>` : ''}
    <section class="m-section">
      <div class="chips" role="tablist">
        ${[['all', 'Все'], ['mine', 'Мои'], ['lawyer', 'От юриста']].map(([k, label]) => `<button class="chip${f === k ? ' is-active' : ''}" data-act="c.filter" data-key="cDocs" data-val="${k}">${label}</button>`).join('')}
      </div>
      <div class="list">${list.map((d) => docRow(s, d, true)).join('') || '<p class="muted pad">Документов нет</p>'}</div>
    </section>`,
  };
}

function docRow(s, d, withCase = false) {
  const kase = d.caseId && caseOf(s, d.caseId);
  const rq = !kase && d.requestId && requestOf(s, d.requestId);
  const where = withCase ? (kase ? kase.title : rq ? `Обращение №${rq.number}` : '') : '';
  const meta = [where, fmtDateShort(d.at), d.by === 'lawyer' ? 'от юриста' : fileSize(d.size)].filter(Boolean).join(' · ');
  return `<button class="doc-row" data-act="c.openDoc" data-id="${d.id}" data-k="d:${d.id}" data-v="${d.status}">
    ${d.thumb ? `<img class="doc-row__thumb" src="${d.thumb}" alt="">` : fileBadge(d.type)}
    <span class="doc-row__main"><b>${esc(d.name)}</b><small>${esc(meta)}</small></span>
    ${pill(DOC_STATUS_CLIENT[d.status], `ds:${d.id}`)}
  </button>`;
}

function requestedCard(d) {
  const s = getState();
  const l = lawyer(s, d.lawyerId);
  const rejected = d.status === 'rejected';
  return `<div class="need-card${rejected ? ' need-card--red' : ''}" data-k="need:${d.id}" data-v="${d.status}">
    <div class="need-card__head">${icon(rejected ? 'refresh' : 'alert')}<span><b>${esc(d.name)}</b><small>${rejected ? 'Нужна новая копия' : `Запросил${l && l.name.endsWith('а') ? 'а' : ''} ${esc(l?.name || 'юрист')}`}${d.requestedAt ? ` · ${relTime(d.requestedAt)}` : ''}</small></span></div>
    ${d.comment ? `<p>${esc(d.comment)}</p>` : ''}
    <div class="btn-row btn-row--tight">
      <label class="btn btn--primary btn--sm"><input type="file" accept="image/*" capture="environment" data-upload="fulfill:${d.id}" class="sr-only">${icon('camera')}Сфотографировать</label>
      <label class="btn btn--secondary btn--sm"><input type="file" accept="${ACCEPT}" data-upload="fulfill:${d.id}" class="sr-only">${icon('upload')}Файл</label>
    </div>
  </div>`;
}

// ——— Профиль, история, платежи ———

function profile(s, me) {
  const active = activeCases(s, me.id).length;
  const docsN = s.documents.filter((d) => d.clientId === me.id && d.status !== 'requested').length;
  const due = s.invoices.filter((i) => i.clientId === me.id && i.status === 'unpaid');
  const reqs = s.requests.filter((r) => r.clientId === me.id).length;
  const row = (href, ic, title, value = '') => `<a class="menu-row" href="${href}">${icon(ic)}<span>${title}</span>${value ? `<em>${value}</em>` : ''}${icon('right', 'menu-row__chev')}</a>`;
  return {
    tab: 'profile',
    html: `${topbar(s, me)}
    <div class="m-pad">
      <div class="profile-head">
        ${avatar(me, 'xl')}
        <div><h1 class="m-h1">${esc(me.name)}</h1><p class="muted">Клиент с ${fmtDate(me.since)}</p></div>
      </div>
      <div class="card">
        <div class="kv"><span>${icon('phone')}Телефон</span><b>${esc(me.phone)}</b></div>
        <div class="kv"><span>${icon('mail')}Email</span><b>${esc(me.email)}</b></div>
        <button class="kv kv--action" data-act="c.sheet" data-type="profile">${icon('pen')}Изменить данные</button>
      </div>
      <div class="stats">
        <a href="#/c/cases"><b>${active}</b><span>${plural(active, 'активное дело', 'активных дела', 'активных дел')}</span></a>
        <a href="#/c/docs"><b>${docsN}</b><span>${plural(docsN, 'документ', 'документа', 'документов')}</span></a>
        <a href="#/c/payments"><b>${due.length}</b><span>к оплате</span></a>
      </div>
    </div>
    <section class="m-section"><div class="card menu">
      ${row('#/c/history', 'history', 'История обращений', reqs)}
      ${row('#/c/cases', 'briefcase', 'Активные дела', active)}
      ${row('#/c/docs', 'file', 'Документы', docsN)}
      ${row('#/c/payments', 'card', 'Платежи', due.length ? money(due.reduce((a, i) => a + i.amount, 0)) : '')}
      ${row('#/c/chat', 'chat', 'История общения')}
      ${row('#/c/calendar', 'calendar', 'Календарь')}
      ${row('#/c/notifications', 'bell', 'Уведомления')}
    </div></section>
    <section class="m-section">
      <div class="card card--pad company">
        <div class="company__head">${logo(true)}</div>
        <div class="kv"><span>${icon('phone')}</span><a href="tel:${s.company.phone.replace(/[^\d+]/g, '')}">${esc(s.company.phone)}</a></div>
        <div class="kv"><span>${icon('building')}</span><b>${esc(s.company.address)}</b></div>
        <div class="kv"><span>${icon('clock')}</span><b>${esc(s.company.hours)}</b></div>
      </div>
    </section>
    <section class="m-section demo-links">
      <a href="#/l/overview">${icon('monitor')}Открыть панель юриста</a>
      <a href="#/demo">${icon('columns')}Демо: оба интерфейса рядом</a>
      <button data-act="app.reset">${icon('refresh')}Сбросить демо-данные</button>
    </section>`,
  };
}

function history(s, me) {
  const reqs = s.requests.filter((r) => r.clientId === me.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return {
    tab: 'profile',
    html: `${bar({ back: '#/c/profile', title: 'История обращений' })}
    <div class="list list--flush">${reqs.map((r) => {
      const kase = r.caseId && caseOf(s, r.caseId);
      return `<a class="doc-row" href="${kase ? `#/c/case/${kase.id}` : `#/c/request/${r.id}`}">
        <span class="fbadge fbadge--num">№${r.number}</span>
        <span class="doc-row__main"><b>${kase ? esc(kase.title) : category(r.category).title}</b><small>${fmtDate(r.createdAt)} · ${category(r.category).title}</small></span>
        ${kase ? pill(CASE_STATUS[kase.status]) : pill(REQ_STATUS_CLIENT[r.status])}
      </a>`;
    }).join('')}</div>`,
  };
}

function payments(s, me) {
  const list = s.invoices.filter((i) => i.clientId === me.id).sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  const due = list.filter((i) => i.status === 'unpaid');
  const sum = due.reduce((a, i) => a + i.amount, 0);
  return {
    tab: 'profile',
    html: `${bar({ back: '#/c/profile', title: 'Платежи' })}
    <div class="m-pad">
      <div class="pay-summary" data-k="pay-sum" data-v="${sum}">
        <span>К оплате</span><b>${money(sum)}</b>
        <small>${due.length ? `${due.length} ${plural(due.length, 'счёт', 'счёта', 'счетов')}` : 'Все счета оплачены'}</small>
      </div>
    </div>
    <div class="list">${list.map((i) => invoiceRow(i, true)).join('') || empty('card', 'Счетов пока нет')}</div>`,
  };
}

function invoiceRow(i, withCase = false) {
  const s = getState();
  const kase = i.caseId && caseOf(s, i.caseId);
  return `<div class="inv-row" data-k="inv:${i.id}" data-v="${i.status}">
    <span class="inv-row__main"><b>${esc(i.service)}</b><small>${i.number} · ${fmtDate(i.issuedAt)}${withCase && kase ? ` · ${esc(kase.title)}` : ''}</small></span>
    <span class="inv-row__side"><b>${money(i.amount)}</b>${i.status === 'paid' ? pill(invoiceStatus(i), `is:${i.id}`) : `<button class="btn btn--primary btn--sm" data-act="c.sheet" data-type="pay" data-id="${i.id}">Оплатить</button>`}</span>
  </div>`;
}

// ——— Уведомления и календарь ———

const NOTIF_ICON = { docs: 'file', status: 'refresh', message: 'chat', event: 'calendar', invoice: 'card', case: 'briefcase', assign: 'user', timeline: 'check' };

function notifications(s, me) {
  const list = s.notifications.filter((n) => n.clientId === me.id).sort(newest);
  if (!ui.notifSnapshot) {
    ui.notifSnapshot = new Set(list.filter((n) => !n.read).map((n) => n.id));
    if (ui.notifSnapshot.size) setTimeout(() => A.markNotificationsRead(), 600);
  }
  return {
    tab: 'home',
    html: `${bar({ back: '#/c/home', title: 'Уведомления' })}
    <div class="list list--flush">${list.map((n) => `
      <a class="notif${ui.notifSnapshot.has(n.id) ? ' is-new' : ''}" href="${n.link || '#/c/home'}" data-k="n:${n.id}">
        <span class="notif__icon notif__icon--${n.kind}">${icon(NOTIF_ICON[n.kind] || 'bell')}</span>
        <span class="notif__body"><span class="notif__top"><b>${esc(n.title)}</b><time>${relTime(n.at)}</time></span><span>${esc(n.text)}</span></span>
      </a>`).join('') || empty('bell', 'Уведомлений нет')}</div>`,
  };
}

function calendar(s, me) {
  const evs = upcomingEvents(s, (e) => e.clientId === me.id);
  const sel = ui.filters.cDay || null;
  const today = startOfDay(Date.now());
  const days = Array.from({ length: 21 }, (_, i) => new Date(today.getTime() + i * 864e5));
  const shown = sel ? evs.filter((e) => sameDay(e.at, sel)) : evs;
  const groups = [];
  shown.forEach((e) => {
    const g = groups.at(-1);
    if (g && sameDay(g.day, e.at)) g.items.push(e);
    else groups.push({ day: e.at, items: [e] });
  });
  return {
    tab: 'home',
    html: `${bar({ back: '#/c/home', title: 'Календарь' })}
    <div class="daystrip" role="listbox" aria-label="Дни">${days.map((d) => {
      const has = evs.some((e) => sameDay(e.at, d));
      const on = sel && sameDay(sel, d);
      return `<button class="day${on ? ' is-active' : ''}${sameDay(d, today) ? ' is-today' : ''}" data-act="c.day" data-day="${d.toISOString()}" role="option" aria-selected="${!!on}">
        <small>${fmtWeekday(d)}</small><b>${d.getDate()}</b><i class="${has ? 'has' : ''}"></i></button>`;
    }).join('')}</div>
    <div class="legend">${Object.entries(EVENT_TYPES).map(([k, t]) => `<span class="legend__i legend__i--${t.tone}">${t.label}</span>`).join('')}</div>
    ${groups.map((g) => `<section class="m-section"><div class="m-section__head"><h2>${fmtDayLabel(g.day)}</h2></div>
      <div class="stack">${g.items.map((e) => agendaItem(s, e)).join('')}</div></section>`).join('')
      || `<div class="m-section">${empty('calendar', sel ? 'В этот день событий нет' : 'Событий нет', sel ? '' : 'Консультации, заседания и сроки появятся здесь.', sel ? '<button class="btn btn--secondary" data-act="c.day" data-day="">Показать все</button>' : '')}</div>`}
    <div class="m-space"></div>`,
  };
}

function agendaItem(s, e) {
  const t = EVENT_TYPES[e.type];
  const l = lawyer(s, e.lawyerId);
  const kase = e.caseId && caseOf(s, e.caseId);
  return `<div class="agenda agenda--${t.tone}" data-k="ag:${e.id}">
    <span class="agenda__time">${e.duration ? fmtTime(e.at) : 'Срок'}</span>
    <span class="agenda__body"><small>${t.label}</small><b>${esc(e.title)}</b>
      <span>${[l?.name, e.place].filter(Boolean).map(esc).join(' · ')}</span>
      ${kase ? `<a href="#/c/case/${kase.id}">${esc(kase.title)}</a>` : ''}</span>
  </div>`;
}

// ——— Нижние листы ———

function sheet(s, me) {
  const sh = ui.sheet;
  if (!sh) return '';
  let title = '';
  let body = '';
  if (sh.type === 'upload') {
    const targets = [
      ...activeCases(s, me.id).map((c) => [`case:${c.id}`, c.title]),
      ...s.requests.filter((r) => r.clientId === me.id && !r.caseId && r.status !== 'closed').map((r) => [`request:${r.id}`, `Обращение №${r.number}`]),
    ];
    if (!sh.target) sh.target = targets[0]?.[0];
    title = 'Загрузить документ';
    body = `${targets.length > 1 ? `<p class="sheet__label">К какому делу относится</p><div class="chips chips--wrap">${targets.map(([k, label]) => `<button class="chip${sh.target === k ? ' is-active' : ''}" data-act="c.sheetTarget" data-target="${k}">${esc(label)}</button>`).join('')}</div>` : ''}
      ${uploadTiles('sheet')}<p class="hint">PDF, JPG, PNG, DOCX · до 20 МБ. Юрист получит документ сразу после загрузки.</p>`;
  }
  if (sh.type === 'ask') {
    const targets = activeCases(s, me.id);
    title = 'Запросить документ у юриста';
    body = `<form data-form="c.ask" class="form-stack">
      <div class="field"><label for="ask-case">Дело</label><select class="input" id="ask-case" name="caseId">${targets.map((c) => `<option value="${c.id}">${esc(c.title)}</option>`).join('')}</select></div>
      <div class="field"><label for="ask-name">Какой документ нужен</label><input class="input" id="ask-name" name="name" required placeholder="Например, копия договора" value="${esc(draft('ask-name'))}" data-draft="ask-name">
        <div class="chips chips--wrap chips--sm">${['Копия договора', 'Справка о ходе дела', 'Копия искового заявления', 'Акт выполненных работ'].map((x) => `<button type="button" class="chip" data-act="c.askFill" data-val="${x}">${x}</button>`).join('')}</div></div>
      <div class="field"><label for="ask-comment">Комментарий <span class="muted">— необязательно</span></label><textarea class="textarea" id="ask-comment" name="comment" rows="3" data-draft="ask-comment">${esc(draft('ask-comment'))}</textarea></div>
      <button class="btn btn--primary btn--lg btn--block" type="submit">Отправить запрос</button>
    </form>`;
  }
  if (sh.type === 'pay') {
    const inv = byId(s.invoices, sh.id);
    title = sh.stage === 'done' ? '' : 'Оплата счёта';
    if (sh.stage === 'done') {
      body = `<div class="done done--sheet"><span class="done__mark" data-k="pay-done">${icon('check')}</span><h2>Оплата прошла</h2><p class="muted">${money(inv.amount)} · ${esc(inv.service)}</p><p class="hint">Чек придёт на ${esc(me.email)}</p><button class="btn btn--primary btn--lg btn--block" data-act="c.closeSheet">Готово</button></div>`;
    } else {
      const busy = sh.stage === 'processing';
      body = `<div class="pay-box"><span>${inv.number}</span><b>${money(inv.amount)}</b><small>${esc(inv.service)}</small></div>
        <div class="stack stack--tight">
          <button class="btn btn--primary btn--lg btn--block" data-act="c.pay" data-method="СБП" ${busy ? 'disabled' : ''}>${busy && sh.method === 'СБП' ? '<span class="spinner"></span>Обработка…' : 'Оплатить через СБП'}</button>
          <button class="btn btn--secondary btn--lg btn--block" data-act="c.pay" data-method="Карта" ${busy ? 'disabled' : ''}>${busy && sh.method === 'Карта' ? '<span class="spinner"></span>Обработка…' : `${icon('card')}Банковской картой`}</button>
        </div>
        <p class="hint">Демонстрационный режим: деньги не списываются.</p>`;
    }
  }
  if (sh.type === 'doc') {
    const d = byId(s.documents, sh.id);
    if (!d) { ui.sheet = null; return ''; }
    const kase = d.caseId && caseOf(s, d.caseId);
    const l = lawyer(s, d.lawyerId);
    title = d.name;
    body = `${docPreview(d)}
      <dl class="facts facts--2">
        <div><dt>Статус</dt><dd>${pill(DOC_STATUS_CLIENT[d.status], `sheet-ds:${d.id}`)}</dd></div>
        <div><dt>Тип</dt><dd>${(d.type || '—').toUpperCase()}${d.size ? ` · ${fileSize(d.size)}` : ''}</dd></div>
        <div><dt>Дата</dt><dd>${fmtDate(d.at)}</dd></div>
        <div><dt>${d.by === 'lawyer' ? 'Подготовил' : 'Дело'}</dt><dd>${d.by === 'lawyer' ? esc(l?.name || 'Юрист') : esc(kase?.title || '—')}</dd></div>
      </dl>
      ${d.comment ? `<p class="note">${icon('info')}${esc(d.comment)}</p>` : ''}
      ${d.status === 'requested' || d.status === 'rejected' ? requestedCard(d) : `<button class="btn btn--secondary btn--lg btn--block" data-act="c.download" data-id="${d.id}">${icon('download')}Скачать</button>`}`;
  }
  if (sh.type === 'profile') {
    title = 'Личные данные';
    body = `<form data-form="c.profile" class="form-stack">
      <div class="field"><label for="p-name">Имя</label><input class="input" id="p-name" name="name" value="${esc(me.name)}" required autocomplete="name"></div>
      <div class="field"><label for="p-phone">Телефон</label><input class="input" id="p-phone" name="phone" type="tel" data-mask="phone" value="${esc(me.phone)}" required autocomplete="tel"></div>
      <div class="field"><label for="p-email">Email</label><input class="input" id="p-email" name="email" type="email" value="${esc(me.email)}" autocomplete="email"></div>
      <button class="btn btn--primary btn--lg btn--block" type="submit">Сохранить</button>
    </form>`;
  }
  return `<div class="sheet" data-k="sheet:${sh.type}" role="dialog" aria-modal="true" aria-label="${esc(title || 'Окно')}">
    <div class="sheet__backdrop" data-act="c.closeSheet"></div>
    <div class="sheet__panel">
      <div class="sheet__grip"></div>
      ${title ? `<div class="sheet__head"><h2>${esc(title)}</h2><button class="icon-btn" data-act="c.closeSheet" aria-label="Закрыть">${icon('x')}</button></div>` : ''}
      <div class="sheet__body">${body}</div>
    </div>
  </div>`;
}

// ——— Действия ———

Object.assign(actions, {
  'c.start': (el) => { startWizard(el.dataset.cat || null); go(el.dataset.cat ? '#/c/new/2' : '#/c/new/1'); },
  'c.pickCat': (el) => { ui.wizard.category = el.dataset.cat; ui.wizard.error = ''; go('#/c/new/2'); },
  'c.wizNext': () => {
    const w = ui.wizard;
    if (w.description.trim().length < 15) { w.error = 'Опишите ситуацию хотя бы в одном-двух предложениях'; rerender(); document.getElementById('wiz-desc')?.focus(); return; }
    w.error = '';
    go('#/c/new/3');
  },
  'c.wizRemove': (el) => { ui.wizard.files = ui.wizard.files.filter((f) => f.id !== el.dataset.id); rerender(); },
  'c.submit': () => {
    const w = ui.wizard;
    const digits = w.phone.replace(/\D/g, '');
    if (!w.name.trim()) w.error = 'Укажите имя';
    else if (digits.length !== 11) w.error = 'Проверьте номер телефона';
    else if (w.email && !/^\S+@\S+\.\S+$/.test(w.email)) w.error = 'Проверьте email';
    else w.error = '';
    if (w.error) { rerender(); return; }
    const r = A.submitRequest({ category: w.category, description: w.description.trim(), files: w.files, contact: { name: w.name.trim(), phone: w.phone, email: w.email.trim() } });
    ui.wizard = null;
    go(`#/c/new/done/${r.id}`);
  },
  'c.filter': (el) => { ui.filters[el.dataset.key] = el.dataset.val; rerender(); },
  'c.day': (el) => { const d = el.dataset.day; ui.filters.cDay = d && ui.filters.cDay && sameDay(ui.filters.cDay, d) ? null : d || null; rerender(); },
  'c.sheet': (el) => { ui.sheet = { type: el.dataset.type, target: el.dataset.target || null, id: el.dataset.id || null, stage: 'choose' }; rerender(); },
  'c.sheetTarget': (el) => { ui.sheet.target = el.dataset.target; rerender(); },
  'c.closeSheet': () => { ui.sheet = null; rerender(); },
  'c.openDoc': (el) => { ui.sheet = { type: 'doc', id: el.dataset.id }; rerender(); },
  'c.download': () => toast('В демо-версии файлы хранятся только как карточки', { iconName: 'info' }),
  'c.askFill': (el) => { ui.drafts['ask-name'] = el.dataset.val; rerender(); },
  'c.pay': (el) => {
    const sh = ui.sheet;
    sh.stage = 'processing';
    sh.method = el.dataset.method;
    rerender();
    setTimeout(() => { A.payInvoice(sh.id, sh.method); if (ui.sheet === sh) { sh.stage = 'done'; rerender(); } }, 1100);
  },
});

Object.assign(forms, {
  'c.send': (form, data) => {
    const text = String(data.get('text') || '').trim();
    if (!text) return;
    A.sendClientMessage({ threadId: form.dataset.thread, text });
    delete ui.drafts[`msg:${form.dataset.thread}`];
  },
  'c.ask': (form, data) => {
    const name = String(data.get('name') || '').trim();
    if (!name) return;
    A.askLawyerForDocument({ caseId: data.get('caseId'), name, comment: String(data.get('comment') || '').trim() });
    delete ui.drafts['ask-name'];
    delete ui.drafts['ask-comment'];
    ui.sheet = null;
    toast('Запрос отправлен юристу');
  },
  'c.profile': (form, data) => {
    A.updateClientProfile({ name: String(data.get('name')).trim(), phone: String(data.get('phone')), email: String(data.get('email')).trim() });
    ui.sheet = null;
    toast('Данные сохранены');
  },
});

// Загрузка файлов: мастер обращения, запрошенные документы, лист загрузки, чат.
const uploaded = (n, where = '') => toast(n === 1 ? `Документ загружен${where}` : `Загружено ${n} ${plural(n, 'документ', 'документа', 'документов')}${where}`, { iconName: 'upload' });

function uploadTo(target, files) {
  if (!target) { toast('Сначала отправьте обращение', { tone: 'error', iconName: 'alert' }); return; }
  const [kind, id] = target.split(':');
  A.uploadDocuments({ files, caseId: kind === 'case' ? id : null, requestId: kind === 'request' ? id : null });
  ui.sheet = null;
  uploaded(files.length);
}

Object.assign(uploads, {
  wizard: (files) => { ui.wizard?.files.push(...files); rerender(); },
  fulfill: (files, id) => {
    const d = byId(getState().documents, id);
    A.uploadDocuments({ files, caseId: d.caseId, requestId: d.requestId, fulfillId: d.id });
    if (ui.sheet?.type === 'doc') ui.sheet = null;
    uploaded(files.length, ' — юрист получил его');
  },
  sheet: (files) => uploadTo(ui.sheet?.target, files),
  case: (files, id) => uploadTo(`case:${id}`, files),
  request: (files, id) => uploadTo(`request:${id}`, files),
  chat: (files, id) => {
    const t = threadInfo(getState(), id);
    A.uploadDocuments({ files, caseId: t.kase?.id || null, requestId: t.kase ? null : t.request?.id, asMessage: true });
  },
});

// Поля мастера обращения живут в памяти, пока обращение не отправлено.
changes.wiz = (input) => {
  if (!ui.wizard) return;
  ui.wizard[input.dataset.wiz] = input.value;
  if (input.dataset.wiz === 'description') {
    const c = document.getElementById('wiz-count');
    if (c) c.textContent = `${input.value.trim().length} / 2000`;
  }
};

export const clientDocRow = docRow;
