// Демо-режим: клиентское приложение в телефоне и панель юриста рядом.
// Обе части — настоящие страницы сервиса в iframe с общим хранилищем.
import { getState } from './store.js';
import { icon } from './icons.js';
import { logo, esc } from './format.js';

const FIRST_NEW = 1048;

const STEPS = [
  { who: 'client', title: 'Клиент отправляет обращение', hint: 'В телефоне нажмите категорию, опишите ситуацию, приложите фото и отправьте.' },
  { who: 'lawyer', title: 'Юрист берёт обращение', hint: 'В панели, в таблице «Последние обращения», нажмите «Взять себе».' },
  { who: 'lawyer', title: 'Юрист создаёт дело', hint: 'Нажмите «Создать дело» в той же строке или в карточке обращения.' },
  { who: 'lawyer', title: 'Юрист запрашивает документ', hint: 'В карточке дела: вкладка «Документы» → «Запросить документ».' },
  { who: 'client', title: 'Клиент загружает документ', hint: 'В телефоне: карточка «Юрист ждёт документ» → «Сфотографировать» или «Файл».' },
  { who: 'lawyer', title: 'Юрист меняет статус', hint: 'Примите документ и нажмите «Изменить статус» → «В работе».' },
  { who: 'lawyer', title: 'Юрист пишет клиенту', hint: 'Вкладка «Сообщения» в карточке дела — напишите ответ.' },
  { who: 'client', title: 'Клиент читает ответ', hint: 'В телефоне откройте «Сообщения» — там ответ юриста.' },
];

function progress() {
  const s = getState();
  const r = s.requests.filter((x) => x.number >= FIRST_NEW).sort((a, b) => b.number - a.number)[0];
  const kase = r?.caseId && s.cases.find((c) => c.id === r.caseId);
  const asked = s.documents.filter((d) => d.requestedAt && ((kase && d.caseId === kase.id) || d.requestId === r?.id));
  const lawyerMsgs = r ? s.messages.filter((m) => m.threadId === r.threadId && m.from === 'lawyer') : [];
  const statusChanged = kase?.activity.some((a) => a.text.startsWith('Статус изменён') && !a.text.endsWith('Нужны документы'));
  return [
    !!r,
    !!r?.lawyerId,
    !!kase,
    asked.length > 0,
    asked.some((d) => d.status !== 'requested'),
    !!statusChanged,
    lawyerMsgs.length > 0,
    lawyerMsgs.some((m) => m.readByClient),
  ];
}

export function mountDemo() {
  return `<div class="demo">
    <header class="demo__bar">
      <a href="#/" class="demo__logo">${logo()}<span class="demo__tag">Демо</span></a>
      <div class="demo__steps" id="demo-steps"></div>
      <div class="demo__tools">
        <div class="demo__switch" role="tablist">
          <button role="tab" data-demo-view="client" class="is-active">${icon('smartphone')}Клиент</button>
          <button role="tab" data-demo-view="lawyer">${icon('monitor')}Юрист</button>
        </div>
        <button class="btn btn--ghost btn--sm" data-act="app.reset">${icon('refresh')}Сбросить</button>
      </div>
    </header>
    <div class="demo__hint" id="demo-hint" aria-live="polite"></div>
    <div class="demo__stage" data-view="client">
      <section class="demo__phone-col">
        <div class="demo__label">${icon('smartphone')}Клиент · Елена Морозова</div>
        <div class="phone"><iframe title="Клиентский кабинет" src="index.html#/c/home"></iframe></div>
      </section>
      <section class="demo__desk-col">
        <div class="demo__label">${icon('monitor')}Юрист · рабочее место</div>
        <div class="desk"><div class="desk__bar"><i></i><i></i><i></i><span>motiv-law.ru/panel</span></div><iframe title="Панель юриста" src="index.html#/l/overview"></iframe></div>
      </section>
    </div>
  </div>`;
}

export function updateDemo(root) {
  const done = progress();
  const current = done.findIndex((x) => !x);
  const steps = root.querySelector('#demo-steps');
  const hint = root.querySelector('#demo-hint');
  if (!steps) return;
  steps.innerHTML = STEPS.map((st, i) => `<span class="dstep${done[i] ? ' is-done' : ''}${i === current ? ' is-current' : ''}" title="${esc(st.title)}">${done[i] ? icon('check') : i + 1}</span>`).join('<i class="dstep__line"></i>');
  if (current === -1) {
    hint.innerHTML = `${icon('check')}<b>Сценарий пройден.</b><span>Клиент и юрист работали в одном сервисе — без звонков, мессенджеров и почты.</span>`;
    hint.className = 'demo__hint is-done';
  } else {
    const st = STEPS[current];
    hint.innerHTML = `<span class="demo__who demo__who--${st.who}">${icon(st.who === 'client' ? 'smartphone' : 'monitor')}${st.who === 'client' ? 'Клиент' : 'Юрист'}</span><b>${current + 1}. ${esc(st.title)}</b><span>${esc(st.hint)}</span>`;
    hint.className = 'demo__hint';
    // На узком экране показываем ту сторону, где нужно действовать.
    const stage = root.querySelector('.demo__stage');
    if (stage && stage.dataset.auto !== 'off') setView(root, st.who);
  }
}

function setView(root, view) {
  root.querySelector('.demo__stage').dataset.view = view;
  root.querySelectorAll('[data-demo-view]').forEach((b) => b.classList.toggle('is-active', b.dataset.demoView === view));
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-demo-view]');
  if (!b) return;
  const root = document.getElementById('app');
  root.querySelector('.demo__stage').dataset.auto = 'off';
  setView(root, b.dataset.demoView);
});
