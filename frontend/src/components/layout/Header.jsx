import React, { useState } from 'react'
import { Button } from '../ui/button.jsx'
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet.jsx'
import { Phone, MessageCircle, Menu } from 'lucide-react'

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const dashboardUrl = import.meta.env.VITE_DASHBOARD_URL || 'http://localhost:5000/login'

  const navigationItems = [
    { href: '#inicio', label: 'Início' },
    { href: '#sobre', label: 'Sobre' },
    { href: '#servicos', label: 'Serviços' },
    { href: '#vantagens', label: 'Vantagens' },
    { href: '#contato', label: 'Contato' }
  ]

  const handleNavClick = (href) => {
    setIsMenuOpen(false)
    const element = document.querySelector(href)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <header className="header-mobile-fix bg-white/90 backdrop-blur-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto container-responsive">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">RELÂMPAGO</h1>
              <p className="text-sm text-gray-600">Distribuições</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navigationItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-gray-700 hover:text-[var(--vinho-escuro)] transition-colors font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vinho-escuro)] focus-visible:ring-offset-2 rounded-sm"
                onClick={(e) => {
                  e.preventDefault()
                  handleNavClick(item.href)
                }}
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Desktop CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Button variant="outline" aria-label="Ligar para a empresa" onClick={() => window.open("tel:+556536531130")}>
              <Phone className="w-4 h-4 mr-2" />
              Ligar
            </Button>

            {/* WhatsApp com gradiente, borda preta e glow no hover */}
            <Button
              variant="brand"
              aria-label="Falar no WhatsApp"
              className="text-white border-2 border-black shadow-md hover:shadow-lg hover:shadow-[var(--vinho-escuro)]/25
                         transition-transform hover:-translate-y-0.5
                         focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--vinho-medio)]
                         bg-gradient-to-b from-[var(--vinho-medio)] to-[var(--vinho-escuro)]
                         hover:from-[var(--vinho-escuro)] hover:to-[var(--vinho-escuro)]"
              onClick={() => window.open("http://wa.me/556536531130", "_blank")}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>

            <Button
              variant="outline"
              aria-label="Acessar painel de gestão"
              onClick={() => window.location.href = '/login'}
            >
              Acessar Painel
            </Button>
          </div>

          {/* Mobile Menu */}
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Abrir menu de navegação"
              >
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px] p-0">
              <div className="flex flex-col h-full">
                {/* Header do menu */}
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">RELÂMPAGO</h2>
                      <p className="text-sm text-gray-600">Distribuições</p>
                    </div>
                  </div>
                </div>

                {/* Navegação */}
                <div className="flex-1 p-6">
                  <nav className="flex flex-col space-y-1">
                    {navigationItems.map((item) => (
                      <a
                        key={item.href}
                        href={item.href}
                        className="text-gray-700 hover:text-[var(--vinho-escuro)] hover:bg-gray-50 transition-all duration-200 font-medium py-3 px-4 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vinho-escuro)] focus-visible:ring-offset-2"
                        onClick={(e) => {
                          e.preventDefault()
                          handleNavClick(item.href)
                        }}
                      >
                        {item.label}
                      </a>
                    ))}
                  </nav>
                </div>

                {/* Botões CTA */}
                <div className="p-6 border-t border-gray-100 bg-gray-50">
                  <div className="flex flex-col space-y-3">
                    <Button
                      variant="outline"
                      className="w-full justify-start h-12 text-base font-medium"
                      aria-label="Ligar para a empresa"
                      onClick={() => window.open("tel:+556536531130")}
                    >
                      <Phone className="w-5 h-5 mr-3" />
                      Ligar na Empresa
                    </Button>

                    {/* WhatsApp com gradiente, borda preta e glow no hover (mobile) */}
                    <Button
                      variant="brand"
                      className="w-full justify-start h-12 text-base font-medium text-white
                                 border-2 border-black shadow-md hover:shadow-lg hover:shadow-[var(--vinho-escuro)]/25
                                 transition-transform hover:-translate-y-0.5
                                 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--vinho-medio)]
                                 bg-gradient-to-b from-[var(--vinho-medio)] to-[var(--vinho-escuro)]
                                 hover:from-[var(--vinho-escuro)] hover:to-[var(--vinho-escuro)]"
                      aria-label="Falar no WhatsApp"
                      onClick={() => window.open("http://wa.me/556536531130", "_blank")}
                    >
                      <MessageCircle className="w-5 h-5 mr-3" />
                      Falar no WhatsApp
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full justify-start h-12 text-base font-medium"
                      aria-label="Acessar painel de gestão"
                      onClick={() => window.location.href = '/login'}
                    >
                      Acessar Painel
                    </Button>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}

export default Header
