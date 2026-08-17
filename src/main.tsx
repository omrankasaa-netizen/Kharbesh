import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { TRPCProvider } from '@/providers/trpc'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TRPCProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </TRPCProvider>
  </StrictMode>,
)
