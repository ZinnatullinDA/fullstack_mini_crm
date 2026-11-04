import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { router } from '@/app/router/router'
import { AuthProvider } from '@/features/auth/auth-provider'
import '@/styles/index.css'

const root = document.getElementById('root')

if (!root) 
  throw new Error('Не найден корневой элемент приложения')

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster richColors />
    </AuthProvider>
  </React.StrictMode>,
)
