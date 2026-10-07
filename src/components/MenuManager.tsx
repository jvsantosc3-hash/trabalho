import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Minus, 
  Edit3, 
  Trash2, 
  ToggleLeft, 
  ToggleRight, 
  AlertTriangle, 
  Save, 
  X,
  Sparkles,
  Search
} from 'lucide-react';
import { MenuItem } from '../types';
import { sqlDb } from '../services/sqlDatabase';

export const MenuManager: React.FC = () => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('35.00');
  const [category, setCategory] = useState('Burgers Artesanais');
  const [imageUrl, setImageUrl] = useState('');
  const [stock, setStock] = useState('40');

  const categories = [
    'Burgers Artesanais',
    'Burgers Especiais',
    'Acompanhamentos',
    'Bebidas',
    'Sobremesas',
  ];

  const loadItems = () => {
    setItems(sqlDb.getAllMenuItemsAdmin());
  };

  useEffect(() => {
    loadItems();
    const unsub = sqlDb.subscribe(() => {
      loadItems();
    });
    return unsub;
  }, []);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setName('');
    setDescription('');
    setPrice('35.00');
    setCategory('Burgers Artesanais');
    setImageUrl('https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80');
    setStock('40');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: MenuItem) => {
    setEditingItem(item);
    setName(item.name);
    setDescription(item.description);
    setPrice(item.price.toFixed(2));
    setCategory(item.category);
    setImageUrl(item.image_url);
    setStock(String(item.stock));
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Preencha o nome do item.');
    const numPrice = parseFloat(price.replace(',', '.')) || 0;
    const numStock = parseInt(stock) || 0;

    try {
      if (editingItem) {
        sqlDb.updateMenuItem(
          editingItem.id,
          name.trim(),
          description.trim(),
          numPrice,
          category,
          imageUrl.trim() || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
          editingItem.is_available,
          numStock
        );
      } else {
        sqlDb.createMenuItem(
          name.trim(),
          description.trim(),
          numPrice,
          category,
          imageUrl.trim() || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
          numStock
        );
      }
      setIsModalOpen(false);
    } catch (err: any) {
      alert('Erro ao salvar item no SQL: ' + err.message);
    }
  };

  const handleToggleAvailable = (item: MenuItem) => {
    sqlDb.toggleItemAvailability(item.id, item.is_available);
  };

  const handleAdjustStock = (item: MenuItem, delta: number) => {
    const nextStock = Math.max(0, item.stock + delta);
    sqlDb.updateMenuItem(
      item.id,
      item.name,
      item.description,
      item.price,
      item.category,
      item.image_url,
      item.is_available,
      nextStock
    );
  };

  const handleDelete = (item: MenuItem) => {
    if (window.confirm(`Deseja excluir "${item.name}" do cardápio SQL?`)) {
      try {
        sqlDb.deleteMenuItem(item.id);
      } catch (e: any) {
        alert('Erro ao excluir item: ' + e.message);
      }
    }
  };

  const filteredItems = items.filter((it) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      it.name.toLowerCase().includes(q) ||
      it.category.toLowerCase().includes(q) ||
      it.description.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-6 h-6 text-amber-500" />
            <h2 className="text-xl font-extrabold text-white">
              Gestão de Itens & Estoque (Tabela: menu_items)
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Controle de preços, disponibilidade no cardápio e controle de estoque
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Adicionar Item ao Cardápio</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          type="text"
          placeholder="Filtrar por nome, categoria ou ingredientes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
        />
      </div>

      {/* Items Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/70 border-b border-zinc-800 text-zinc-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Item / Foto</th>
                <th className="py-3.5 px-4">Categoria</th>
                <th className="py-3.5 px-4">Preço (R$)</th>
                <th className="py-3.5 px-4">Estoque Atual</th>
                <th className="py-3.5 px-4">Cardápio</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-zinc-200">
              {filteredItems.map((item, idx) => (
                <tr key={`admin-item-${item.id}-${idx}`} className="hover:bg-zinc-800/40 transition">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-12 h-12 rounded-lg object-cover bg-zinc-950 border border-zinc-800"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-white text-sm">{item.name}</p>
                          <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-1.5 py-0.2 rounded font-semibold">
                            🥡 Viagem OK
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 max-w-sm line-clamp-1">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-800 border border-zinc-700 text-zinc-300">
                      {item.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-amber-400 text-sm">
                    R$ {(Number(item.price) || 0).toFixed(2).replace('.', ',')}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1">
                        <button
                          onClick={() => handleAdjustStock(item, -1)}
                          className="text-zinc-400 hover:text-white p-0.5 cursor-pointer"
                          title="Diminuir estoque"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className={`font-mono font-bold mx-2 text-xs ${
                          item.stock <= 10 ? 'text-red-400' : 'text-zinc-200'
                        }`}>
                          {item.stock} un
                        </span>
                        <button
                          onClick={() => handleAdjustStock(item, 1)}
                          className="text-zinc-400 hover:text-white p-0.5 cursor-pointer"
                          title="Aumentar estoque"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      {item.stock <= 10 && (
                        <span title="Estoque Baixo" className="text-red-400">
                          <AlertTriangle className="w-4 h-4" />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleToggleAvailable(item)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition cursor-pointer ${
                        item.is_available === 1
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-500'
                      }`}
                    >
                      {item.is_available === 1 ? 'Disponível' : 'Pausado'}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                        title="Editar item"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition cursor-pointer"
                        title="Remover item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add/Edit Item */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div 
            className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/70">
              <h3 className="text-base font-bold text-white">
                {editingItem ? 'Editar Item do Cardápio' : 'Novo Item no Cardápio'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Nome do Item *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Double Cheddar Melt"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Categoria *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 text-xs focus:outline-none focus:border-amber-500"
                  >
                    {categories.map((c, idx) => (
                      <option key={`cat-opt-${c}-${idx}`} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Preço (R$) *</label>
                  <input
                    type="text"
                    required
                    placeholder="39.90"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Descrição & Ingredientes</label>
                <textarea
                  rows={2}
                  placeholder="Blend 180g, cheddar, cebola caramelizada..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 text-xs focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Estoque Inicial (un)</label>
                  <input
                    type="number"
                    min="0"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">URL da Imagem</label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 text-xs focus:outline-none focus:border-amber-500 truncate"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-zinc-300 hover:bg-zinc-800 font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold shadow-md transition cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar no Banco SQL</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
