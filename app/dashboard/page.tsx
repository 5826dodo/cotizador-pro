'use client';
import imageCompression from 'browser-image-compression';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  Loader2,
  Package,
  Camera,
  X,
  Trash2,
  CheckCircle2,
} from 'lucide-react';

// ── Tipos ──────────────────────────────────────────────────────────────────
interface Categoria {
  id: string;
  nombre: string;
  empresa_id: string;
}

interface Producto {
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  stock: number;
  unidad_medida: string;
  empresa_id: string;
  imagen_url?: string | null;
  categoria_id?: string | null;
  activo: boolean;
  created_at: string;
  categorias?: { nombre: string } | null;
}

// ── Constantes ─────────────────────────────────────────────────────────────
const UNIDADES_MEDIDA = [
  'UNIDADES',
  'LITROS',
  'KILOS',
  'METROS',
  'PAQUETES',
] as const;
const ITEMS_POR_PAGINA = 12;

// ── Componente Modal de Recetas ─────────────────────────────────────────────
function ModalReceta({
  producto,
  productos,
  onClose,
  empresaId,
  supabase,
}: any) {
  const [busqueda, setBusqueda] = useState('');
  const [ingredientes, setIngredientes] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const cargarReceta = async () => {
      if (!producto?.id) return;
      try {
        const { data, error } = await supabase
          .from('recetas')
          .select('*, p_insumo:productos!insumo_id(*)')
          .eq('producto_final_id', producto.id);

        if (error) throw error;
        if (data) {
          setIngredientes(
            data.map((r: any) => ({
              id: r.insumo_id,
              nombre: r.p_insumo?.nombre || 'Insumo no encontrado',
              costo: Number(r.p_insumo?.costo_compra) || 0,
              cantidad: Number(r.cantidad_requerida) || 0,
              unidad: r.p_insumo?.unidad_medida || 'unid',
            })),
          );
        }
      } catch (err) {
        console.error('Error cargando receta:', err);
      }
    };
    cargarReceta();
  }, [producto?.id, supabase]);

  const insumosFiltrados = (productos || []).filter(
    (p: any) =>
      p.id !== producto?.id &&
      p.nombre?.toLowerCase().includes(busqueda.toLowerCase()),
  );

  const costoTotal = ingredientes.reduce(
    (acc, i) => acc + Number(i.costo || 0) * Number(i.cantidad || 0),
    0,
  );
  const precioVenta = Number(producto?.precio || 0);
  const margen =
    precioVenta > 0 ? ((precioVenta - costoTotal) / precioVenta) * 100 : 0;

  const guardarReceta = async () => {
    if (!producto?.id) return;
    setCargando(true);
    try {
      await supabase
        .from('recetas')
        .delete()
        .eq('producto_final_id', producto.id);
      const nuevasFilas = ingredientes.map((i) => ({
        producto_final_id: producto.id,
        insumo_id: i.id,
        cantidad_requerida: i.cantidad,
        empresa_id: empresaId,
      }));
      if (nuevasFilas.length > 0) {
        const { error } = await supabase.from('recetas').insert(nuevasFilas);
        if (error) throw error;
      }
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error al guardar');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[99999] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl relative flex flex-col overflow-hidden border border-white/20">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="font-black text-xl text-slate-800 uppercase tracking-tight">
              Receta: {producto?.nombre}
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Calculadora de rentabilidad
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-8 space-y-6 max-h-[50vh] overflow-y-auto bg-white">
          <input
            type="text"
            placeholder="BUSCAR INGREDIENTE..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-slate-100 border-2 border-transparent p-4 rounded-2xl outline-none focus:ring-2 ring-orange-500 font-bold text-sm text-slate-600"
          />
          {busqueda && (
            <div className="bg-white border shadow-2xl rounded-2xl overflow-hidden mt-[-15px] z-10 relative">
              {insumosFiltrados.slice(0, 5).map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => {
                    if (!ingredientes.find((i) => i.id === p.id)) {
                      setIngredientes([
                        ...ingredientes,
                        {
                          id: p.id,
                          nombre: p.nombre,
                          costo: p.costo_compra,
                          cantidad: 0,
                          unidad: p.unidad_medida,
                        },
                      ]);
                    }
                    setBusqueda('');
                  }}
                  className="w-full text-left p-4 hover:bg-orange-50 border-b last:border-0 font-bold text-xs uppercase flex justify-between text-slate-600"
                >
                  {p.nombre}{' '}
                  <span className="text-slate-400 font-black">
                    STOCK: {p.stock}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="space-y-3">
            {ingredientes.map((ing) => (
              <div
                key={ing.id}
                className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100"
              >
                <div className="flex-1">
                  <p className="font-black text-xs text-slate-700 uppercase">
                    {ing.nombre}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">
                    Costo: ${Number(ing.costo || 0).toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={ing.cantidad}
                    onChange={(e) =>
                      setIngredientes(
                        ingredientes.map((i) =>
                          i.id === ing.id
                            ? {
                                ...i,
                                cantidad: parseFloat(e.target.value) || 0,
                              }
                            : i,
                        ),
                      )
                    }
                    className="w-20 bg-white border-2 border-slate-200 p-2 rounded-xl text-center font-black text-sm outline-none focus:border-orange-500 text-slate-700"
                  />
                  <span className="text-[10px] font-black text-slate-400 uppercase w-8">
                    {ing.unidad || 'unid'}
                  </span>
                </div>
                <button
                  onClick={() =>
                    setIngredientes(ingredientes.filter((i) => i.id !== ing.id))
                  }
                  className="text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="p-8 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex gap-8">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Costo Total
              </p>
              <p className="text-xl font-black text-emerald-400">
                ${costoTotal.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Margen Real
              </p>
              <p
                className={`text-xl font-black ${margen < 30 ? 'text-red-400' : 'text-emerald-400'}`}
              >
                {margen.toFixed(1)}%
              </p>
            </div>
          </div>
          <button
            onClick={guardarReceta}
            disabled={cargando}
            className="bg-orange-500 hover:bg-orange-600 px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all flex items-center gap-2"
          >
            {cargando ? (
              <Loader2 className="animate-spin" />
            ) : (
              <CheckCircle2 size={18} />
            )}{' '}
            GUARDAR
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente Principal ───────────────────────────────────────────────────
export default function InventarioPage() {
  const supabase = createClient();

  // — Sesión / empresa
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [nombreEmpresa, setNombreEmpresa] = useState('');
  const [cargando, setCargando] = useState(true);

  // — Formulario
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('');
  const [costoCompra, setCostoCompra] = useState(''); // Nuevo campo
  const [unidad, setUnidad] = useState<string>('UNIDADES');
  const [categoriaId, setCategoriaId] = useState('');
  const [editando, setEditando] = useState<Producto | null>(null);

  // — Estados Receta
  const [productoParaReceta, setProductoParaReceta] = useState<any>(null);

  // — Imagen
  const [imagenFile, setImagenFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [subiendoImg, setSubiendoImg] = useState(false);
  const [comprimiendo, setComprimiendo] = useState(false);
  const [imagenError, setImagenError] = useState<string | null>(null);
  const [imagenInfo, setImagenInfo] = useState<{
    original: string;
    comprimido: string;
  } | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  // — Catálogo
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [mensaje, setMensaje] = useState('');

  // — Paginación
  const paginaRef = useRef(0);
  const [tieneMas, setTieneMas] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const mostrarMensaje = (texto: string) => {
    setMensaje(texto);
    setTimeout(() => setMensaje(''), 3000);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const asignarPreview = (url: string | null) => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    if (url && url.startsWith('blob:')) {
      objectUrlRef.current = url;
    }
    setPreviewUrl(url);
  };

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const obtenerProductos = useCallback(
    async (idEmpresa: string, reiniciar = false) => {
      const paginaActual = reiniciar ? 0 : paginaRef.current;
      if (!reiniciar) setCargandoMas(true);

      const desde = paginaActual * ITEMS_POR_PAGINA;
      const hasta = desde + ITEMS_POR_PAGINA - 1;

      const { data, error } = await supabase
        .from('productos')
        .select(`*, categorias ( nombre )`)
        .eq('empresa_id', idEmpresa)
        .order('activo', { ascending: false })
        .order('created_at', { ascending: false })
        .range(desde, hasta);

      if (error) {
        console.error(error);
      } else {
        const nuevos = (data as Producto[]) ?? [];
        if (reiniciar) {
          setProductos(nuevos);
          paginaRef.current = 1;
        } else {
          setProductos((prev) => [...prev, ...nuevos]);
          paginaRef.current = paginaActual + 1;
        }
        setTieneMas(nuevos.length === ITEMS_POR_PAGINA);
      }
      setCargandoMas(false);
    },
    [supabase],
  );

  useEffect(() => {
    const inicializarDatos = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: perfil } = await supabase
          .from('perfiles')
          .select('empresa_id, empresas(nombre)')
          .eq('id', user.id)
          .single();

        if (perfil) {
          setEmpresaId(perfil.empresa_id);
          setNombreEmpresa((perfil.empresas as any)?.nombre || 'Mi Empresa');
          await obtenerProductos(perfil.empresa_id, true);

          const { data: cats } = await supabase
            .from('categorias')
            .select('*')
            .eq('empresa_id', perfil.empresa_id)
            .order('nombre');
          setCategorias((cats as Categoria[]) || []);
        }
      }
      setCargando(false);
    };
    inicializarDatos();
  }, [obtenerProductos, supabase]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagenError(null);
    setImagenInfo(null);
    if (file.size > 15 * 1024 * 1024) {
      setImagenError(`Supera el límite de 15 MB.`);
      return;
    }
    setComprimiendo(true);
    try {
      const archivoOptimizado = await imageCompression(file, {
        maxSizeMB: 0.7,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
        fileType: 'image/webp',
      });
      const archivoFinal = new File(
        [archivoOptimizado],
        `${file.name.split('.')[0]}.webp`,
        { type: 'image/webp' },
      );
      setImagenFile(archivoFinal);
      setImagenInfo({
        original: formatBytes(file.size),
        comprimido: formatBytes(archivoFinal.size),
      });
      asignarPreview(URL.createObjectURL(archivoFinal));
    } catch (error) {
      console.error(error);
      setImagenError('Error al procesar.');
      setImagenFile(file);
      asignarPreview(URL.createObjectURL(file));
    } finally {
      setComprimiendo(false);
    }
  };

  const subirImagen = async (file: File): Promise<string> => {
    const fileName = `${empresaId}/${crypto.randomUUID()}.webp`;
    const { error: uploadError } = await supabase.storage
      .from('productos')
      .upload(fileName, file, { contentType: 'image/webp', upsert: true });
    if (uploadError) throw uploadError;
    const {
      data: { publicUrl },
    } = supabase.storage.from('productos').getPublicUrl(fileName);
    return publicUrl;
  };

  const guardarProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) return alert('Error de sesión');
    setSubiendoImg(true);

    try {
      let finalImageUrl: string | null = editando?.imagen_url ?? null;
      if (imagenFile) finalImageUrl = await subirImagen(imagenFile);

      const payload = {
        nombre,
        descripcion,
        precio: parseFloat(precio),
        stock: parseFloat(stock),
        costo_compra: parseFloat(costoCompra) || 0, // Nuevo campo
        unidad_medida: unidad,
        empresa_id: empresaId,
        imagen_url: finalImageUrl,
        categoria_id: categoriaId === '' ? null : categoriaId,
      };

      let error;
      if (editando) {
        const { error: err } = await supabase
          .from('productos')
          .update(payload)
          .eq('id', editando.id);
        error = err;
      } else {
        const { error: err } = await supabase
          .from('productos')
          .insert([payload]);
        error = err;
      }

      if (!error) {
        mostrarMensaje(editando ? '✅ Actualizado' : '🚀 Registrado');
        cancelarEdicion();
        obtenerProductos(empresaId, true);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSubiendoImg(false);
    }
  };

  const eliminarProducto = async (id: string) => {
    if (!confirm('¿Archivar producto?')) return;
    try {
      await supabase.from('productos').update({ activo: false }).eq('id', id);
      if (empresaId) obtenerProductos(empresaId, true);
      mostrarMensaje('📦 Archivado');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const reactivarProducto = async (id: string) => {
    try {
      await supabase.from('productos').update({ activo: true }).eq('id', id);
      if (empresaId) obtenerProductos(empresaId, true);
      mostrarMensaje('✅ Reactivado');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const prepararEdicion = (prod: any) => {
    setEditando(prod);
    setNombre(prod.nombre);
    setDescripcion(prod.descripcion || '');
    setPrecio(prod.precio.toString());
    setStock(prod.stock.toString());
    setCostoCompra((prod.costo_compra || 0).toString()); // Nuevo campo
    setUnidad(prod.unidad_medida || 'UNIDADES');
    setCategoriaId(prod.categoria_id || '');
    setPreviewUrl(prod.imagen_url ?? null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicion = () => {
    setEditando(null);
    setNombre('');
    setDescripcion('');
    setPrecio('');
    setStock('');
    setCostoCompra('');
    setUnidad('UNIDADES');
    setCategoriaId('');
    setImagenFile(null);
    setImagenError(null);
    setImagenInfo(null);
    asignarPreview(null);
  };

  if (cargando)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-orange-500" />
      </div>
    );

  return (
    <main className="min-h-screen bg-slate-100 pb-20">
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm flex justify-between items-center">
          <div>
            <span className="text-[10px] font-black text-orange-500 uppercase">
              Sesión: {nombreEmpresa}
            </span>
            <h1 className="text-2xl font-black uppercase tracking-tighter">
              Panel de <span className="text-orange-500">Inventario</span>
            </h1>
          </div>
          {mensaje && (
            <div className="bg-emerald-500 text-white px-6 py-2 rounded-full text-xs font-black">
              {mensaje}
            </div>
          )}
        </div>

        <section className="bg-white p-6 md:p-8 rounded-[3rem] shadow-xl border border-white">
          <form
            onSubmit={guardarProducto}
            className="grid grid-cols-1 md:grid-cols-4 gap-6"
          >
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-[2rem] p-4 relative overflow-hidden">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  className="w-24 h-24 object-cover rounded-2xl shadow-md"
                  alt="Preview"
                />
              ) : (
                <Camera size={32} className="text-slate-200" />
              )}
              <label className="cursor-pointer text-[10px] font-black uppercase text-slate-400 mt-2">
                {comprimiendo ? '...' : 'Subir Foto'}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={comprimiendo}
                />
              </label>
            </div>

            <div className="md:col-span-2 space-y-4">
              <input
                placeholder="Nombre del Producto"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                className="w-full bg-slate-50 p-4 rounded-2xl outline-none focus:ring-2 ring-orange-500 font-bold"
              />
              <textarea
                placeholder="Descripción"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="w-full bg-slate-50 p-4 rounded-2xl outline-none focus:ring-2 ring-orange-500 font-bold resize-none"
                rows={2}
              />

              <div className="grid grid-cols-2 gap-4">
                <select
                  value={categoriaId}
                  onChange={(e) => setCategoriaId(e.target.value)}
                  className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold text-slate-700"
                >
                  <option value="">SIN CAT.</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nombre}
                    </option>
                  ))}
                </select>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-black text-slate-400 ml-2">
                    Precio Venta ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                    required
                    className="w-full bg-slate-50 p-4 rounded-2xl outline-none focus:ring-2 ring-orange-500 font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-black text-slate-400 ml-2">
                    Stock
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    required
                    className="w-full bg-slate-50 p-4 rounded-2xl outline-none focus:ring-2 ring-orange-500 font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-black text-slate-400 ml-2">
                    Costo ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={costoCompra}
                    onChange={(e) => setCostoCompra(e.target.value)}
                    className="w-full bg-slate-50 p-4 rounded-2xl outline-none focus:ring-2 ring-orange-500 font-bold"
                  />
                </div>
              </div>

              <select
                value={unidad}
                onChange={(e) => setUnidad(e.target.value)}
                className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold text-slate-700"
              >
                {UNIDADES_MEDIDA.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                disabled={subiendoImg || comprimiendo}
                className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-orange-200"
              >
                {subiendoImg
                  ? 'Guardando...'
                  : editando
                    ? 'Actualizar'
                    : 'Registrar'}
              </button>
              {editando && (
                <button
                  type="button"
                  onClick={cancelarEdicion}
                  className="w-full py-3 bg-red-50 text-red-500 rounded-2xl font-black uppercase text-[10px]"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {productos.map((prod) => {
            const esActivo = prod.activo !== false;
            return (
              <div
                key={prod.id}
                className={`bg-white p-4 rounded-[2.5rem] shadow-sm border-2 ${!esActivo ? 'opacity-50 grayscale' : 'border-white'}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-slate-100 rounded-2xl overflow-hidden flex-shrink-0">
                    {prod.imagen_url ? (
                      <img
                        src={`${prod.imagen_url}?width=150&quality=50`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <Package
                        size={24}
                        className="m-auto mt-8 text-slate-200"
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="text-[8px] font-black bg-slate-100 text-slate-400 px-2 py-0.5 rounded-md uppercase">
                      {prod.categorias?.nombre || 'General'}
                    </span>
                    <h3 className="font-black text-slate-800 text-sm uppercase truncate">
                      {prod.nombre}
                    </h3>
                    <p className="text-orange-500 font-black text-lg">
                      ${Number(prod.precio).toFixed(2)}
                    </p>
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 uppercase">
                      Stock: {prod.stock}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setProductoParaReceta(prod)}
                      className="p-2 bg-emerald-50 text-emerald-500 rounded-xl hover:bg-emerald-100 transition-all"
                      title="Receta"
                    >
                      <Package size={16} />
                    </button>
                    <button
                      onClick={() => prepararEdicion(prod)}
                      className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:text-orange-500"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() =>
                        esActivo
                          ? eliminarProducto(prod.id)
                          : reactivarProducto(prod.id)
                      }
                      className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:text-red-500"
                    >
                      {esActivo ? '🗑️' : '🔄'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {tieneMas && (
          <div className="flex justify-center mt-12 mb-20">
            <button
              onClick={() => empresaId && obtenerProductos(empresaId)}
              disabled={cargandoMas}
              className="px-8 py-4 bg-white border-2 border-slate-200 rounded-[2rem] font-black uppercase text-xs"
            >
              {cargandoMas ? 'Cargando...' : 'Ver más'}
            </button>
          </div>
        )}
      </div>

      {productoParaReceta && (
        <ModalReceta
          producto={productoParaReceta}
          productos={productos}
          empresaId={empresaId}
          supabase={supabase}
          onClose={() => setProductoParaReceta(null)}
        />
      )}
    </main>
  );
}
