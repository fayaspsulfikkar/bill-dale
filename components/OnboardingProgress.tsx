"use client";

import { motion } from "framer-motion";

interface Props {
  currentStep: number;
  steps: string[];
}

export function OnboardingProgress({ currentStep, steps }: Props) {
  return (
    <div className="w-full max-w-md mx-auto mb-8">
      <div className="flex items-center justify-between relative">
        {/* Track line */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-border" />
        <motion.div
          className="absolute top-4 left-0 h-0.5 bg-primary origin-left"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: (currentStep - 1) / (steps.length - 1) }}
          transition={{ duration: 0.4 }}
          style={{ width: "100%" }}
        />

        {steps.map((step, i) => {
          const stepNum = i + 1;
          const isDone = stepNum < currentStep;
          const isActive = stepNum === currentStep;
          return (
            <div key={step} className="relative flex flex-col items-center gap-2 z-10">
              <motion.div
                initial={false}
                animate={{
                  backgroundColor: isDone || isActive ? "hsl(var(--primary))" : "hsl(var(--card))",
                  borderColor: isDone || isActive ? "hsl(var(--primary))" : "hsl(var(--border))",
                }}
                className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold"
              >
                {isDone ? (
                  <svg className="w-4 h-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className={isDone || isActive ? "text-primary-foreground" : "text-muted-foreground"}>
                    {stepNum}
                  </span>
                )}
              </motion.div>
              <span className={`text-xs font-medium whitespace-nowrap ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
