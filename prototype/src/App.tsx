import { Routes, Route } from 'react-router-dom'
import { LandingPage } from '@/pages/marketing/LandingPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { DocBrowserPage } from '@/pages/docs/DocBrowserPage'
import { ConsoleDashboard } from '@/pages/console/ConsoleDashboard'
import { ApiEditorPage } from '@/pages/console/ApiEditorPage'
import { DebugPage } from '@/pages/console/DebugPage'
import { EnvironmentPage } from '@/pages/console/EnvironmentPage'
import { VersionPage } from '@/pages/console/VersionPage'
import { MockPage } from '@/pages/console/MockPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/docs/:spaceKey/:projectKey" element={<DocBrowserPage />} />
      <Route path="/docs" element={<DocBrowserPage />} />
      <Route path="/console" element={<ConsoleDashboard />} />
      <Route path="/console/api-editor" element={<ApiEditorPage />} />
      <Route path="/console/debug" element={<DebugPage />} />
      <Route path="/console/environments" element={<EnvironmentPage />} />
      <Route path="/console/versions" element={<VersionPage />} />
      <Route path="/console/mock" element={<MockPage />} />
    </Routes>
  )
}

export default App
