'use client';

import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import Navbar from "../app/components/Navbar";
import Footer from "../app/components/Footer";
import { useCartStore } from "../app/stores/cartStore";
import { useAuthStore } from "../app/stores/authStore";
import { useEffect } from "react";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClientSideInitializer />
        <Toaster position="top-right" />
        <div className="flex flex-col min-h-screen">
          <Navbar />
          {children}
          <Footer />
        </div>
      </body>
    </html>
  );
}

function ClientSideInitializer() {
  const initializeAuth = useAuthStore((state) => state.initialize);
  const syncCart = useCartStore((state) => state.syncCart);

  useEffect(() => {
    initializeAuth();
    syncCart();
  }, [initializeAuth, syncCart]);

  return null;
}
