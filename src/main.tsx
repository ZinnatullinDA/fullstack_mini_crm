import React from 'react'
import ReactDOM from 'react-dom/client'
import '@/styles/index.css'

const root = document.getElementById('root')

if (!root)
  throw new Error('Не найден корневой элемент приложения')

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-3xl font-bold">Объекты и задачи</h1>
    </main>
  </React.StrictMode>,
)
