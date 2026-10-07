import React, { useState, useEffect } from 'react';
import { 
  ChefHat, 
  Flame, 
  CheckCircle, 
  Bike, 
  Clock, 
  AlertCircle, 
  Eye, 
  ArrowRight, 
  Ban,
  CheckCheck
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { sqlDb } from '../services/sqlDatabase';
import { OrderReceiptModal } from './OrderReceiptModal';

export const KitchenKDS: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<Order | null>(null);
  const [lastExecutedSql, setLastExecutedSql] = useState<string | null>(null);

  const loadOrders = () => {
    setOrders(sqlDb.getOrders());
  };

  useEffect(() => {
    loadOrders();
    const unsub = sqlDb.subscribe(() => {
      loadOrders();
    });
    return unsub;
  }, []);

  const handleUpdateStatus = (orderId: number, nextStatus: OrderStatus) => {
    sqlDb.updateOrderStatus(orderId, nextStatus);
    setLastExecutedSql(`UPDATE orders SET status = '${nextStatus}', updated_at = datetime('now') WHERE id = ${orderId};`);
    setTimeout(() => setLastExecutedSql(null), 4000);
  };

  const getElapsedTimeText = (createdAtStr: string) => {
    try {
      const created = new Date(createdAtStr.replace(' ', 'T'));
      const diffMs = Date.now() - created.getTime();
      const mins = Math.max(1, Math.floor(diffMs / 60000));
      return `${mins} min`;
    } catch {
      return 'recente';
    }
  };

  const newOrders = orders.filter((o) => o.status === 'NOVO');
  const preppingOrders = orders.filter((o) => o.status === 'PREPARANDO');
  const readyOrders = orders.filter((o) => o.status === 'PRONTO');
  const deliveryOrders = orders.filter((o) => o.status === 'ENTREGANDO');

  const renderOrderCard = (order: Order, currentColumn: 'NOVO' | 'PREPARANDO' | 'PRONTO' | 'ENTREGANDO', index: number = 0) => {
    const elapsed = getElapsedTimeText(order.created_at);
    const isLate = elapsed.includes('min') && parseInt(elapsed) > 20;

    return (
      <div
        key={`kds-card-${order.id}-${currentColumn}-${index}`}
        className={`bg-zinc-900 border rounded-2xl p-4 shadow-lg transition-all flex flex-col justify-between ${
          isLate ? 'border-red-500/60 bg-red-950/10' : 'border-zinc-800 hover:border-zinc-700'
        }`}
      >
        <div>
          {/* Card Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800/80">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-base font-mono">
                #{order.id}
              </span>
              <span className="text-xs font-semibold text-zinc-300 truncate max-w-[120px]">
                {order.customer_name}
              </span>
              {(order.order_type === 'VIAGEM' || (order.notes && order.notes.includes('VIAGEM'))) && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-500/20 text-orange-300 border border-orange-500/40">
                  🥡 Viagem
                </span>
              )}
            </div>
            <div className={`flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full ${
              isLate ? 'bg-red-500/20 text-red-400 font-bold' : 'bg-zinc-800 text-zinc-400'
            }`}>
              <Clock className="w-3 h-3" />
              <span>{elapsed}</span>
            </div>
          </div>

          {/* Items List */}
          <div className="py-3 space-y-2">
            {(order.items || []).map((item, idx) => (
              <div key={`kds-item-${order.id}-${item.id || idx}-${idx}`} className="text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-[11px] shrink-0">
                    {item.quantity}x
                  </span>
                  <span className="font-semibold text-zinc-200">{item.item_name}</span>
                </div>
                {item.custom_notes && (
                  <p className="ml-7 text-[11px] text-amber-300/80 font-medium bg-amber-500/5 px-2 py-0.5 rounded mt-0.5">
                    {item.custom_notes}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Delivery Note */}
          {order.notes && (
            <div className="mt-1 p-2 rounded-lg bg-zinc-950/80 border border-zinc-800/60 text-[11px] text-zinc-400">
              <span className="text-zinc-500 font-semibold">Obs:</span> {order.notes}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
          <button
            onClick={() => setSelectedReceiptOrder(order)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
            title="Ver comanda completa"
          >
            <Eye className="w-4 h-4" />
          </button>

          {currentColumn === 'NOVO' && (
            <button
              onClick={() => handleUpdateStatus(order.id, 'PREPARANDO')}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs transition cursor-pointer shadow-md shadow-orange-600/20"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Iniciar Preparo</span>
            </button>
          )}

          {currentColumn === 'PREPARANDO' && (
            <button
              onClick={() => handleUpdateStatus(order.id, 'PRONTO')}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer shadow-md shadow-emerald-600/20"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Pronto p/ Entrega</span>
            </button>
          )}

          {currentColumn === 'PRONTO' && (
            <button
              onClick={() => handleUpdateStatus(order.id, 'ENTREGANDO')}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition cursor-pointer shadow-md shadow-purple-600/20"
            >
              <Bike className="w-3.5 h-3.5" />
              <span>Despachar / Rota</span>
            </button>
          )}

          {currentColumn === 'ENTREGANDO' && (
            <button
              onClick={() => handleUpdateStatus(order.id, 'CONCLUIDO')}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-white font-bold text-xs transition cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Concluir Pedido</span>
            </button>
          )}

          <button
            onClick={() => {
              if (window.confirm(`Deseja cancelar o pedido #${order.id}?`)) {
                handleUpdateStatus(order.id, 'CANCELADO');
              }
            }}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition cursor-pointer"
            title="Cancelar pedido"
          >
            <Ban className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-orange-500" />
            <h2 className="text-xl font-extrabold text-white">
              Painel KDS da Cozinha (Tempo Real)
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Controle de fluxo de montagem com atualização sincronizada no banco SQL
          </p>
        </div>

        {/* Real-time active SQL statement notification */}
        {lastExecutedSql && (
          <div className="animate-fade-in px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-[11px] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="truncate max-w-xs">{lastExecutedSql}</span>
          </div>
        )}
      </div>

      {/* Kanban Board (4 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Column 1: Novos */}
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-4 flex flex-col min-h-[500px]">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                1. Novos Pedidos
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400">
              {newOrders.length}
            </span>
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto">
            {newOrders.map((o, idx) => renderOrderCard(o, 'NOVO', idx))}
            {newOrders.length === 0 && (
              <div className="text-center py-12 text-zinc-600 text-xs">
                Nenhum novo pedido na fila.
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Preparando */}
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-4 flex flex-col min-h-[500px]">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-pulse" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                2. Na Chapa / Preparo
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-500/20 text-orange-400">
              {preppingOrders.length}
            </span>
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto">
            {preppingOrders.map((o, idx) => renderOrderCard(o, 'PREPARANDO', idx))}
            {preppingOrders.length === 0 && (
              <div className="text-center py-12 text-zinc-600 text-xs">
                Chapa livre no momento.
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Prontos */}
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-4 flex flex-col min-h-[500px]">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                3. Prontos p/ Retirada
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400">
              {readyOrders.length}
            </span>
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto">
            {readyOrders.map((o, idx) => renderOrderCard(o, 'PRONTO', idx))}
            {readyOrders.length === 0 && (
              <div className="text-center py-12 text-zinc-600 text-xs">
                Nenhum pedido aguardando retirada.
              </div>
            )}
          </div>
        </div>

        {/* Column 4: Em Rota de Entrega */}
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-4 flex flex-col min-h-[500px]">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                4. Em Rota / Entrega
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-400">
              {deliveryOrders.length}
            </span>
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto">
            {deliveryOrders.map((o, idx) => renderOrderCard(o, 'ENTREGANDO', idx))}
            {deliveryOrders.length === 0 && (
              <div className="text-center py-12 text-zinc-600 text-xs">
                Nenhum pedido em trânsito.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      <OrderReceiptModal
        order={selectedReceiptOrder}
        onClose={() => setSelectedReceiptOrder(null)}
      />
    </div>
  );
};
