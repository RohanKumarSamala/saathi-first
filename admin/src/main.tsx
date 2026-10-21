import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from '../../main/src/auth/AuthProvider'
import './index.css'
import Admin from './Admin'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <Admin />
    </AuthProvider>
  </StrictMode>,
)
