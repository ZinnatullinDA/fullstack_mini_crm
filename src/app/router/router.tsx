import { createBrowserRouter, Link, Outlet } from 'react-router-dom'
import { Button } from '@/shared/components/ui/button'

function Layout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <nav className="mx-auto flex max-w-6xl items-center gap-6 p-4">
          <Link className="font-semibold" to="/objects">Объекты и задачи</Link>
          <Link to="/objects">Объекты</Link>
          <Link to="/my-tasks">Мои задачи</Link>
          <Button className="ml-auto" size="sm" variant="outline">Выйти</Button>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  )
}

function Placeholder({ title }: { title: string }) {
  return <h1 className="text-3xl font-bold">{title}</h1>
}

export const router = createBrowserRouter([
  { path: '/login', element: <Placeholder title="Вход" /> },
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Placeholder title="Объекты" /> },
      { path: '/objects', element: <Placeholder title="Объекты" /> },
      { path: '/objects/:id', element: <Placeholder title="Карточка объекта" /> },
      { path: '/tasks/:id', element: <Placeholder title="Карточка задачи" /> },
      { path: '/my-tasks', element: <Placeholder title="Мои задачи" /> },
    ],
  },
])
