export default function Footer() {
  const linkClass = 'text-you42-text-secondary hover:text-white text-sm transition-colors block py-0.5'

  return (
    <footer className="bg-[#111] mt-auto">
      {/* CTA banner - matches You42's "Are you a creator?" section */}
      <div className="bg-you42-bg py-16 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
          Are you a creator? Join You42 and<br />keep all your revenue.
        </h2>
        <a
          href="https://you42.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-6 bg-you42-blue hover:bg-you42-blue-hover text-white font-medium text-sm px-6 py-2.5 rounded transition-colors"
        >
          Learn about You42 for creators
        </a>
      </div>

      {/* Footer links - matches You42's footer layout */}
      <div className="max-w-300 mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
          {/* Column 1: Logo */}
          <div className="col-span-2 sm:col-span-1">
            <img src="/you42-logo.png" alt="You42" className="h-10 brightness-200 mb-6" />
          </div>

          {/* Column 2 */}
          <div>
            <a href="https://you42.com" className={linkClass}>About us</a>
            <a href="https://you42.com" className={linkClass}>Terms of Use</a>
            <a href="https://you42.com" className={linkClass}>Privacy Policy</a>
            <div className="h-4" />
            <a href="https://you42.com" className={linkClass}>Careers</a>
            <a href="https://you42.com" className={linkClass}>Investor Relations</a>
            <a href="https://you42.com" className={linkClass}>Promote on You42</a>
          </div>

          {/* Column 3 */}
          <div>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className={linkClass}>Facebook</a>
            <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className={linkClass}>TikTok</a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className={linkClass}>Instagram</a>
          </div>

          {/* Column 4 */}
          <div>
            <a href="https://you42.com" className={linkClass}>Log In</a>
            <a href="https://you42.com" className={linkClass}>Create an Account</a>
            <a href="https://you42.com" className={linkClass}>You42 for Creators</a>
            <a href="https://you42.com" className={linkClass}>You42 for Podcasters</a>
            <a href="https://you42.com" className={linkClass}>You42 for Videographers</a>
            <a href="https://you42.com" className={linkClass}>You42 for Musicians and Bands</a>
            <a href="https://you42.com" className={linkClass}>You42 for Networks</a>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-you42-border text-you42-text-muted text-xs flex flex-col sm:flex-row justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} You42. All rights reserved.</span>
          <span>
            Ticketing by{' '}
            <a href="https://phantomticket.com" target="_blank" rel="noopener noreferrer" className="text-you42-text-secondary hover:text-white">
              Phantom Ticket
            </a>
          </span>
        </div>
      </div>
    </footer>
  )
}
