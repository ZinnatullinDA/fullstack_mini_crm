import type { FormEvent } from 'react'
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/auth-provider'
import { Button } from '@/shared/components/ui/button'

export function LoginPage() {
  const { error: configError, loading, session, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  if (loading) 
    return <p>Восстановление сессии…</p>

  if (session) 
    return <Navigate replace to="/objects" />

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)

    try {
      await signIn(email, password)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось войти')
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <form
        className="w-full max-w-sm space-y-5 rounded-xl bg-white p-8 shadow-sm"
        onSubmit={submit}
      >
        <div>
          <h1 className="text-2xl font-bold">Вход в CRM</h1>
          <p className="mt-1 text-sm text-slate-500">Объекты и задачи</p>
        </div>
        <label className="block space-y-1 text-sm font-medium">
          <span>Email</span>
          <input
            autoComplete="email"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <label className="block space-y-1 text-sm font-medium">
          <span>Пароль</span>
          <input
            autoComplete="current-password"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>
        {(error || configError) && (
          <p className="text-sm text-red-700" role="alert">
            {error || configError}
          </p>
        )}
        <Button
          className="w-full"
          disabled={pending || Boolean(configError)}
          type="submit"
        >
          {pending ? 'Входим…' : 'Войти'}
        </Button>
      </form>
    </main>
  )
}
