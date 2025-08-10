import React from 'react'
import { Button } from '../ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card.jsx'
import {
  Phone,
  MessageCircle,
  MapPin,
  Mail,
  Clock
} from 'lucide-react'

function Contact() {
  const contactInfo = [
    {
      icon: <Phone className="w-6 h-6" />,
      title: "Telefone",
      content: "(65) 3000-0000",
      action: "tel:+556530000000"
    },
    {
      icon: <MessageCircle className="w-6 h-6" />,
      title: "WhatsApp",
      content: "(65) 99999-9999",
      action: "https://wa.me/5565999999999"
    },
    {
      icon: <Mail className="w-6 h-6" />,
      title: "E-mail",
      content: "contato@relampago.com.br",
      action: "mailto:contato@relampago.com.br"
    },
    {
      icon: <MapPin className="w-6 h-6" />,
      title: "Endereço",
      content: "Cuiabá - Mato Grosso",
      action: null
    }
  ]

  return (
    <section id="contato" className="section-padding bg-gray-50 mobile-safe">
      <div className="max-w-7xl mx-auto container-responsive">
        <div className="text-center space-y-6 mb-16">
          <h2 className="heading-secondary text-gray-900">
            Entre em contato conosco
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Estamos prontos para ajudar sua empresa a alcançar novos patamares.
            Fale conosco e descubra como podemos turbinar suas vendas!
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Contact Information */}
          <div className="space-y-8">
            <div className="space-y-6">
              {contactInfo.map((info, index) => (
                <Card key={index} className="border-0 brand-shadow">
                  <CardContent className="flex items-center space-x-4 p-6">
                    <div className="w-12 h-12 bg-[var(--vinho-escuro)] rounded-full flex items-center justify-center text-white flex-shrink-0">
                      {info.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{info.title}</h3>
                      {info.action ? (
                        <a
                          href={info.action}
                          className="text-[var(--vinho-escuro)] hover:text-[var(--vinho-medio)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vinho-escuro)] focus-visible:ring-offset-2 rounded-sm"
                          target={info.action.startsWith('http') ? '_blank' : undefined}
                          rel={info.action.startsWith('http') ? 'noopener noreferrer' : undefined}
                        >
                          {info.content}
                        </a>
                      ) : (
                        <p className="text-gray-600">{info.content}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Business Hours */}
            <Card className="border-0 brand-shadow">
              <CardHeader>
                <CardTitle className="flex items-center space-x-3 text-gray-900">
                  <Clock className="w-6 h-6 text-[var(--vinho-escuro)]" />
                  <span>Horário de Funcionamento</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Segunda a Sexta:</span>
                  <span className="font-medium text-gray-900">08:00 - 18:00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Sábado:</span>
                  <span className="font-medium text-gray-900">08:00 - 12:00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Domingo:</span>
                  <span className="font-medium text-gray-900">Fechado</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* CTA Section */}
          <div className="space-y-8">
            <Card className="border-0 brand-shadow bg-[var(--vinho-escuro)] text-white">
              <CardHeader>
                <CardTitle className="text-2xl text-white">
                  Pronto para turbinar suas vendas?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-gray-200 leading-relaxed">
                  Nossa equipe especializada está pronta para criar a estratégia
                  perfeita para sua empresa. Entre em contato agora mesmo e
                  descubra como podemos ajudar você a alcançar seus objetivos.
                </p>
                
                <div className="space-y-4">
                  <Button 
                    size="lg" 
                    variant="yellow"
                    className="w-full text-lg py-4"
                    aria-label="Falar no WhatsApp"
                  >
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Falar no WhatsApp
                  </Button>
                  
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="w-full text-lg py-4"
                    aria-label="Ligar para a empresa"
                  >
                    <Phone className="w-5 h-5 mr-2" />
                    Ligar Agora
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Additional Info */}
            <div className="bg-white rounded-xl p-6 brand-shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Por que nos escolher?
              </h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-[var(--vinho-escuro)] rounded-full mt-2 flex-shrink-0"></div>
                  <span>25 anos de experiência no mercado</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-[var(--vinho-escuro)] rounded-full mt-2 flex-shrink-0"></div>
                  <span>Equipe própria e treinada</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-[var(--vinho-escuro)] rounded-full mt-2 flex-shrink-0"></div>
                  <span>Tecnologia de monitoramento GPS</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-[var(--vinho-escuro)] rounded-full mt-2 flex-shrink-0"></div>
                  <span>Relatórios detalhados de cada campanha</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Contact

