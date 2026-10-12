import { ChevronDown, CircleUserRound, House, Menu, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import logo from '../assets/logo/logo-horizontal-light.svg'
import { useAuth } from '../auth/context'
import { navLinks, services } from '../content/site'

const linkClass =
  'whitespace-nowrap rounded-full px-2.5 py-2 text-[0.9375rem] font-medium leading-6 text-blush transition-colors duration-200 hover:text-gold xl:px-4'

function useIsActive() {
  const { pathname, hash } = useLocation()
  return (to: string) => {
    const [path, targetHash] = to.split('#')
    if (targetHash) return pathname === path && hash === `#${targetHash}`
    return pathname === path || pathname.startsWith(`${path}/`)
  }
}

function ServicesDropdown() {
  const [open, setOpen] = useState(false)
  const wrapper = useRef<HTMLDivElement>(null)
  // While the pointer is over the menu a click must not toggle it shut again.
  const hovered = useRef(false)
  const menuId = useId()
  const { pathname } = useLocation()
  const active = pathname === '/services'

  useEffect(() => {
    if (!open) return
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !wrapper.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  return (
    <div
      ref={wrapper}
      className="relative"
      onMouseEnter={() => {
        hovered.current = true
        setOpen(true)
      }}
      onMouseLeave={() => {
        hovered.current = false
        setOpen(false)
      }}
      onBlur={(event) => {
        if (!wrapper.current?.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => hovered.current || !value)}
        className={`${linkClass} flex items-center gap-2 ${active ? 'text-gold' : ''}`}
      >
        Our Services
        <ChevronDown
          aria-hidden
          className={`size-4 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        id={menuId}
        className={`absolute left-0 top-full w-72 pt-5 transition-[opacity,transform,visibility] duration-300 ease-out-soft ${
          open ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-2 opacity-0'
        }`}
      >
        <ul className="rounded-3xl border border-blush/10 bg-wine/85 p-3 shadow-card backdrop-blur-[15px]">
          <li>
            <Link
              to="/services"
              onClick={() => setOpen(false)}
              className="block rounded-2xl px-4 py-2.5 text-[0.9375rem] font-semibold text-gold transition-colors hover:bg-blush/10"
            >
              All services
            </Link>
          </li>
          {services.map((service) => (
            <li key={service.id}>
              <Link
                to={`/services#${service.id}`}
                onClick={() => setOpen(false)}
                className="block rounded-2xl px-4 py-2.5 text-[0.9375rem] font-medium text-blush transition-colors hover:bg-blush/10 hover:text-gold"
              >
                {service.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/** Sign-in button for visitors; a small menu (admin link, sign out) once signed in. */
function AccountMenu() {
  const { user, isAdmin, openAuth, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const wrapper = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !wrapper.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  if (!user) {
    return (
      <button type="button" onClick={openAuth} className={`${linkClass} flex items-center gap-2`}>
        <CircleUserRound aria-hidden className="size-5" />
        Sign in
      </button>
    )
  }

  const itemClass =
    'block w-full rounded-2xl px-4 py-2.5 text-left text-[0.9375rem] font-medium text-blush transition-colors hover:bg-blush/10 hover:text-gold'

  return (
    <div ref={wrapper} className="relative">
      <button
        type="button"
        aria-label="Account"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="grid size-10 place-items-center rounded-full text-gold transition-colors hover:bg-blush/10"
      >
        <CircleUserRound aria-hidden className="size-6" />
      </button>
      {open && (
        <div className="absolute right-0 top-full w-64 pt-5">
          <div className="rounded-3xl border border-blush/10 bg-wine/85 p-3 shadow-card backdrop-blur-[15px]">
            <p className="truncate px-4 py-2 text-sm text-blush/70">
              {user.phoneNumber ?? user.email}
            </p>
            {isAdmin && (
              <Link to="/admin" onClick={() => setOpen(false)} className={itemClass}>
                Admin
              </Link>
            )}
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                void signOut()
              }}
              className={itemClass}
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function Header() {
  const { user, isAdmin, openAuth, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const isActive = useIsActive()
  const panelId = useId()
  const wrapper = useRef<HTMLDivElement>(null)

  const closeMenu = () => setMenuOpen(false)

  // The mobile menu closes on Escape or a press anywhere outside the bar and the menu.
  useEffect(() => {
    if (!menuOpen) return
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !wrapper.current?.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', close)
    }
  }, [menuOpen])

  return (
    <header className="page-padding fixed inset-x-0 top-5 z-50 nav:top-6">
      <div ref={wrapper} className="container-large relative">
        <div className="flex h-16 items-center justify-between gap-4 rounded-full border-b border-wine bg-wine/70 px-5 shadow-[-1px_-1px_0_0_rgb(253_238_238/0.32)] backdrop-blur-[15px] nav:h-18 nav:px-8">
          <Link to="/" aria-label="Saathi First home" onClick={closeMenu} className="shrink-0 rounded-lg">
            <img src={logo} alt="Saathi First" width={373} height={112} className="h-9 w-auto nav:h-10" />
          </Link>

          <nav aria-label="Primary" className="hidden items-center min-[1120px]:flex">
            <ServicesDropdown />
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                aria-current={isActive(link.to) ? 'page' : undefined}
                className={`${linkClass} ${isActive(link.to) ? 'text-gold' : ''}`}
              >
                {link.label}
              </Link>
            ))}
            <AccountMenu />
          </nav>

          <div className="flex items-center gap-1 min-[1120px]:hidden">
            <Link
              to="/"
              aria-label="Home"
              onClick={closeMenu}
              className="grid size-11 place-items-center rounded-full text-blush transition-colors hover:text-gold"
            >
              <House aria-hidden className="size-6" />
            </Link>
            <button
              type="button"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              aria-controls={panelId}
              onClick={() => setMenuOpen((value) => !value)}
              className="grid size-11 place-items-center rounded-full text-blush"
            >
              {menuOpen ? <X aria-hidden className="size-7" /> : <Menu aria-hidden className="size-7" />}
            </button>
          </div>
        </div>

        <nav
          id={panelId}
          aria-label="Mobile"
          className={`absolute inset-x-0 top-full mt-3 max-h-[calc(100dvh-7.5rem)] overflow-y-auto rounded-card border border-blush/10 bg-wine/90 p-4 shadow-card backdrop-blur-[15px] transition-[opacity,transform,visibility] duration-300 ease-out-soft min-[1120px]:hidden ${
            menuOpen ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-3 opacity-0'
          }`}
        >
          {[{ label: 'Our Services', to: '/services' }, ...navLinks].map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={closeMenu}
              aria-current={isActive(link.to) ? 'page' : undefined}
              className={`block rounded-2xl px-4 py-3 text-lg font-medium ${
                isActive(link.to) ? 'text-gold' : 'text-blush'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div aria-hidden className="divider-fade my-2 text-blush/40" />
          {user && isAdmin && (
            <Link to="/admin" onClick={closeMenu} className="block rounded-2xl px-4 py-3 text-lg font-medium text-blush">
              Admin
            </Link>
          )}
          <button
            type="button"
            onClick={() => {
              closeMenu()
              if (user) void signOut()
              else openAuth()
            }}
            className="block w-full rounded-2xl px-4 py-3 text-left text-lg font-medium text-gold"
          >
            {user ? 'Sign out' : 'Sign in'}
          </button>
        </nav>
      </div>
    </header>
  )
}
