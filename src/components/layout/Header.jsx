import { Link } from 'react-router-dom'
import { useCart } from '../../context/CartContext'

export default function Header() {
  const { items, toggleDrawer } = useCart()
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <>
      {/* Blue announcement bar - matches You42's "Create on You42" banner */}
      <div className="bg-you42-banner text-white py-2 px-4 text-sm">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <span>
            <strong>Live Events on You42.</strong>{' '}
            <span className="hidden sm:inline">Get tickets to the best experiences.</span>
          </span>
          <span className="text-white/60 cursor-pointer hover:text-white text-lg leading-none">&times;</span>
        </div>
      </div>

      {/* Main nav - matches You42's header exactly */}
      <header className="bg-you42-bg sticky top-0 z-40">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
          <div className="flex items-center h-14">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 mr-8">
              <img src="/you42.png" alt="You42" className="h-8 w-8" />
            </Link>

            {/* Nav links - same style as Videos, Music, Podcasts, etc. */}
            <nav className="hidden md:flex items-center gap-5">
              <Link to="/" className="text-[#ccc] hover:text-white transition-colors text-sm">
                Events
              </Link>
              <a href="https://you42.com" target="_blank" rel="noopener noreferrer" className="text-[#ccc] hover:text-white transition-colors text-sm">
                Videos
              </a>
              <a href="https://you42.com" target="_blank" rel="noopener noreferrer" className="text-[#ccc] hover:text-white transition-colors text-sm">
                Music
              </a>
              <a href="https://you42.com" target="_blank" rel="noopener noreferrer" className="text-[#ccc] hover:text-white transition-colors text-sm">
                Podcasts
              </a>
            </nav>

            {/* Right side - matches You42's Log in / Sign Up / + Create pattern */}
            <div className="ml-auto flex items-center gap-3">
              <button
                onClick={toggleDrawer}
                className="relative text-[#ccc] hover:text-white transition-colors p-1.5"
                aria-label="Shopping cart"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-you42-blue text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </button>

              <a href="https://you42.com" className="hidden sm:block text-you42-blue hover:text-white transition-colors text-sm">
                Log in
              </a>
              <a href="https://you42.com" className="hidden sm:block border border-you42-blue text-you42-blue hover:bg-you42-blue hover:text-white text-sm px-3 py-1 rounded transition-colors">
                Sign Up
              </a>
            </div>
          </div>
        </div>
      </header>
    </>
  )
}
