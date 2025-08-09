import React, { useState } from 'react'
import { Button } from '../ui/button.jsx'
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet.jsx'
import {
  Phone,
  MessageCircle,
  Menu,
  X
} from 'lucide-react'

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
    // Smooth scroll to section
    const element = document.querySelector(href)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <header className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto container-spacing">
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
            <Button 
              variant="outline" 
              className="border-[var(--vinho-escuro)] text-[var(--vinho-escuro)] hover:bg-red-50"
              aria-label="Ligar para a empresa"
            >
              <Phone className="w-4 h-4 mr-2" />
              Ligar
            </Button>
            <Button 
              variant="brand"
              aria-label="Falar no WhatsApp"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
            <a href={dashboardUrl} target="_blank" rel="noopener noreferrer">
              <Button 
                variant="outline" 
                className="border-[var(--vinho-escuro)] text-[var(--vinho-escuro)] hover:bg-red-50"
                aria-label="Acessar painel de gestão"
              >
                Painel de Gestão
              </Button>
            </a>
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
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <div className="flex flex-col space-y-6 mt-6">
                {/* Mobile Navigation */}
                <nav className="flex flex-col space-y-4">
                  {navigationItems.map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      className="text-gray-700 hover:text-[var(--vinho-escuro)] transition-colors font-medium py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vinho-escuro)] focus-visible:ring-offset-2 rounded-sm"
                      onClick={(e) => {
                        e.preventDefault()
                        handleNavClick(item.href)
                      }}
                    >
                      {item.label}
                    </a>
                  ))}
                </nav>

                {/* Mobile CTA Buttons */}
                <div className="flex flex-col space-y-3 pt-4 border-t border-gray-200">
                  <Button 
                    variant="outline" 
                    className="border-[var(--vinho-escuro)] text-[var(--vinho-escuro)] hover:bg-red-50 w-full"
                    aria-label="Ligar para a empresa"
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Ligar na Empresa
                  </Button>
                  <Button 
                    variant="brand"
                    className="w-full"
                    aria-label="Falar no WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Falar no WhatsApp
                  </Button>
                  <a href={dashboardUrl} target="_blank" rel="noopener noreferrer" className="w-full">
                    <Button 
                      variant="outline" 
                      className="border-[var(--vinho-escuro)] text-[var(--vinho-escuro)] hover:bg-red-50 w-full"
                      aria-label="Acessar painel de gestão"
                    >
                      Painel de Gestão
                    </Button>
                  </a>
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

