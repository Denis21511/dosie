// Точка входа: маршрутизация, перерисовка, делегирование событий,
// всплывающие уведомления при изменениях из другой вкладки.
import { load, subscribe, getState } from './store.js';
import { ui, actions, forms, changes, uploads, setRenderer, rerender, go, applyFx, push, readFiles, formatPhone } from './ui.js';
import { renderClient } from './client.js';
import { renderPanel } from './panel.js';
import { renderEntry } from './entry.js';
import { mountDemo, updateDemo } from './demo.js';

load();
if (window.self !== window.top) document.documentElement.classList.add('embedded');

const root = document.getElementById('app');
const parse = () => location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
let lastKey = null;
let demoMounted = false;

const TITLES = { c: 'Мотив — личный кабинет', l: 'Мотив — рабочее место юриста', demo: 'Мотив — демо: клиент и юрист' };

function autogrow(el) {
  el.style.height = 'auto';
  el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
}

function render() {
  const route = parse();
  const area = route[0] || '';
  document.documentElement.dataset.area = area || 'entry';
  document.title = TITLES[area] || 'Мотив — юридическая помощь в одном месте';

  if (area === 'demo') {
    if (!demoMounted) { root.innerHTML = mountDemo(); demoMounted = true; }
    updateDemo(root);
    lastKey = 'demo';
    return;
  }
  demoMounted = false;

  const key = route.join('/');
  const changed = key !== lastKey;
  if (changed) {
    Object.assign(ui, { sheet: null, modal: null, popover: null, navOpen: false });
    if (route[1] !== 'notifications') ui.notifSnapshot = null;
  }

  // Что нужно сохранить между перерисовками: фокус, выделение, прокрутку.
  const active = document.activeElement;
  const focus = active?.id && root.contains(active) ? { id: active.id, s: active.selectionStart, e: active.selectionEnd } : null;
  const scrolls = {};
  root.querySelectorAll('[data-scroll]').forEach((el) => {
    scrolls[el.dataset.scroll] = { top: el.scrollTop, bottom: el.scrollHeight - el.scrollTop - el.clientHeight < 60 };
  });
  const winY = window.scrollY;
  const winBottom = window.innerHeight + winY >= document.documentElement.scrollHeight - 60;

  root.innerHTML = area === 'c' ? renderClient(route.slice(1)) : area === 'l' ? renderPanel(route.slice(1)) : renderEntry();
  const { same, added } = applyFx(root, key);

  root.querySelectorAll('.composer__input').forEach(autogrow);

  if (focus) {
    const el = document.getElementById(focus.id);
    if (el) {
      el.focus({ preventScroll: true });
      try { if (focus.s != null) el.setSelectionRange(focus.s, focus.e); } catch { /* поле без выделения */ }
    }
  }

  root.querySelectorAll('[data-scroll]').forEach((el) => {
    const prev = scrolls[el.dataset.scroll];
    el.scrollTop = !prev || !same || prev.bottom || added ? el.scrollHeight : prev.top;
  });

  const pageChat = area === 'c' && root.querySelector('.m-screen [data-chat]');
  if (pageChat) window.scrollTo(0, !same || winBottom || added ? document.documentElement.scrollHeight : winY);
  else if (changed) window.scrollTo(0, 0);
  else window.scrollTo(0, winY);

  if (changed) root.querySelector('.m-screen, .p-content, .entry')?.classList.add('page-in');
  lastKey = key;
}

setRenderer(render);

// ——— Уведомления из другой вкладки ———

const seenNotif = new Set(getState().notifications.map((n) => n.id));
const seenFeed = new Set(getState().feed.map((f) => f.id));
const NOTIF_ICON = { docs: 'file', status: 'refresh', message: 'chat', event: 'calendar', invoice: 'card', case: 'briefcase', assign: 'user', timeline: 'check' };
const FEED = {
  request: ['Новое обращение', 'inbox'], message: ['Новое сообщение', 'chat'], doc: ['Документ загружен', 'fileText'],
  docAsk: ['Клиент запросил документ', 'file'], payment: ['Поступила оплата', 'card'],
};

subscribe((source) => {
  const s = getState();
  const area = parse()[0];
  const freshN = s.notifications.filter((n) => !seenNotif.has(n.id));
  const freshF = s.feed.filter((f) => !seenFeed.has(f.id));
  freshN.forEach((n) => seenNotif.add(n.id));
  freshF.forEach((f) => seenFeed.add(f.id));
  if (source === 'remote') {
    if (area === 'c') {
      freshN.filter((n) => n.clientId === s.me.clientId).forEach((n) => push({ title: n.title, text: n.text, link: n.link, iconName: NOTIF_ICON[n.kind] }));
    }
    if (area === 'l') {
      freshF.forEach((f) => push({ title: FEED[f.kind]?.[0] || 'Обновление', text: f.text, link: f.link, iconName: FEED[f.kind]?.[1] }));
    }
  }
  rerender();
});

// ——— События ———

const INTERACTIVE = 'a, button, input, label, select, textarea';

document.addEventListener('click', (e) => {
  if (ui.popover && !e.target.closest('[data-popover]') && !e.target.closest('[data-act="l.pop"]')) {
    ui.popover = null;
    rerender();
  }
  if (ui.drafts.search && !e.target.closest('.search')) {
    delete ui.drafts.search;
    rerender();
  }
  const el = e.target.closest('[data-act], [data-go]');
  if (!el) return;
  if (el.dataset.go && !el.dataset.act) {
    const inner = e.target.closest(INTERACTIVE);
    if (inner && inner !== el && el.contains(inner)) return;
    e.preventDefault();
    go(el.dataset.go);
    return;
  }
  const fn = actions[el.dataset.act];
  if (!fn) return;
  if (!fn.keepDefault) e.preventDefault();
  fn(el, e);
});

document.addEventListener('submit', (e) => {
  const form = e.target.closest('form[data-form]');
  if (!form) return;
  e.preventDefault();
  forms[form.dataset.form]?.(form, new FormData(form));
  rerender();
});

document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.dataset.mask === 'phone' && !String(e.inputType).startsWith('delete')) t.value = formatPhone(t.value);
  if (t.dataset.wiz) changes.wiz(t);
  if (t.dataset.draft) {
    ui.drafts[t.dataset.draft] = t.value;
    if ('live' in t.dataset) rerender();
  }
  if (t.classList.contains('composer__input')) autogrow(t);
});

document.addEventListener('change', async (e) => {
  const t = e.target;
  if (t.type !== 'file' || !t.dataset.upload) return;
  const [kind, id] = t.dataset.upload.split(':');
  const files = await readFiles(t.files);
  t.value = '';
  if (files.length) uploads[kind]?.(files, id);
});

const coarse = matchMedia('(pointer: coarse)');

document.addEventListener('keydown', (e) => {
  const t = e.target;
  if (e.key === 'Enter' && !e.shiftKey && t.matches('[data-enter-submit]') && !coarse.matches) {
    e.preventDefault();
    t.form.requestSubmit();
    return;
  }
  if (e.key === 'Enter' && t.matches('tr[data-go]')) { go(t.dataset.go); return; }
  if (e.key === 'Enter' && t.matches('[data-act][role="button"]')) { actions[t.dataset.act]?.(t, e); return; }
  if (e.key === 'Escape' && (ui.sheet || ui.modal || ui.popover || ui.navOpen)) {
    Object.assign(ui, { sheet: null, modal: null, popover: null, navOpen: false });
    rerender();
  }
});

window.addEventListener('hashchange', render);
render();
