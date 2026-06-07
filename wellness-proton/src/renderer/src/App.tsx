import { Route, Routes } from 'react-router'
import { Toaster } from 'react-hot-toast'
import Layout from './components/Layout'
import NavigationBridge from './components/NavigationBridge'
import ChimePlayer from './components/ChimePlayer'
import AchievementToast from './components/AchievementToast'
import MedReminderToast from './components/MedReminderToast'
import ThemeProvider from './components/ThemeProvider'
import Dashboard from './pages/Dashboard'
import Water from './pages/Water'
import Meals from './pages/Meals'
import Medications from './pages/Medications'
import Exercise from './pages/Exercise'
import Sleep from './pages/Sleep'
import Analytics from './pages/Analytics'
import Achievements from './pages/Achievements'
import Assistant from './pages/Assistant'
import Settings from './pages/Settings'

function App(): React.JSX.Element {
  return (
    <>
      <ThemeProvider />
      <NavigationBridge />
      <ChimePlayer />
      <AchievementToast />
      <MedReminderToast />
      <Toaster />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="water" element={<Water />} />
          <Route path="meals" element={<Meals />} />
          <Route path="medications" element={<Medications />} />
          <Route path="exercise" element={<Exercise />} />
          <Route path="sleep" element={<Sleep />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="achievements" element={<Achievements />} />
          <Route path="assistant" element={<Assistant />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </>
  )
}

export default App
