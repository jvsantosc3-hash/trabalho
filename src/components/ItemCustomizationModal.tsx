import React, { useState } from 'react';
import { X, Plus, Minus, ShoppingBag, Check, PackageCheck } from 'lucide-react';
import { MenuItem } from '../types';

interface ItemCustomizationModalProps {
  item: MenuItem | null;
  isTravelMode?: boolean;
  onClose: () => void;
  onAddToCart: (item: MenuItem, quantity: number, notes: string) => void;
}

export const ItemCustomizationModal: React.FC<ItemCustomizationModalProps> = ({
  item,
  isTravelMode = false,
  onClose,
  onAddToCart,
}) => {
  if (!item) return null;

  const [quantity, setQuantity] = useState(1);
  const isBurger = item.category.toLowerCase().includes('burger');
  const [cookingPoint, setCookingPoint] = useState<string>('Ao Ponto (Suculento e rosado)');
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [specialNotes, setSpecialNotes] = useState('');

  // Modo Viagem options within modal
  const [travelSauceSeparate, setTravelSauceSeparate] = useState(isTravelMode);
  const [travelThermalBag, setTravelThermalBag] = useState(isTravelMode);
  const [travelCrispyToast, setTravelCrispyToast] = useState(false);

  const burgerCookingOptions = [
    'Ao Ponto (Suculento e rosado)',
    'Ao Ponto para Bem',
    'Bem Passado (Sem ponto rosado)',
    'Mal Passado (Selado por fora)',
  ];

  const commonAddons = isBurger
    ? [
        { name: 'Bacon Artesanal Extra', price: 6.0 },
        { name: 'Queijo Cheddar Extra', price: 5.0 },
        { name: 'Cebola Caramelizada', price: 4.0 },
        { name: 'Molho Especial Extra', price: 3.5 },
      ]
    : [];

  const toggleAddon = (addonName: string) => {
    setSelectedAddons((prev) =>
      prev.includes(addonName) ? prev.filter((a) => a !== addonName) : [...prev, addonName]
    );
  };

  const handleConfirm = () => {
    const notesParts: string[] = [];
    if (isBurger && cookingPoint) {
      notesParts.push(`Ponto: ${cookingPoint}`);
    }
    if (selectedAddons.length > 0) {
      notesParts.push(`Extras: ${selectedAddons.join(', ')}`);
    }

    const travelTags: string[] = [];
    if (travelSauceSeparate) travelTags.push('Molho à parte');
    if (travelThermalBag) travelTags.push('Embalagem térmica');
    if (travelCrispyToast) travelTags.push('Pão tostado extra p/ viagem');
    if (travelTags.length > 0) {
      notesParts.push(`Viagem: ${travelTags.join(', ')}`);
    }

    if (specialNotes.trim()) {
      notesParts.push(`Obs: ${specialNotes.trim()}`);
    }

    onAddToCart(item, quantity, notesParts.join(' | '));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with image */}
        <div className="relative h-48 bg-zinc-950 overflow-hidden shrink-0">
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover object-center brightness-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-black/60" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-full bg-black/60 hover:bg-black/90 text-zinc-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="absolute bottom-3 left-4 right-4">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
              {item.category}
            </span>
            <h3 className="text-xl font-bold text-white mt-1">{item.name}</h3>
            <p className="text-amber-400 font-bold text-lg">
              R$ {(Number(item.price) || 0).toFixed(2).replace('.', ',')}
            </p>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-zinc-200 text-sm">
          <p className="text-zinc-400 text-xs leading-relaxed">{item.description}</p>

          {isBurger && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                Ponto da Carne
              </label>
              <div className="space-y-1.5">
                {burgerCookingOptions.map((opt, idx) => (
                  <button
                    key={`cook-opt-${opt}-${idx}`}
                    type="button"
                    onClick={() => setCookingPoint(opt)}
                    className={`w-full text-left px-3 py-2 rounded-lg border text-xs font-medium flex items-center justify-between transition cursor-pointer ${
                      cookingPoint === opt
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-zinc-800/50 border-zinc-700/60 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    <span>{opt}</span>
                    {cookingPoint === opt && <Check className="w-4 h-4 text-amber-400" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {commonAddons.length > 0 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                Personalizações & Extras
              </label>
              <div className="grid grid-cols-2 gap-2">
                {commonAddons.map((add, idx) => {
                  const selected = selectedAddons.includes(add.name);
                  return (
                    <button
                      key={`addon-opt-${add.name}-${idx}`}
                      type="button"
                      onClick={() => toggleAddon(add.name)}
                      className={`text-left p-2.5 rounded-lg border text-xs transition cursor-pointer flex flex-col justify-between ${
                        selected
                          ? 'bg-orange-500/20 border-orange-500/60 text-orange-200'
                          : 'bg-zinc-800/40 border-zinc-700/50 text-zinc-400 hover:bg-zinc-800'
                      }`}
                    >
                      <span className="font-medium text-zinc-200">{add.name}</span>
                      <span className="text-[11px] text-amber-400 mt-1">
                        + R$ {add.price.toFixed(2).replace('.', ',')}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Modo Viagem Packaging Options */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-center gap-2 mb-2">
              <PackageCheck className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Preparo p/ Modo Viagem (Takeaway)
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mb-2.5">
              Personalize o acondicionamento térmico para chegar crocante e na temperatura ideal.
            </p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs text-zinc-200 cursor-pointer bg-zinc-950/70 p-2 rounded-lg border border-zinc-800/80 hover:border-amber-500/40">
                <input
                  type="checkbox"
                  checked={travelSauceSeparate}
                  onChange={(e) => setTravelSauceSeparate(e.target.checked)}
                  className="rounded accent-amber-500 cursor-pointer"
                />
                <span className="flex-1">
                  <strong className="text-white">Molho em potinho separado</strong>
                  <span className="block text-[10px] text-zinc-400">Evita que o pão e os ingredientes fiquem úmidos no trajeto</span>
                </span>
              </label>

              <label className="flex items-center gap-2 text-xs text-zinc-200 cursor-pointer bg-zinc-950/70 p-2 rounded-lg border border-zinc-800/80 hover:border-amber-500/40">
                <input
                  type="checkbox"
                  checked={travelThermalBag}
                  onChange={(e) => setTravelThermalBag(e.target.checked)}
                  className="rounded accent-amber-500 cursor-pointer"
                />
                <span className="flex-1">
                  <strong className="text-white">Embalagem térmica selada</strong>
                  <span className="block text-[10px] text-zinc-400">Mantém o calor por até 45 minutos com lacre de segurança</span>
                </span>
              </label>

              <label className="flex items-center gap-2 text-xs text-zinc-200 cursor-pointer bg-zinc-950/70 p-2 rounded-lg border border-zinc-800/80 hover:border-amber-500/40">
                <input
                  type="checkbox"
                  checked={travelCrispyToast}
                  onChange={(e) => setTravelCrispyToast(e.target.checked)}
                  className="rounded accent-amber-500 cursor-pointer"
                />
                <span className="flex-1">
                  <strong className="text-white">Selagem extra do pão</strong>
                  <span className="block text-[10px] text-zinc-400">Crostinha de manteiga reforçada na chapa para viagem</span>
                </span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Observações Especiais
            </label>
            <textarea
              rows={2}
              value={specialNotes}
              onChange={(e) => setSpecialNotes(e.target.value)}
              placeholder="Ex: sem cebola, molho à parte, guardanapo extra..."
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-amber-500/80 resize-none"
            />
          </div>
        </div>

        {/* Footer with quantity and add to cart */}
        <div className="p-4 bg-zinc-950/80 border-t border-zinc-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 bg-zinc-800 px-3 py-1.5 rounded-lg border border-zinc-700">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="font-bold text-sm text-white w-4 text-center">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => Math.min(item.stock, q + 1))}
              disabled={quantity >= item.stock}
              className="text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleConfirm}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-zinc-950 font-bold text-sm shadow-lg shadow-orange-600/20 transition cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>
              Adicionar • R$ {((Number(item.price) || 0) * quantity).toFixed(2).replace('.', ',')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
