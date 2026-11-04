# Мини-CRM «Объекты и задачи»

React SPA для строительной компании: постановщики управляют объектами и задачами, назначенные исполнители выполняют задачи и отправляют их на проверку. Требования взяты из DOCX в корне репозитория.

## Стек

React 19, Vite 8, TypeScript 6 (strict), React Router 7, Tailwind CSS 4, компоненты в стиле shadcn/ui на Radix, Supabase Auth/PostgreSQL/RLS, Vitest и Playwright. Код проверяют ESLint Flat Config с `@antfu/eslint-config`, Husky, lint-staged и Commitlint.

## Структура

- `src/app/router` — маршруты и защищённый layout.
- `src/pages` — пять обязательных экранов.
- `src/features/auth` — сессия, профиль, вход и выход.
- `src/entities/task/model` — типы, статусы и отображение доступных действий.
- `src/shared/api` — Supabase client и запросы.
- `src/shared/components` — общие UI-компоненты и состояния.
- `src/shared/hooks` — загрузка данных.
- `supabase/migrations` — схема, RLS и серверные переходы статусов.
- `e2e` — браузерные и API-проверки через пользовательские сессии.

Типы `src/shared/api/database.types.ts` синхронизированы с SQL-миграциями вручную, поскольку генерация типов из недоступного в этом сеансе проекта невозможна. После применения миграций их следует сверить с выводом `supabase gen types typescript --remote`.

## Настройка

1. Установите Node.js 22+ и выполните `npm ci`.
2. Скопируйте `.env.example` в `.env.local`.
3. Укажите `VITE_SUPABASE_URL=https://pgpkrhuvpqhfinszeqvy.supabase.co` и публичный `VITE_SUPABASE_PUBLISHABLE_KEY` из Connect либо Settings → API Keys в Supabase Dashboard. Поддерживается и устаревающий `VITE_SUPABASE_ANON_KEY`. Не используйте secret key или `service_role` в SPA.
4. Установите Supabase CLI и выполните `supabase login`. До применения SQL проверьте, что подключён нужный проект и что в схеме нет конфликтующих таблиц, типов и функций. Свяжите проект через `supabase link --project-ref pgpkrhuvpqhfinszeqvy`, проверьте историю миграций через `supabase migration list --remote`, затем примените файлы `supabase/migrations` командой `supabase db push --remote`. При существующих изменениях схемы сначала синхронизируйте их через `supabase db pull --remote`. Миграции не идемпотентны; не применяйте их поверх конфликтующей схемы.
5. В общих настройках Supabase Auth отключите **Allow new users to sign up**. Проверьте это прямым запросом к Auth API.
6. В Dashboard → Authentication → Users вручную создайте одного постановщика и двух исполнителей с подтверждённым email. Для новых пользователей триггер создаёт профиль исполнителя. Назначьте постановщику роль в SQL Editor: `update public.profiles set role = 'manager', display_name = 'Постановщик' where id = '<UUID_пользователя>';`. Для исполнителей при желании задайте `display_name`. Пароли храните вне Git.
7. Выполните `npm run dev` и откройте адрес Vite.

Публичной регистрации в интерфейсе нет. Для работы нужен применённый SQL и реальные пользователи Supabase.

## Права и данные

Постановщик видит все активные объекты и задачи, создаёт и меняет их, назначает исполнителя, принимает задачу или возвращает её на доработку. Исполнитель видит только назначенные задачи и связанные объекты. Свой профиль нельзя менять через клиентский API: для него выдано только чтение. Удаление объектов и задач мягкое (`deleted_at`); при удалении объекта его задачи также скрываются. Физическое удаление клиенту не предоставлено, поэтому история остаётся в БД.

Статусы: `new → in_progress → in_review`, затем постановщик выбирает `accepted` или `rework`; из `rework` исполнитель возвращает задачу в `in_progress`. Для `rework` обязателен непустой комментарий. Клиент показывает доступные кнопки, но правила проверяет `transition_task_status` в PostgreSQL. Функция проверяет `auth.uid()`, роль и назначение, блокирует строку `FOR UPDATE`, сравнивает ожидаемый статус и атомарно записывает историю. Прямой UPDATE статуса отклоняет триггер. У таблицы истории для `authenticated` есть только SELECT, а RLS ограничивает чтение.

## Проверки

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
```

Для прямых RLS-проверок в `e2e/security.spec.ts` задайте переменные окружения `CRM_SUPABASE_URL`, `CRM_SUPABASE_PUBLISHABLE_KEY`, `CRM_MANAGER_EMAIL`, `CRM_MANAGER_PASSWORD`, `CRM_EXECUTOR_EMAIL`, `CRM_EXECUTOR_PASSWORD`, `CRM_OTHER_EXECUTOR_EMAIL`, `CRM_OTHER_EXECUTOR_PASSWORD`. Поддерживается и устаревающий `CRM_SUPABASE_ANON_KEY`. Используется только публичный ключ и вход каждым тестовым пользователем. Без этих переменных тест явно пропускается; см. `TEST_REPORT.md`.

## Production

Выполните `npm run build` и разместите содержимое `dist` на статическом хостинге. Настройте fallback всех путей на `index.html` для React Router. Перед сборкой укажите публичные `VITE_SUPABASE_URL` и `VITE_SUPABASE_PUBLISHABLE_KEY`; переменные `VITE_` встраиваются в клиентский bundle. В Supabase Auth добавьте домен развёрнутой SPA в разрешённые URL. Secret key, `service_role` и пароли в хостинг frontend не передавайте.

## Примечание к ESLint

В установленной версии `eslint-plugin-react` правило `react/jsx-self-closing-comp` отсутствует, поэтому включено совместимое `style/jsx-self-closing-comp`. Остальные запрошенные JSX-правила проверяются через `eslint-plugin-react`. Правило `antfu/reasonable-newline` отключено: вместе с обязательным отключением `format/prettier` оно создавало нечитабельные переносы и отступы; отступы, кавычки и точки с запятой проверяют правила `@stylistic`.

## Текущее состояние

Миграции сохранены в Git и применены к целевому удалённому проекту `pgpkrhuvpqhfinszeqvy`. Локальный `supabase/config.toml` запрещает открытую регистрацию. Перед использованием приложения необходимо создать тестовые аккаунты и выполнить security E2E-тесты с реальными JWT. Подробности — в `TEST_REPORT.md`.

Документация Supabase: [ключи API](https://supabase.com/docs/guides/getting-started/api-keys), [настройки Auth](https://supabase.com/docs/guides/auth/general-configuration), [применение миграций](https://supabase.com/docs/guides/deployment/database-migrations).
