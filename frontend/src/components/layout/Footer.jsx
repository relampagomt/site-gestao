import React from 'react'
import { Button } from '../ui/button.jsx'
import {
  Phone,
  MessageCircle,
  MapPin,
  Mail
} from 'lucide-react'

function Footer() {
  const currentYear = new Date().getFullYear()
  const dashboardUrl = import.meta.env.VITE_DASHBOARD_URL || 'http://localhost:5000/login'

  return (
    <footer className="bg-[var(--vinho-escuro)] text-white">
      <div className="max-w-7xl mx-auto container-spacing">
        {/* Main Footer Content */}
        <div className="py-12 grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div>
              <h3 className="text-2xl font-bold text-white">RELÂMPAGO</h3>
              <p className="text-[var(--laranja-destaque)] font-medium">Distribuições</p>
            </div>
            <p className="text-gray-300 leading-relaxed">
              25 anos de experiência em panfletagem e ações promocionais.
              A maior empresa do segmento no Centro-Oeste.
            </p>
            <div className="flex space-x-4">
              <Button 
                size="sm" 
                variant="yellow"
                aria-label="Falar no WhatsApp"
                onClick={() => window.open("http://wa.me/556536531130", "_blank")}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                WhatsApp
              </Button>
              <Button
                size="sm"
                variant="outline"
                aria-label="Ligar para a empresa"
                onClick={() => window.open("tel:+556536531130")}
              >
                <Phone className="w-4 h-4 mr-2" />
                Ligar
              </Button>
            </div>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">Nossos Serviços</h4>
            <ul className="space-y-2 text-gray-300">
              <li>
                <a href="#servicos" className="hover:text-[var(--laranja-destaque)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--laranja-destaque)] focus-visible:ring-offset-2 rounded-sm">
                  Panfletagem Residencial
                </a>
              </li>
              <li>
                <a href="#servicos" className="hover:text-[var(--laranja-destaque)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--laranja-destaque)] focus-visible:ring-offset-2 rounded-sm">
                  Sinaleiros e Pedestres
                </a>
              </li>
              <li>
                <a href="#servicos" className="hover:text-[var(--laranja-destaque)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--laranja-destaque)] focus-visible:ring-offset-2 rounded-sm">
                  Locais Estratégicos
                </a>
              </li>
              <li>
                <a href="#servicos" className="hover:text-[var(--laranja-destaque)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--laranja-destaque)] focus-visible:ring-offset-2 rounded-sm">
                  Ações Promocionais
                </a>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">Links Rápidos</h4>
            <ul className="space-y-2 text-gray-300">
              <li>
                <a href="#inicio" className="hover:text-[var(--laranja-destaque)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--laranja-destaque)] focus-visible:ring-offset-2 rounded-sm">
                  Início
                </a>
              </li>
              <li>
                <a href="#sobre" className="hover:text-[var(--laranja-destaque)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--laranja-destaque)] focus-visible:ring-offset-2 rounded-sm">
                  Sobre Nós
                </a>
              </li>
              <li>
                <a href="#vantagens" className="hover:text-[var(--laranja-destaque)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--laranja-destaque)] focus-visible:ring-offset-2 rounded-sm">
                  Vantagens
                </a>
              </li>
              <li>
                <a href="#contato" className="hover:text-[var(--laranja-destaque)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--laranja-destaque)] focus-visible:ring-offset-2 rounded-sm">
                  Contato
                </a>
              </li>
              <li>
                <a 
                  href={dashboardUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-[var(--laranja-destaque)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--laranja-destaque)] focus-visible:ring-offset-2 rounded-sm"
                >
                  Painel de Gestão
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">Contato</h4>
            <div className="space-y-3 text-gray-300">
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-[var(--laranja-destaque)] flex-shrink-0" />
                <span>Rua Manaíra, 589, St. Antônio do Pedregal, 78060-450, Cuiabá - Mato Grosso</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-[var(--laranja-destaque)] flex-shrink-0" />
                <a 
                  href="tel:+556536531130" 
                  className="hover:text-[var(--laranja-destaque)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--laranja-destaque)] focus-visible:ring-offset-2 rounded-sm"
                >
                  (65) 3653-1130
                </a>
              </div>
              <div className="flex items-center space-x-3">
                <MessageCircle className="w-5 h-5 text-[var(--laranja-destaque)] flex-shrink-0" />
                <a 
                  href="http://wa.me/556536531130" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-[var(--laranja-destaque)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--laranja-destaque)] focus-visible:ring-offset-2 rounded-sm"
                >
                  (65) 99913-1130
                </a>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-[var(--laranja-destaque)] flex-shrink-0" />
                <a 
                  href="mailto:sac@relampagomt.com.br" 
                  className="hover:text-[var(--laranja-destaque)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--laranja-destaque)] focus-visible:ring-offset-2 rounded-sm"
                >
                  sac@relampagomt.com.br
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="py-6 border-t border-white/20">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-gray-300 text-sm">
              © {currentYear} Relâmpago Distribuições. Todos os direitos reservados.
            </p>
            <div className="flex space-x-6 text-sm text-gray-300">
              <a href="#" className="hover:text-[var(--laranja-destaque)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--laranja-destaque)] focus-visible:ring-offset-2 rounded-sm">
                Política de Privacidade
              </a>
              <a href="#" className="hover:text-[var(--laranja-destaque)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--laranja-destaque)] focus-visible:ring-offset-2 rounded-sm">
                Termos de Uso
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer

