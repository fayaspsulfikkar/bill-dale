"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "valid" | "invalid" | "expired" | "accepted">("loading");
  const [invite, setInvite] = useState<{ business_id: string; role: string; businesses?: { name: string } } | null>(null);
  const [businessName, setBusinessName] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      const { data: inv } = await supabase.from("staff_invitations").select("*").eq("token", token).single();
      if (!inv) { setStatus("invalid"); return; }
      if (inv.accepted_at) { setStatus("accepted"); return; }
      if (new Date(inv.expires_at) < new Date()) { setStatus("expired"); return; }

      const { data: biz } = await supabase.from("businesses").select("*").eq("id", inv.business_id).single();
      setBusinessName(biz?.name ?? "a business");
      setInvite({ business_id: inv.business_id, role: inv.role });
      setStatus("valid");
    };
    load();
  }, [token]);

  const handleJoin = () => {
    if (!supabase) {
      // Mock: just redirect
      router.push("/dashboard");
      return;
    }
    signInWithGoogle();
    // AuthProvider will detect new session → business membership lookup
    // For full impl, a server-side function would create the business_member row after OAuth
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="flex justify-center mb-8">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(var(--primary),0.4)]">
            <span className="font-black text-background text-2xl">B</span>
          </div>
        </div>

        <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-2xl text-center">
          {status === "loading" && <Loader2 className="w-10 h-10 mx-auto animate-spin text-primary" />}

          {status === "valid" && (
            <>
              <CheckCircle2 className="w-10 h-10 mx-auto text-primary mb-3" />
              <h1 className="text-xl font-bold mb-1">You&apos;re invited!</h1>
              <p className="text-muted-foreground text-sm mb-6">
                Join <span className="font-semibold text-foreground">{businessName}</span> on BillDale as a{" "}
                <span className="capitalize font-semibold text-primary">{invite?.role}</span>.
              </p>
              <Button onClick={handleJoin} className="w-full h-11 font-semibold">
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google to Join
              </Button>
            </>
          )}

          {(status === "invalid" || status === "expired" || status === "accepted") && (
            <>
              <XCircle className="w-10 h-10 mx-auto text-destructive mb-3" />
              <h1 className="text-xl font-bold mb-1">
                {status === "accepted" ? "Already Accepted" : status === "expired" ? "Link Expired" : "Invalid Link"}
              </h1>
              <p className="text-muted-foreground text-sm mb-4">
                {status === "accepted" ? "This invite has already been used." : "Please ask your admin for a new invite link."}
              </p>
              <Button variant="outline" onClick={() => router.push("/login")} className="w-full">
                Go to Login
              </Button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
