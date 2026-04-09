export default function Header() {
  return (
    <header className="fixed top-0 w-full z-50 bg-neutral-950/80 backdrop-blur-xl shadow-[0_4px_30px_rgba(212,56,13,0.06)] flex justify-between items-center px-6 py-3">
      <div className="flex items-center gap-8">
        <h1 className="text-xl font-bold tracking-tighter text-white font-['Inter']">Forensic Intelligence</h1>
        <div className="hidden md:flex items-center space-x-6">
          <nav className="flex items-center gap-6">
            <a className="text-orange-500 font-bold transition-colors" href="#">Overview</a>
            <a className="text-neutral-400 hover:text-white hover:bg-neutral-800/50 transition-colors px-3 py-1 rounded-lg" href="#">Assets</a>
            <a className="text-neutral-400 hover:text-white hover:bg-neutral-800/50 transition-colors px-3 py-1 rounded-lg" href="#">Investigations</a>
          </nav>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative hidden sm:block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">search</span>
          <input className="bg-surface-container-lowest border-none text-xs label-font rounded-lg pl-9 pr-4 py-2 w-64 focus:ring-1 focus:ring-primary/30" placeholder="Global search..." type="text"/>
        </div>
        <button className="text-neutral-400 hover:text-white transition-colors relative">
          <span className="material-symbols-outlined">notifications</span>
          <span className="absolute top-0 right-0 w-2 h-2 bg-primary-container rounded-full border-2 border-neutral-950"></span>
        </button>
        <div className="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant/20 overflow-hidden">
          <img alt="User profile" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDWwvgiO14o_07C_sAm7yeHzIEpMrU4lYSN8T0cLTqmmX5B18a68VMZ4vCPycwMyqU9EeU9KOFo6vtfMnwYt9zWFTSR--pDGPBLUxuyzaQuAJWNFaOK4SLBcrhIDjRY9eaibnu5oKWpFRGx2kWIwu8Ddkx-7yekiUbNH3TINRG6Svwf-Y1nGL6gP4Yd_yGv0PBoYLIR6uTYg1AGM8F9lOTHKM2lAF1_Wnxx4fr-MzFqVfwIwk-2JsExvMp-gGm3SO4AcIzvDBMF-Zg7"/>
        </div>
      </div>
    </header>
  )
}
