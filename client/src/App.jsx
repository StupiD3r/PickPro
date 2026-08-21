import { useEffect, useState } from 'react'
import Home from './pages/Home'
import Admin from './pages/Admin'

function getRoute() {
  return window.location.pathname.startsWith('/admin') ? 'admin' : 'home'
}

function App() {
  const [route, setRoute] = useState(getRoute)

  useEffect(() => {
    const onPopState = () => setRoute(getRoute())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  return route === 'admin' ? <Admin /> : <Home />
}

export default App