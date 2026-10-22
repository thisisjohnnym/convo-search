import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { Flip } from 'gsap/Flip'
import App from './App'
import './styles.css'

gsap.registerPlugin(useGSAP, Flip)
gsap.defaults({ overwrite: 'auto' })
gsap.ticker.lagSmoothing(0) // keep animation timing true on slow frames instead of stretching it
if (import.meta.env.DEV) (window as unknown as { gsap: typeof gsap }).gsap = gsap

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
