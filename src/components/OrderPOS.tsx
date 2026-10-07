import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  UserCheck, 
  UserPlus, 
  CreditCard, 
  QrCode, 
  Banknote, 
  CheckCircle2, 
  ShoppingBag,
  Sparkles,
  Percent,
  SlidersHorizontal,
  PackageCheck,
  Utensils,
  Bike
} from 'lucide-react';
import { Customer, MenuItem, CartItem, PaymentMethod } from '../types';
import { sqlDb } from '../services/sqlDatabase';
import { ItemCustomizationModal } from './ItemCustomizationModal';
import { CustomerModal } from './CustomerModal';

interface OrderPOSProps {
  onOrderCreated: (orderId: number) => void;
}

export const OrderPOS: React.FC<OrderPOSProps> = ({ onOrderCreated }) => {
  const [categories, setCategories] = useState<string[]>([
    'Todos',
    '🥡 Kits Viagem',
    'Burgers Artesanais',
    'Burgers Especiais',
    'Acompanhamentos',
    'Bebidas',
    'Sobremesas',
  ]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Cart & Order State
  const [orderType, setOrderType] = useState<import('../types').OrderType>('VIAGEM');
  const [travelThermalSeal, setTravelThermalSeal] = useState(true);
  const [travelExtraSauce, setTravelExtraSauce] = useState(true);
  const [travelCutlery, setTravelCutlery] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [orderNotes, setOrderNotes] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0);

  // Modals
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  // Load data from SQL
  const loadData = () => {
    if (selectedCategory === '🥡 Kits Viagem') {
      const all = sqlDb.getMenuItems();
      setMenuItems(all.filter((m) => m.category.includes('Burger') || m.name.includes('Batata')));
    } else {
      setMenuItems(sqlDb.getMenuItems(selectedCategory));
    }
    setCustomers(sqlDb.getCustomers(customerSearch));
  };

  useEffect(() => {
    loadData();
    const unsubscribe = sqlDb.subscribe(() => {
      loadData();
    });
    return unsubscribe;
  }, [selectedCategory, customerSearch]);

  // Set default customer if none selected and customers exist
  useEffect(() => {
    if (!selectedCustomer && customers.length > 0) {
      setSelectedCustomer(customers[0]);
    }
  }, [customers, selectedCustomer]);

  const handleOpenCustomization = (item: MenuItem) => {
    setCustomizingItem(item);
  };

  const handleAddToCart = (item: MenuItem, quantity: number, notes: string) => {
    setCart((prev) => {
      // Check if same item with same notes already exists
      const existingIdx = prev.findIndex(
        (ci) => ci.item.id === item.id && (ci.custom_notes || '') === (notes || '')
      );
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx].quantity += quantity;
        return copy;
      }
      return [...prev, { item, quantity, custom_notes: notes }];
    });
  };

  const handleUpdateCartQty = (index: number, delta: number) => {
    setCart((prev) => {
      const copy = [...prev];
      const newQty = copy[index].quantity + delta;
      if (newQty <= 0) {
        return copy.filter((_, i) => i !== index);
      }
      copy[index].quantity = newQty;
      return copy;
    });
  };

  const handleRemoveCartItem = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const handleApplyDiscount = () => {
    const code = discountCode.trim().toUpperCase();
    if (code === 'SQL10' || code === 'BURGER10') {
      setAppliedDiscount(0.1); // 10%
    } else if (code === 'VIP20') {
      setAppliedDiscount(0.2); // 20%
    } else {
      alert('Cupom inválido. Tente "SQL10" para 10% de desconto.');
      setAppliedDiscount(0);
    }
  };

  const cartSubtotal = cart.reduce((acc, curr) => acc + curr.item.price * curr.quantity, 0);
  const discountAmount = cartSubtotal * appliedDiscount;
  const cartTotal = Math.max(0, cartSubtotal - discountAmount);

  const handleCreateNewCustomer = (data: { name: string; email: string; phone: string; address: string }) => {
    try {
      const newId = sqlDb.createCustomer(data.name, data.email, data.phone, data.address);
      const updatedList = sqlDb.getCustomers();
      const created = updatedList.find((c) => c.id === newId);
      if (created) setSelectedCustomer(created);
    } catch (e: any) {
      alert('Erro ao criar cliente no SQL: ' + e.message);
    }
  };

  const handleCheckout = () => {
    if (!selectedCustomer) {
      alert('Selecione ou cadastre um cliente para o pedido.');
      return;
    }
    if (cart.length === 0) {
      alert('Adicione pelo menos um item ao pedido.');
      return;
    }

    try {
      let finalNotes = orderNotes.trim();
      if (orderType === 'VIAGEM') {
        const viageItems: string[] = [];
        if (travelThermalSeal) viageItems.push('Lacre Térmico');
        if (travelExtraSauce) viageItems.push('Sachês Artesanais Extras');
        if (travelCutlery) viageItems.push('Talheres Ecológicos');
        finalNotes = `[MODO VIAGEM: ${viageItems.join(' + ')}] ${finalNotes}`.trim();
      } else if (orderType === 'LOCAL') {
        finalNotes = `[CONSUMO NO LOCAL] ${finalNotes}`.trim();
      } else if (orderType === 'DELIVERY') {
        finalNotes = `[DELIVERY] ${finalNotes}`.trim();
      }

      if (appliedDiscount > 0) {
        finalNotes = `[Cupom ${discountCode} (${appliedDiscount * 100}% OFF)] ${finalNotes}`;
      }

      const orderId = sqlDb.createOrder(
        selectedCustomer.id,
        cart,
        paymentMethod,
        finalNotes,
        orderType
      );

      // Trigger celebratory confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#ea580c', '#10b981'],
      });

      // Clear cart
      setCart([]);
      setOrderNotes('');
      setDiscountCode('');
      setAppliedDiscount(0);

      onOrderCreated(orderId);
    } catch (err: any) {
      alert('Erro ao processar transação no banco SQL: ' + err.message);
    }
  };

  const filteredMenuItems = menuItems.filter((item) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Menu Items & Categories (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Order Mode Selector (Modo Viagem vs Consumo no Local vs Delivery) */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  orderType === 'VIAGEM'
                    ? 'bg-amber-500 text-zinc-950 font-black shadow-md shadow-amber-500/20'
                    : 'bg-zinc-800 text-zinc-400'
                }`}>
                  <PackageCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold text-white">
                      Modo Viagem no Cardápio
                    </h3>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      orderType === 'VIAGEM'
                        ? 'bg-amber-500 text-zinc-950'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      {orderType === 'VIAGEM' ? 'Ativo 🥡' : 'Inativo'}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    {orderType === 'VIAGEM'
                      ? 'Preparo térmico reforçado e proteção anti-umidade para viagem inclusos.'
                      : 'Alterne para ativar embalagens térmicas e cuidados de viagem nos itens.'}
                  </p>
                </div>
              </div>

              {/* Mode Switch Buttons */}
              <div className="grid grid-cols-3 gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800/80 shrink-0">
                <button
                  type="button"
                  onClick={() => setOrderType('VIAGEM')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                    orderType === 'VIAGEM'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-zinc-950 shadow-md shadow-orange-600/20'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  <PackageCheck className="w-3.5 h-3.5" />
                  <span>🥡 Modo Viagem</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOrderType('LOCAL')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                    orderType === 'LOCAL'
                      ? 'bg-amber-500 text-zinc-950 shadow-md'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  <Utensils className="w-3.5 h-3.5" />
                  <span>No Local</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOrderType('DELIVERY')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                    orderType === 'DELIVERY'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  <Bike className="w-3.5 h-3.5" />
                  <span>Delivery</span>
                </button>
              </div>
            </div>

            {/* Modo Viagem Active Checklist Banner */}
            {orderType === 'VIAGEM' && (
              <div className="mt-3.5 pt-3 border-t border-zinc-800/80 animate-fade-in flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs bg-amber-500/10 p-3 rounded-xl border border-amber-500/30">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 font-bold">🥡 Itens de Viagem Inclusos:</span>
                  <span className="text-zinc-300 text-[11px]">Embalagem térmica + sacola kraft</span>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-zinc-300">
                  <label className="flex items-center gap-1.5 cursor-pointer bg-zinc-950/80 px-2 py-1 rounded-md border border-zinc-800 hover:border-amber-500/40">
                    <input
                      type="checkbox"
                      checked={travelThermalSeal}
                      onChange={(e) => setTravelThermalSeal(e.target.checked)}
                      className="rounded accent-amber-500 cursor-pointer"
                    />
                    <span>Lacre Inviolável</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer bg-zinc-950/80 px-2 py-1 rounded-md border border-zinc-800 hover:border-amber-500/40">
                    <input
                      type="checkbox"
                      checked={travelExtraSauce}
                      onChange={(e) => setTravelExtraSauce(e.target.checked)}
                      className="rounded accent-amber-500 cursor-pointer"
                    />
                    <span>Sachês da Casa</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer bg-zinc-950/80 px-2 py-1 rounded-md border border-zinc-800 hover:border-amber-500/40">
                    <input
                      type="checkbox"
                      checked={travelCutlery}
                      onChange={(e) => setTravelCutlery(e.target.checked)}
                      className="rounded accent-amber-500 cursor-pointer"
                    />
                    <span>Talheres Ecológicos</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Search & Category Filter */}
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Buscar burgers, acompanhamentos, bebidas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat, idx) => (
              <button
                key={`pos-cat-${cat}-${idx}`}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Menu Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredMenuItems.map((item, idx) => (
              <div
                key={`pos-item-${item.id}-${idx}`}
                onClick={() => handleOpenCustomization(item)}
                className={`group relative bg-zinc-900 border rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 hover:shadow-xl cursor-pointer ${
                  orderType === 'VIAGEM'
                    ? 'border-amber-500/40 hover:border-amber-400 bg-gradient-to-b from-zinc-900 to-amber-950/20 hover:shadow-amber-500/10'
                    : 'border-zinc-800/80 hover:border-amber-500/50 hover:shadow-amber-500/5'
                }`}
              >
                <div>
                  <div className="relative h-40 w-full rounded-xl overflow-hidden mb-3 bg-zinc-950">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 brightness-95"
                    />
                    <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-black/70 backdrop-blur-md text-amber-300 border border-amber-500/30">
                      R$ {(Number(item.price) || 0).toFixed(2).replace('.', ',')}
                    </div>
                    {item.stock <= 10 && (
                      <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/80 text-white">
                        Restam {item.stock} un.
                      </div>
                    )}
                    {orderType === 'VIAGEM' && (
                      <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-zinc-950 shadow-md flex items-center gap-1">
                        <PackageCheck className="w-3 h-3" />
                        <span>🥡 Apto p/ Viagem</span>
                      </div>
                    )}
                  </div>
                  <h3 className="font-bold text-zinc-100 group-hover:text-amber-400 transition text-base flex items-center justify-between">
                    <span>{item.name}</span>
                  </h3>
                  <p className="text-zinc-400 text-xs mt-1 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                  {orderType === 'VIAGEM' && (
                    <div className="mt-2 text-[10px] text-amber-400/90 flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                      <span>✓ Embalagem térmica selada + sachê da casa</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                    {item.category}
                  </span>
                  
                  {orderType === 'VIAGEM' ? (
                    <button
                      type="button"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 text-xs font-bold transition shadow-sm cursor-pointer"
                    >
                      <PackageCheck className="w-3.5 h-3.5" />
                      <span>Pedir p/ Viagem 🥡</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOrderType('VIAGEM');
                          handleOpenCustomization(item);
                        }}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-300 text-[11px] font-bold transition border border-zinc-700 cursor-pointer"
                        title="Ativar Modo Viagem para este item"
                      >
                        <PackageCheck className="w-3 h-3" />
                        <span>Viagem 🥡</span>
                      </button>
                      <button
                        type="button"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/10 group-hover:bg-amber-500 text-amber-400 group-hover:text-zinc-950 border border-amber-500/30 text-xs font-bold transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredMenuItems.length === 0 && (
            <div className="text-center py-12 bg-zinc-900/40 rounded-2xl border border-zinc-800">
              <ShoppingBag className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400 text-sm">Nenhum item encontrado com esses filtros.</p>
            </div>
          )}
        </div>

        {/* Right Column: Customer & Live Comanda/Cart (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl flex flex-col h-full">
            {/* Customer Picker */}
            <div className="pb-4 border-b border-zinc-800">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-amber-400" />
                  Cliente no SQL
                </label>
                <button
                  onClick={() => setIsCustomerModalOpen(true)}
                  className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Novo Cliente</span>
                </button>
              </div>

              {/* Customer Select Dropdown */}
              <select
                value={selectedCustomer?.id || ''}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  const found = customers.find((c) => c.id === id);
                  setSelectedCustomer(found || null);
                }}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                {customers.map((c, idx) => (
                  <option key={`pos-cust-opt-${c.id}-${idx}`} value={c.id}>
                    {c.name} ({c.email}) - {c.phone}
                  </option>
                ))}
              </select>

              {selectedCustomer && (
                <div className="mt-2 text-[11px] text-zinc-400 bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800/80">
                  <p className="font-semibold text-zinc-200">{selectedCustomer.name}</p>
                  <p className="truncate">{selectedCustomer.address || 'Sem endereço informado'}</p>
                  <div className="mt-1 flex items-center justify-between text-zinc-500 text-[10px]">
                    <span>Pedidos anteriores: {selectedCustomer.total_orders || 0}</span>
                    <span className="text-amber-400 font-mono">
                      LTV: R$ {(Number(selectedCustomer.total_spent) || 0).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Order Mode Badge on Cart */}
            <div className="py-2.5 px-3 bg-zinc-950/80 rounded-xl border border-zinc-800/80 flex items-center justify-between text-xs">
              <span className="text-zinc-400 font-medium">Modo da Comanda:</span>
              {orderType === 'VIAGEM' ? (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold text-[11px]">
                  <PackageCheck className="w-3.5 h-3.5" />
                  <span>🥡 PARA VIAGEM</span>
                </span>
              ) : orderType === 'LOCAL' ? (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 font-bold text-[11px]">
                  <Utensils className="w-3.5 h-3.5" />
                  <span>No Local (Mesa)</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-bold text-[11px]">
                  <Bike className="w-3.5 h-3.5" />
                  <span>Delivery</span>
                </span>
              )}
            </div>

            {/* Cart Items List */}
            <div className="flex-1 py-4 overflow-y-auto max-h-72 divide-y divide-zinc-800/60">
              {cart.length === 0 ? (
                <div className="text-center py-10 text-zinc-500">
                  <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-30 text-zinc-400" />
                  <p className="text-xs">Sua comanda está vazia.</p>
                  <p className="text-[11px] text-zinc-600 mt-1">
                    Selecione burgers ou acompanhamentos ao lado.
                  </p>
                </div>
              ) : (
                cart.map((cartItem, idx) => (
                  <div key={`pos-cart-line-${cartItem.item.id}-${idx}`} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-100">{cartItem.item.name}</span>
                        <span className="font-mono font-bold text-zinc-200">
                          R$ {((Number(cartItem.item.price) || 0) * cartItem.quantity).toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                      {cartItem.custom_notes && (
                        <p className="text-[11px] text-amber-400/90 italic mt-0.5">
                          {cartItem.custom_notes}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex items-center gap-2 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                          <button
                            onClick={() => handleUpdateCartQty(idx, -1)}
                            className="text-zinc-400 hover:text-white cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-bold text-white text-[11px]">
                            {cartItem.quantity}
                          </span>
                          <button
                            onClick={() => handleUpdateCartQty(idx, 1)}
                            className="text-zinc-400 hover:text-white cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <button
                          onClick={() => handleRemoveCartItem(idx)}
                          className="text-zinc-500 hover:text-red-400 p-1 cursor-pointer transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Discount / Coupon */}
            <div className="pt-3 border-t border-zinc-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Cupom (ex: SQL10)"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 uppercase focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={handleApplyDiscount}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold cursor-pointer transition"
                >
                  Aplicar
                </button>
              </div>
              {appliedDiscount > 0 && (
                <p className="text-[11px] text-emerald-400 mt-1 font-medium flex items-center gap-1">
                  <Percent className="w-3 h-3" />
                  Desconto de {appliedDiscount * 100}% aplicado com sucesso!
                </p>
              )}
            </div>

            {/* Payment Method Selector */}
            <div className="mt-4 pt-3 border-t border-zinc-800">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                Método de Pagamento
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('PIX')}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-medium transition cursor-pointer ${
                    paymentMethod === 'PIX'
                      ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  <QrCode className="w-4 h-4 text-emerald-400" />
                  <span>PIX Instantâneo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('CARTAO_CREDITO')}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-medium transition cursor-pointer ${
                    paymentMethod === 'CARTAO_CREDITO'
                      ? 'bg-sky-500/15 border-sky-500/50 text-sky-300'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-sky-400" />
                  <span>Cartão Crédito</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('CARTAO_DEBITO')}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-medium transition cursor-pointer ${
                    paymentMethod === 'CARTAO_DEBITO'
                      ? 'bg-blue-500/15 border-blue-500/50 text-blue-300'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-blue-400" />
                  <span>Cartão Débito</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('DINHEIRO')}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-medium transition cursor-pointer ${
                    paymentMethod === 'DINHEIRO'
                      ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  <Banknote className="w-4 h-4 text-amber-400" />
                  <span>Dinheiro Vivo</span>
                </button>
              </div>
            </div>

            {/* Notes */}
            <div className="mt-3">
              <input
                type="text"
                placeholder="Observações da entrega ou comanda..."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Total & Checkout */}
            <div className="mt-4 pt-4 border-t border-zinc-800 space-y-3">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Subtotal:</span>
                  <span className="font-mono">R$ {(Number(cartSubtotal) || 0).toFixed(2).replace('.', ',')}</span>
                </div>
                {appliedDiscount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Desconto ({appliedDiscount * 100}%):</span>
                    <span className="font-mono">- R$ {(Number(discountAmount) || 0).toFixed(2).replace('.', ',')}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-extrabold text-white pt-1">
                  <span>Total do Pedido:</span>
                  <span className="text-amber-400 font-mono text-lg">
                    R$ {(Number(cartTotal) || 0).toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 font-bold text-sm shadow-lg shadow-orange-600/20 transition cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar Pedido (SQL Transaction)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Item Customization Modal */}
      <ItemCustomizationModal
        item={customizingItem}
        isTravelMode={orderType === 'VIAGEM'}
        onClose={() => setCustomizingItem(null)}
        onAddToCart={handleAddToCart}
      />

      {/* Customer Create Modal */}
      <CustomerModal
        customer={null}
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSave={handleCreateNewCustomer}
      />
    </div>
  );
};
