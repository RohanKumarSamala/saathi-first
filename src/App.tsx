import { lazy, Suspense, useEffect, useRef } from 'react'
import { BrowserRouter, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import BecomeSaathi from './pages/BecomeSaathi'
import Contact from './pages/Contact'
import Home from './pages/Home'
import NotFound from './pages/NotFound'
import Plans from './pages/Plans'
import Policy from './pages/Policy'
import Saathis from './pages/Saathis'
import Services from './pages/Services'

// Only admins need this code, so it is loaded on demand.
const Admin = lazy(() => import('./pages/Admin'))

/** Scrolls to the hash target on in-page links, otherwise to the top on navigation. */
function useScrollRestoration() {
  const { pathname, hash, key } = useLocation()
  const previousPath = useRef(pathname)

  useEffect(() => {
    // Jump straight there when arriving from another page; glide within the same page.
    const behavior = previousPath.current === pathname ? 'smooth' : 'instant'
    previousPath.current = pathname

    const target = hash && document.getElementById(decodeURIComponent(hash.slice(1)))
    if (target) target.scrollIntoView({ behavior })
    else window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname, hash, key])
}

function Layout() {
  const { pathname } = useLocation()
  useScrollRestoration()

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-blush focus:px-5 focus:py-3 focus:font-semibold focus:text-wine"
      >
        Skip to content
      </a>
      {/* Fixed page wash: the soft blush glow sits behind every light section. */}
      <div aria-hidden className="page-wash fixed inset-0 -z-10" />
      <Header />
      <main id="main" className="[overflow-x:clip]">
        <Outlet />
      </main>
      <Footer showEnquiry={!pathname.startsWith('/contact') && pathname !== '/admin'} />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="services" element={<Services />} />
          <Route path="saathis" element={<Saathis />} />
          <Route path="saathis/:serviceId" element={<Saathis />} />
          <Route path="plans" element={<Plans />} />
          <Route path="become-a-saathi" element={<BecomeSaathi />} />
          <Route path="contact" element={<Contact />} />
          <Route path="contact/:serviceId" element={<Contact />} />
          <Route path="policies/:slug" element={<Policy />} />
          <Route
            path="admin"
            element={
              <Suspense fallback={null}>
                <Admin />
              </Suspense>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
