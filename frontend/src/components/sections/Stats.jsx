import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '../ui/card.jsx'

function Stats() {
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

  const stats = [
    { number: "25", label: "Anos de Experiência e Credibilidade" },
    { number: "+8000", label: "Campanhas realizadas com Sucesso!" },
    { number: "+1500", label: "Empresas atendidas em diversas cidades de MT" },
    { number: "100%", label: "De dedicação aos nossos clientes" }
  ]

  return (
    <section id="estatisticas" className="section-padding bg-[var(--vinho-escuro)] mobile-safe">
      <div className="max-w-7xl mx-auto container-responsive">
        <div className="text-center space-y-6 mb-16">
          <h2 className="heading-secondary text-white">
            Números que comprovam nossa
            <span className="text-[var(--laranja-destaque)] block">excelência e dedicação</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <Card
              key={index}
              id={`stat-${index}`}
              data-animate
              className={`stats-card text-center p-8 border-0 ${
                isVisible[`stat-${index}`] ? 'fade-in' : 'opacity-0'
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardContent className="space-y-4 p-0">
                <div className="text-4xl md:text-5xl font-bold text-[var(--laranja-destaque)]">
                  {stat.number}
                </div>
                <p className="text-sm md:text-base text-white font-medium leading-relaxed">
                  {stat.label}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Stats

