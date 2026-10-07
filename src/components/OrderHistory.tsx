import React, { useState, useEffect } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  DollarSign, 
  ShoppingBag, 
  TrendingUp, 
  Clock, 
  Eye, 
  Printer, 
  Download,
  Flame,
  Award
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { sqlDb } from '../services/sqlDatabase';
import { OrderReceiptModal } from './OrderReceiptModal';

export const OrderHistory: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [paymentFilter, setPaymentFilter] = useState<string>('TODOS');
  const [typeFilter, setTypeFilter] = useState<string>('TODOS');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [stats, setStats] = useState({ totalRevenue: 0, totalOrders: 0, activeOrders: 0, customersCount: 0 });
  const [topItems, setTopItems] = useState<{ name: string; total_sold: number; total_revenue: number }[]>([]);

  const loadData = () => {
    setOrders(sqlDb.getOrders());
    setStats(sqlDb.getDashboardStats());
    setTopItems(sqlDb.getTopSellingItems());
  };

  useEffect(() => {
    loadData();
    const unsub = sqlDb.subscribe(() => {
      loadData();
    });
    return unsub;
  }, []);

  const handleUpdateStatus = (orderId: number, newStatus: OrderStatus) => {
    sqlDb.updateOrderStatus(orderId, newStatus);
  };

  const filteredOrders = orders.filter((order) => {
    if (statusFilter !== 'TODOS' && order.status !== statusFilter) return false;
    if (paymentFilter !== 'TODOS' && order.payment_method !== paymentFilter) return false;
    if (typeFilter !== 'TODOS' && order.order_type !== typeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = String(order.id).includes(q);
      const matchName = (order.customer_name || '').toLowerCase().includes(q);
      const matchPhone = (order.customer_phone || '').toLowerCase().includes(q);
      return matchId || matchName || matchPhone;
    }
    return true;
  });

  const getStatusBadge = (status: OrderStatus) => {
    const map: Record<OrderStatus, { label: string; cls: string }> = {
      NOVO: { label: 'Novo', cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
      PREPARANDO: { label: 'Preparo', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
      PRONTO: { label: 'Pronto', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
      ENTREGANDO: { label: 'Em Rota', cls: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
      CONCLUIDO: { label: 'Concluído', cls: 'bg-zinc-700/30 text-zinc-300 border-zinc-600/30' },
      CANCELADO: { label: 'Cancelado', cls: 'bg-red-500/15 text-red-400 border-red-500/30' },
    };
    const s = map[status] || { label: status, cls: 'bg-zinc-800 text-zinc-300 border-zinc-700' };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${s.cls}`}>
        {s.label}
      </span>
    );
  };

  const averageTicket = stats.totalOrders > 0 ? stats.totalRevenue / stats.totalOrders : 0;

  const formatBRL = (val: number | null | undefined): string => {
    const num = typeof val === 'number' ? val : Number(val);
    return (isNaN(num) ? 0 : num).toFixed(2).replace('.', ',');
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Cliente', 'Data', 'Status', 'Metodo_Pagamento', 'Total_Reais'];
    const rows = filteredOrders.map((o) => [
      o.id,
      `"${o.customer_name || ''}"`,
      `"${o.created_at}"`,
      o.status,
      o.payment_method,
      (Number(o.total_amount) || 0).toFixed(2),
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `burgersql_historico_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Title & Overview Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-6 h-6 text-amber-500" />
            <h2 className="text-xl font-extrabold text-white">
              Histórico de Compras em Tempo Real
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Registro transacional sincronizado no banco SQL com métricas agregadas
          </p>
        </div>

        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition self-start sm:self-auto cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Exportar Relatório CSV</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-zinc-400 font-medium">Faturamento Total</p>
            <p className="text-xl font-black text-white font-mono">
              R$ {formatBRL(stats.totalRevenue)}
            </p>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-zinc-400 font-medium">Total de Pedidos</p>
            <p className="text-xl font-black text-white font-mono">
              {stats.totalOrders} pedidos
            </p>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center gap-4">
          <div className="p-3 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-zinc-400 font-medium">Ticket Médio</p>
            <p className="text-xl font-black text-white font-mono">
              R$ {formatBRL(averageTicket)}
            </p>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center gap-4">
          <div className="p-3 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-zinc-400 font-medium">Pedidos em Andamento</p>
            <p className="text-xl font-black text-white font-mono">
              {stats.activeOrders} ativos
            </p>
          </div>
        </div>
      </div>

      {/* Top Selling Items (SQL Aggregation preview) */}
      {topItems.length > 0 && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              Burgers & Itens Mais Vendidos (SQL GROUP BY)
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {topItems.map((item, idx) => (
              <div
                key={`top-item-${item.name}-${idx}`}
                className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800/80 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400">
                    <span>#{idx + 1}</span>
                    <span className="truncate text-zinc-200">{item.name}</span>
                  </div>
                  <p className="text-xs font-bold text-white mt-1">{item.total_sold} vendidos</p>
                </div>
                <p className="text-[11px] font-mono text-zinc-400 mt-2 pt-1 border-t border-zinc-900">
                  R$ {formatBRL(item.total_revenue)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por ID, nome do cliente ou telefone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
            >
              <option value="TODOS">Todos os Status</option>
              <option value="NOVO">Novos</option>
              <option value="PREPARANDO">Preparando</option>
              <option value="PRONTO">Prontos</option>
              <option value="ENTREGANDO">Em Rota</option>
              <option value="CONCLUIDO">Concluídos</option>
              <option value="CANCELADO">Cancelados</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-400">Tipo:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
            >
              <option value="TODOS">Todos os Tipos</option>
              <option value="VIAGEM">🥡 Modo Viagem</option>
              <option value="LOCAL">🍽️ No Local</option>
              <option value="DELIVERY">🛵 Delivery</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-400">Pagamento:</span>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
            >
              <option value="TODOS">Todas Formas</option>
              <option value="PIX">PIX</option>
              <option value="CARTAO_CREDITO">Cartão de Crédito</option>
              <option value="CARTAO_DEBITO">Cartão de Débito</option>
              <option value="DINHEIRO">Dinheiro</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/70 border-b border-zinc-800 text-zinc-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Pedido ID</th>
                <th className="py-3.5 px-4">Tipo</th>
                <th className="py-3.5 px-4">Cliente (SQL)</th>
                <th className="py-3.5 px-4">Itens & Detalhes</th>
                <th className="py-3.5 px-4">Data / Hora</th>
                <th className="py-3.5 px-4">Pagamento</th>
                <th className="py-3.5 px-4">Total</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Comanda</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-zinc-200">
              {filteredOrders.map((order, oIdx) => (
                <tr key={`hist-order-${order.id}-${oIdx}`} className="hover:bg-zinc-800/40 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                    #{order.id}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {order.order_type === 'VIAGEM' || (order.notes && order.notes.includes('VIAGEM')) ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-orange-500/20 text-orange-300 border border-orange-500/40">
                        🥡 Viagem
                      </span>
                    ) : order.order_type === 'DELIVERY' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                        🛵 Delivery
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
                        🍽️ Local
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-white">{order.customer_name}</p>
                    <p className="text-[11px] text-zinc-400">{order.customer_phone}</p>
                  </td>
                  <td className="py-3.5 px-4 max-w-xs">
                    <div className="line-clamp-2">
                      {(order.items || []).map((it, itIdx) => (
                        <span key={`hist-it-${order.id}-${it.id || itIdx}-${itIdx}`} className="mr-1.5 text-zinc-300">
                          <span className="font-bold text-amber-400">{it.quantity}x</span> {it.item_name}
                          {itIdx < (order.items?.length || 0) - 1 ? ',' : ''}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-400 whitespace-nowrap">
                    {order.created_at}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-medium text-zinc-300">{order.payment_method}</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-white whitespace-nowrap">
                    R$ {formatBRL(order.total_amount)}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5">
                      {getStatusBadge(order.status)}
                      <select
                        value={order.status}
                        onChange={(e) => handleUpdateStatus(order.id, e.target.value as OrderStatus)}
                        className="bg-zinc-950 border border-zinc-800 rounded px-1.5 py-0.5 text-[10px] text-zinc-400 hover:text-white cursor-pointer"
                        title="Alterar status do pedido diretamente"
                      >
                        <option value="NOVO">Mudar para Novo</option>
                        <option value="PREPARANDO">Mudar para Preparando</option>
                        <option value="PRONTO">Mudar para Pronto</option>
                        <option value="ENTREGANDO">Mudar para Entregando</option>
                        <option value="CONCLUIDO">Mudar para Concluído</option>
                        <option value="CANCELADO">Mudar para Cancelado</option>
                      </select>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition cursor-pointer"
                      title="Abrir comanda completa"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12 text-zinc-500 text-xs">
            Nenhum pedido encontrado para os filtros selecionados.
          </div>
        )}
      </div>

      {/* Comanda / Receipt Modal */}
      <OrderReceiptModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  );
};
