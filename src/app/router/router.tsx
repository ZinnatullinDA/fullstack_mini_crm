import { createBrowserRouter, Link, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/features/auth/auth-provider'
import { LoginPage } from '@/pages/login/login-page'
import { MyTasksPage } from '@/pages/my-tasks/my-tasks-page'
import { ObjectDetailsPage } from '@/pages/object-details/object-details-page'
import { ObjectsPage } from '@/pages/objects/objects-page'
import { TaskDetailsPage } from '@/pages/task-details/task-details-page'
import { Button } from '@/shared/components/ui/button'

function ProtectedLayout() {
  const { error, loading, profile, session, signOut } = useAuth()
  const navigate = useNavigate()

  if (loading)
    return <main className="p-8" role="status">Восстановление сессии…</main>

  if (!session)
    return <Navigate replace to="/login" />

  if (error)
    return <main className="p-8 text-red-700" role="alert">{error}</main>

  if (!profile)
    return <main className="p-8" role="status">Загрузка профиля…</main>

  async function exit() {
    try {
      await signOut()
      void navigate('/login')
    }
    catch (cause) {
      toast.error(cause instanceof Error
? cause.message
: 'Не удалось выйти')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 p-4">
          <Link className="font-semibold" to="/objects">Объекты и задачи</Link>
          <Link className="text-sm hover:underline" to="/objects">Объекты</Link>
          {profile.role === 'executor' && <Link className="text-sm hover:underline" to="/my-tasks">Мои задачи</Link>}
          <span className="ml-auto text-sm text-slate-500">{profile.display_name || session.user.email}</span>
          <Button onClick={() => void exit()} size="sm" variant="outline">Выйти</Button>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl p-4 md:p-8"><Outlet /></main>
    </div>
  )
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedLayout />,
    children: [
      { path: '/', element: <Navigate replace to="/objects" /> },
      { path: '/objects', element: <ObjectsPage /> },
      { path: '/objects/:id', element: <ObjectDetailsPage /> },
      { path: '/tasks/:id', element: <TaskDetailsPage /> },
      { path: '/my-tasks', element: <MyTasksPage /> },
    ],
  },
  { path: '*', element: <Navigate replace to="/objects" /> },
])
