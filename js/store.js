// Единое хранилище сервиса. Клиентский кабинет и панель юриста читают и пишут
// одно состояние; изменения расходятся между вкладками через событие storage.
import { createSeed, VERSION } from './seed.js';

const KEY = 'motiv-legal:state';
let state = null;
const listeners = new Set();

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === VERSION) {
        state = parsed;
        return state;
      }
    }
  } catch { /* повреждённые данные — начинаем с демо-набора */ }
  state = createSeed();
  persist();
  return state;
}

export const getState = () => state;

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(source) {
  listeners.forEach((fn) => fn(source));
}

function persist() {
  const json = JSON.stringify(state);
  try {
    localStorage.setItem(KEY, json);
  } catch {
    // Не хватило места: убираем превью самых старых документов и пробуем снова.
    const withThumbs = state.documents.filter((d) => d.thumb).sort((a, b) => a.at.localeCompare(b.at));
    for (const doc of withThumbs) {
      doc.thumb = null;
      try {
        localStorage.setItem(KEY, JSON.stringify(state));
        return;
      } catch { /* продолжаем освобождать место */ }
    }
  }
}

// Все изменения идут через mutate: правка, сохранение, уведомление подписчиков.
export function mutate(fn) {
  const result = fn(state);
  state.rev = (state.rev || 0) + 1;
  persist();
  emit('local');
  return result;
}

export function reset() {
  state = createSeed();
  persist();
  emit('local');
}

window.addEventListener('storage', (e) => {
  if (e.key !== KEY) return;
  try {
    state = e.newValue ? JSON.parse(e.newValue) : createSeed();
  } catch {
    return;
  }
  emit('remote');
});
