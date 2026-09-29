// Стартовый экран: вход в клиентский кабинет, панель юриста или демо-режим.
import { icon } from './icons.js';
import { logo } from './format.js';

export function renderEntry() {
  const card = (href, ic, title, text, cta) => `
    <a class="entry-card" href="${href}">
      <span class="entry-card__icon">${icon(ic)}</span>
      <span class="entry-card__body"><b>${title}</b><span>${text}</span></span>
      <span class="entry-card__cta">${cta}${icon('arrowRight')}</span>
    </a>`;
  return `<div class="entry">
    <header class="entry__head">${logo(true)}</header>
    <main class="entry__main">
      <h1>Цифровой кабинет юридической компании</h1>
      <p class="entry__lead">Приём клиентов, дела, документы, переписка, задачи, календарь и оплаты — в одном сервисе. Клиент работает с телефона, юрист — из рабочей панели, данные общие.</p>
      <div class="entry__cards">
        ${card('#/c/home', 'smartphone', 'Клиентский кабинет', 'Обращение за пару минут, статус дела, документы с камеры телефона и чат с юристом.', 'Открыть')}
        ${card('#/l/overview', 'monitor', 'Рабочее место юриста', 'Новые обращения, клиенты, дела, задачи, календарь, документы и счета.', 'Открыть')}
        ${card('#/demo', 'columns', 'Демо: оба интерфейса рядом', 'Действия клиента сразу видны юристу — и наоборот. С подсказками по сценарию.', 'Запустить')}
      </div>
      <p class="entry__note">${icon('info')}Демо-данные хранятся в этом браузере. Откройте кабинет клиента и панель юриста в двух вкладках — изменения синхронизируются мгновенно.</p>
    </main>
  </div>`;
}
