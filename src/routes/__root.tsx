import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { Button } from '../components/ui/button'
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react'
import { UserCredits } from '../components/user-credits'

export const Route = createRootRoute({
    component: () => (
        <>
            <header className="border-b border-black/10 sticky top-0 z-[99] bg-white">
                <div className="flex px-6 h-14 items-center max-w-5xl mx-auto">
                    <Link to="/">
                        <img src="/logo.png" alt="PaperBag logo" width={48} height={48} />
                    </Link>
                    <nav className="ml-auto flex items-center justify-center space-x-4">
                        <Link to="/dashboard">
                            <Button variant="ghost" size="sm" className="text-black hover:bg-black/5">Dashboard</Button>
                        </Link>
                        <SignedIn>
                            <div className="flex items-center gap-3">
                                <UserCredits />
                                <UserButton />
                            </div>
                        </SignedIn>
                        <SignedOut>
                            <SignInButton mode="modal" fallbackRedirectUrl="/">
                                <Button size="sm" variant="outline" className="border-black/20 hover:bg-black/5 text-black hover:text-black">Sign In</Button>
                            </SignInButton>
                        </SignedOut>
                    </nav>
                </div>
            </header>
            <Outlet />
            {/* Footer */}
            <footer className="border-t border-black/10 py-6">
                <div className="container flex flex-col items-center justify-center gap-4 md:flex-row">
                    <p className="text-center text-xs text-black/60">
                        © 2025 CartoonAI. All rights reserved.
                    </p>
                    <div className="flex gap-6">
                        <Link to="/" className="text-xs text-black/60 hover:text-black">Terms</Link>
                        <Link to="/" className="text-xs text-black/60 hover:text-black">Privacy</Link>
                        <Link to="/" className="text-xs text-black/60 hover:text-black">Contact</Link>
                    </div>
                </div>
            </footer>
        </>
    ),
})