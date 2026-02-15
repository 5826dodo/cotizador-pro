'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import {
  Trash2,
  Plus,
  Minus,
  FileText,
  Search,
  DollarSign,
  ShoppingCart,
  ChevronUp,
  X,
} from 'lucide-react';

export default function CotizarPage() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [productosInventario, setProductosInventario] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any>(null);
  const [carrito, setCarrito] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [mostrarModalResumen, setMostrarModalResumen] = useState(false);
  const [observaciones, setObservaciones] = useState('');
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [tasaBCV, setTasaBCV] = useState<number>(382.63);
  const [monedaPrincipal, setMonedaPrincipal] = useState<'USD' | 'BS'>('USD');
  const [miEmpresaId, setMiEmpresaId] = useState<string | null>(null);
  const [datosEmpresa, setDatosEmpresa] = useState<any>(null); // Estado para el perfil de empresa
  // ... tus estados anteriores
  const [tipoOperacion, setTipoOperacion] = useState<
    'cotizacion' | 'venta_directa'
  >('cotizacion');
  const [estadoPago, setEstadoPago] = useState('pendiente_pago');
  const [montoPagado, setMontoPagado] = useState(0);

  useEffect(() => {
    const cargarDatos = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Obtenemos empresa_id y los DATOS de la empresa mediante un Join
        const { data: perfil } = await supabase
          .from('perfiles')
          .select('empresa_id, empresas(*)')
          .eq('id', user.id)
          .single();

        if (perfil?.empresa_id) {
          setMiEmpresaId(perfil.empresa_id);
          setDatosEmpresa(perfil.empresas); // Guardamos la info de la empresa

          // Cargar Clientes
          const { data: c } = await supabase
            .from('clientes')
            .select('*')
            .eq('empresa_id', perfil.empresa_id)
            .order('nombre');

          // Cargar Productos
          const { data: p } = await supabase
            .from('productos')
            .select('*')
            .eq('empresa_id', perfil.empresa_id)
            .gt('stock', 0)
            .order('nombre');

          if (c) setClientes(c);
          if (p) setProductosInventario(p);
        }
      }
    };
    cargarDatos();
  }, []);

  const actualizarItem = (
    id: string,
    campo: 'precio' | 'cantidad',
    valor: string,
  ) => {
    setCarrito((prevCarrito) =>
      prevCarrito.map((item) => {
        if (item.id === id) {
          if (valor === '') return { ...item, [campo]: '' };
          const numValor = parseFloat(valor);
          if (campo === 'cantidad') {
            const valorLimpio = isNaN(numValor) ? 0 : numValor;
            const cantFinal =
              valorLimpio > item.stock ? item.stock : valorLimpio;
            return { ...item, cantidad: cantFinal };
          }
          return { ...item, [campo]: isNaN(numValor) ? 0 : numValor };
        }
        return item;
      }),
    );
  };

  const calcularTotal = () =>
    carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0);

  const agregarAlCarrito = (prod: any) => {
    const existe = carrito.find((item) => item.id === prod.id);
    if (!existe) setCarrito([...carrito, { ...prod, cantidad: 1 }]);
  };

  const descargarPDF = (
    cliente: any,
    items: any[],
    total: number,
    notasExtra: string,
  ) => {
    try {
      const doc = new jsPDF();
      const colorDorado: [number, number, number] = [184, 134, 11];

      // --- DATOS DINÁMICOS DE LA EMPRESA ---
      const nombreEmp = datosEmpresa?.nombre || 'MI EMPRESA';
      const rifEmp = datosEmpresa?.rif || 'RIF: NO REGISTRADO';
      const telEmp = datosEmpresa?.telefono || '';
      const logoUrl = datosEmpresa?.logo_url;

      // 1. LOGO DINÁMICO
      if (logoUrl) {
        try {
          doc.addImage(logoUrl, 'PNG', 10, 10, 35, 35);
        } catch (e) {
          console.error('Error al cargar logo personalizado', e);
        }
      }

      // Datos de la Empresa (Membrete Dinámico)
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(nombreEmp.toUpperCase(), 50, 25);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`RIF: ${rifEmp}`, 50, 32);
      doc.text(
        telEmp ? `Telf: ${telEmp}` : 'Calidad y confianza en cada material',
        50,
        37,
      );

      // Etiqueta COTIZACIÓN
      doc.setTextColor(colorDorado[0], colorDorado[1], colorDorado[2]);
      doc.setFontSize(16);
      // Definimos el título según el tipo de operación
      const tituloDocumento =
        tipoOperacion === 'venta_directa' ? 'NOTA DE ENTREGA' : 'COTIZACIÓN';

      // Etiqueta Dinámica
      doc.setTextColor(colorDorado[0], colorDorado[1], colorDorado[2]);
      doc.setFontSize(16);
      doc.text(tituloDocumento, 196, 25, { align: 'right' }); // <--- Aquí usamos la variable
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`N°: ${Math.floor(Date.now() / 10000)}`, 196, 32, {
        align: 'right',
      });
      doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 196, 37, {
        align: 'right',
      });

      // Línea divisoria
      doc.setDrawColor(colorDorado[0], colorDorado[1], colorDorado[2]);
      doc.setLineWidth(1);
      doc.line(14, 58, 196, 58);

      // --- 2. CAJA DE CLIENTE ---
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, 65, 182, 35, 2, 2);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('CLIENTE:', 20, 72);
      doc.text('RIF / C.I.:', 20, 79);
      doc.text('NOTAS/ENVÍO:', 20, 86);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `${cliente.nombre.toUpperCase()} ${cliente.apellido?.toUpperCase() || ''}`,
        50,
        72,
      );
      doc.text(`${cliente.cedula || cliente.rif || 'N/A'}`, 50, 79);
      const textoDestino = notasExtra || 'Por definir';
      const notasCortadas = doc.splitTextToSize(textoDestino, 135);
      doc.text(notasCortadas, 50, 86);

      // --- 3. TABLA ---
      const simbolo = monedaPrincipal === 'BS' ? 'Bs.' : '$';
      const factor = monedaPrincipal === 'BS' ? tasaBCV : 1;

      autoTable(doc, {
        startY: 105,
        head: [
          [
            'DESCRIPCIÓN',
            'CANT.',
            `PRECIO (${monedaPrincipal})`,
            `SUBTOTAL (${monedaPrincipal})`,
          ],
        ],
        body: items.map((i) => [
          i.nombre.toUpperCase(),
          i.cantidad,
          `${simbolo} ${(i.precio * factor).toLocaleString(monedaPrincipal === 'BS' ? 'es-VE' : 'en-US', { minimumFractionDigits: 2 })}`,
          `${simbolo} ${(i.precio * i.cantidad * factor).toLocaleString(monedaPrincipal === 'BS' ? 'es-VE' : 'en-US', { minimumFractionDigits: 2 })}`,
        ]),
        headStyles: { fillColor: [30, 41, 59], halign: 'center' },
        styles: { fontSize: 8 },
        columnStyles: {
          1: { halign: 'center' },
          2: { halign: 'right' },
          3: { halign: 'right' },
        },
      });

      // --- 4. TOTAL ---
      const finalY = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(16);
      doc.setTextColor(colorDorado[0], colorDorado[1], colorDorado[2]);
      doc.setFont('helvetica', 'bold');
      doc.text(
        `TOTAL A PAGAR: ${simbolo} ${(total * factor).toLocaleString(monedaPrincipal === 'BS' ? 'es-VE' : 'en-US', { minimumFractionDigits: 2 })}`,
        196,
        finalY,
        { align: 'right' },
      );
      // !!! NUEVO: Información de pago solo si es venta
      if (tipoOperacion === 'venta_directa') {
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139); // Gris
        doc.setFont('helvetica', 'normal');

        const deuda = total - montoPagado;

        doc.text(
          `Monto Abonado: $ ${montoPagado.toLocaleString()}`,
          196,
          finalY + 8,
          { align: 'right' },
        );

        if (deuda > 0) {
          doc.setTextColor(200, 0, 0); // Rojo para la deuda
          doc.text(
            `Restante por Pagar: $ ${deuda.toLocaleString()}`,
            196,
            finalY + 14,
            { align: 'right' },
          );
        } else {
          doc.setTextColor(0, 150, 0); // Verde si está solvente
          doc.text('ESTADO: TOTALMENTE PAGADO', 196, finalY + 14, {
            align: 'right',
          });
        }
      }

      const nombreArchivo =
        tipoOperacion === 'venta_directa' ? 'Nota_Entrega' : 'Cotizacion';

      doc.save(
        `${nombreArchivo}_${nombreEmp.replace(/\s/g, '_')}_${cliente.nombre}.pdf`,
      );
    } catch (err) {
      console.error(err);
      alert('Error al generar PDF');
    }
  };

  // ... (Las funciones enviarWhatsApp y enviarTelegram se mantienen igual pero usando nombreEmp dinámico si gustas)
  const enviarWhatsApp = (
    cliente: any,
    total: number,
    items: any[],
    notas: string,
    moneda: string,
    tasa: number,
  ) => {
    let telefono = cliente.telefono;
    if (!telefono) {
      const telIngresado = prompt(
        'Ingresa el número de WhatsApp (ej: 584121234567):',
      );
      if (!telIngresado) return;
      telefono = telIngresado;
    }
    const telLimpio = telefono.replace(/\D/g, '');
    const factor = moneda === 'BS' ? tasa : 1;
    const simbolo = moneda === 'BS' ? 'Bs.' : '$';
    const listaProd = items
      .map(
        (i) =>
          `🔹 *${i.nombre.trim()}*\nCant: ${i.cantidad} -> ${simbolo}${(i.precio * i.cantidad * factor).toLocaleString('es-VE')}`,
      )
      .join('\n\n');

    const textoMensaje = `🏗️ *${datosEmpresa?.nombre || 'MI EMPRESA'}*\n--------------------------------------------\n👤 *Cliente:* ${cliente.nombre}\n🆔 *ID:* ${cliente.cedula || 'N/A'}\n📍 *Entrega:* ${notas || 'Retiro en tienda'}\n\n📝 *RESUMEN:*\n${listaProd}\n\n💵 *TOTAL: ${simbolo} ${(total * factor).toLocaleString('es-VE')}*\n--------------------------------------------\n🛠️ *¡Estamos para servirle!*`;
    window.open(
      `https://wa.me/${telLimpio}?text=${encodeURIComponent(textoMensaje)}`,
      '_blank',
    );
  };

  const descontarInventario = async (items: any[]) => {
    for (const item of items) {
      const { error } = await supabase
        .from('productos')
        .update({ stock: item.stock - item.cantidad })
        .eq('id', item.id);
      if (error) console.error('Error actualizando stock de:', item.nombre);
    }
  };

  const procesarCotizacion = async () => {
    if (!clienteSeleccionado || carrito.length === 0)
      return alert('Faltan datos');
    if (!miEmpresaId) return alert('Error de sesión');

    setCargando(true);
    try {
      const total = calcularTotal();
      const esVenta = tipoOperacion === 'venta_directa';

      const { error } = await supabase.from('cotizaciones').insert([
        {
          cliente_id: clienteSeleccionado.id,
          productos_seleccionados: carrito,
          total: total,
          empresa_id: miEmpresaId,
          // LOGICA DE ESTADOS NUEVA
          estado: esVenta ? 'aprobada' : 'pendiente',
          tipo_operacion: tipoOperacion,
          estado_pago: esVenta ? estadoPago : 'pendiente_pago',
          monto_pagado: esVenta ? montoPagado : 0,
          moneda: monedaPrincipal,
          tasa_bcv: tasaBCV,
          observaciones: observaciones, // Asegúrate de que este campo exista en tu tabla
        },
      ]);

      if (error) throw error;

      // SI ES VENTA, DESCONTAMOS EL STOCK REAL
      if (esVenta) {
        await descontarInventario(carrito);
      }

      descargarPDF(clienteSeleccionado, carrito, total, observaciones);

      setTimeout(() => {
        if (confirm('¿Deseas enviar por WhatsApp?')) {
          enviarWhatsApp(
            clienteSeleccionado,
            total,
            carrito,
            observaciones,
            monedaPrincipal,
            tasaBCV,
          );
        }
      }, 500);

      // Limpieza de estados
      setCarrito([]);
      setClienteSeleccionado(null);
      setObservaciones('');
      setMontoPagado(0);
      setMostrarModalResumen(false);
      alert(
        esVenta
          ? '✅ Venta registrada e inventario actualizado'
          : '📄 Cotización guardada',
      );
    } catch (e) {
      alert('Error al procesar');
    } finally {
      setCargando(false);
    }
  };

  // --- RENDERIZADO ---
  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 pb-32">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
        {/* IZQUIERDA: BUSCADOR Y PRODUCTOS */}
        <div className="flex-1 space-y-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-4xl font-black text-slate-800 tracking-tighter">
              {tipoOperacion === 'cotizacion' ? 'Cotizar' : 'Venta Directa'}
            </h1>

            {/* Switch Elegante */}
            <div className="flex bg-slate-200 p-1 rounded-2xl shadow-inner">
              <button
                onClick={() => setTipoOperacion('cotizacion')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${tipoOperacion === 'cotizacion' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
              >
                COTIZACIÓN
              </button>
              <button
                onClick={() => setTipoOperacion('venta_directa')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${tipoOperacion === 'venta_directa' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500'}`}
              >
                VENTA DIRECTA
              </button>
            </div>
          </div>

          {/* REEMPLAZO DEL SELECT POR BUSCADOR INTELIGENTE */}
          <section className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 relative">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-2">
              Cliente (Busca por Nombre, RIF o Cédula)
            </label>

            <div className="relative">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={24}
              />
              <input
                type="text"
                placeholder="Escribir para buscar cliente..."
                className="w-full pl-14 pr-12 py-5 bg-slate-50 rounded-[1.5rem] outline-none ring-2 ring-slate-100 text-xl font-bold transition-all focus:ring-blue-500"
                // Si hay un cliente seleccionado, mostramos su nombre, si no, lo que se esté escribiendo
                value={
                  clienteSeleccionado
                    ? `${clienteSeleccionado.nombre} ${clienteSeleccionado.apellido || ''}`
                    : busquedaCliente
                }
                onChange={(e) => {
                  setBusquedaCliente(e.target.value);
                  if (clienteSeleccionado) setClienteSeleccionado(null);
                }}
              />

              {/* Botón para limpiar selección */}
              {clienteSeleccionado && (
                <button
                  onClick={() => {
                    setClienteSeleccionado(null);
                    setBusquedaCliente('');
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-slate-200 p-2 rounded-full text-slate-600 hover:bg-red-500 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {/* LISTA DE RESULTADOS FILTRADOS (Aparece solo mientras buscas) */}
            {!clienteSeleccionado && busquedaCliente.length > 0 && (
              <div className="absolute z-[100] left-6 right-6 mt-2 bg-white rounded-[2rem] shadow-2xl border border-slate-100 max-h-[350px] overflow-y-auto p-3 custom-scroll">
                {clientes
                  .filter((c) => {
                    const term = busquedaCliente.toLowerCase();
                    return (
                      c.nombre?.toLowerCase().includes(term) ||
                      c.apellido?.toLowerCase().includes(term) ||
                      c.cedula?.toString().includes(term) ||
                      c.rif?.toLowerCase().includes(term)
                    );
                  })
                  .map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setClienteSeleccionado(c);
                        setBusquedaCliente('');
                      }}
                      className="w-full text-left p-4 hover:bg-blue-50 rounded-2xl transition-all flex flex-col border-b border-slate-50 last:border-none group"
                    >
                      <span className="font-black text-slate-800 text-lg uppercase group-hover:text-blue-600">
                        {c.nombre} {c.apellido || ''}
                      </span>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-500 rounded-md">
                          ID: {c.cedula || c.rif || 'N/A'}
                        </span>
                        {c.empresa && (
                          <span className="text-xs text-blue-400 font-medium italic">
                            🏢 {c.empresa}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}

                {/* Mensaje cuando no hay resultados */}
                {clientes.filter((c) => {
                  const term = busquedaCliente.toLowerCase();
                  return (
                    c.nombre?.toLowerCase().includes(term) ||
                    c.cedula?.toString().includes(term)
                  );
                }).length === 0 && (
                  <div className="p-8 text-center">
                    <p className="text-slate-400 font-bold uppercase text-xs">
                      No se encontró el cliente
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>
          {/* --- PANEL DE TASA Y CAMBIO DE MONEDA --- */}
          <section className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="bg-amber-50 p-4 rounded-[1.5rem] border border-amber-100">
                <DollarSign className="text-amber-600" size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  Tasa BCV (Bs/$)
                </p>
                <input
                  type="number"
                  value={tasaBCV}
                  onChange={(e) => setTasaBCV(parseFloat(e.target.value) || 0)}
                  className="text-3xl font-black text-slate-800 bg-transparent outline-none w-32 focus:text-blue-600 transition-colors"
                />
              </div>
            </div>

            <div className="flex bg-slate-100 p-2 rounded-[1.8rem] shadow-inner">
              <button
                onClick={() => setMonedaPrincipal('USD')}
                className={`px-8 py-3 rounded-[1.4rem] font-black text-sm transition-all flex items-center gap-2 ${
                  monedaPrincipal === 'USD'
                    ? 'bg-white text-blue-600 shadow-md scale-105'
                    : 'text-slate-400'
                }`}
              >
                $ USD
              </button>
              <button
                onClick={() => setMonedaPrincipal('BS')}
                className={`px-8 py-3 rounded-[1.4rem] font-black text-sm transition-all flex items-center gap-2 ${
                  monedaPrincipal === 'BS'
                    ? 'bg-white text-emerald-600 shadow-md scale-105'
                    : 'text-slate-400'
                }`}
              >
                Bs BS
              </button>
            </div>
          </section>

          <section className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
            <div className="relative mb-6">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={24}
              />
              <input
                type="text"
                placeholder="Buscar producto..."
                className="w-full pl-14 pr-4 py-5 bg-slate-50 rounded-[1.5rem] outline-none ring-2 ring-slate-100 text-xl font-medium"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-[500px] overflow-y-auto pr-2">
              {productosInventario
                .filter((p) =>
                  p.nombre.toLowerCase().includes(busqueda.toLowerCase()),
                )
                .map((p) => (
                  <button
                    key={p.id}
                    onClick={() => agregarAlCarrito(p)}
                    className={`p-6 rounded-[2rem] border-2 text-left transition-all relative ${
                      carrito.find((i) => i.id === p.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-100 bg-white'
                    }`}
                  >
                    {/* ESTE ES EL CONTADOR RESTAURADO */}
                    {carrito.find((i) => i.id === p.id) && (
                      <div className="absolute -top-3 -right-3 bg-blue-600 text-white font-black w-10 h-10 rounded-full flex items-center justify-center shadow-lg text-lg ring-4 ring-white">
                        {carrito.find((i) => i.id === p.id).cantidad}
                      </div>
                    )}
                    <p className="font-black text-xl text-slate-800 mb-2">
                      {p.nombre}
                    </p>
                    <div className="flex justify-between items-end">
                      <div className="flex flex-col">
                        {/* El precio principal siempre en Dólares */}
                        <span className="text-2xl font-black text-blue-600 leading-none">
                          ${p.precio.toLocaleString()}
                        </span>

                        {/* El equivalente en Bs. pequeño abajo (Solo si el switch es BS) */}
                        {monedaPrincipal === 'BS' && (
                          <span className="text-[11px] font-black text-emerald-600 mt-1 uppercase tracking-tighter">
                            ≈ Bs.{' '}
                            {(p.precio * tasaBCV).toLocaleString('es-VE', {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        )}
                      </div>

                      <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-500 rounded-lg">
                        Stock: {p.stock}
                      </span>
                    </div>
                  </button>
                ))}
            </div>
          </section>
        </div>

        {/* DERECHA: RESUMEN (VISIBLE EN ESCRITORIO) */}
        <div className="hidden lg:block w-[450px]">
          <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-blue-50 sticky top-8">
            <h2 className="text-2xl font-black mb-6 text-slate-800 flex justify-between">
              Resumen <ShoppingCart className="text-blue-500" />
            </h2>
            {/* AQUÍ DEFINIMOS EL SCROLL PARA PC */}
            <div className="max-h-[500px] overflow-y-auto pr-2 custom-scroll">
              {/* Busca donde estaba <ListadoResumen /> en la parte de PC y cámbialo por esto: */}
              <div className="space-y-4">
                {carrito.map((item) => (
                  <TarjetaProductoCarrito
                    key={`pc-${item.id}`}
                    item={item}
                    actualizarItem={actualizarItem}
                    setCarrito={setCarrito}
                    carrito={carrito}
                    monedaPrincipal={monedaPrincipal}
                    tasaBCV={tasaBCV}
                  />
                ))}
              </div>
            </div>
            <div className="mt-6 pt-6 border-t-4 border-dashed border-slate-100">
              {/* !!! PEGA EL NUEVO BLOQUE JUSTO AQUÍ !!! */}
              {tipoOperacion === 'venta_directa' && (
                <div className="mb-6 space-y-4 p-5 bg-emerald-50 rounded-[2rem] border border-emerald-100">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-emerald-700 uppercase ml-2 tracking-widest">
                      Estado del Pago
                    </label>
                    <select
                      value={estadoPago}
                      onChange={(e) => setEstadoPago(e.target.value)}
                      className="w-full p-4 bg-white rounded-2xl font-bold text-slate-700 shadow-sm outline-none border-none"
                    >
                      <option value="pendiente_pago">
                        ❌ Pendiente (Deuda)
                      </option>
                      <option value="pago_parcial">
                        ⏳ Pago Parcial (Abono)
                      </option>
                      <option value="pagado">✅ Pagado Total</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-emerald-700 uppercase ml-2 tracking-widest">
                      Monto Recibido ($)
                    </label>
                    <input
                      type="number"
                      value={montoPagado}
                      onChange={(e) =>
                        setMontoPagado(parseFloat(e.target.value) || 0)
                      }
                      className="w-full p-4 bg-white rounded-2xl font-bold text-slate-700 shadow-sm outline-none border-none"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              )}
              <div className="flex justify-between items-center mb-6">
                <div className="mb-6">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                    Notas / Dirección de Envío
                  </label>
                  <textarea
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Ej: Entrega en Obra - Av. Bolívar / Contactar a Ing. Pérez..."
                    className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 text-sm outline-none focus:border-blue-500 transition-all resize-none"
                    rows={3}
                  />
                </div>
                <span className="text-sm font-black text-slate-400 uppercase">
                  Total
                </span>
                <span className="text-4xl font-black text-blue-700">
                  <div className="flex flex-col items-end mb-6">
                    <span className="text-sm font-black text-slate-400 uppercase tracking-widest">
                      Total a Pagar
                    </span>

                    {/* Monto en Dólares siempre destacado */}
                    <span className="text-4xl font-black text-blue-700 leading-tight">
                      ${calcularTotal().toLocaleString()}
                    </span>

                    {/* Monto en Bolívares justo debajo como referencia principal */}
                    <div className="flex items-center gap-2 bg-emerald-50 px-4 py-1 rounded-full border border-emerald-100 mt-1">
                      <span className="text-xs font-black text-emerald-700 uppercase">
                        Bs.
                      </span>
                      <span className="text-lg font-black text-emerald-600">
                        {(calcularTotal() * tasaBCV).toLocaleString('es-VE', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                </span>
              </div>
              <button
                onClick={procesarCotizacion}
                disabled={
                  cargando || carrito.length === 0 || !clienteSeleccionado
                }
                className="w-full py-5 rounded-[2rem] font-black text-xl text-white bg-blue-600 shadow-xl shadow-blue-200"
              >
                {cargando ? 'REGISTRANDO...' : 'GENERAR COTIZACIÓN'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- CARRITO FLOTANTE MÓVIL --- */}
      {carrito.length > 0 && !mostrarModalResumen && (
        <div className="lg:hidden fixed bottom-8 left-4 right-4 z-[90]">
          <button
            onClick={() => setMostrarModalResumen(true)}
            className="w-full bg-slate-900 text-white p-5 rounded-[2.5rem] shadow-2xl flex items-center justify-between border border-white/10"
          >
            <div className="flex items-center gap-4">
              <div className="relative bg-blue-600 p-3 rounded-2xl">
                <ShoppingCart size={24} />
                <span className="absolute -top-2 -right-2 bg-red-500 text-xs font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-slate-900">
                  {carrito.length} {/* Contador de TIPOS de productos */}
                </span>
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black text-slate-400 uppercase">
                  Total
                </p>
                <p className="text-2xl font-black">
                  <div className="flex flex-col items-end mb-6">
                    <span className="text-sm font-black text-slate-400 uppercase tracking-widest">
                      Total a Pagar
                    </span>

                    {/* Monto en Dólares siempre destacado */}
                    <span className="text-4xl font-black text-blue-700 leading-tight">
                      ${calcularTotal().toLocaleString()}
                    </span>

                    {/* Monto en Bolívares justo debajo como referencia principal */}
                    <div className="flex items-center gap-2 bg-emerald-50 px-4 py-1 rounded-full border border-emerald-100 mt-1">
                      <span className="text-xs font-black text-emerald-700 uppercase">
                        Bs.
                      </span>
                      <span className="text-lg font-black text-emerald-600">
                        {(calcularTotal() * tasaBCV).toLocaleString('es-VE', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 font-black text-blue-400">
              {' '}
              REVISAR <ChevronUp size={20} />
            </div>
          </button>
        </div>
      )}

      {mostrarModalResumen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end justify-center">
          {/* Contenedor Principal del Modal */}
          <div className="bg-slate-100 w-full max-w-2xl h-[92vh] rounded-t-[3rem] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom-full duration-300">
            {/* Indicador visual de "arrastre" (estilo iPhone) */}
            <div className="w-full flex justify-center pt-3 pb-1 shrink-0 bg-white">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
            </div>

            {/* CABECERA FIJA */}
            <div className="px-6 py-4 border-b bg-white flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-2xl font-black text-slate-800 leading-none">
                  Mi Carrito
                </h2>
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1">
                  {carrito.length} productos seleccionados
                </p>
              </div>
              <button
                onClick={() => setMostrarModalResumen(false)}
                className="p-3 bg-slate-100 text-slate-500 rounded-full active:scale-90 transition-all"
              >
                <X size={24} />
              </button>
            </div>

            {/* CUERPO CON SCROLL - Aquí cambiamos el fondo a slate-100 para que las tarjetas blancas resalten */}
            <div
              className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-100"
              style={{ overscrollBehavior: 'contain' }} // <--- CLAVE: Evita recargar la página al llegar al tope
            >
              <div className="space-y-3">
                {carrito.map((item) => (
                  <div
                    key={`mobile-${item.id}`}
                    className="bg-white rounded-[2rem] p-1 shadow-md border border-white"
                  >
                    <TarjetaProductoCarrito
                      item={item}
                      actualizarItem={actualizarItem}
                      setCarrito={setCarrito}
                      carrito={carrito}
                      monedaPrincipal={monedaPrincipal}
                      tasaBCV={tasaBCV}
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={() => setMostrarModalResumen(false)}
                className="w-full py-6 mt-4 border-2 border-dashed border-slate-300 rounded-[2rem] text-slate-400 font-black text-xs uppercase tracking-widest active:bg-white transition-all"
              >
                + Agregar más productos
              </button>
            </div>

            {/* PIE DE PÁGINA FIJO (Resumen de Totales) */}
            <div className="p-6 bg-white border-t border-slate-200 shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0,05)]">
              {/* !!! PEGA EL NUEVO BLOQUE JUSTO AQUÍ !!! */}
              {tipoOperacion === 'venta_directa' && (
                <div className="mb-6 space-y-4 p-5 bg-emerald-50 rounded-[2rem] border border-emerald-100">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-emerald-700 uppercase ml-2 tracking-widest">
                      Estado del Pago
                    </label>
                    <select
                      value={estadoPago}
                      onChange={(e) => setEstadoPago(e.target.value)}
                      className="w-full p-4 bg-white rounded-2xl font-bold text-slate-700 shadow-sm outline-none border-none"
                    >
                      <option value="pendiente_pago">
                        ❌ Pendiente (Deuda)
                      </option>
                      <option value="pago_parcial">
                        ⏳ Pago Parcial (Abono)
                      </option>
                      <option value="pagado">✅ Pagado Total</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-emerald-700 uppercase ml-2 tracking-widest">
                      Monto Recibido ($)
                    </label>
                    <input
                      type="number"
                      value={montoPagado}
                      onChange={(e) =>
                        setMontoPagado(parseFloat(e.target.value) || 0)
                      }
                      className="w-full p-4 bg-white rounded-2xl font-bold text-slate-700 shadow-sm outline-none border-none"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              )}
              <div className="mb-4">
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Notas de entrega o dirección..."
                  className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 text-sm outline-none focus:border-blue-500 transition-all resize-none"
                  rows={2}
                />
              </div>

              <div className="flex justify-between items-center mb-6 px-2">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Total Estimado
                  </span>
                  <span className="text-3xl font-black text-blue-600">
                    ${calcularTotal().toLocaleString()}
                  </span>
                </div>
                {monedaPrincipal === 'BS' && (
                  <div className="text-right">
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                      En Bolívares
                    </span>
                    <p className="text-xl font-black text-emerald-600 leading-none">
                      Bs. {(calcularTotal() * tasaBCV).toLocaleString('es-VE')}
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={procesarCotizacion}
                disabled={cargando}
                className="w-full py-5 rounded-[2rem] bg-blue-600 text-white text-xl font-black shadow-xl shadow-blue-200 active:scale-95 transition-all"
              >
                {cargando ? 'PROCESANDO...' : 'GENERAR COTIZACIÓN'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// Componente auxiliar para las tarjetas (Asegúrate de tenerlo definido abajo o en otro archivo)
function TarjetaProductoCarrito({
  item,
  actualizarItem,
  setCarrito,
  carrito,
  monedaPrincipal,
  tasaBCV,
}: any) {
  const factor = monedaPrincipal === 'BS' ? tasaBCV : 1;
  const simbolo = monedaPrincipal === 'BS' ? 'Bs.' : '$';

  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-3xl shadow-sm border border-slate-100">
      <div className="flex-1">
        <p className="font-bold text-slate-800 uppercase text-sm">
          {item.nombre}
        </p>
        <p className="text-blue-600 font-black text-lg">
          {simbolo}{' '}
          {(item.precio * factor).toLocaleString(undefined, {
            minimumFractionDigits: 2,
          })}
        </p>
      </div>
      <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl">
        <button
          onClick={() =>
            actualizarItem(item.id, 'cantidad', (item.cantidad - 1).toString())
          }
          className="p-1 hover:bg-white rounded-lg transition-colors"
        >
          <Minus size={18} />
        </button>
        <span className="font-black text-xl w-8 text-center">
          {item.cantidad}
        </span>
        <button
          onClick={() =>
            actualizarItem(item.id, 'cantidad', (item.cantidad + 1).toString())
          }
          className="p-1 hover:bg-white rounded-lg transition-colors"
        >
          <Plus size={18} />
        </button>
      </div>
      <button
        onClick={() => setCarrito(carrito.filter((i: any) => i.id !== item.id))}
        className="p-3 text-red-400 hover:text-red-600"
      >
        <Trash2 size={20} />
      </button>
    </div>
  );
}
