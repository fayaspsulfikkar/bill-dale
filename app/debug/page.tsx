"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function DebugPage() {
  const [status, setStatus] = useState("Checking...");
  const [env, setEnv] = useState<{ url: string; keyPrefix: string } | null>(null);

  useEffect(() => {
    const check = async () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
      
      setEnv({
        url,
        keyPrefix: key.substring(0, 10) + "..."
      });

      if (!supabase) {
        setStatus("Supabase client is null. Environment variables are missing.");
        return;
      }

      try {
        const { error } = await supabase.from('businesses').select('id').limit(1);
        if (error) {
          setStatus("DB Error: " + error.message);
        } else {
          setStatus("Connection successful!");
        }
      } catch (e: any) {
        setStatus("Fetch Error: " + (e.message || String(e)));
      }
    };
    check();
  }, []);

  return (
    <div className="p-10 font-mono text-sm space-y-4">
      <h1 className="text-xl font-bold">Vercel Debug Page</h1>
      <div><strong>Status:</strong> {status}</div>
      <div><strong>URL:</strong> {env?.url || "EMPTY"}</div>
      <div><strong>Key Prefix:</strong> {env?.keyPrefix || "EMPTY"}</div>
      <div><strong>Original Error Message from last message:</strong> "secure internet connection again and again"</div>
    </div>
  );
}
