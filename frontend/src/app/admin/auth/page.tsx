"use client";

import { useRouter } from "next/navigation";
import { AdminLoginForm } from "@/Components";

export default function AdminAuthPage() {
  const router = useRouter();

  function onSuccess() {
    router.replace("/admin");
  }

  return <AdminLoginForm onSuccess={onSuccess} />;
}
