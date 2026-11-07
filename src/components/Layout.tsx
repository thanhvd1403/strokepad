import { Library, Search, Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { clsx } from 'clsx'
import { LanguageToggle } from './LanguageToggle'
import { ScriptToggle } from './ScriptToggle'
import { ThemeToggle } from './ThemeToggle'

function BottomNav() {
  const { t } = useTranslation()
  const location = useLocation()
  if (location.pathname.startsWith('/practice')) return null

  const items = [
    { to: '/', label: t('nav.search'), icon: Search, end: true },
    { to: '/collections', label: t('nav.collections'), icon: Library },
    { to: '/settings', label: t('nav.settings'), icon: Settings },
  ]

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line/70 bg-surface/90 pb-safe backdrop-blur-xl">
      <div className="mx-auto flex max-w-3xl items-stretch justify-around px-2 pt-1">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                clsx(
                  'flex min-w-20 flex-col items-center gap-1 rounded-2xl px-4 py-2 text-[11px] font-semibold transition',
                  isActive ? 'text-accent' : 'text-muted hover:text-ink',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={clsx(
                      'grid h-8 w-12 place-items-center rounded-xl transition',
                      isActive && 'bg-accent-soft',
                    )}
                  >
                    <Icon className="h-5 w-5" strokeWidth={isActive ? 2.4 : 2} />
                  </span>
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}

export function Layout() {
  const { t } = useTranslation()
  const location = useLocation()
  const hideNav = location.pathname.startsWith('/practice')

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <header className="sticky top-0 z-30 border-b border-line/60 bg-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 pt-safe pb-2.5">
          <Link to="/" className="group flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-accent-soft text-lg font-bold text-accent hanzi shadow-sm transition group-active:scale-95">
              汉
            </span>
            <span className="min-w-0">
              <span className="block truncate text-base font-bold tracking-tight text-ink">
                {t('app.name')}
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <ScriptToggle />
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main
        className={clsx(
          'mx-auto w-full max-w-3xl px-4 pt-4',
          hideNav ? 'pb-8' : 'pb-28',
        )}
      >
        <Outlet />
      </main>

      <BottomNav />
    </div>
  )
}
