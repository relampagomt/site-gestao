import React, { useState, useEffect } from 'react'
import { Button } from '../ui/button.jsx'
import { Badge } from '../ui/badge.jsx'
import {
  MapPin,
  Zap,
  Phone,
  MessageCircle
} from 'lucide-react'

// Importando a imagem da equipe
import equipeImg from '../../assets/equipe.webp'

function Highlights() {
  const [isVisible, setIsVisible] = useState({})

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(prev => ({ ...prev, [entry.target.id]: true }))
          }
        })
      },
      { threshold: 0.1 }
    )

    const elements = document.querySelectorAll('[data-animate]')
    elements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])

  return (
    <section id="sobre" className="section-padding bg-[var(--vinho-escuro)] text-white mobile-safe">
      <div className="max-w-7xl mx-auto container-responsive">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div
            id="about-content"
            data-animate
            className={`space-y-8 ${isVisible['about-content'] ? 'slide-in-left' : 'opacity-0'}`}
          >
            <div className="space-y-4">
              <Badge className="bg-[var(--laranja-destaque)] text-[var(--vinho-escuro)] text-sm font-semibold px-4 py-2">
                Quem Somos
              </Badge>
              <h2 className="heading-secondary text-white">
                Somos especialistas em
                <span className="text-[var(--laranja-destaque)] block">PANFLETAGEM e AÇÕES PROMOCIONAIS</span>
              </h2>
            </div>

            <p className="text-lg text-gray-200 leading-relaxed">
              Com 25 anos de experiência. Somos especialistas em PANFLETAGEM e
              ações promocionais de impacto. A Relâmpago Distribuições é a maior
              do segmento em toda região do Centro-Oeste. Acreditamos que as ações de
              guerrilha, ações promocionais e panfletagem estratégica são ferramentas
              poderosas para ajudar empresas de todos os segmentos a alcançarem
              resultados incríveis e impulsionares suas vendas.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <MapPin className="w-8 h-8 text-[var(--laranja-destaque)] mb-3" />
                <h3 className="text-lg font-semibold mb-2">Sede em Cuiabá - Mato Grosso</h3>
                <p className="text-gray-300">
                  Atendemos em todo estado de Mato Grosso
                  mediante agendamento prévio.
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <Zap className="w-8 h-8 text-[var(--laranja-destaque)] mb-3" />
                <h3 className="text-lg font-semibold mb-2">Frotas e equipes profissionais</h3>
                <p className="text-gray-300">
                  Possuímos uma estrutura própria e completa
                  Administrativa, Frota completa e diversas equipes
                  operacionais para garantir o melhor atendimento
                  aos nossos clientes.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                variant="yellow"
                className="text-lg px-8 py-4"
                aria-label="Ligar para a empresa"
              >
                <Phone className="w-5 h-5 mr-2" />
                LIGAR NA EMPRESA
              </Button>
              <Button 
                size="lg" 
                variant="brand"
                className="text-lg px-8 py-4"
                aria-label="Falar no WhatsApp"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                FALAR NO WHATSAPP
              </Button>
            </div>
          </div>

          <div
            id="about-image"
            data-animate
            className={`${isVisible['about-image'] ? 'slide-in-right' : 'opacity-0'}`}
          >
            <div className="relative">
              <img
                src={equipeImg}
                alt="Equipe profissional da Relâmpago Distribuições"
                className="w-full h-auto rounded-2xl shadow-2xl"
                loading="lazy"
                decoding="async"
                width="600"
                height="400"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute -bottom-6 -right-6 bg-[var(--laranja-destaque)] text-[var(--vinho-escuro)] p-6 rounded-xl shadow-xl max-w-sm">
                <p className="text-lg font-bold">
                  Você já sentiu a frustração de<br />
                  <span className="text-xl">ter um produto ou serviço incrível</span>, mas não conseguir<br />
                  alcançar seu público alvo?
                </p>
                <Button 
                  className="mt-4" 
                  variant="brand"
                >
                  NÓS PODEMOS TE AJUDAR!
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Highlights

