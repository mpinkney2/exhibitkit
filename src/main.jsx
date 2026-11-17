import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { captureLandingAttribution } from './utils/attribution'
import { installLinkedInInsightTag } from './utils/linkedinInsight'

captureLandingAttribution()
installLinkedInInsightTag()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
