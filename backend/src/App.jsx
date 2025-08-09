import React, { useState, useEffect } from 'react'
import { Button } from './components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card.jsx'
import { Badge } from './components/ui/badge.jsx'
import {
  Phone,
  MessageCircle,
  MapPin,
  Users,
  Target,
  Zap,
  Award,
  TrendingUp,
  Clock,
  CheckCircle,
  Star,
  ArrowRight,
  Menu,
  X
} from 'lucide-react'
import './App.css'

// Importando as imagens
import logoImg from './assets/logo.png'
import backgroundImg from './assets/background.png'
import equipeImg from './assets/equipe.webp'
import modeloImg from './assets/modelo.webp'
import residencialImg from './assets/residencial.webp'
import sinaleirosImg from './assets/sinaleiros-pedestres.webp'
import locaisEstrategicosImg from './assets/locais-estrategicos.webp'
import acoesPromocionaisImg from './assets/acoes-promocionais.webp'
import estrategiasImg from './assets/estrategias.webp'
import frotaImg from './assets/frota(moto).webp'
import administrativoImg from './assets/administrativo.webp'

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isVisible, setIsVisible] = useState({})

  useEffect(() => {
    // Força todos os elementos a serem visíveis inicialmente para evitar problemas de invisibilidade
    const allAnimatedElements = document.querySelectorAll('[data-animate]')
    allAnimatedElements.forEach((el) => {
      if (el.id) {
        setIsVisible(prev => ({ ...prev, [el.id]: true }))
      }
    })

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

  const stats = [
    { number: "25", label: "Anos de Experiência e Credibilidade" },
    { number: "+8000", label: "Campanhas realizadas com Sucesso!" },
    { number: "+1500", label: "Empresas atendidas em diversas cidades de MT" },
    { number: "100%", label: "De dedicação aos nossos clientes" }
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto container-spacing">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-3">
              <div>
                <h1 className="text-xl font-bold text-gray-900">RELÂMPAGO</h1>
                <p className="text-sm text-gray-600">Distribuições</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#inicio" className="text-gray-700 hover:text-red-700 transition-colors font-medium">Início</a>
              <a href="#sobre" className="text-gray-700 hover:text-red-700 transition-colors font-medium">Sobre</a>
              <a href="#servicos" className="text-gray-700 hover:text-red-700 transition-colors font-medium">Serviços</a>
              <a href="#vantagens" className="text-gray-700 hover:text-red-700 transition-colors font-medium">Vantagens</a>
              <a href="#contato" className="text-gray-700 hover:text-red-700 transition-colors font-medium">Contato</a>
            </nav>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center space-x-4">
              <Button variant="outline" className="border-red-700 text-red-700 hover:bg-red-50">
                <Phone className="w-4 h-4 mr-2" />
                Ligar
              </Button>
              <Button className="btn-relampago text-white">
                <MessageCircle className="w-4 h-4 mr-2" />
                WhatsApp
              </Button>
              <a href="http://localhost:5000/login" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="border-red-700 text-red-700 hover:bg-red-50">
                  Painel de Gestão
                </Button>
              </a>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-200">
              <nav className="flex flex-col space-y-4">
                <a href="#inicio" className="text-gray-700 hover:text-red-700 transition-colors font-medium">Início</a>
                <a href="#sobre" className="text-gray-700 hover:text-red-700 transition-colors font-medium">Sobre</a>
                <a href="#servicos" className="text-gray-700 hover:text-red-700 transition-colors font-medium">Serviços</a>
                <a href="#vantagens" className="text-gray-700 hover:text-red-700 transition-colors font-medium">Vantagens</a>
                <a href="#contato" className="text-gray-700 hover:text-red-700 transition-colors font-medium">Contato</a>
                <div className="flex flex-col space-y-3 pt-4">
                  <Button variant="outline" className="border-red-700 text-red-700 hover:bg-red-50">
                    <Phone className="w-4 h-4 mr-2" />
                    Ligar na Empresa
                  </Button>
                  <Button className="btn-relampago text-white">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Falar no WhatsApp
                  </Button>
                  <a href="http://localhost:5000/login" target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="border-red-700 text-red-700 hover:bg-red-50">
                      Painel de Gestão
                    </Button>
                  </a>
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section id="inicio" className="relative min-h-screen flex items-center pt-20 md:pt-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${backgroundImg})` }}
        />
        <div className="absolute inset-0 hero-overlay" />

        <div className="relative z-10 max-w-7xl mx-auto container-spacing w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-white space-y-8 fade-in">
              <div className="space-y-6">
                <h1 className="heading-primary text-white">
                  A melhor estratégia para
                  <span className="text-yellow-400 block">turbinar as suas vendas!</span>
                </h1>
                <p className="text-xl text-gray-200 leading-relaxed">
                  Sua mensagem nas mãos certas, na hora certa, e com a máxima eficácia.
                </p>
                <p className="text-lg text-gray-300 leading-relaxed">
                  Somos a maior empresa especializada em Panfletagem e Ações Promocionais
                  de Mato Grosso. <strong>Nosso propósito é ajudar empresas e empreendedores a
                  alcançar seu público alvo</strong> com uma <strong>distribuição profissional de impressos</strong>
                  focada em estratégias de Geomarketing, utilizando uma equipe treinada,
                  tecnologia de monitoramento GPS e suporte operacional.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="btn-laranja text-lg px-8 py-4">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Falar no WhatsApp
                </Button>
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-red-700 text-lg px-8 py-4">
                  <Phone className="w-5 h-5 mr-2" />
                  Quero um Orçamento
                </Button>
              </div>
            </div>

            <div className="hidden lg:block slide-in-right">
              <img
                src={modeloImg}
                alt="Modelo Relâmpago"
                className="w-full h-auto rounded-2xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="sobre" className="section-padding bg-red-700 text-white">
        <div className="max-w-7xl mx-auto container-spacing">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div
              id="about-content"
              data-animate
              className={`space-y-8 ${isVisible['about-content'] ? 'slide-in-left' : 'opacity-0'}`}
            >
              <div className="space-y-4">
                <Badge className="bg-yellow-400 text-red-700 text-sm font-semibold px-4 py-2">
                  Quem Somos
                </Badge>
                <h2 className="heading-secondary text-white">
                  Somos especialistas em
                  <span className="text-yellow-400 block">PANFLETAGEM e AÇÕES PROMOCIONAIS</span>
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
                  <MapPin className="w-8 h-8 text-yellow-400 mb-3" />
                  <h3 className="text-lg font-semibold mb-2">Sede em Cuiabá - Mato Grosso</h3>
                  <p className="text-gray-300">
                    Atendemos em todo estado de Mato Grosso
                    mediante agendamento prévio.
                  </p>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <Zap className="w-8 h-8 text-yellow-400 mb-3" />
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
                <Button size="lg" className="btn-laranja text-lg px-8 py-4">
                  <Phone className="w-5 h-5 mr-2" />
                  LIGAR NA EMPRESA
                </Button>
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-red-700 text-lg px-8 py-4">
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
                  alt="Equipe Relâmpago"
                  className="w-full h-auto rounded-2xl shadow-2xl"
                />
                <div className="absolute -bottom-6 -right-6 bg-yellow-400 text-red-700 p-6 rounded-xl shadow-xl">
                  <p className="text-lg font-bold">
                    Você já sentiu a frustração de<br />
                    <span className="text-xl">ter um produto ou serviço incrível</span>, mas não conseguir<br />
                    alcançar seu público alvo?
                  </p>
                  <Button className="mt-4 bg-red-700 text-white hover:bg-red-800">
                    NÓS PODEMOS TE AJUDAR!
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="servicos" className="section-padding bg-gray-50">
        <div className="max-w-7xl mx-auto container-spacing">
          <div className="text-center space-y-6 mb-16">
            <Badge className="bg-red-700 text-white text-sm font-semibold px-4 py-2">
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
                className={`card-hover border-0 shadow-lg overflow-hidden ${
                  isVisible[`service-${index}`] ? 'fade-in' : 'opacity-0'
                }`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="aspect-video overflow-hidden">
                  <img
                    src={service.image}
                    alt={service.title}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                </div>
                <CardHeader className="space-y-3">
                  <Badge variant="secondary" className="w-fit text-xs">
                    {service.category}
                  </Badge>
                  <CardTitle className="text-xl font-bold text-gray-900">
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

      {/* Why Choose Us Section */}
      <section id="vantagens" className="section-padding bg-white">
        <div className="max-w-7xl mx-auto container-spacing">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div
              id="why-choose-us-content"
              data-animate
              className={`space-y-8 ${isVisible['why-choose-us-content'] ? 'slide-in-left' : 'opacity-0'}`}
            >
              <div className="space-y-4">
                <Badge className="bg-red-700 text-white text-sm font-semibold px-4 py-2">
                  POR QUE NOS ESCOLHER?
                </Badge>
                <h2 className="heading-secondary text-gray-900">
                  Nossas vantagens competitivas que nos destacam no mercado.
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {advantages.map((advantage, index) => (
                  <div key={index} className="flex items-start space-x-4">
                    <div className="flex-shrink-0 text-red-700">
                      {advantage.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {advantage.title}
                      </h3>
                      <p className="text-gray-600">
                        {advantage.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="btn-laranja text-lg px-8 py-4">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Falar no WhatsApp
                </Button>
                <Button size="lg" variant="outline" className="border-red-700 text-red-700 hover:bg-red-50 text-lg px-8 py-4">
                  <Phone className="w-5 h-5 mr-2" />
                  Quero um Orçamento
                </Button>
              </div>
            </div>

            <div
              id="why-choose-us-image"
              data-animate
              className={`${isVisible['why-choose-us-image'] ? 'slide-in-right' : 'opacity-0'}`}
            >
              <img
                src={estrategiasImg}
                alt="Estratégias de Marketing"
                className="w-full h-auto rounded-2xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-red-700 text-white py-16">
        <div className="max-w-7xl mx-auto container-spacing">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {stats.map((stat, index) => (
              <div
                key={index}
                id={`stat-${index}`}
                data-animate
                className={`space-y-2 ${isVisible[`stat-${index}`] ? 'fade-in-up' : 'opacity-0'}`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <p className="text-5xl font-bold text-yellow-400">
                  {stat.number}
                </p>
                <p className="text-lg font-medium">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="section-padding bg-gray-50">
        <div className="max-w-7xl mx-auto container-spacing">
          <div className="bg-gradient-to-r from-red-700 to-red-900 text-white rounded-3xl p-8 md:p-12 lg:p-16 shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `url(${backgroundImg})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between text-center lg:text-left space-y-8 lg:space-y-0">
              <div className="max-w-3xl">
                <h2 className="text-3xl md:text-4xl font-bold leading-tight mb-4">
                  Pronto para turbinar suas vendas e alcançar novos clientes?
                </h2>
                <p className="text-lg opacity-90">
                  Entre em contato conosco hoje mesmo e descubra como a Relâmpago Distribuições pode impulsionar o seu negócio!
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="btn-laranja text-lg px-8 py-4">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Falar no WhatsApp
                </Button>
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-red-700 text-lg px-8 py-4">
                  <Phone className="w-5 h-5 mr-2" />
                  Quero um Orçamento
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contato" className="section-padding bg-white">
        <div className="max-w-7xl mx-auto container-spacing">
          <div className="text-center space-y-6 mb-16">
            <Badge className="bg-red-700 text-white text-sm font-semibold px-4 py-2">
              CONTATO
            </Badge>
            <h2 className="heading-secondary text-gray-900">
              Fale Conosco
            </h2>
            <p className="text-lg text-gray-600">
              Estamos prontos para atender você e tirar todas as suas dúvidas.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <Phone className="w-8 h-8 text-red-700" />
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Telefone</h3>
                  <p className="text-lg text-gray-600">(65) 99999-9999</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <MessageCircle className="w-8 h-8 text-red-700" />
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">WhatsApp</h3>
                  <p className="text-lg text-gray-600">(65) 99999-9999</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <MapPin className="w-8 h-8 text-red-700" />
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Endereço</h3>
                  <p className="text-lg text-gray-600">Rua Exemplo, 123, Bairro, Cuiabá - MT</p>
                </div>
              </div>
            </div>
            <div>
              {/* Formulário de Contato (exemplo) */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Envie sua Mensagem</CardTitle>
                  <CardDescription>Preencha o formulário abaixo e entraremos em contato.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nome</label>
                      <input type="text" id="name" name="name" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                      <input type="email" id="email" name="email" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                    </div>
                    <div>
                      <label htmlFor="message" className="block text-sm font-medium text-gray-700">Mensagem</label>
                      <textarea id="message" name="message" rows="4" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"></textarea>
                    </div>
                    <Button type="submit" className="btn-relampago">
                      Enviar Mensagem
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto container-spacing text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} Relâmpago Distribuições. Todos os direitos reservados.</p>
          <p className="mt-2">Desenvolvido com ❤️ por [Seu Nome/Empresa]</p>
        </div>
      </footer>
    </div>
  )
}

export default App


