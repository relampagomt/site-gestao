// frontend/src/admin/Finance.jsx
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';

// Abas (iguais no estilo/UX)
import LancamentosTab from './financeTabs/LancamentosTab.jsx';
import ContasPagarTab from './financeTabs/ContasPagarTab.jsx';
import ContasReceberTab from './financeTabs/ContasReceberTab.jsx';

const Finance = () => {
  const [activeTab, setActiveTab] = useState('lancamentos');

  return (
    <div className="max-w-screen-2xl mx-auto px-3 md:px-6 py-4 md:py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl md:text-2xl font-semibold">Finanças</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
          <TabsTrigger value="contas-pagar">Contas a Pagar</TabsTrigger>
          <TabsTrigger value="contas-receber">Contas a Receber</TabsTrigger>
        </TabsList>

        <TabsContent value="lancamentos" className="mt-6">
          <LancamentosTab />
        </TabsContent>

        <TabsContent value="contas-pagar" className="mt-6">
          <ContasPagarTab />
        </TabsContent>

        <TabsContent value="contas-receber" className="mt-6">
          <ContasReceberTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Finance;
