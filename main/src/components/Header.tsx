import { ArrowRight, ChevronDown, CircleUserRound, Crown, House, Menu, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type SyntheticEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import logo from '../assets/logo/logo-horizontal-light.svg'
import { useAuth } from '../auth/context'
import { navLinks, services } from '../content/site'
import { useMembership } from '../hooks/useMembership'
import { currentPlanOf } from '../lib/membership'

const linkClass =
  'relative z-10 whitespace-nowrap rounded-xl px-3.5 py-2 text-[0.8125rem] font-semibold uppercase leading-6 tracking-[0.04em] text-blush/75 transition-colors duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-blush aria-[current=page]:text-blush 2xl:px-4'

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
      data-nav-item
      data-active={active || undefined}
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
        aria-current={active ? 'page' : undefined}
        className={`${linkClass} flex items-center gap-1.5`}
      >
        Our Services
        <ChevronDown
          aria-hidden
          className={`size-4 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        id={menuId}
        className={`absolute left-0 top-full w-72 pt-4 transition-[opacity,transform,visibility] duration-300 ease-out-soft ${
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

/** The separate admin website, e.g. https://admin.yourdomain.com (VITE_ADMIN_URL). */
const adminSite = import.meta.env.VITE_ADMIN_URL as string | undefined

/** The signed-in member's plan; null when there is none in force. */
function useActiveMembership() {
  const membership = useMembership()
  const [now] = useState(() => new Date())
  if (!membership || membership.status !== 'active' || membership.validUntil.toMillis() < now.getTime()) return null
  const plan = currentPlanOf(membership)
  return { planId: plan.id, planName: plan.name }
}

/** Each plan's badge colours: silver for Silver Care, gold for Golden Care. */
const badgeTones: Record<string, string> = {
  'silver-care': 'bg-[#c9ced6]/20 text-[#dfe3e8] ring-[#c9ced6]/50 hover:bg-[#c9ced6]/30',
  'golden-care': 'bg-gold/20 text-gold ring-gold/40 hover:bg-gold/30',
}

/**
 * Badge in the bar showing a member's plan in its colour, linking to My profile (where the visits
 * left are).
 */
function MembershipBadge({ onClick }: { onClick?: () => void }) {
  const active = useActiveMembership()
  if (!active) return null
  return (
    <Link
      to="/profile"
      onClick={onClick}
      aria-label={`${active.planName} membership`}
      title={`${active.planName} membership`}
      className={`flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-bold uppercase tracking-[0.04em] ring-1 transition-colors ${badgeTones[active.planId] ?? badgeTones['golden-care']}`}
    >
      <Crown aria-hidden className="size-4" />
      {/* The name shows where the bar has room: not on small phones, nor on laptop-width desktop bars. */}
      <span className="hidden pr-0.5 sm:inline xl:hidden 2xl:inline">{active.planName}</span>
    </Link>
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
        <CircleUserRound aria-hidden className="size-[1.125rem]" />
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
        <div className="absolute right-0 top-full w-64 pt-4">
          <div className="rounded-3xl border border-blush/10 bg-wine/85 p-3 shadow-card backdrop-blur-[15px]">
            <p className="truncate px-4 py-2 text-sm text-blush/70">
              {user.phoneNumber ?? user.email}
            </p>
            <Link to="/bookings" onClick={() => setOpen(false)} className={itemClass}>
              My bookings
            </Link>
            <Link to="/profile" onClick={() => setOpen(false)} className={itemClass}>
              My profile
            </Link>
            {isAdmin && adminSite && (
              <a href={adminSite} className={itemClass}>
                Admin
              </a>
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

/**
 * Transparent while a dark hero sits behind it, then a frosted bar once the hero
 * has scrolled away. Pages without a `data-nav-hero` section get the frosted bar
 * straight away so the light text never lands on a light background.
 */
function useOverHero() {
  const { pathname } = useLocation()
  const [overHero, setOverHero] = useState(false)

  useEffect(() => {
    const update = () => {
      const hero = document.querySelector('[data-nav-hero]')
      setOverHero(Boolean(hero && hero.getBoundingClientRect().bottom > 96))
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [pathname])

  return overHero
}

/**
 * A soft highlight that glides to whichever link is hovered or focused and rests on
 * the current page's link otherwise. Positioned directly on the element so moving it
 * never re-renders the nav.
 */
function useSlidingHighlight() {
  const list = useRef<HTMLDivElement>(null)
  const highlight = useRef<HTMLSpanElement>(null)

  const moveTo = (item: Element | null | undefined) => {
    const marker = highlight.current
    if (!marker) return
    if (!(item instanceof HTMLElement)) {
      marker.style.opacity = '0'
      return
    }
    marker.style.opacity = '1'
    marker.style.width = `${item.offsetWidth}px`
    marker.style.transform = `translateX(${item.offsetLeft}px)`
  }
  const rest = () => moveTo(list.current?.querySelector('[data-nav-item][data-active]'))

  // Re-settle after every render (route changes move the active link) and on resize.
  useEffect(() => {
    rest()
    window.addEventListener('resize', rest)
    return () => window.removeEventListener('resize', rest)
  })

  const fromEvent = (event: SyntheticEvent) => moveTo((event.target as Element).closest('[data-nav-item]'))

  return {
    list,
    highlight,
    handlers: { onMouseOver: fromEvent, onFocus: fromEvent, onMouseLeave: rest, onBlur: rest },
  }
}

export function Header() {
  const { user, isAdmin, openAuth, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const isActive = useIsActive()
  const panelId = useId()
  const wrapper = useRef<HTMLDivElement>(null)
  const overHero = useOverHero()
  const { list, highlight, handlers } = useSlidingHighlight()
  // The bar stays frosted while the mobile menu is open so the two read as one surface.
  const frosted = !overHero || menuOpen

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
    <header
      className={`page-padding fixed inset-x-0 z-50 transition-[top] duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${
        frosted ? 'top-3 nav:top-4' : 'top-1 nav:top-2'
      }`}
    >
      <div ref={wrapper} className="container-large relative">
        <div
          className={`flex h-16 items-center justify-between gap-4 rounded-2xl border px-4 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] nav:h-18 nav:px-6 ${
            frosted
              ? 'border-blush/15 bg-wine/80 shadow-[0_8px_40px_rgb(0_0_0/0.35),0_0_0_0.5px_rgb(253_238_238/0.08)] backdrop-blur-[32px] backdrop-brightness-90 backdrop-saturate-[1.8]'
              : 'border-transparent bg-transparent shadow-none'
          }`}
        >
          <Link
            to="/"
            aria-label="Saathi First home"
            onClick={closeMenu}
            className="shrink-0 rounded-lg transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:scale-[1.03]"
          >
            <img src={logo} alt="Saathi First" width={373} height={112} className="h-9 w-auto nav:h-10" />
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-4 xl:flex">
            <div ref={list} className="relative flex items-center" {...handlers}>
              <span
                ref={highlight}
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-0 w-0 rounded-xl bg-blush/10 opacity-0 transition-[transform,width,opacity] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
              />
              <ServicesDropdown />
              {/* Contact is reached through the Book a Saathi button on desktop. */}
              {navLinks
                .filter((link) => link.to !== '/contact')
                .map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    data-nav-item
                    data-active={isActive(link.to) || undefined}
                    aria-current={isActive(link.to) ? 'page' : undefined}
                    className={linkClass}
                  >
                    {link.label}
                  </Link>
                ))}
            </div>
            <span aria-hidden className="h-5 w-px bg-blush/15" />
            <MembershipBadge />
            <AccountMenu />
            <Link
              to="/contact"
              aria-current={isActive('/contact') ? 'page' : undefined}
              className="group relative isolate flex items-center overflow-hidden rounded-xl px-5 py-2.5 text-[0.8125rem] font-bold uppercase tracking-[0.04em] text-wine [background-image:var(--grad-primary)] transition-shadow duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:shadow-[0_0_28px_rgb(201_162_107/0.55)]"
            >
              <span
                aria-hidden
                className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#d9b680,#fbe7cc)] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              />
              <span
                aria-hidden
                className="absolute inset-0 -translate-x-full bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.55),transparent)] transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-full"
              />
              <span
                aria-hidden
                className="absolute inset-0 rounded-xl opacity-0 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.5)] transition-opacity duration-300 group-hover:opacity-100"
              />
              <span className="flex items-center gap-1.5">
                Book a Saathi
                <ArrowRight
                  aria-hidden
                  className="size-3.5 transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-1"
                />
              </span>
            </Link>
          </nav>

          <div className="flex items-center gap-1 xl:hidden">
            <MembershipBadge onClick={closeMenu} />
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
          className={`absolute inset-x-0 top-full mt-3 max-h-[calc(100dvh-7.5rem)] overflow-y-auto rounded-2xl border border-blush/15 bg-wine/85 p-4 shadow-[0_8px_40px_rgb(0_0_0/0.35)] backdrop-blur-[32px] backdrop-saturate-[1.8] transition-[opacity,transform,visibility] duration-300 ease-out-soft xl:hidden ${
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
          {user && (
            <Link
              to="/bookings"
              onClick={closeMenu}
              aria-current={isActive('/bookings') ? 'page' : undefined}
              className={`block rounded-2xl px-4 py-3 text-lg font-medium ${isActive('/bookings') ? 'text-gold' : 'text-blush'}`}
            >
              My bookings
            </Link>
          )}
          {user && (
            <Link
              to="/profile"
              onClick={closeMenu}
              aria-current={isActive('/profile') ? 'page' : undefined}
              className={`block rounded-2xl px-4 py-3 text-lg font-medium ${isActive('/profile') ? 'text-gold' : 'text-blush'}`}
            >
              My profile
            </Link>
          )}
          {user && isAdmin && adminSite && (
            <a href={adminSite} className="block rounded-2xl px-4 py-3 text-lg font-medium text-blush">
              Admin
            </a>
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
