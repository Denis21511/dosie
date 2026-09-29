// Компоненты, которые выглядят одинаково у клиента и у юриста.
import { icon } from './icons.js';
import { esc, fmtDate, fmtTime, fmtDayLabel, sameDay, threadMessages, lawyer, client, byId, fileBadge, fileSize } from './format.js';

export function timeline(kase, { controls = false } = {}) {
  const items = kase.timeline.map((t, i) => {
    const meta = t.state === 'done' ? (t.at ? fmtDate(t.at) : 'Выполнено') : t.state === 'current' ? 'Сейчас' : 'Далее';
    const edit = controls && t.state !== 'done'
      ? `<button class="link-btn tl__edit" data-act="l.editStage" data-case="${kase.id}" data-stage="${t.id}">${t.note ? 'Изменить' : 'Добавить описание'}</button>`
      : '';
    return `<li class="tl__item tl__item--${t.state}" data-k="tl:${kase.id}:${i}" data-v="${t.state}">
      <span class="tl__dot">${t.state === 'done' ? icon('check') : ''}</span>
      <div class="tl__body">
        <div class="tl__row"><span class="tl__title">${esc(t.title)}</span><span class="tl__meta">${meta}</span></div>
        ${t.note ? `<div class="tl__note">${esc(t.note)}</div>` : ''}
        ${edit}
      </div>
    </li>`;
  }).join('');
  return `<ol class="tl">${items}</ol>`;
}

const SYS_ICON = { request: 'inbox', case: 'briefcase', docRequest: 'file', doc: 'fileText', status: 'refresh', assign: 'user', timeline: 'check', event: 'calendar' };

export function chatMessages(s, threadId, side) {
  const msgs = threadMessages(s, threadId);
  let prev = null;
  let out = '';
  for (const m of msgs) {
    if (!prev || !sameDay(prev.at, m.at)) out += `<div class="chat-day"><span>${fmtDayLabel(m.at)}</span></div>`;
    const doc = m.docId ? byId(s.documents, m.docId) : null;
    if (m.from === 'system') {
      const openAttr = doc ? ` data-act="${side === 'client' ? 'c' : 'l'}.openDoc" data-id="${doc.id}" role="button" tabindex="0"` : '';
      out += `<div class="msg-sys msg-sys--${m.kind || 'info'}" data-k="m:${m.id}"${openAttr}>${icon(SYS_ICON[m.kind] || 'info')}<span>${esc(m.text)}</span><time>${fmtTime(m.at)}</time></div>`;
    } else {
      const mine = side === 'client' ? m.from === 'client' : m.from === 'lawyer';
      const author = m.from === 'lawyer' ? lawyer(s, m.lawyerId) : client(s, m.clientId);
      const showAuthor = !mine || (side === 'lawyer' && m.lawyerId !== s.me.lawyerId);
      const attach = doc
        ? `<button class="msg-file" data-act="${side === 'client' ? 'c' : 'l'}.openDoc" data-id="${doc.id}">${fileBadge(doc.type)}<span><b>${esc(doc.name)}</b><small>${fileSize(doc.size) || 'Документ'}</small></span></button>`
        : '';
      const read = mine && side === 'client' ? (m.readByLawyer ? `<span class="msg__read">${icon('check')}Прочитано</span>` : '') : '';
      out += `<div class="msg ${mine ? 'msg--me' : 'msg--them'}" data-k="m:${m.id}">
        ${showAuthor ? `<div class="msg__author">${esc(author?.name || '')}${m.from === 'lawyer' && side === 'client' ? '<span> · юрист</span>' : ''}</div>` : ''}
        <div class="msg__bubble">${attach}${m.text ? `<div class="msg__text">${esc(m.text).replace(/\n/g, '<br>')}</div>` : ''}</div>
        <div class="msg__meta"><time>${fmtTime(m.at)}</time>${read}</div>
      </div>`;
    }
    prev = m;
  }
  return out || '<div class="chat-empty">Сообщений пока нет</div>';
}

export const empty = (iconName, title, text = '', action = '') =>
  `<div class="empty">${icon(iconName)}<b>${esc(title)}</b>${text ? `<p>${esc(text)}</p>` : ''}${action}</div>`;

export function docPreview(d) {
  if (d.thumb) return `<div class="preview preview--img"><img src="${d.thumb}" alt=""></div>`;
  if (d.status === 'requested') return `<div class="preview preview--empty">${icon('upload')}<span>Документ ещё не загружен</span></div>`;
  const lines = Array.from({ length: 9 }, (_, i) => `<i style="width:${[92, 78, 88, 60, 94, 70, 84, 52, 40][i]}%"></i>`).join('');
  return `<div class="preview preview--doc"><div class="preview__page">${fileBadge(d.type)}<div class="preview__lines">${lines}</div></div></div>`;
}
