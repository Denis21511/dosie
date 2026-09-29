// Инфраструктура интерфейса: память экрана, реестр действий, тосты, чтение файлов.
import { icon } from './icons.js';
import { esc } from './format.js';

// Состояние интерфейса этой вкладки (не попадает в общее хранилище).
export const ui = {
  drafts: {},
  wizard: null,
  sheet: null,
  modal: null,
  popover: null,
  filters: {},
  notifSnapshot: null,
  navOpen: false,
};

export const actions = {};
export const forms = {};
export const changes = {};
export const uploads = {};

let renderer = () => {};
let pending = false;
export const setRenderer = (fn) => { renderer = fn; };
export function rerender() {
  if (pending) return;
  pending = true;
  queueMicrotask(() => { pending = false; renderer(); });
}

export function go(hash) {
  const h = hash.startsWith('#') ? hash : `#${hash}`;
  if (location.hash === h) rerender();
  else location.hash = h;
}

export const draft = (key, fallback = '') => ui.drafts[key] ?? fallback;

// ——— Тосты и push-баннеры ———

const toastRoot = () => document.getElementById('toasts');

export function toast(text, { tone = 'default', iconName = 'check' } = {}) {
  const el = document.createElement('div');
  el.className = `toast toast--${tone}`;
  el.setAttribute('role', 'status');
  el.innerHTML = `${icon(iconName)}<span>${esc(text)}</span>`;
  toastRoot().append(el);
  setTimeout(() => { el.classList.add('is-leaving'); setTimeout(() => el.remove(), 220); }, 2600);
}

export function push({ title, text, link, iconName = 'bell', meta = 'сейчас' }) {
  const el = document.createElement(link ? 'a' : 'div');
  el.className = 'push';
  if (link) el.href = link;
  el.innerHTML = `<span class="push__icon">${icon(iconName)}</span><span class="push__body"><span class="push__head"><b>${esc(title)}</b><time>${esc(meta)}</time></span><span class="push__text">${esc(text)}</span></span>`;
  el.addEventListener('click', () => el.remove());
  toastRoot().append(el);
  setTimeout(() => { el.classList.add('is-leaving'); setTimeout(() => el.remove(), 260); }, 5200);
}

// ——— Файлы ———

const ALLOWED = { pdf: 'pdf', jpg: 'jpg', jpeg: 'jpg', png: 'png', docx: 'docx', heic: 'jpg', webp: 'jpg' };
export const ACCEPT = '.pdf,.jpg,.jpeg,.png,.docx,application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const MAX = 20 * 1024 * 1024;

async function thumbnail(file) {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 480 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.72);
  } catch {
    return null;
  }
}

// Файлы из input → описания для хранилища. Для фото делаем лёгкое превью.
export async function readFiles(fileList) {
  const out = [];
  for (const file of [...fileList]) {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    let type = ALLOWED[ext];
    if (!type && file.type === 'image/jpeg') type = 'jpg';
    if (!type && file.type === 'image/png') type = 'png';
    if (!type) { toast(`«${file.name}»: формат не поддерживается`, { tone: 'error', iconName: 'alert' }); continue; }
    if (file.size > MAX) { toast(`«${file.name}» больше 20 МБ`, { tone: 'error', iconName: 'alert' }); continue; }
    const isImage = type === 'jpg' || type === 'png';
    let name = file.name;
    if (/^image\.\w+$|^IMG_\d+/i.test(name) || !name.includes('.')) {
      const d = new Date();
      name = `Фото документа ${d.toLocaleDateString('ru-RU')} ${String(d.getHours()).padStart(2, '0')}-${String(d.getMinutes()).padStart(2, '0')}.jpg`;
    }
    if (ext === 'heic' || ext === 'webp') name = name.replace(/\.\w+$/, '.jpg');
    out.push({ id: `f${Math.random().toString(36).slice(2, 9)}`, name, type, size: file.size, thumb: isImage ? await thumbnail(file) : null });
  }
  return out;
}

// ——— Маска телефона ———

export function formatPhone(value) {
  let d = value.replace(/\D/g, '');
  if (!d) return '';
  if (d[0] === '8') d = `7${d.slice(1)}`;
  if (d[0] !== '7') d = `7${d}`;
  d = d.slice(0, 11);
  const p = [d.slice(1, 4), d.slice(4, 7), d.slice(7, 9), d.slice(9, 11)];
  let out = '+7';
  if (p[0]) out += ` (${p[0]}${p[0].length === 3 ? ')' : ''}`;
  if (p[1]) out += ` ${p[1]}`;
  if (p[2]) out += `-${p[2]}`;
  if (p[3]) out += `-${p[3]}`;
  return out;
}

// ——— Микровзаимодействия ———
// Элементы с data-k отслеживаются между перерисовками одного экрана:
// новые плавно появляются, изменившиеся (data-v) коротко подсвечиваются.
let prevKeys = new Map();
let prevScreen = null;

export function applyFx(root, screenKey) {
  const same = screenKey === prevScreen;
  const next = new Map();
  let added = 0;
  root.querySelectorAll('[data-k]').forEach((el) => {
    const k = el.dataset.k;
    const v = el.dataset.v ?? '';
    next.set(k, v);
    if (!same) return;
    if (!prevKeys.has(k)) { el.classList.add('fx-in'); added++; }
    else if (prevKeys.get(k) !== v) el.classList.add('fx-changed');
  });
  prevKeys = next;
  prevScreen = screenKey;
  return { same, added };
}
