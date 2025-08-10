import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card.jsx'
import { Badge } from '../ui/badge.jsx'

// Importando as imagens dos serviços
import residencialImg from '../../assets/residencial.webp'
import sinaleirosImg from '../../assets/sinaleiros-pedestres.webp'
import locaisEstrategicosImg from '../../assets/locais-estrategicos.webp'
import acoesPromocionaisImg from '../../assets/acoes-promocionais.webp'

function ServicesGrid() {
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

  const services = [
    {
      title: "Formato Residencial",
      description: "É a distribuição de panfletos diretamente nas residências, uma técnica eficiente para aumentar a visibilidade de sua marca. Suas vantagens incluem segmentação geográfica, custo-benefício e impacto direto no público-alvo.",
      image: residencialImg,
      category: "Panfletagem"
    },
    {
      title: "Sinaleiros e/ou Pedestres",
      description: "É a distribuição de materiais em pontos estratégicos de grande circulação de pessoas, aumentando a visibilidade da marca e alcançando potenciais clientes. Aumente a visibilidade da sua marca e conquiste novos clientes.",
      image: sinaleirosImg,
      category: "Panfletagem"
    },
    {
      title: "Eventos ou locais estratégicos",
      description: "Consiste na distribuição de materiais promocionais em locais onde há grande concentração de público-alvo, aumentando o alcance da marca e a possibilidade de conversão em clientes potenciais.",
      image: locaisEstrategicosImg,
      category: "Panfletagem"
    },
    {
      title: "Ação Promocional de impacto",
      description: "É uma estratégia de marketing que busca atrair a atenção do público de forma criativa e inusitada, gerando uma maior lembrança da marca e aumentando as chances de conversão em vendas.",
      image: acoesPromocionaisImg,
      category: "Marketing de Guerrilha"
    }
  ]

  return (
    <section id="servicos" className="section-padding bg-gray-50 mobile-safe">
      <div className="max-w-7xl mx-auto container-responsive">
        <div className="text-center space-y-6 mb-16">
          <Badge className="bg-[var(--vinho-escuro)] text-white text-sm font-semibold px-4 py-2">
            NOSSOS SERVIÇOS
          </Badge>
          <h2 className="heading-secondary text-gray-900">
            Te ajudamos a aumentar a visibilidade da sua marca e turbinar as suas vendas.
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {services.map((service, index) => (
            <Card
              key={index}
              id={`service-${index}`}
              data-animate
              className={`card-hover border-0 brand-shadow overflow-hidden ${
                isVisible[`service-${index}`] ? 'fade-in' : 'opacity-0'
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="aspect-video overflow-hidden">
                <img
                  src={service.image}
                  alt={service.title}
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                  loading="lazy"
                  decoding="async"
                  width="400"
                  height="225"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
              </div>
              <CardHeader className="space-y-3">
                <Badge variant="secondary" className="w-fit text-xs">
                  {service.category}
                </Badge>
                <CardTitle className="text-xl font-semibold text-gray-900 leading-tight">
                  {service.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 leading-relaxed">
                  {service.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

export default ServicesGrid

