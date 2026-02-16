import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Navbar from '../components/Navbar';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Cotizador Pro',
  description: 'Sistema de gestión de inventario y clientes',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {/* AGREGAMOS EL NAVBAR AQUÍ PARA QUE APAREZCA EN TODAS LAS PÁGINAS */}
        {<Navbar />}

        {/* EL CONTENIDO DE LAS PÁGINAS SE RENDERIZA AQUÍ ABAJO */}
        <main className="pb-24 md:pb-8">{children}</main>
      </body>
    </html>
  );
}
