import React from 'react';
import Header from '../components/layout/Header.jsx';
import Footer from '../components/layout/Footer.jsx';
import Hero from '../components/sections/Hero.jsx';
import Highlights from '../components/sections/Highlights.jsx';
import ServicesGrid from '../components/sections/ServicesGrid.jsx';
import CtaBanner from '../components/sections/CtaBanner.jsx';
import Stats from '../components/sections/Stats.jsx';
import Contact from '../components/sections/Contact.jsx';

const Home = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main>
        {/* #inicio já está dentro do Hero.jsx */}
        <Hero />

        {/* #sobre */}
        <section id="sobre" aria-label="Sobre nós" className="scroll-mt-24">
          <Highlights />
        </section>

        {/* #servicos */}
        <section id="servicos" aria-label="Nossos serviços" className="scroll-mt-24">
          <ServicesGrid />
        </section>

        {/* #vantagens */}
        <section id="vantagens" aria-label="Vantagens e diferenciais" className="scroll-mt-24">
          <CtaBanner />
          {/* Mantive as métricas aqui embaixo para reforçar as vantagens */}
          <Stats />
        </section>

        {/* #contato */}
        <section id="contato" aria-label="Contato" className="scroll-mt-24">
          <Contact />
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Home;
