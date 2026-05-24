"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Sparkles, TrendingUp, ShieldAlert, LineChart, PackageSearch } from "lucide-react";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";

function ToggleRow({ label, desc, value, onChange, icon: Icon }: { label: string; desc: string; value: boolean; onChange: () => void; icon: React.ElementType }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/40 last:border-0">
      <div className="flex gap-4 items-start">
        <div className="mt-0.5">
          <Icon className={`w-5 h-5 ${value ? "text-primary" : "text-muted-foreground"}`} />
        </div>
        <div>
          <Label className="text-sm font-medium">{label}</Label>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-md">{desc}</p>
        </div>
      </div>
      <button onClick={onChange} className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ml-4 ${value ? "bg-primary" : "bg-muted"}`}>
        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${value ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}

export default function AITab() {
  const { form, u } = useBusinessSettings();

  return (
    <div className="space-y-6 max-w-4xl pb-10">
      
      <Card className="bg-card/50 border-border/50 backdrop-blur-md overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">AI & Automation</CardTitle>
              <CardDescription className="text-xs">Enable intelligent features to optimize your business</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          
          <ToggleRow
            icon={TrendingUp}
            label="Stock Forecasting"
            desc="Predict future stock depletion rates based on historical sales data."
            value={form.ai_stock_forecasting ?? false}
            onChange={() => u({ ai_stock_forecasting: !form.ai_stock_forecasting })}
          />

          <ToggleRow
            icon={LineChart}
            label="Demand Prediction"
            desc="Identify seasonal trends and upcoming demand spikes."
            value={form.ai_demand_prediction ?? false}
            onChange={() => u({ ai_demand_prediction: !form.ai_demand_prediction })}
          />

          <ToggleRow
            icon={ShieldAlert}
            label="Fraud Detection"
            desc="Flag suspicious transactions, unusual void patterns, and extreme discounts."
            value={form.ai_fraud_detection ?? true}
            onChange={() => u({ ai_fraud_detection: !form.ai_fraud_detection })}
          />

          <ToggleRow
            icon={Sparkles}
            label="Customer Behavior Analysis"
            desc="Analyze purchase history to generate targeted marketing segments."
            value={form.ai_customer_behavior_analysis ?? false}
            onChange={() => u({ ai_customer_behavior_analysis: !form.ai_customer_behavior_analysis })}
          />

          <ToggleRow
            icon={PackageSearch}
            label="Smart Reorder Suggestions"
            desc="AI will suggest the optimal quantity to reorder based on lead time and velocity."
            value={form.ai_smart_reorder_suggestions ?? false}
            onChange={() => u({ ai_smart_reorder_suggestions: !form.ai_smart_reorder_suggestions })}
          />

        </CardContent>
      </Card>

    </div>
  );
}
