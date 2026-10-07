import React from 'react';
import { 
  Flame, 
  UtensilsCrossed, 
  ChefHat, 
  History, 
  Users, 
  Package, 
  Terminal, 
  Sparkles, 
  RotateCcw,
  Database
} from 'lucide-react';

export type ActiveTab = 'pos' | 'kds' | 'history' | 'customers' | 'menu' | 'sql';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  activeOrdersCount: number;
  onSimulateOrder: () => void;
  onResetDatabase: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  activeOrdersCount,
  onSimulateOrder,
  onResetDatabase,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 text-zinc-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-600 to-red-600 shadow-lg shadow-orange-500/20 text-white font-bold">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-amber-400 via-orange-300 to-white bg-clip-text text-transparent">
                  BurgerSQL
                </span>
                <span className="text-[10px] font-mono tracking-wider uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  SQL Real-time
                </span>
              </div>
              <p className="text-xs text-zinc-400 hidden sm:block">
                Gestão de Pedidos, Clientes & Histórico Relacional
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onSimulateOrder}
              title="Gera um pedido aleatório para testar o fluxo em tempo real"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 border border-orange-500/30 text-xs font-medium transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-orange-400" />
              <span className="hidden md:inline">Simular Pedido</span>
            </button>

            <button
              onClick={() => {
                if (window.confirm('Deseja resetar o banco de dados SQL para os dados originais?')) {
                  onResetDatabase();
                }
              }}
              title="Resetar dados para o padrão inicial"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <nav className="flex space-x-1 overflow-x-auto pb-2 scrollbar-none border-t border-zinc-800/60 pt-2 text-sm font-medium">
          <button
            onClick={() => setActiveTab('pos')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition cursor-pointer ${
              activeTab === 'pos'
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>Cardápio & Pedidos (Modo Viagem)</span>
          </button>

          <button
            onClick={() => setActiveTab('kds')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition cursor-pointer relative ${
              activeTab === 'kds'
                ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <ChefHat className="w-4 h-4" />
            <span>Cozinha KDS</span>
            {activeOrdersCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-xs font-bold bg-orange-500 text-zinc-950">
                {activeOrdersCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition cursor-pointer ${
              activeTab === 'history'
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Histórico de Compras</span>
          </button>

          <button
            onClick={() => setActiveTab('customers')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition cursor-pointer ${
              activeTab === 'customers'
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Clientes (CRM SQL)</span>
          </button>

          <button
            onClick={() => setActiveTab('menu')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition cursor-pointer ${
              activeTab === 'menu'
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Itens & Estoque</span>
          </button>

          <button
            onClick={() => setActiveTab('sql')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition cursor-pointer ${
              activeTab === 'sql'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span className="flex items-center gap-1">
              Console SQL
              <Database className="w-3.5 h-3.5 opacity-70" />
            </span>
          </button>
        </nav>
      </div>
    </header>
  );
};
