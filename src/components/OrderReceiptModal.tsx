import React from 'react';
import { X, Printer, CheckCircle, Clock, MapPin, Phone, CreditCard, DollarSign, QrCode } from 'lucide-react';
import { Order } from '../types';

interface OrderReceiptModalProps {
  order: Order | null;
  onClose: () => void;
}

export const OrderReceiptModal: React.FC<OrderReceiptModalProps> = ({ order, onClose }) => {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'PIX':
        return <QrCode className="w-4 h-4 text-emerald-400" />;
      case 'DINHEIRO':
        return <DollarSign className="w-4 h-4 text-amber-400" />;
      default:
        return <CreditCard className="w-4 h-4 text-sky-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      NOVO: { label: 'Novo Pedido', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
      PREPARANDO: { label: 'Na Cozinha (Preparo)', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
      PRONTO: { label: 'Pronto p/ Entrega', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
      ENTREGANDO: { label: 'Em Rota de Entrega', cls: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
      CONCLUIDO: { label: 'Concluído', cls: 'bg-zinc-700/30 text-zinc-300 border-zinc-600/30' },
      CANCELADO: { label: 'Cancelado', cls: 'bg-red-500/10 text-red-400 border-red-500/30' },
    };
    const s = map[status] || { label: status, cls: 'bg-zinc-800 text-zinc-300 border-zinc-700' };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${s.cls}`}>
        {s.label}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in print:bg-white print:p-0">
      <div 
        className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] print:border-none print:shadow-none print:bg-white print:text-black"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/70 print:border-b-2 print:border-black">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-wider text-amber-400 print:text-black">
                Comanda / Pedido #{order.id}
              </span>
              {getStatusBadge(order.status)}
              {(order.order_type === 'VIAGEM' || (order.notes && order.notes.includes('VIAGEM'))) && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-500/20 text-orange-300 border border-orange-500/40 print:text-black print:border-black">
                  🥡 Modo Viagem
                </span>
              )}
            </div>
            <h3 className="text-lg font-black text-white print:text-black mt-0.5">
              BurgerSQL Kitchen & Delivery
            </h3>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handlePrint}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition cursor-pointer"
              title="Imprimir comanda"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Receipt Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-zinc-300 print:text-black">
          {/* Customer & Timestamp info */}
          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2 print:bg-gray-100 print:border-gray-300">
            <div className="flex justify-between items-center text-zinc-400 print:text-gray-700">
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5 text-amber-400 print:text-black" />
                Data do Registro (SQL):
              </span>
              <span className="font-mono text-zinc-200 print:text-black">{order.created_at}</span>
            </div>
            <div className="border-t border-zinc-800/60 pt-2 print:border-gray-300">
              <p className="font-bold text-sm text-white print:text-black">{order.customer_name}</p>
              {order.customer_phone && (
                <p className="text-zinc-400 print:text-gray-700 flex items-center gap-1.5 mt-0.5">
                  <Phone className="w-3 h-3 text-zinc-500" />
                  {order.customer_phone}
                </p>
              )}
              {order.customer_address && (
                <p className="text-zinc-400 print:text-gray-700 flex items-start gap-1.5 mt-0.5">
                  <MapPin className="w-3 h-3 text-zinc-500 shrink-0 mt-0.5" />
                  {order.customer_address}
                </p>
              )}
            </div>
          </div>

          {/* Items breakdown (from SQL order_items JOIN menu_items) */}
          <div>
            <h4 className="font-semibold text-zinc-200 uppercase tracking-wider text-[11px] mb-2 print:text-black">
              Itens do Pedido (Relacional SQL: order_items)
            </h4>
            <div className="divide-y divide-zinc-800 border-y border-zinc-800 print:divide-gray-300 print:border-gray-300">
              {(order.items || []).map((item, idx) => (
                <div key={`receipt-item-${order.id}-${item.id || idx}-${idx}`} className="py-2.5 flex justify-between items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-amber-400 font-mono text-xs print:text-black">
                        {item.quantity}x
                      </span>
                      <span className="font-semibold text-zinc-100 text-xs print:text-black">
                        {item.item_name}
                      </span>
                    </div>
                    {item.custom_notes && (
                      <p className="text-[11px] text-amber-300/80 mt-0.5 italic print:text-gray-600">
                        {item.custom_notes}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-zinc-200 text-xs font-mono print:text-black">
                      R$ {(Number(item.subtotal) || 0).toFixed(2).replace('.', ',')}
                    </span>
                    <p className="text-[10px] text-zinc-500 print:text-gray-600">
                      (un. R$ {(Number(item.unit_price) || 0).toFixed(2).replace('.', ',')})
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Special observations */}
          {order.notes && (
            <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800 text-xs print:bg-gray-100">
              <span className="font-bold text-amber-400 print:text-black">Observações da Entrega:</span>
              <p className="text-zinc-300 print:text-black mt-0.5">{order.notes}</p>
            </div>
          )}

          {/* Financial summary & Payment method */}
          <div className="pt-2 border-t border-zinc-800 space-y-1.5 print:border-black">
            <div className="flex justify-between items-center text-zinc-400 print:text-gray-700">
              <span>Forma de Pagamento:</span>
              <span className="font-semibold text-zinc-200 print:text-black flex items-center gap-1.5">
                {getPaymentIcon(order.payment_method)}
                {order.payment_method}
              </span>
            </div>
            <div className="flex justify-between items-center text-base font-extrabold text-white pt-2 border-t border-zinc-800/80 print:text-black print:border-gray-400">
              <span>Total Pago:</span>
              <span className="text-amber-400 text-lg font-mono print:text-black">
                R$ {(Number(order.total_amount) || 0).toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-zinc-950/80 border-t border-zinc-800 flex justify-end print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
