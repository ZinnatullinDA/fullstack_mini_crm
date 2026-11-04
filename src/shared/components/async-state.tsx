import type { ReactNode } from 'react'

interface AsyncStateProps {
  error?: string | null
  loading?: boolean
  empty?: boolean
  children: ReactNode
}

export function AsyncState({
  children,
  empty,
  error,
  loading,
}: AsyncStateProps) {
  if (loading) 
    return <p role="status">Загрузка…</p>

  if (error) {
    return (
      <p className="text-red-700" role="alert">
        {error}
      </p>
    )
  }

  if (empty) 
    return <p className="text-slate-500">Пока нет данных.</p>

  return children
}
