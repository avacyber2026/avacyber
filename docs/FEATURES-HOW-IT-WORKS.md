# Как работают добавленные фичи (Vision Board)

## Backend

### Миграция `migrate_profile_notifications.sql`
- В таблицу **users** добавлены поля: `first_name`, `last_name`, `job_title`, `department`, `avatar_url`.
- В таблицу **reports** добавлены (если ещё не было): `priority`, `comment`, `updated_at`.
- Создана таблица **notifications**: уведомления для пользователей (при закрытии репорта автору создаётся запись).

### API
- **GET/PATCH /profile** — просмотр и обновление своего профиля (имя, фамилия, должность, отдел, аватар URL). Требует авторизацию.
- **GET /notifications** — список уведомлений текущего пользователя.
- **PATCH /notifications/:id/read** — отметить уведомление прочитанным.
- **POST /notifications/read-all** — отметить все прочитанными.
- При **PATCH /reports/:id/resolve** (закрытие репорта) автору репорта создаётся уведомление "Report resolved".

---

## Frontend — навигация и страницы

### Сайдбар (меню)
- Для всех ролей (кроме Admin): **Dashboard**, **Profile**, **Requests**, **Report Activity**, **Settings**, **User guide**, **Help & Support**, **Security on-call**, **Integrations**, **Notifications**.
- Для **Admin** — один пункт **Admin** (переход в админку).
- Имя в сайдбаре подтягивается из **/profile** (displayName: «Имя Ф.»).
- Внизу: переключатель **Light/Dark theme** и **Log out**.

### 1) User profile (Профиль)
- **Страница:** `/profile`.
- Показывает: аватар, email, имя и фамилию, должность (job title), отдел (department).
- Кнопка **Edit profile** открывает форму: имя, фамилия, job title, department, URL аватара. **Save** отправляет PATCH /profile.

### 2) Language settings (Язык)
- **Страница:** `/settings`, блок «Language».
- Сейчас заглушка: кнопка «English (coming soon)». В видении — переключатель языка (например, кнопка-«планета» в хедере); при необходимости можно подключить i18n и вынести в шапку.

### 3) Incidents list (Список инцидентов)
- **Страница:** `/report`.
- Кнопка **Create new Incident** ведёт на `/report/create`.
- **End-User:** форма создания + блок «Search incident DB» + **Timeline — your incidents** (история с датами слева).
- **Premium (GSOC и др.):** список всех репортов с фильтрами (см. ниже) и кнопками «Mark Resolved».

### 4) User guide
- **Страница:** `/guide`.
- Статичный текст-заглушка. Сюда можно добавить PDF или ссылку на внутреннюю инструкцию.

### 5) Settings (Настройки)
- **Страница:** `/settings`.
- **Appearance:** переключатель Light/Dark (дублирует сайдбар).
- **Account:** ссылка «Open profile» на `/profile`.
- **Language:** заглушка переключателя языка.

### 6) Notifications (Уведомления)
- **Страница:** `/notifications`.
- Список уведомлений (GET /notifications). Кнопка **Mark all as read** вызывает POST /notifications/read-all.
- Уведомления создаются при закрытии репорта (автору приходит «Report resolved»).

### 7) Security on-call
- **Страница:** `/on-call`.
- Кнопка **Call security on-call** — ссылка `tel:+1234567890`. Номер можно заменить в коде или вынести в конфиг/админку.

### 8) Search bar
- Поиск по инцидентам: на странице **Report Activity** (и в **Reported Activity**) есть фильтр **Search (Report ID)** и пресеты по времени (см. ниже).

### 9) Dashboard (Аналитика)
- **Страница:** `/dashboard`.
- Карточки: количество репортов (GET /reports), количество тикетов (GET /tickets), блок «Analytics — Coming soon» для будущих графиков.

### 10) Help / Support
- **Страница:** `/help`.
- Текст и ссылка на **Security on-call** (`/on-call`).

### 11) Dark mode
- Уже было: переключатель в сайдбаре и в **Settings** (Appearance).

### 12) Timeline under user's incidents
- В **Report Activity** для End-User блок **Timeline — your incidents**: вертикальная линия по датам, слева дата, справа карточки инцидентов (subject, description, status, кто закрыл).

### 13) Search incident DB
- На **Report Activity** (End-User): поле «Search similar past incidents...» над формой создания — поиск по своим репортам (subject/description), под полем список до 8 совпадений.
- На **Create new incident** (`/report/create`): блок «Search incident DB» — поиск по всем доступным репортам, ниже форма создания с приоритетом.

### 14) Integrations
- **Страница:** `/integrations`.
- Список SIEM (Splunk, Azure Sentinel, Elastic, Google Chronicle, Rapid7) с пометкой «Coming soon».
- Блок «Create tickets from» — заглушка для тикетов из email/звонков.

---

## Фильтры на странице Reported Activity (Premium)

- **Presets:** None / Today / Last 7 days / Last 30 days — фильтр по времени создания репорта.
- **Date & time: from / to** — свой диапазон дат (сбрасывает preset).
- **Status:** All / Open / Resolved.
- **Priority:** All / Low / Medium / High.
- **Search (Report ID)** — подстрока в id репорта.
- **Reset Filters** — сброс всех фильтров.

---

## Создание инцидента

- **Где:** `/report` (форма у End-User) или **Create new Incident** → `/report/create` (общая страница).
- **Поля:** Subject, Description, Priority (Low/Medium/High).
- **Search incident DB** на `/report/create`: перед созданием можно искать похожие инциденты по тексту.

---

## Визуал

- Общий стиль сохранён: Chakra UI, зелёный акцент #50BFA0, сайдбар 220px, блоки с `app.cardBg` и `app.border`.
- Новые страницы используют тот же класс `style.main` (отступ от сайдбара и адаптив под мобильные).
- Таймлайн в истории инцидентов — вертикальная линия слева и даты.

---

## Запуск

1. **Миграции:** `cd backend && node db/runMigrations.js`
2. **Бэкенд:** `node server.js` (порт 3020)
3. **Фронт:** `cd frontend && pnpm dev` (порт 3000)

После входа под пользователем доступны все пункты меню; профиль и уведомления работают через API выше.
