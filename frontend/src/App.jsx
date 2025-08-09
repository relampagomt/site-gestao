import React from 'react'
import Header from './components/layout/Header.jsx'
import Footer from './components/layout/Footer.jsx'
import Hero from './components/sections/Hero.jsx'
import Highlights from './components/sections/Highlights.jsx'
import ServicesGrid from './components/sections/ServicesGrid.jsx'
import CtaBanner from './components/sections/CtaBanner.jsx'
import Stats from './components/sections/Stats.jsx'
import Contact from './components/sections/Contact.jsx'
import './App.css'

function App() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main>
        <Hero />
        <Highlights />
        <ServicesGrid />
        <CtaBanner />
        <Stats />
        <Contact />
      </main>
      
      <Footer />
    </div>
  )
}

export default App

