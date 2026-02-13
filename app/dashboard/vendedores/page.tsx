'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function VendedoresPage() {
  const [vendedores, setVendedores] = useState<any[]>([]);
  const supabase = createClient();

  // 1. Cargar vendedores de LA MISMA empresa
  const cargarVendedores = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('empresa_id')
      .eq('id', user?.id)
      .single();

    if (perfil?.empresa_id) {
      const { data } = await supabase
        .from('perfiles')
        .select('*')
        .eq('empresa_id', perfil.empresa_id)
        .eq('rol', 'vendedor');
      setVendedores(data || []);
    }
  };

  useEffect(() => {
    cargarVendedores();
  }, []);

  // Aquí iría un formulario similar al que usamos en el Panel Maestro
  // pero que guarde automáticamente el empresa_id del Dueño y rol: 'vendedor'

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Gestionar Vendedores</h1>
      {/* Tabla de vendedores y formulario de creación rápida */}
    </div>
  );
}
