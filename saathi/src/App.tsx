import { LogOut } from 'lucide-react'
import logo from '../../main/src/assets/logo/logo-horizontal-light.svg'
import { AuthGate } from '../../main/src/auth/AuthGate'
import { AuthProvider } from '../../main/src/auth/AuthProvider'
import { useAuth } from '../../main/src/auth/context'
import { Portal } from './Portal'

function TopBar() {
  const { user, signOut } = useAuth()
  return (
    <header className="sticky top-0 z-40 bg-wine px-4 pt-[env(safe-area-inset-top)] text-blush shadow-[0_10px_30px_-20px_rgb(0_0_0/0.8)]">
      <div className="mx-auto flex h-14 max-w-xl items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <img src={logo} alt="Saathi First" width={373} height={112} className="h-7 w-auto" />
          <span className="rounded-full bg-blush/10 px-2.5 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-gold">
            Saathi
          </span>
        </div>
        {user && (
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors hover:bg-blush/10 hover:text-gold"
          >
            <LogOut aria-hidden className="size-4" />
            Sign out
          </button>
        )}
      </div>
    </header>
  )
}

export default function App() {
  return (
    // Saathis sign in with Google (Gmail) or their phone number.
    <AuthProvider methods={['phone']}>
      <div aria-hidden className="page-wash fixed inset-0 -z-10" />
      <TopBar />
      <main className="mx-auto max-w-xl px-4 pb-28 pt-5">
        <AuthGate action="see your visits" hint="Use your Gmail (Continue with Google) or your mobile number.">
          <Portal />
        </AuthGate>
      </main>
    </AuthProvider>
  )
}
