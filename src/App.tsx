import React, { useState, useEffect } from 'react';
import { Navbar, ActiveTab } from './components/Navbar';
import { OrderPOS } from './components/OrderPOS';
import { KitchenKDS } from './components/KitchenKDS';
import { OrderHistory } from './components/OrderHistory';
import { CustomerManager } from './components/CustomerManager';
import { MenuManager } from './components/MenuManager';
import { SqlConsole } from './components/SqlConsole';
import { sqlDb } from './services/sqlDatabase';
import { Flame, Database, Loader2, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('pos');
  const [isLoading, setIsLoading] = useState(true);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    async function initDatabase() {
      try {
        await sqlDb.init();
        updateActiveOrders();
      } catch (e) {
        console.error('Initialization error:', e);
      } finally {
        setIsLoading(false);
      }
    }

    initDatabase();

    const unsub = sqlDb.subscribe(() => {
      updateActiveOrders();
    });

    return unsub;
  }, []);

  const updateActiveOrders = () => {
    const stats = sqlDb.getDashboardStats();
    setActiveOrdersCount(stats.activeOrders);
  };

  const handleSimulateOrder = () => {
    const orderId = sqlDb.simulateRandomOrder();
    if (orderId) {
      showNotification(`Pedido #${orderId} gerado com sucesso via SQL e enviado para a Cozinha!`);
    }
  };

  const handleResetDatabase = () => {
    sqlDb.resetDatabase();
    showNotification('Banco de dados SQL restaurado para o estado inicial!');
  };

  const handleOrderCreated = (orderId: number) => {
    showNotification(`Pedido #${orderId} registrado com sucesso no banco SQL!`);
    setActiveTab('kds'); // Switch to KDS to see the new order live in the kitchen
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification((curr) => (curr === msg ? null : curr));
    }, 4500);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-600 to-red-600 flex items-center justify-center shadow-xl shadow-orange-500/20 mb-4 animate-pulse">
          <Flame className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-xl font-extrabold text-white">Iniciando BurgerSQL...</h1>
        <p className="text-zinc-400 text-xs mt-1 flex items-center gap-2">
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          Inicializando motor de banco de dados SQL e tabelas relacionais
        </p>
        <Loader2 className="w-6 h-6 text-amber-500 animate-spin mt-6" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Top Banner Notification */}
      {notification && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-xs font-semibold py-2 px-4 text-center shadow-md flex items-center justify-center gap-2 animate-fade-in sticky top-0 z-50">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Main Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeOrdersCount={activeOrdersCount}
        onSimulateOrder={handleSimulateOrder}
        onResetDatabase={handleResetDatabase}
      />

      {/* Tab Content */}
      <main className="flex-1">
        {activeTab === 'pos' && <OrderPOS onOrderCreated={handleOrderCreated} />}
        {activeTab === 'kds' && <KitchenKDS />}
        {activeTab === 'history' && <OrderHistory />}
        {activeTab === 'customers' && <CustomerManager />}
        {activeTab === 'menu' && <MenuManager />}
        {activeTab === 'sql' && <SqlConsole />}
      </main>

      {/* Subtle Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-4 px-6 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-400">BurgerSQL</span>
            <span>•</span>
            <span>Motor Relacional com Tabelas, Índices e Foreign Keys</span>
          </div>
          <p className="text-[11px] text-zinc-600">
            Itens, Clientes e Histórico de Compras integrados em tempo real
          </p>
        </div>
      </footer>
    </div>
  );
}
