import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Mail, 
  Phone, 
  MapPin, 
  ShoppingBag, 
  DollarSign, 
  Edit2, 
  Trash2, 
  History,
  Eye,
  X
} from 'lucide-react';
import { Customer, Order } from '../types';
import { sqlDb } from '../services/sqlDatabase';
import { CustomerModal } from './CustomerModal';
import { OrderReceiptModal } from './OrderReceiptModal';

export const CustomerManager: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Customer order history drawer
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState<Customer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<Order | null>(null);

  const loadCustomers = () => {
    setCustomers(sqlDb.getCustomers(searchQuery));
  };

  useEffect(() => {
    loadCustomers();
    const unsub = sqlDb.subscribe(() => {
      loadCustomers();
      if (selectedCustomerForHistory) {
        // reload customer orders
        const allOrders = sqlDb.getOrders();
        setCustomerOrders(allOrders.filter((o) => o.customer_id === selectedCustomerForHistory.id));
      }
    });
    return unsub;
  }, [searchQuery]);

  const handleOpenCreate = () => {
    setEditingCustomer(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const handleSaveCustomer = (data: { name: string; email: string; phone: string; address: string }) => {
    try {
      if (editingCustomer) {
        sqlDb.updateCustomer(editingCustomer.id, data.name, data.email, data.phone, data.address);
      } else {
        sqlDb.createCustomer(data.name, data.email, data.phone, data.address);
      }
    } catch (e: any) {
      alert('Erro ao salvar cliente no banco SQL: ' + e.message);
    }
  };

  const handleDeleteCustomer = (id: number, name: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o cliente "${name}" e todos os seus pedidos vinculados no banco de dados SQL?`)) {
      try {
        sqlDb.deleteCustomer(id);
        if (selectedCustomerForHistory?.id === id) {
          setSelectedCustomerForHistory(null);
        }
      } catch (e: any) {
        alert('Erro ao excluir cliente: ' + e.message);
      }
    }
  };

  const handleViewCustomerHistory = (customer: Customer) => {
    setSelectedCustomerForHistory(customer);
    const allOrders = sqlDb.getOrders();
    setCustomerOrders(allOrders.filter((o) => o.customer_id === customer.id));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-500" />
            <h2 className="text-xl font-extrabold text-white">
              Gestão de Clientes & CRM (Tabela: customers)
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Métricas de LTV e histórico de consumo agregados em tempo real via SQL JOIN
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition cursor-pointer self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Cadastrar Cliente</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          type="text"
          placeholder="Buscar clientes por nome, email ou telefone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
        />
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers.map((customer, idx) => (
          <div
            key={`customer-${customer.id}-${idx}`}
            className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono text-zinc-500">ID #{customer.id}</span>
                  <h3 className="font-bold text-base text-white">{customer.name}</h3>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(customer)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                    title="Editar dados"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteCustomer(customer.id, customer.name)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition cursor-pointer"
                    title="Excluir cliente"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Contact info */}
              <div className="mt-3 space-y-1.5 text-xs text-zinc-400">
                <p className="flex items-center gap-2 truncate">
                  <Mail className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  <span className="truncate">{customer.email}</span>
                </p>
                {customer.phone && (
                  <p className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <span>{customer.phone}</span>
                  </p>
                )}
                {customer.address && (
                  <p className="flex items-start gap-2 line-clamp-2">
                    <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
                    <span>{customer.address}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Aggregated SQL Metrics & History Trigger */}
            <div className="mt-5 pt-3 border-t border-zinc-800/80">
              <div className="grid grid-cols-2 gap-2 text-center bg-zinc-950 p-2 rounded-xl border border-zinc-800/60 mb-3">
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                    Pedidos Feitos
                  </p>
                  <p className="text-sm font-black text-white font-mono mt-0.5">
                    {customer.total_orders || 0}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                    Total Gasto (LTV)
                  </p>
                  <p className="text-sm font-black text-amber-400 font-mono mt-0.5">
                    R$ {(customer.total_spent || 0).toFixed(2).replace('.', ',')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleViewCustomerHistory(customer)}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition cursor-pointer"
              >
                <History className="w-3.5 h-3.5 text-amber-400" />
                <span>Ver Compras Deste Cliente</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {customers.length === 0 && (
        <div className="text-center py-16 bg-zinc-900/50 rounded-2xl border border-zinc-800">
          <Users className="w-12 h-12 text-zinc-600 mx-auto mb-2" />
          <p className="text-zinc-400 text-sm">Nenhum cliente cadastrado ou encontrado na busca.</p>
        </div>
      )}

      {/* Customer Orders History Modal / Drawer */}
      {selectedCustomerForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div 
            className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/70">
              <div>
                <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">
                  Histórico Individual (SQL JOIN)
                </span>
                <h3 className="text-lg font-bold text-white">
                  {selectedCustomerForHistory.name}
                </h3>
                <p className="text-xs text-zinc-400">
                  {selectedCustomerForHistory.email} • {customerOrders.length} pedido(s)
                </p>
              </div>
              <button
                onClick={() => setSelectedCustomerForHistory(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {customerOrders.length === 0 ? (
                <p className="text-center py-12 text-zinc-500 text-xs">
                  Este cliente ainda não realizou nenhum pedido.
                </p>
              ) : (
                customerOrders.map((ord, idx) => (
                  <div
                    key={`cust-ord-${ord.id}-${idx}`}
                    className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-400 font-mono text-xs">
                          Pedido #{ord.id}
                        </span>
                        <span className="text-zinc-500 text-[11px] font-mono">
                          {ord.created_at}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-semibold">
                          {ord.status}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-zinc-300">
                        {(ord.items || []).map((it, itemIdx) => (
                          <span key={`cust-ord-it-${ord.id}-${it.id || itemIdx}-${itemIdx}`} className="mr-2">
                            <span className="text-amber-400 font-semibold">{it.quantity}x</span> {it.item_name}
                            {itemIdx < (ord.items?.length || 0) - 1 ? ',' : ''}
                          </span>
                        ))}
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-1">
                        Forma de Pagamento: {ord.payment_method}
                      </p>
                    </div>

                    <div className="text-right shrink-0 flex flex-col items-end gap-2">
                      <span className="text-base font-extrabold text-white font-mono">
                        R$ {(Number(ord.total_amount) || 0).toFixed(2).replace('.', ',')}
                      </span>
                      <button
                        onClick={() => setSelectedReceiptOrder(ord)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver Comanda</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <CustomerModal
        customer={editingCustomer}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveCustomer}
      />

      <OrderReceiptModal
        order={selectedReceiptOrder}
        onClose={() => setSelectedReceiptOrder(null)}
      />
    </div>
  );
};
