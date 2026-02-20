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
  ChevronDown, // <--- Agrega este
  User, // <--- Agrega este para el icono de cliente
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
  const [mostrarListaClientes, setMostrarListaClientes] = useState(false);
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
          // Permitimos decimales. Si es vacío, dejamos 0 para evitar errores de NAN
          const num = valor === '' ? 0 : parseFloat(valor);

          if (campo === 'cantidad') {
            // Validamos contra el stock real
            const cant = num > item.stock ? item.stock : num;
            return { ...item, cantidad: cant };
          }
          return { ...item, [campo]: num };
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

      if (logoUrl) {
        try {
          doc.addImage(logoUrl, 'PNG', 10, 10, 35, 35);
        } catch (e) {
          console.error(e);
        }
      }

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(nombreEmp.toUpperCase(), 50, 25);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`RIF: ${rifEmp}`, 50, 32);
      doc.text(telEmp ? `Telf: ${telEmp}` : 'Calidad y confianza', 50, 37);

      const tituloDocumento =
        tipoOperacion === 'venta_directa' ? 'NOTA DE ENTREGA' : 'COTIZACIÓN';
      doc.setTextColor(colorDorado[0], colorDorado[1], colorDorado[2]);
      doc.setFontSize(16);
      doc.text(tituloDocumento, 196, 25, { align: 'right' });

      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`N°: ${Math.floor(Date.now() / 10000)}`, 196, 32, {
        align: 'right',
      });
      doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 196, 37, {
        align: 'right',
      });

      doc.setDrawColor(colorDorado[0], colorDorado[1], colorDorado[2]);
      doc.setLineWidth(1);
      doc.line(14, 58, 196, 58);

      // --- CAJA DE CLIENTE ---
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
      doc.text(doc.splitTextToSize(notasExtra || 'Por definir', 135), 50, 86);

      // --- TABLA ---
      const simbolo = monedaPrincipal === 'BS' ? 'Bs.' : '$';
      const factor = monedaPrincipal === 'BS' ? tasaBCV : 1;

      // --- TABLA ---
      autoTable(doc, {
        startY: 105,
        head: [['DESCRIPCIÓN', 'CANT.', 'PRECIO', 'SUBTOTAL']],
        body: items.map((i) => [
          // Opción: "CEMENTO (SACOS)" o "ARENA (METROS)"
          `${i.nombre.toUpperCase()}\n[UNIDAD: ${i.unidad_medida || 'UNID.'}]`,
          i.cantidad.toString(), // Aquí saldrán los decimales como 0.5
          `${simbolo} ${(i.precio * factor).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`,
          `${simbolo} ${(i.precio * i.cantidad * factor).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`,
        ]),
        headStyles: { fillColor: [30, 41, 59], halign: 'center' },
        styles: { fontSize: 8, cellPadding: 3 }, // Añadimos padding para que la unidad quepa bien
        columnStyles: {
          0: { cellWidth: 80 }, // Le damos más ancho a la descripción
          1: { halign: 'center' },
          2: { halign: 'right' },
          3: { halign: 'right' },
        },
      });

      const finalY = (doc as any).lastAutoTable.finalY + 15;

      // --- LÓGICA DE PAGOS Y SELLO ---
      // --- LÓGICA DE PAGOS Y SELLO (CORREGIDA) ---
      if (tipoOperacion === 'venta_directa') {
        const finalY = (doc as any).lastAutoTable.finalY + 15;
        const simbolo = monedaPrincipal === 'BS' ? 'Bs.' : '$';
        const factor = monedaPrincipal === 'BS' ? tasaBCV : 1;

        // El TOTAL siempre se multiplica por el factor para mostrarlo en la moneda elegida
        const totalEnMoneda = total * factor;

        // EL CAMBIO CLAVE: El montoPagado ya viene en la moneda elegida desde el input de la pantalla
        // por lo tanto, NO se debe multiplicar por el factor nuevamente.
        const abonadoEnMoneda = montoPagado;
        const deudaEnMoneda = totalEnMoneda - abonadoEnMoneda;

        let colorSello = [239, 68, 68]; // Rojo
        let textoSello = 'PENDIENTE';

        if (estadoPago === 'pagado') {
          colorSello = [34, 197, 94]; // Verde
          textoSello = 'PAGADO';
        } else if (estadoPago === 'pago_parcial') {
          colorSello = [234, 179, 8]; // Amarillo
          textoSello = 'ABONO';
        }

        // Dibujar Sello
        doc.setDrawColor(colorSello[0], colorSello[1], colorSello[2]);
        doc.setTextColor(colorSello[0], colorSello[1], colorSello[2]);
        doc.setLineWidth(1.5);
        doc.roundedRect(14, finalY, 50, 18, 3, 3);
        doc.setFontSize(14);
        doc.text(textoSello, 39, finalY + 11, { align: 'center' });

        // Mostrar Totales
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(12);
        doc.text(
          `TOTAL: ${simbolo} ${totalEnMoneda.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`,
          196,
          finalY + 5,
          { align: 'right' },
        );

        if (estadoPago === 'pago_parcial') {
          doc.setFontSize(10);
          doc.setTextColor(100, 116, 139);
          doc.text(
            `Recibido: ${simbolo} ${abonadoEnMoneda.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`,
            196,
            finalY + 12,
            { align: 'right' },
          );

          doc.setTextColor(200, 0, 0);
          doc.setFont('helvetica', 'bold');
          doc.text(
            `RESTA: ${simbolo} ${deudaEnMoneda.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`,
            196,
            finalY + 19,
            { align: 'right' },
          );
        }
      } else {
        // Si es solo cotización, solo muestra el total
        doc.setFontSize(14);
        doc.setTextColor(colorDorado[0], colorDorado[1], colorDorado[2]);
        doc.text(
          `TOTAL PRESUPUESTO: ${simbolo} ${(total * factor).toLocaleString('es-VE')}`,
          196,
          finalY + 5,
          { align: 'right' },
        );
      }

      const nombreArchivo =
        tipoOperacion === 'venta_directa' ? 'Nota_Entrega' : 'Cotizacion';
      doc.save(`${nombreArchivo}_${cliente.nombre}.pdf`);
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
          `🔹 *${i.nombre.trim()}*\n    Cant: ${i.cantidad} ${i.unidad_medida || 'UNID.'} -> ${simbolo}${(i.precio * i.cantidad * factor).toLocaleString('es-VE')}`,
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
          total: total, // Este total suele ser en $ en base de datos
          empresa_id: miEmpresaId,
          estado: esVenta ? 'aprobada' : 'pendiente',
          tipo_operacion: tipoOperacion,
          estado_pago: esVenta ? estadoPago : 'pendiente_pago',
          // Si el monto fue en BS, lo convertimos a $ para la DB (opcional, depende de tu preferencia)
          monto_pagado:
            monedaPrincipal === 'BS' ? montoPagado / tasaBCV : montoPagado,
          moneda: monedaPrincipal,
          tasa_bcv: tasaBCV,
          observaciones: observaciones,
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

  // --- PEGA ESTO JUSTO ANTES DEL RETURN ---
  const renderSeccionPago = () => {
    if (tipoOperacion !== 'venta_directa') return null;

    return (
      <div
        className={`mb-6 space-y-4 p-5 rounded-[2rem] border-2 ${monedaPrincipal === 'BS' ? 'bg-orange-50/20 border-orange-100' : 'bg-slate-800/50 border-white/10'}`}
      >
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-2">
          Estado del Pago
        </label>
        <select
          value={estadoPago}
          onChange={(e) => {
            setEstadoPago(e.target.value);
            if (e.target.value === 'pagado') {
              const factor = monedaPrincipal === 'BS' ? tasaBCV : 1;
              setMontoPagado(calcularTotal() * factor);
            }
          }}
          className="w-full p-4 bg-white text-slate-900 rounded-2xl font-bold border-2 border-slate-200 outline-none"
        >
          <option value="pendiente_pago">❌ Pendiente</option>
          <option value="pago_parcial">⏳ Abono / Parcial</option>
          <option value="pagado">✅ Pagado Total</option>
        </select>

        {estadoPago !== 'pendiente_pago' && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-2">
              Monto Recibido ({monedaPrincipal === 'BS' ? 'Bs.' : '$'})
            </label>
            <input
              type="number"
              value={montoPagado}
              onChange={(e) => setMontoPagado(parseFloat(e.target.value) || 0)}
              className="w-full p-4 bg-white text-slate-900 rounded-2xl font-black text-xl border-2 border-orange-500 outline-none"
            />
          </div>
        )}
      </div>
    );
  };

  // --- RENDERIZADO ---
  return (
    <main
      style={{ overscrollBehaviorY: 'contain', touchAction: 'pan-x pan-y' }}
      className="min-h-screen bg-slate-50 p-4 pb-32"
    >
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
        {/* IZQUIERDA: BUSCADOR Y PRODUCTOS */}
        <div className="flex-1 space-y-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-4xl font-black text-slate-800 tracking-tighter">
              {tipoOperacion === 'cotizacion' ? 'Cotizar' : 'Venta Directa'}
            </h1>

            {/* Switch Estilo Ventiq-Orange */}
            <div className="flex bg-slate-200 p-1.5 rounded-2xl shadow-inner">
              <button
                onClick={() => setTipoOperacion('cotizacion')}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black transition-all italic uppercase ${tipoOperacion === 'cotizacion' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}
              >
                Cotización
              </button>
              <button
                onClick={() => setTipoOperacion('venta_directa')}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black transition-all italic uppercase ${tipoOperacion === 'venta_directa' ? 'bg-orange-600 text-white shadow-lg shadow-orange-200' : 'text-slate-500'}`}
              >
                Venta Directa
              </button>
            </div>
          </div>

          {/* REEMPLAZO DEL SELECT POR BUSCADOR INTELIGENTE */}
          <section className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 relative">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-2">
              Cliente (Selecciona o busca)
            </label>

            <div className="relative">
              <button
                onClick={() => setMostrarListaClientes(!mostrarListaClientes)} // Debes crear este estado: const [mostrarListaClientes, setMostrarListaClientes] = useState(false);
                className="w-full pl-6 pr-12 py-5 bg-slate-50 rounded-[1.5rem] text-left border-2 border-slate-100 text-xl font-bold flex justify-between items-center"
              >
                <span
                  className={
                    clienteSeleccionado ? 'text-slate-800' : 'text-slate-400'
                  }
                >
                  {clienteSeleccionado
                    ? `${clienteSeleccionado.nombre} ${clienteSeleccionado.apellido || ''}`
                    : 'Toca para ver lista de clientes...'}
                </span>
                <ChevronDown size={24} className="text-slate-400" />
              </button>

              {/* Dropdown de Clientes */}
              {mostrarListaClientes && (
                <div className="absolute z-[100] left-0 right-0 mt-2 bg-white rounded-[1.5rem] shadow-2xl border border-slate-300 overflow-hidden">
                  <div className="p-4 border-b border-slate-100 bg-slate-50">
                    <input
                      type="text"
                      placeholder="Escribe para filtrar..."
                      className="w-full p-3 bg-white border border-slate-300 rounded-xl outline-none"
                      onChange={(e) => setBusquedaCliente(e.target.value)}
                    />
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {clientes
                      .filter((c) =>
                        `${c.nombre} ${c.cedula}`
                          .toLowerCase()
                          .includes(busquedaCliente.toLowerCase()),
                      )
                      .map((c) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setClienteSeleccionado(c);
                            setMostrarListaClientes(false);
                          }}
                          className="p-4 hover:bg-orange-50 cursor-pointer border-b border-slate-50 last:border-none"
                        >
                          <p className="font-bold text-slate-800 uppercase">
                            {c.nombre} {c.apellido}
                          </p>
                          <p className="text-xs text-slate-400">
                            CI/RIF: {c.cedula || c.rif}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </section>
          {/* --- PANEL DE TASA Y CAMBIO DE MONEDA --- */}
          <section className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="bg-orange-600 p-4 rounded-2xl shadow-lg shadow-orange-200">
                <DollarSign className="text-white" size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  Tasa BCV (Bs/$)
                </p>
                <input
                  type="number"
                  step="any"
                  value={tasaBCV === 0 ? '' : tasaBCV}
                  onChange={(e) => setTasaBCV(parseFloat(e.target.value) || 0)}
                  className="text-3xl font-black text-slate-800 bg-transparent border-b-4 border-orange-500 outline-none w-40 px-2"
                />
              </div>
            </div>

            {/* Switch Moneda Ventiq */}
            <div className="flex bg-slate-100 p-1.5 rounded-2xl">
              <button
                onClick={() => setMonedaPrincipal('USD')}
                className={`px-8 py-3 rounded-xl font-black text-[10px] transition-all uppercase ${monedaPrincipal === 'USD' ? 'bg-[#1A1C1E] text-white shadow-lg' : 'text-slate-400'}`}
              >
                USD $
              </button>
              <button
                onClick={() => setMonedaPrincipal('BS')}
                className={`px-8 py-3 rounded-xl font-black text-[10px] transition-all uppercase ${monedaPrincipal === 'BS' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400'}`}
              >
                BS.
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
                    className={`p-6 rounded-[2.5rem] border-2 text-left transition-all relative group ${
                      carrito.find((i) => i.id === p.id)
                        ? 'border-orange-500 bg-orange-50/30 shadow-lg shadow-orange-100'
                        : 'border-white bg-white hover:border-slate-200'
                    }`}
                  >
                    {/* Contador Naranja */}
                    {carrito.find((i) => i.id === p.id) && (
                      <div className="absolute -top-3 -right-3 bg-orange-600 text-white font-black w-11 h-11 rounded-full flex items-center justify-center shadow-xl text-lg ring-4 ring-white animate-in zoom-in">
                        {carrito.find((i) => i.id === p.id).cantidad}
                      </div>
                    )}
                    <p className="font-black text-xl text-slate-800 mb-2 italic uppercase tracking-tighter group-hover:text-orange-600 transition-colors">
                      {p.nombre}
                    </p>
                    <div className="flex justify-between items-end">
                      <div className="flex flex-col">
                        {/* El precio principal siempre en Dólares */}
                        <span className="text-2xl font-black text-orange-500 leading-none">
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
          <div className="bg-[#1A1C1E] p-8 rounded-[3rem] shadow-2xl border-t-8 border-orange-600 sticky top-8 text-white">
            <h2 className="text-2xl font-black mb-10 italic uppercase tracking-tighter flex justify-between items-center">
              Resumen <ShoppingCart className="text-orange-500" />
            </h2>

            {/* El listado de productos aquí debe tener estilos de texto blanco */}
            <div className="max-h-[400px] overflow-y-auto pr-2 custom-scroll-dark">
              {/* El listado de productos aquí */}
              <div className="max-h-[400px] overflow-y-auto pr-2 custom-scroll-dark space-y-4">
                {carrito.map((item) => (
                  <TarjetaProductoCarrito
                    key={`esc-${item.id}`}
                    item={item}
                    actualizarItem={actualizarItem}
                    setCarrito={setCarrito}
                    carrito={carrito}
                    monedaPrincipal={monedaPrincipal}
                    tasaBCV={tasaBCV}
                    isDark={true} // Una prop opcional si quieres que el texto sea blanco en el fondo oscuro
                  />
                ))}
              </div>
            </div>

            {/* --- AGREGA ESTA LÍNEA AQUÍ --- */}
            {renderSeccionPago()}

            <div className="mt-10 pt-8 border-t border-white/10">
              <div className="flex flex-col items-end mb-8">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-2">
                  Total a Cobrar
                </span>
                <span className="text-5xl font-black text-white tracking-tighter italic">
                  ${calcularTotal().toLocaleString()}
                </span>
                <div className="mt-2 bg-orange-600 px-4 py-1 rounded-full shadow-lg shadow-orange-900/40">
                  <span className="text-lg font-black text-white italic">
                    Bs. {(calcularTotal() * tasaBCV).toLocaleString('es-VE')}
                  </span>
                </div>
              </div>

              <button
                onClick={() => procesarCotizacion()}
                disabled={cargando}
                className="w-full py-6 rounded-[2rem] font-black text-xl text-white bg-orange-600 hover:bg-orange-500 shadow-xl shadow-orange-900/40 transition-all active:scale-95 uppercase italic tracking-tighter"
              >
                {cargando
                  ? 'PROCESANDO...'
                  : tipoOperacion === 'cotizacion'
                    ? 'Confirmar Presupuesto'
                    : 'Registrar Venta'}
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
              <div className="relative bg-orange-600 p-3 rounded-2xl">
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
                    <span className="text-4xl font-black text-orange-700 leading-tight">
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
            <div className="flex items-center gap-2 font-black text-orange-400">
              {' '}
              REVISAR <ChevronUp size={20} />
            </div>
          </button>
        </div>
      )}

      {/* --- MODAL RESUMEN MÓVIL OPTIMIZADO --- */}
      {/* --- MODAL DE RESUMEN MÓVIL --- */}
      {mostrarModalResumen && (
        <div className="lg:hidden fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-white rounded-t-[3rem] p-6 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-slate-800">Tu Pedido</h2>
              <button
                onClick={() => setMostrarModalResumen(false)}
                className="p-3 bg-slate-100 rounded-full text-slate-500"
              >
                <X size={24} />
              </button>
            </div>

            {/* Lista de productos en el móvil */}
            <div className="space-y-4 mb-8">
              {carrito.map((item) => (
                <TarjetaProductoCarrito
                  key={`movil-${item.id}`}
                  item={item}
                  actualizarItem={actualizarItem}
                  setCarrito={setCarrito}
                  carrito={carrito}
                  monedaPrincipal={monedaPrincipal}
                  tasaBCV={tasaBCV}
                />
              ))}
            </div>

            {/* Inputs de Pago (Solo si es Venta Directa) */}
            {renderSeccionPago()}

            {/* Notas y Botón Final */}
            <div className="space-y-4">
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Notas o dirección de envío..."
                className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 text-sm"
                rows={2}
              />

              <div className="flex justify-between items-center px-2">
                <span className="font-black text-slate-400">TOTAL</span>
                <span className="text-3xl font-black text-orange-700">
                  ${calcularTotal().toLocaleString()}
                </span>
              </div>

              <button
                onClick={() => {
                  if (!clienteSeleccionado)
                    return alert('Selecciona un cliente');
                  procesarCotizacion();
                }}
                disabled={cargando}
                className={`w-full py-5 rounded-[2rem] font-black text-xl text-white shadow-xl ${
                  tipoOperacion === 'cotizacion'
                    ? 'bg-orange-600'
                    : 'bg-emerald-600'
                }`}
              >
                {cargando ? 'PROCESANDO...' : 'CONFIRMAR Y GENERAR'}
              </button>
            </div>
          </div>
        </div>
      )}
      <style jsx global>{`
        .custom-scroll-dark::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scroll-dark::-webkit-scrollbar-thumb {
          background: #ff6b00;
          border-radius: 10px;
        }
        .custom-scroll-dark::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
        }
      `}</style>
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
  return (
    <div className="bg-slate-50 p-4 rounded-[2rem] border-2 border-slate-100 mb-3">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <p className="font-black text-slate-800 leading-tight uppercase text-sm mb-2">
            {item.nombre}
          </p>

          {/* --- BLOQUE DE PRECIO EDITABLE --- */}
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              Precio Unit. ($)
            </label>
            <div className="flex items-center gap-1">
              <span className="font-black text-orange-500">$</span>
              <input
                type="number"
                step="any"
                // Si el precio es 0, muestra vacío para escribir limpio
                value={item.precio === 0 ? '' : item.precio}
                onChange={(e) =>
                  actualizarItem(item.id, 'precio', e.target.value)
                }
                onFocus={(e) => e.target.select()}
                className="w-24 bg-white border-b-2 border-blue-200 font-black text-lg text-orange-700 outline-none px-1 rounded-sm"
              />
            </div>
            {/* Referencia en Bs. justo debajo */}
            {monedaPrincipal === 'BS' && (
              <p className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full w-fit">
                ≈ Bs.{' '}
                {(item.precio * tasaBCV).toLocaleString('es-VE', {
                  minimumFractionDigits: 2,
                })}
              </p>
            )}
          </div>
        </div>

        {/* Botón de eliminar */}
        <button
          onClick={() =>
            setCarrito(carrito.filter((i: any) => i.id !== item.id))
          }
          className="p-2 text-red-400 hover:text-red-600 transition-colors"
        >
          <Trash2 size={20} />
        </button>
      </div>

      <div className="flex justify-between items-center bg-white p-3 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() =>
              actualizarItem(
                item.id,
                'cantidad',
                (item.cantidad - 1).toString(),
              )
            }
            className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 active:bg-slate-200"
          >
            <Minus size={18} />
          </button>

          <input
            type="number"
            step="0.01"
            value={item.cantidad === 0 ? '' : item.cantidad}
            onChange={(e) =>
              actualizarItem(item.id, 'cantidad', e.target.value)
            }
            onFocus={(e) => e.target.select()}
            className="w-12 text-center font-black text-xl text-slate-800 outline-none bg-transparent"
          />

          <button
            onClick={() =>
              actualizarItem(
                item.id,
                'cantidad',
                (item.cantidad + 1).toString(),
              )
            }
            className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white active:bg-orange-700 shadow-lg shadow-blue-200"
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Subtotal del item */}
        <div className="text-right">
          <p className="text-[9px] font-black text-slate-400 uppercase">
            Subtotal
          </p>
          <p className="font-black text-slate-800">
            ${(item.precio * item.cantidad).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
