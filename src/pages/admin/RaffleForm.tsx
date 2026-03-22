import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Loader2, CheckCircle2, Upload, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import BackButton from '../../components/BackButton';

interface HiddenPrize {
  target_number: number;
  prize_value: number;
  prize_type: 'cash' | 'physical';
  description: string;
}

export default function RaffleForm() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  
  // BLOCO 1: Identidade Visual
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // BLOCO 2: Dados Básicos
  const [nome, setNome] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [totalNumbers, setTotalNumbers] = useState<number>(100);
  const [mainPrizeValue, setMainPrizeValue] = useState<number>(0);
  const [mainPrizeDescription, setMainPrizeDescription] = useState('');
  const [mainPrizeType, setMainPrizeType] = useState<'cash' | 'physical'>('cash');

  // BLOCO 3: Engenharia de Prémios Escondidos
  const [hiddenPrizes, setHiddenPrizes] = useState<HiddenPrize[]>([]);
  const [newPrizeNumber, setNewPrizeNumber] = useState<string>('');
  const [newPrizeValue, setNewPrizeValue] = useState<string>('');
  const [newPrizeType, setNewPrizeType] = useState<'cash' | 'physical'>('cash');
  const [newPrizeDescription, setNewPrizeDescription] = useState<string>('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addHiddenPrize = () => {
    const num = parseInt(newPrizeNumber);
    const val = parseFloat(newPrizeValue) || 0;

    if (isNaN(num)) {
      alert('Por favor, insira um número de bilhete válido.');
      return;
    }

    if (newPrizeType === 'cash' && (isNaN(parseFloat(newPrizeValue)) || parseFloat(newPrizeValue) <= 0)) {
      alert('Por favor, insira um valor em dinheiro válido.');
      return;
    }

    if (newPrizeType === 'physical' && !newPrizeDescription.trim()) {
      alert('Por favor, insira uma descrição para o prémio material.');
      return;
    }

    if (num > totalNumbers) {
      alert(`O número do bilhete (${num}) não pode ser maior que o total de números da rifa (${totalNumbers}).`);
      return;
    }

    if (hiddenPrizes.find(p => p.target_number === num)) {
      alert('Já existe um prémio para este número.');
      return;
    }

    setHiddenPrizes([...hiddenPrizes, { 
      target_number: num, 
      prize_value: val,
      prize_type: newPrizeType,
      description: newPrizeDescription || (newPrizeType === 'cash' ? 'Prémio em Dinheiro' : 'Prémio Físico')
    }]);
    setNewPrizeNumber('');
    setNewPrizeValue('');
    setNewPrizeDescription('');
  };

  const removeHiddenPrize = (index: number) => {
    setHiddenPrizes(hiddenPrizes.filter((_, i) => i !== index));
  };

  // BLOCO 4: Processo de Publicação
  const handlePublish = async () => {
    if (!nome || price <= 0 || !imageFile) {
      alert('Por favor, preencha o nome, o preço e selecione uma imagem para a rifa.');
      return;
    }

    setLoading(true);

    try {
      // 1. Upload da imagem para o Supabase Storage
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `rifas/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('fotos-rifas')
        .upload(filePath, imageFile);

      if (uploadError) throw uploadError;

      // Pegar a URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('fotos-rifas')
        .getPublicUrl(filePath);

          // 2. Inserir a rifa na tabela rifas
          const { data: raffle, error: raffleError } = await supabase
            .from('rifas')
            .insert([{
              nome,
              price,
              total_numbers: totalNumbers,
              main_prize_value: mainPrizeValue,
              main_prize_type: mainPrizeType,
              main_prize_description: mainPrizeDescription || (mainPrizeType === 'cash' ? `${mainPrizeValue.toLocaleString()} Kz` : nome),
              image_url: publicUrl,
              current_number: 1,
              sold_count: 0,
              status: 'active',
              draw_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            }])
            .select()
            .single();

      if (raffleError) throw raffleError;

          // 3. Inserir prémios escondidos na tabela premios_escondidos
          if (hiddenPrizes.length > 0) {
            const prizesToInsert = hiddenPrizes.map(p => ({
              raffle_id: raffle.id,
              target_number: p.target_number,
              prize_value: p.prize_value,
              prize_type: p.prize_type,
              description: p.description
            }));
    
            const { error: prizesError } = await supabase
              .from('premios_escondidos')
              .insert(prizesToInsert);
    
            if (prizesError) throw prizesError;
          }

      navigate('/admin');
    } catch (error: any) {
      console.error('Erro ao publicar rifa:', error);
      alert('Erro ao publicar rifa: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black p-4 md:p-12">
      <div className="mx-auto max-w-4xl">
        <BackButton />
        <div className="space-y-8 md:space-y-12">
          {/* BLOCO 1: Identidade Visual */}
          <section className="rounded-[1.5rem] md:rounded-[2.5rem] border border-white/5 bg-zinc-900/50 p-6 shadow-sm md:p-12">
            <div className="mb-6 md:mb-8 flex items-center gap-3">
              <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                <span className="text-sm md:text-base font-bold">1</span>
              </div>
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">Identidade Visual</h2>
            </div>

            <div 
              onClick={() => !imagePreview && fileInputRef.current?.click()}
              className={`relative flex aspect-video w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[1.5rem] md:rounded-[2rem] border-2 md:border-4 border-dashed transition-all ${
                imagePreview ? 'border-transparent' : 'border-white/5 bg-white/5 hover:border-emerald-500/50 hover:bg-emerald-500/5'
              }`}
            >
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage();
                    }}
                    className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white backdrop-blur-md transition-colors hover:bg-red-500"
                  >
                    <X className="h-5 w-5 md:h-6 md:w-6" />
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 md:gap-4 text-zinc-500">
                  <div className="rounded-full bg-white/5 p-4 md:p-6 shadow-sm">
                    <Upload className="h-8 w-8 md:h-10 md:w-10 text-emerald-500" />
                  </div>
                  <div className="text-center px-4">
                    <p className="text-base md:text-lg font-bold text-white">Foto do Prémio Principal</p>
                    <p className="text-xs md:text-sm font-medium">Clique para fazer upload (JPG, PNG)</p>
                  </div>
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/*"
                className="hidden"
              />
            </div>
          </section>

          {/* BLOCO 2: Dados Básicos */}
          <section className="rounded-[1.5rem] md:rounded-[2.5rem] border border-white/5 bg-zinc-900/50 p-6 shadow-sm md:p-12">
            <div className="mb-6 md:mb-8 flex items-center gap-3">
              <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                <span className="text-sm md:text-base font-bold">2</span>
              </div>
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">Dados Básicos</h2>
            </div>

            <div className="grid gap-6 md:grid-gap-8 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-[10px] md:text-sm font-bold uppercase tracking-wider text-zinc-500">Nome do Prémio</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: IPHONE 15"
                  className="w-full rounded-xl md:rounded-2xl border border-white/10 bg-zinc-950 px-4 md:px-6 py-3 md:py-4 text-base md:text-lg font-bold text-white placeholder:font-medium placeholder:text-zinc-500 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-[10px] md:text-sm font-bold uppercase tracking-wider text-zinc-500">Preço do Bilhete (Kz)</label>
                <input
                  type="number"
                  value={price || ''}
                  onChange={(e) => setPrice(parseFloat(e.target.value))}
                  placeholder="0.00 Kz"
                  className="w-full rounded-xl md:rounded-2xl border border-white/10 bg-zinc-950 px-4 md:px-6 py-3 md:py-4 text-base md:text-lg font-bold text-white placeholder:font-medium placeholder:text-zinc-500 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-[10px] md:text-sm font-bold uppercase tracking-wider text-zinc-500">Quantidade de Números</label>
                <input
                  type="number"
                  value={totalNumbers || ''}
                  onChange={(e) => setTotalNumbers(parseInt(e.target.value))}
                  placeholder="Ex: 10000"
                  min={1}
                  max={100000}
                  className="w-full rounded-xl md:rounded-2xl border border-white/10 bg-zinc-950 px-4 md:px-6 py-3 md:py-4 text-base md:text-lg font-bold text-white placeholder:font-medium placeholder:text-zinc-500 focus:ring-2 focus:ring-emerald-500"
                />
                <p className="mt-2 text-[8px] md:text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Máximo: 100.000 números</p>
              </div>

              <div>
                <label className="mb-2 block text-[10px] md:text-sm font-bold uppercase tracking-wider text-zinc-500">Tipo do Prémio Principal</label>
                <select
                  value={mainPrizeType}
                  onChange={(e) => setMainPrizeType(e.target.value as 'cash' | 'physical')}
                  className="w-full rounded-xl md:rounded-2xl border border-white/10 bg-zinc-950 px-4 md:px-6 py-3 md:py-4 text-base md:text-lg font-bold text-white focus:ring-2 focus:ring-emerald-500 appearance-none"
                >
                  <option value="cash" className="bg-zinc-900 text-white">Dinheiro</option>
                  <option value="physical" className="bg-zinc-900 text-white">Material</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-[10px] md:text-sm font-bold uppercase tracking-wider text-zinc-500">
                  {mainPrizeType === 'cash' ? 'Valor do Prémio Principal (Kz)' : 'Descrição do Prémio Principal'}
                </label>
                {mainPrizeType === 'cash' ? (
                  <input
                    type="number"
                    value={mainPrizeValue || ''}
                    onChange={(e) => setMainPrizeValue(parseFloat(e.target.value))}
                    placeholder="0.00 Kz"
                    className="w-full rounded-xl md:rounded-2xl border border-white/10 bg-zinc-950 px-4 md:px-6 py-3 md:py-4 text-base md:text-lg font-bold text-white placeholder:font-medium placeholder:text-zinc-500 focus:ring-2 focus:ring-emerald-500"
                  />
                ) : (
                  <input
                    type="text"
                    value={mainPrizeDescription}
                    onChange={(e) => setMainPrizeDescription(e.target.value)}
                    placeholder="Ex: iPhone 15 Pro Max"
                    className="w-full rounded-xl md:rounded-2xl border border-white/10 bg-zinc-950 px-4 md:px-6 py-3 md:py-4 text-base md:text-lg font-bold text-white placeholder:font-medium placeholder:text-zinc-500 focus:ring-2 focus:ring-emerald-500"
                  />
                )}
              </div>
            </div>
          </section>

          {/* BLOCO 3: Engenharia de Prémios Escondidos */}
          <section className="rounded-[1.5rem] md:rounded-[2.5rem] border border-white/5 bg-zinc-900/50 p-6 shadow-sm md:p-12">
            <div className="mb-6 md:mb-8 flex items-center gap-3">
              <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                <span className="text-sm md:text-base font-bold">3</span>
              </div>
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">Engenharia de Prémios Escondidos</h2>
            </div>

            <div className="mb-8 rounded-2xl md:rounded-3xl bg-white/5 p-4 md:p-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Número Alvo</label>
                  <input
                    type="number"
                    value={newPrizeNumber}
                    onChange={(e) => setNewPrizeNumber(e.target.value)}
                    placeholder="Ex: 450"
                    className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm font-bold text-white placeholder:font-medium placeholder:text-zinc-500 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Tipo de Prémio</label>
                  <select
                    value={newPrizeType}
                    onChange={(e) => setNewPrizeType(e.target.value as 'cash' | 'physical')}
                    className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm font-bold text-white focus:ring-2 focus:ring-emerald-500 appearance-none"
                  >
                    <option value="cash" className="bg-zinc-900 text-white">Dinheiro</option>
                    <option value="physical" className="bg-zinc-900 text-white">Material</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Valor (Kz) / Descrição</label>
                  {newPrizeType === 'cash' ? (
                    <input
                      type="number"
                      value={newPrizeValue}
                      onChange={(e) => setNewPrizeValue(e.target.value)}
                      placeholder="Ex: 5000"
                      className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm font-bold text-white placeholder:font-medium placeholder:text-zinc-500 focus:ring-2 focus:ring-emerald-500"
                    />
                  ) : (
                    <input
                      type="text"
                      value={newPrizeDescription}
                      onChange={(e) => setNewPrizeDescription(e.target.value)}
                      placeholder="Ex: iPhone 15"
                      className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm font-bold text-white placeholder:font-medium placeholder:text-zinc-500 focus:ring-2 focus:ring-emerald-500"
                    />
                  )}
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={addHiddenPrize}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-700"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {hiddenPrizes.length === 0 ? (
                <p className="text-center text-sm italic text-zinc-500">Nenhum prémio escondido adicionado ainda.</p>
              ) : (
                hiddenPrizes.map((prize, index) => (
                  <div key={index} className="flex items-center justify-between rounded-xl md:rounded-2xl border border-white/5 bg-white/5 p-4 shadow-sm">
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full bg-emerald-500/10 text-xs md:text-sm font-black text-emerald-500">
                        #{prize.target_number}
                      </div>
                      <div>
                        <p className="text-xs md:text-sm font-bold text-white">
                          {prize.prize_type === 'cash' ? `${prize.prize_value.toLocaleString()} Kz` : prize.description}
                        </p>
                        <p className="text-[10px] text-zinc-500 uppercase font-medium tracking-wider">
                          {prize.prize_type === 'cash' ? 'Dinheiro' : 'Material'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeHiddenPrize(index)}
                      className="rounded-full p-2 text-zinc-600 transition-colors hover:bg-red-500/10 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4 md:h-5 md:w-5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* BLOCO 4: Processo de Publicação */}
          <div className="flex flex-col items-center gap-4 md:gap-6">
            <button
              onClick={handlePublish}
              disabled={loading}
              className="group relative flex w-full max-w-md items-center justify-center gap-3 overflow-hidden rounded-full bg-emerald-600 py-4 md:py-6 text-lg md:text-xl font-black uppercase tracking-widest text-white transition-all hover:bg-emerald-500 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 md:h-6 md:w-6 animate-spin" />
                  <span className="text-sm md:text-base">Publicando Rifa e Prémios...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 md:h-6 md:w-6" />
                  <span className="text-sm md:text-base">Publicar Rifa</span>
                </>
              )}
            </button>
            <p className="text-[10px] md:text-sm font-medium text-zinc-500 text-center px-4">
              Ao publicar, a imagem será carregada e a rifa ficará disponível imediatamente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
