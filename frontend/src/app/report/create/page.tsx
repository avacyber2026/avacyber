"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ReportCreatePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/tickets/new");
  }, [router]);
  return null;
}
