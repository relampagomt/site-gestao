import React from 'react'
import { Button } from '../ui/button.jsx'
import {
  MessageCircle,
  Phone
} from 'lucide-react'

// Importando as imagens
import backgroundImg from '../../assets/background.png'
import modeloImg from '../../assets/modelo.webp'

function Hero() {
  return (
    <section id="inicio" className="relative min-h-screen flex items-center">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundImg})` }}
      />
      
      {/* Enhanced Overlay for better contrast */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-[var(--vinho-escuro)]/80 to-[var(--vinho-medio)]/70" />

      <div className="relative z-10 max-w-7xl mx-auto container-spacing w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-white space-y-8 fade-in">
            <div className="space-y-6 max-w-2xl">
              <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight text-white">
                A melhor estratégia para
                <span className="text-[var(--laranja-destaque)] block">turbinar as suas vendas!</span>
              </h1>
              <p className="text-xl text-gray-200 leading-relaxed">
                Sua mensagem nas mãos certas, na hora certa, e com a máxima eficácia.
              </p>
              <p className="text-lg text-gray-300 leading-relaxed">
                Somos a maior empresa especializada em Panfletagem e Ações Promocionais
                de Mato Grosso. <strong className="text-white">Nosso propósito é ajudar empresas e empreendedores a
                alcançar seu público alvo</strong> com uma <strong className="text-white">distribuição profissional de impressos</strong>
                focada em estratégias de Geomarketing, utilizando uma equipe treinada,
                tecnologia de monitoramento GPS e suporte operacional.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 max-w-2xl">
              <Button 
                size="lg" 
                variant="brand"
                className="text-lg px-8 py-4 bg-[var(--laranja-destaque)] text-[var(--vinho-escuro)] hover:bg-[var(--laranja-destaque)]/90 hover:shadow-lg"
                aria-label="Falar no WhatsApp"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Falar no WhatsApp
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-white text-white hover:bg-white hover:text-[var(--vinho-escuro)] text-lg px-8 py-4 focus-visible:ring-white"
                aria-label="Solicitar orçamento"
              >
                <Phone className="w-5 h-5 mr-2" />
                Quero um Orçamento
              </Button>
            </div>
          </div>

          <div className="hidden lg:block slide-in-right">
            <img
              src={modeloImg}
              alt="Modelo representando os serviços da Relâmpago Distribuições"
              className="w-full h-auto rounded-2xl shadow-2xl"
              loading="lazy"
              decoding="async"
              width="600"
              height="800"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero

