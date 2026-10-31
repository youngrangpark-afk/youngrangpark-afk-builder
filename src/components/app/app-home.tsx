"use client";

import { useEffect, useState } from "react";
import { BrandFormLoader } from "@/components/app/brand-form";
import { Dashboard } from "@/components/app/dashboard";
import { Card } from "@/components/ui/card";
import type { Database } from "@/lib/database.types";
import { getBrowserSupabase } from "@/lib/supabase/browser";

type Brand = Pick<
  Database["public"]["Tables"]["brands"]["Row"],
  "id" | "name" | "category" | "auto_mode" | "aliases" | "aliases_checked_at"
>;

// `/app` (D-23): 로그인했고 진단한 브랜드가 있으면 대시보드, 아니면 브랜드 입력
export function AppHome() {
  const [brands, setBrands] = useState<Brand[] | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    let stop = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        if (!stop) setBrands([]);
        return;
      }
      // 진단을 한 번이라도 시작한 브랜드만, 최근 진단 순
      const { data: runs } = await supabase
        .from("diagnosis_runs")
        .select("brand_id, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      const order = [...new Set((runs ?? []).map((r) => r.brand_id))];
      if (!order.length) {
        if (!stop) setBrands([]);
        return;
      }
      const { data: b } = await supabase.from("brands").select("id, name, category, auto_mode, aliases, aliases_checked_at").in("id", order);
      if (!stop) setBrands(order.map((id) => b?.find((x) => x.id === id)).filter((x): x is Brand => !!x));
    })();
    return () => {
      stop = true;
    };
  }, []);

  if (brands === null) return <Card className="h-72 animate-pulse rounded-2xl" aria-label="불러오는 중" />;
  if (brands.length === 0 || showForm) return <BrandFormLoader />;
  return <Dashboard brands={brands} onNewBrand={() => setShowForm(true)} />;
}
