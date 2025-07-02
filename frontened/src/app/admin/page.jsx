"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthStore } from "@/app/stores/authStore";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { toast } from "react-hot-toast";
import AdminPanel from "@/app/components/AdminPanel";

export default function Admin() {
  const { user, isAuthenticated, initialize } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    initialize();
    if (!isAuthenticated || user?.role !== "ADMIN") {
      toast.error("Access denied. Admins only.");
      router.push("/admin-login");
    }
  }, [isAuthenticated, user, router, initialize]);

  if (!isAuthenticated || user?.role !== "ADMIN") {
    return null; // Render nothing while redirecting
  }

  return (
    <div className="flex flex-col min-h-screen text-black">
      <Navbar cartCount={0} />
      <AdminPanel setPage={(page) => router.push(`/${page}`)} />
      <Footer />
    </div>
  );
}