import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card.jsx'
import { Badge } from '../ui/badge.jsx'
import {
  Users,
  MapPin,
  Award,
  Target
} from 'lucide-react'

function CtaBanner() {
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

  const advantages = [
    {
      icon: <Users className="w-8 h-8" />,
      title: "Equipe própria e fixa",
      description: "Profissionais treinados e dedicados exclusivamente aos nossos serviços"
    },
    {
      icon: <MapPin className="w-8 h-8" />,
      title: "Monitoramento GPS",
      description: "Tecnologia avançada para acompanhar e garantir a execução das ações"
    },
    {
      icon: <Award className="w-8 h-8" />,
      title: "Relatórios Detalhados",
      description: "Documentação completa de todas as atividades realizadas"
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: "Múltiplas equipes e Frota",
      description: "Capacidade para atender múltiplos projetos simultaneamente"
    }
  ]

  return (
    <section id="vantagens" className="section-padding bg-white mobile-safe">
      <div className="max-w-7xl mx-auto container-responsive">
        <div className="text-center space-y-6 mb-16">
          <Badge className="bg-[var(--vinho-escuro)] text-white text-sm font-semibold px-4 py-2">
            NOSSAS VANTAGENS
          </Badge>
          <h2 className="heading-secondary text-gray-900">
            Por que escolher a
            <span className="text-[var(--vinho-escuro)] block">Relâmpago Distribuições?</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Oferecemos soluções completas e profissionais para suas campanhas de marketing direto,
            com tecnologia avançada e equipe especializada.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {advantages.map((advantage, index) => (
            <Card
              key={index}
              id={`advantage-${index}`}
              data-animate
              className={`card-hover text-center border-0 brand-shadow ${
                isVisible[`advantage-${index}`] ? 'fade-in' : 'opacity-0'
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardHeader className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-[var(--vinho-escuro)] rounded-full flex items-center justify-center text-white">
                  {advantage.icon}
                </div>
                <CardTitle className="text-xl font-semibold text-gray-900">
                  {advantage.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 leading-relaxed">
                  {advantage.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

export default CtaBanner

