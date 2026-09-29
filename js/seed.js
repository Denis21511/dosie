// Демо-данные небольшой юридической компании. Даты считаются от текущего
// момента, чтобы календарь, сроки и «последние обновления» всегда были живыми.
export const VERSION = 4;

const MIN = 6e4;
const HOUR = 36e5;
const DAY = 864e5;

export function createSeed() {
  const now = Date.now();
  const ago = (ms) => new Date(now - ms).toISOString();
  const dayAt = (days, h, m = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };

  let n = 0;
  const id = (p) => `${p}${++n}`;

  const lawyers = [
    { id: 'l1', name: 'Анна Соколова', role: 'Управляющий партнёр', area: 'Семейное и наследственное право', phone: '+7 (351) 200-40-41', email: 'sokolova@motiv-law.ru', tone: 1 },
    { id: 'l2', name: 'Дмитрий Ершов', role: 'Старший юрист', area: 'Договоры и судебные споры', phone: '+7 (351) 200-40-42', email: 'ershov@motiv-law.ru', tone: 2 },
    { id: 'l3', name: 'Мария Кузнецова', role: 'Юрист', area: 'Трудовые споры, защита прав потребителей', phone: '+7 (351) 200-40-43', email: 'kuznetsova@motiv-law.ru', tone: 3 },
  ];

  const clients = [
    { id: 'c1', name: 'Елена Морозова', phone: '+7 (912) 345-67-89', email: 'e.morozova@mail.ru', since: ago(24 * DAY) },
    { id: 'c2', name: 'Игорь Павлов', phone: '+7 (922) 118-40-55', email: 'pavlov.igor@yandex.ru', since: ago(3 * HOUR) },
    { id: 'c3', name: 'Ольга Лебедева', phone: '+7 (951) 207-33-19', email: 'olga.lebedeva@gmail.com', since: ago(40 * MIN) },
    { id: 'c4', name: 'Сергей Никитин', phone: '+7 (904) 870-12-64', email: 's.nikitin@bk.ru', since: ago(28 * HOUR) },
    { id: 'c5', name: 'Алексей Громов', company: 'ООО «Вектор»', phone: '+7 (351) 220-14-08', email: 'gromov@vektor-ural.ru', since: ago(52 * DAY) },
    { id: 'c6', name: 'Наталья Белова', phone: '+7 (919) 334-02-71', email: 'belova.n@mail.ru', since: ago(30 * DAY) },
    { id: 'c7', name: 'Виктор Орлов', phone: '+7 (908) 561-77-30', email: 'orlov.v@yandex.ru', since: ago(70 * DAY) },
    { id: 'c8', name: 'Павел Зуев', phone: '+7 (912) 640-58-12', email: 'p.zuev@mail.ru', since: ago(14 * DAY) },
  ];

  const req = (number, clientId, category, description, createdAt, status, lawyerId, caseId) => ({
    id: `r${number}`, number, clientId, category, description, createdAt, status, lawyerId, caseId,
    threadId: `t${number}`, source: 'Клиентский кабинет',
  });

  const requests = [
    req(1039, 'c5', 'debts', 'Контрагент не оплатил поставку на 1,2 млн ₽ по договору от марта. Претензию получил, но не отвечает уже месяц.', ago(52 * DAY), 'case', 'l2', 'k5'),
    req(1040, 'c6', 'realty', 'Росреестр приостановил регистрацию договора купли-продажи квартиры. Нужна помощь с документами, сделка срывается.', ago(30 * DAY), 'case', 'l1', 'k6'),
    req(1041, 'c1', 'contracts', 'Подрядчик сорвал сроки ремонта квартиры на два месяца и требует доплату сверх сметы. Договор и смета есть.', ago(24 * DAY), 'case', 'l2', 'k1'),
    req(1042, 'c7', 'labor', 'Уволили по сокращению с нарушениями: не предложили вакансии и не предупредили за два месяца.', ago(70 * DAY), 'case', 'l3', 'k7'),
    req(1043, 'c1', 'family', 'Разводимся с мужем, нужно разделить квартиру и машину. Хотим договориться мирно, через соглашение.', ago(9 * DAY), 'case', 'l1', 'k2'),
    req(1044, 'c8', 'debts', 'Банк требует погасить кредит умершего отца. Наследство я не принимал. Нужна консультация, что делать.', ago(14 * DAY), 'closed', 'l2', null),
    req(1045, 'c2', 'labor', 'Уволился по собственному желанию, работодатель не выплатил компенсацию за 28 дней неиспользованного отпуска и задерживает выдачу трудовой книжки.', ago(3 * HOUR), 'new', null, null),
    req(1046, 'c4', 'consumer', 'Купил ноутбук, через 10 дней он перестал включаться. Магазин отказывается менять и предлагает ремонт на 45 дней.', ago(28 * HOUR), 'info', 'l3', null),
    req(1047, 'c3', 'inherit', 'Отец оставил завещание на квартиру мне. Брат говорит, что будет оспаривать его в суде. Срок вступления в наследство истекает через два месяца.', ago(40 * MIN), 'new', null, null),
  ];

  const stage = (title, state, at = null, note = '') => ({ id: id('st'), title, state, at, note });

  const cases = [
    {
      id: 'k1', number: 'М-26/037', title: 'Спор по договору подряда', category: 'contracts', clientId: 'c1', lawyerId: 'l2',
      status: 'work', openedAt: ago(23 * DAY), deadline: dayAt(21, 18), updatedAt: ago(26 * HOUR), requestId: 'r1041', threadId: 't1041',
      summary: 'Подрядчик нарушил сроки ремонта и требует доплату сверх сметы. Направлена досудебная претензия, ждём ответ.',
      timeline: [
        stage('Обращение принято', 'done', ago(24 * DAY)),
        stage('Документы получены', 'done', ago(22 * DAY)),
        stage('Юрист изучил ситуацию', 'done', ago(18 * DAY)),
        stage('Подготовлены документы', 'current', null, 'Претензия направлена подрядчику, срок ответа — 10 дней'),
        stage('Следующий этап', 'upcoming', null, 'Подача иска в суд, если претензия останется без ответа'),
      ],
      activity: [
        { id: id('a'), at: ago(23 * DAY), text: 'Дело открыто по обращению №1041' },
        { id: id('a'), at: ago(18 * DAY), text: 'Этап «Юрист изучил ситуацию» завершён' },
        { id: id('a'), at: ago(2 * DAY), text: 'Загружен документ «Претензия подрядчику.docx»' },
        { id: id('a'), at: ago(26 * HOUR), text: 'Претензия отправлена подрядчику' },
      ],
    },
    {
      id: 'k2', number: 'М-26/041', title: 'Раздел имущества', category: 'family', clientId: 'c1', lawyerId: 'l1',
      status: 'docs', openedAt: ago(8 * DAY), deadline: dayAt(30, 18), updatedAt: ago(50 * MIN), requestId: 'r1043', threadId: 't1043',
      summary: 'Раздел квартиры и автомобиля по соглашению супругов. Готовим проект соглашения, нужна свежая выписка из ЕГРН.',
      timeline: [
        stage('Обращение принято', 'done', ago(9 * DAY)),
        stage('Документы получены', 'current', null, 'Ждём выписку из ЕГРН на квартиру'),
        stage('Юрист изучил ситуацию', 'upcoming'),
        stage('Подготовлены документы', 'upcoming', null, 'Проект соглашения о разделе имущества'),
        stage('Следующий этап', 'upcoming', null, 'Подписание соглашения у нотариуса'),
      ],
      activity: [
        { id: id('a'), at: ago(8 * DAY), text: 'Дело открыто по обращению №1043' },
        { id: id('a'), at: ago(26 * HOUR), text: 'Запрошен документ «Выписка из ЕГРН на квартиру»' },
        { id: id('a'), at: ago(26 * HOUR), text: 'Статус изменён: Нужны документы' },
      ],
    },
    {
      id: 'k5', number: 'М-26/029', title: 'Взыскание долга с ООО «Стройресурс»', category: 'debts', clientId: 'c5', lawyerId: 'l2',
      status: 'court', openedAt: ago(50 * DAY), deadline: dayAt(3, 10, 30), updatedAt: ago(2 * HOUR), requestId: 'r1039', threadId: 't1039',
      summary: 'Взыскание 1,2 млн ₽ по договору поставки и неустойки. Иск принят арбитражным судом, назначено заседание.',
      timeline: [
        stage('Обращение принято', 'done', ago(52 * DAY)),
        stage('Документы получены', 'done', ago(49 * DAY)),
        stage('Юрист изучил ситуацию', 'done', ago(45 * DAY)),
        stage('Подготовлены документы', 'done', ago(40 * DAY)),
        stage('Следующий этап', 'current', null, 'Судебное заседание в арбитражном суде'),
      ],
      activity: [
        { id: id('a'), at: ago(50 * DAY), text: 'Дело открыто по обращению №1039' },
        { id: id('a'), at: ago(40 * DAY), text: 'Иск подан в арбитражный суд' },
        { id: id('a'), at: ago(12 * DAY), text: 'Статус изменён: Ожидание суда' },
      ],
    },
    {
      id: 'k6', number: 'М-26/034', title: 'Регистрация сделки с квартирой', category: 'realty', clientId: 'c6', lawyerId: 'l1',
      status: 'work', openedAt: ago(29 * DAY), deadline: dayAt(12, 18), updatedAt: ago(30 * MIN), requestId: 'r1040', threadId: 't1040',
      summary: 'Регистрация приостановлена из-за ошибок в договоре. Готовим исправленный договор и пакет документов.',
      timeline: [
        stage('Обращение принято', 'done', ago(30 * DAY)),
        stage('Документы получены', 'done', ago(28 * DAY)),
        stage('Юрист изучил ситуацию', 'done', ago(25 * DAY)),
        stage('Подготовлены документы', 'current', null, 'Исправленный договор купли-продажи'),
        stage('Следующий этап', 'upcoming', null, 'Повторная подача в Росреестр'),
      ],
      activity: [{ id: id('a'), at: ago(29 * DAY), text: 'Дело открыто по обращению №1040' }],
    },
    {
      id: 'k7', number: 'М-26/022', title: 'Восстановление на работе', category: 'labor', clientId: 'c7', lawyerId: 'l3',
      status: 'done', openedAt: ago(68 * DAY), deadline: null, updatedAt: ago(6 * DAY), requestId: 'r1042', threadId: 't1042',
      summary: 'Суд признал увольнение незаконным. Клиент восстановлен, взыскан средний заработок за время вынужденного прогула.',
      timeline: [
        stage('Обращение принято', 'done', ago(70 * DAY)),
        stage('Документы получены', 'done', ago(66 * DAY)),
        stage('Юрист изучил ситуацию', 'done', ago(63 * DAY)),
        stage('Подготовлены документы', 'done', ago(58 * DAY)),
        stage('Следующий этап', 'done', ago(6 * DAY), 'Решение суда вступило в силу'),
      ],
      activity: [{ id: id('a'), at: ago(6 * DAY), text: 'Статус изменён: Завершено' }],
    },
  ];

  const doc = (name, clientId, caseId, requestId, by, at, status, extra = {}) => {
    const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : null;
    return {
      id: id('d'), name, type: ext === 'jpeg' ? 'jpg' : ext, size: extra.size ?? (ext ? 180000 + ((n * 73111) % 2400000) : 0),
      clientId, caseId, requestId, by, lawyerId: extra.lawyerId || null, at, status, comment: extra.comment || '', thumb: null,
      requestedAt: extra.requestedAt || null,
    };
  };

  const documents = [
    doc('Договор подряда №17.pdf', 'c1', 'k1', 'r1041', 'client', ago(24 * DAY), 'accepted'),
    doc('Смета к договору.pdf', 'c1', 'k1', 'r1041', 'client', ago(24 * DAY), 'accepted'),
    doc('Акт осмотра квартиры.jpg', 'c1', 'k1', null, 'client', ago(22 * DAY), 'accepted'),
    doc('Претензия подрядчику.docx', 'c1', 'k1', null, 'lawyer', ago(2 * DAY), 'ready', { lawyerId: 'l2' }),
    doc('Свидетельство о браке.jpg', 'c1', 'k2', 'r1043', 'client', ago(9 * DAY), 'accepted'),
    doc('ПТС автомобиля.pdf', 'c1', 'k2', null, 'client', ago(26 * HOUR), 'review'),
    doc('Выписка из ЕГРН на квартиру', 'c1', 'k2', null, 'client', ago(26 * HOUR), 'requested', { lawyerId: 'l1', requestedAt: ago(26 * HOUR), comment: 'Свежая, не старше 30 дней. Заказывается на Госуслугах за 1 рабочий день.' }),
    doc('Договор поставки.pdf', 'c5', 'k5', 'r1039', 'client', ago(52 * DAY), 'accepted'),
    doc('Акт сверки.pdf', 'c5', 'k5', null, 'client', ago(49 * DAY), 'accepted'),
    doc('Исковое заявление.docx', 'c5', 'k5', null, 'lawyer', ago(40 * DAY), 'ready', { lawyerId: 'l2' }),
    doc('Уведомление о приостановлении.pdf', 'c6', 'k6', 'r1040', 'client', ago(30 * DAY), 'accepted'),
    doc('Договор купли-продажи (редакция 2).docx', 'c6', 'k6', null, 'lawyer', ago(3 * HOUR), 'ready', { lawyerId: 'l1' }),
    doc('Решение суда.pdf', 'c7', 'k7', null, 'lawyer', ago(6 * DAY), 'ready', { lawyerId: 'l3' }),
    doc('Заявление об увольнении.pdf', 'c2', null, 'r1045', 'client', ago(3 * HOUR), 'review'),
    doc('Фото ноутбука.jpg', 'c4', null, 'r1046', 'client', ago(28 * HOUR), 'review'),
    doc('Кассовый чек и гарантийный талон', 'c4', null, 'r1046', 'client', ago(20 * HOUR), 'requested', { lawyerId: 'l3', requestedAt: ago(20 * HOUR), comment: 'Фото или скан, чтобы были видны дата покупки и модель.' }),
    doc('Завещание.pdf', 'c3', null, 'r1047', 'client', ago(40 * MIN), 'review'),
    doc('Свидетельство о смерти.jpg', 'c3', null, 'r1047', 'client', ago(39 * MIN), 'review'),
  ];

  const msg = (threadId, clientId, from, text, at, opts = {}) => ({
    id: id('m'), threadId, clientId, from, lawyerId: opts.lawyerId || null, text, at, docId: opts.docId || null,
    kind: opts.kind || null,
    readByClient: opts.readByClient ?? true,
    readByLawyer: opts.readByLawyer ?? true,
  });

  const messages = [
    msg('t1041', 'c1', 'system', 'Обращение №1041 принято', ago(24 * DAY), { kind: 'request' }),
    msg('t1041', 'c1', 'system', 'Открыто дело М-26/037 «Спор по договору подряда»', ago(23 * DAY), { kind: 'case' }),
    msg('t1041', 'c1', 'lawyer', 'Елена, здравствуйте! Я Дмитрий Ершов, буду вести ваше дело. Посмотрел договор: срок и цена в нём зафиксированы, требовать доплату подрядчик не вправе. Подготовлю претензию.', ago(23 * DAY - 2 * HOUR), { lawyerId: 'l2' }),
    msg('t1041', 'c1', 'client', 'Спасибо! Жду.', ago(23 * DAY - 3 * HOUR)),
    msg('t1041', 'c1', 'system', 'Документ загружен: Претензия подрядчику.docx', ago(2 * DAY), { kind: 'doc' }),
    msg('t1041', 'c1', 'lawyer', 'Претензия готова — посмотрите её в документах. Если всё верно, отправим подрядчику заказным письмом.', ago(2 * DAY - 5 * MIN), { lawyerId: 'l2' }),
    msg('t1041', 'c1', 'client', 'Посмотрела, всё верно. Отправляйте.', ago(2 * DAY - 3 * HOUR)),
    msg('t1041', 'c1', 'lawyer', 'Отправил. Срок ответа — 10 дней, я отслеживаю и напишу, как только будет ответ.', ago(26 * HOUR), { lawyerId: 'l2' }),

    msg('t1043', 'c1', 'system', 'Обращение №1043 принято', ago(9 * DAY), { kind: 'request' }),
    msg('t1043', 'c1', 'system', 'Открыто дело М-26/041 «Раздел имущества»', ago(8 * DAY), { kind: 'case' }),
    msg('t1043', 'c1', 'lawyer', 'Елена, добрый день. Для соглашения о разделе понадобятся документы на квартиру и автомобиль. Свидетельство о браке уже получила, спасибо.', ago(8 * DAY - HOUR), { lawyerId: 'l1' }),
    msg('t1043', 'c1', 'client', 'Хорошо, ПТС загружу сегодня.', ago(8 * DAY - 2 * HOUR)),
    msg('t1043', 'c1', 'system', 'Документ загружен: ПТС автомобиля.pdf', ago(26 * HOUR + 10 * MIN), { kind: 'doc' }),
    msg('t1043', 'c1', 'system', 'Юрист запросил дополнительный документ: Выписка из ЕГРН на квартиру', ago(26 * HOUR), { kind: 'docRequest' }),
    msg('t1043', 'c1', 'system', 'Статус дела изменён: Нужны документы', ago(26 * HOUR), { kind: 'status' }),
    msg('t1043', 'c1', 'lawyer', 'Елена, выписку из ЕГРН можно заказать на Госуслугах — её готовят за один рабочий день. Загрузите её, пожалуйста, в кабинет, а завтра на консультации обсудим проект соглашения.', ago(50 * MIN), { lawyerId: 'l1', readByClient: false }),

    msg('t1039', 'c5', 'system', 'Обращение №1039 принято', ago(52 * DAY), { kind: 'request' }),
    msg('t1039', 'c5', 'lawyer', 'Алексей, иск принят к производству. Заседание назначено, дату и зал добавил в календарь.', ago(12 * DAY), { lawyerId: 'l2' }),
    msg('t1039', 'c5', 'client', 'Дмитрий, добрый день. Нужно ли мне лично присутствовать на заседании или достаточно доверенности?', ago(2 * HOUR), { readByLawyer: false }),

    msg('t1040', 'c6', 'system', 'Обращение №1040 принято', ago(30 * DAY), { kind: 'request' }),
    msg('t1040', 'c6', 'lawyer', 'Наталья, исправленный договор готов, он в документах. Встретимся сегодня в 16:00 в офисе — подпишем и подадим документы.', ago(3 * HOUR), { lawyerId: 'l1' }),
    msg('t1040', 'c6', 'client', 'Спасибо, буду к 16:00. Паспорт продавца взять с собой?', ago(30 * MIN), { readByLawyer: false }),

    msg('t1042', 'c7', 'lawyer', 'Виктор, решение суда вступило в силу. Работодатель обязан исполнить его немедленно — если возникнут сложности, пишите.', ago(6 * DAY), { lawyerId: 'l3' }),
    msg('t1042', 'c7', 'client', 'Спасибо вам огромное!', ago(6 * DAY - 2 * HOUR)),

    msg('t1044', 'c8', 'system', 'Обращение №1044 принято', ago(14 * DAY), { kind: 'request' }),
    msg('t1044', 'c8', 'lawyer', 'Павел, если вы не принимали наследство, долги отца вы не наследуете. Направьте банку ответ по шаблону, который я приложил. Консультация завершена.', ago(13 * DAY), { lawyerId: 'l2' }),

    msg('t1045', 'c2', 'system', 'Обращение №1045 принято', ago(3 * HOUR), { kind: 'request' }),

    msg('t1046', 'c4', 'system', 'Обращение №1046 принято', ago(28 * HOUR), { kind: 'request' }),
    msg('t1046', 'c4', 'system', 'Ответственный юрист: Мария Кузнецова', ago(22 * HOUR), { kind: 'assign' }),
    msg('t1046', 'c4', 'system', 'Юрист запросил дополнительный документ: Кассовый чек и гарантийный талон', ago(20 * HOUR), { kind: 'docRequest' }),
    msg('t1046', 'c4', 'lawyer', 'Сергей, пришлите, пожалуйста, чек и гарантийный талон — без них не сможем подготовить претензию магазину.', ago(20 * HOUR), { lawyerId: 'l3' }),

    msg('t1047', 'c3', 'system', 'Обращение №1047 принято', ago(40 * MIN), { kind: 'request' }),
  ];

  const tasks = [
    { id: id('tk'), caseId: 'k5', title: 'Подготовить позицию к заседанию', assigneeId: 'l2', due: dayAt(2, 18), status: 'progress', createdAt: ago(5 * DAY) },
    { id: id('tk'), caseId: 'k5', title: 'Подготовить иск', assigneeId: 'l2', due: dayAt(-41, 18), status: 'done', createdAt: ago(48 * DAY) },
    { id: id('tk'), caseId: 'k1', title: 'Проверить материалы: ответ подрядчика', assigneeId: 'l2', due: dayAt(9, 12), status: 'todo', createdAt: ago(DAY) },
    { id: id('tk'), caseId: 'k1', title: 'Подготовить претензию', assigneeId: 'l2', due: dayAt(-3, 18), status: 'done', createdAt: ago(18 * DAY) },
    { id: id('tk'), caseId: 'k2', title: 'Позвонить клиенту: напомнить про выписку ЕГРН', assigneeId: 'l1', due: dayAt(0, 17), status: 'todo', createdAt: ago(DAY) },
    { id: id('tk'), caseId: 'k2', title: 'Запросить документы', assigneeId: 'l1', due: dayAt(-1, 18), status: 'done', createdAt: ago(8 * DAY) },
    { id: id('tk'), caseId: 'k2', title: 'Подготовить договор: соглашение о разделе имущества', assigneeId: 'l1', due: dayAt(4, 18), status: 'todo', createdAt: ago(8 * DAY) },
    { id: id('tk'), caseId: 'k6', title: 'Подготовить договор купли-продажи (редакция 2)', assigneeId: 'l1', due: dayAt(0, 12), status: 'done', createdAt: ago(6 * DAY) },
    { id: id('tk'), caseId: 'k6', title: 'Проверить материалы для повторной подачи', assigneeId: 'l3', due: dayAt(1, 15), status: 'progress', createdAt: ago(2 * DAY) },
  ];

  const events = [
    { id: id('e'), type: 'meeting', title: 'Встреча с Натальей Беловой: подписание договора', at: dayAt(0, 16), duration: 60, clientId: 'c6', caseId: 'k6', lawyerId: 'l1', place: 'Офис, переговорная 2' },
    { id: id('e'), type: 'consultation', title: 'Консультация: проект соглашения о разделе', at: dayAt(1, 11), duration: 60, clientId: 'c1', caseId: 'k2', lawyerId: 'l1', place: 'Офис, ул. Кирова, 110, каб. 305' },
    { id: id('e'), type: 'court', title: 'Судебное заседание по иску к ООО «Стройресурс»', at: dayAt(3, 10, 30), duration: 90, clientId: 'c5', caseId: 'k5', lawyerId: 'l2', place: 'Арбитражный суд Челябинской области, зал 412' },
    { id: id('e'), type: 'deadline', title: 'Срок: загрузить выписку из ЕГРН', at: dayAt(6, 18), duration: 0, clientId: 'c1', caseId: 'k2', lawyerId: 'l1', place: '' },
    { id: id('e'), type: 'date', title: 'Срок ответа подрядчика на претензию', at: dayAt(9, 12), duration: 0, clientId: 'c1', caseId: 'k1', lawyerId: 'l2', place: '' },
    { id: id('e'), type: 'deadline', title: 'Повторная подача документов в Росреестр', at: dayAt(12, 10), duration: 0, clientId: 'c6', caseId: 'k6', lawyerId: 'l1', place: 'МФЦ' },
    { id: id('e'), type: 'meeting', title: 'Планёрка команды', at: dayAt(1, 9, 30), duration: 30, clientId: null, caseId: null, lawyerId: 'l1', place: 'Офис' },
    { id: id('e'), type: 'court', title: 'Предварительное заседание: трудовой спор', at: dayAt(15, 14), duration: 60, clientId: null, caseId: null, lawyerId: 'l3', place: 'Центральный районный суд' },
  ];

  const inv = (number, clientId, caseId, service, amount, issuedAt, dueAt, status, paidAt = null) => ({
    id: id('i'), number, clientId, caseId, service, amount, issuedAt, dueAt, status, paidAt,
  });

  const invoices = [
    inv('С-0301', 'c5', 'k5', 'Подготовка искового заявления', 15000, ago(45 * DAY), ago(38 * DAY), 'paid', ago(42 * DAY)),
    inv('С-0303', 'c6', 'k6', 'Сопровождение сделки с недвижимостью', 18000, ago(28 * DAY), ago(21 * DAY), 'paid', ago(27 * DAY)),
    inv('С-0305', 'c7', 'k7', 'Представительство по трудовому спору', 30000, ago(60 * DAY), ago(50 * DAY), 'paid', ago(55 * DAY)),
    inv('С-0307', 'c1', 'k1', 'Анализ договора и консультация', 5000, ago(22 * DAY), ago(15 * DAY), 'paid', ago(22 * DAY)),
    inv('С-0309', 'c1', 'k2', 'Консультация по разделу имущества', 3000, ago(8 * DAY), ago(1 * DAY), 'paid', ago(8 * DAY)),
    inv('С-0311', 'c8', null, 'Консультация', 3000, ago(14 * DAY), ago(7 * DAY), 'paid', ago(14 * DAY)),
    inv('С-0314', 'c5', 'k5', 'Представительство в арбитражном суде', 45000, ago(10 * DAY), dayAt(4, 23), 'unpaid'),
    inv('С-0316', 'c1', 'k1', 'Подготовка досудебной претензии', 8000, ago(2 * DAY), dayAt(5, 23), 'unpaid'),
  ];

  const notifications = [
    { id: id('n'), clientId: 'c1', kind: 'invoice', title: 'Выставлен счёт', text: 'Подготовка досудебной претензии — 8 000 ₽', at: ago(2 * DAY), read: true, link: '#/c/payments' },
    { id: id('n'), clientId: 'c1', kind: 'status', title: 'Изменился статус дела', text: '«Раздел имущества»: Нужны документы', at: ago(26 * HOUR), read: true, link: '#/c/case/k2' },
    { id: id('n'), clientId: 'c1', kind: 'docs', title: 'Необходимо загрузить документ', text: 'Выписка из ЕГРН на квартиру — дело «Раздел имущества»', at: ago(26 * HOUR), read: false, link: '#/c/docs' },
    { id: id('n'), clientId: 'c1', kind: 'event', title: 'Завтра запланирована консультация', text: 'Завтра в 11:00 · Анна Соколова, офис на Кирова, 110', at: ago(2 * HOUR), read: false, link: '#/c/calendar' },
    { id: id('n'), clientId: 'c1', kind: 'message', title: 'Юрист ответил на сообщение', text: 'Анна Соколова: выписку из ЕГРН можно заказать на Госуслугах…', at: ago(50 * MIN), read: false, link: '#/c/chat/t1043' },
  ];

  const feed = [
    { id: id('f'), kind: 'doc', text: 'Е. Морозова загрузила «ПТС автомобиля.pdf»', at: ago(26 * HOUR + 10 * MIN), link: '#/l/case/k2/docs', read: true },
    { id: id('f'), kind: 'request', text: 'Новое обращение №1045 — Игорь Павлов', at: ago(3 * HOUR), link: '#/l/request/r1045', read: false },
    { id: id('f'), kind: 'message', text: 'Сообщение от Алексея Громова', at: ago(2 * HOUR), link: '#/l/messages/t1039', read: false },
    { id: id('f'), kind: 'request', text: 'Новое обращение №1047 — Ольга Лебедева', at: ago(40 * MIN), link: '#/l/request/r1047', read: false },
    { id: id('f'), kind: 'message', text: 'Сообщение от Натальи Беловой', at: ago(30 * MIN), link: '#/l/messages/t1040', read: false },
  ];

  return {
    version: VERSION,
    rev: 0,
    seq: { request: 1048, case: 42, invoice: 318 },
    me: { clientId: 'c1', lawyerId: 'l1' },
    company: {
      name: 'Мотив', tagline: 'Юридическая помощь в одном месте', phone: '+7 (351) 200-40-40', email: 'hello@motiv-law.ru',
      address: 'Челябинск, ул. Кирова, 110, офис 305', hours: 'Пн–Пт, 9:00–19:00', replySla: 2,
      notifyEmail: true, notifySms: true, autoAssign: false,
    },
    lawyers, clients, requests, cases, documents, messages, tasks, events, invoices, notifications, feed,
  };
}
