import React from 'react';
import { motion } from 'motion/react';
import { Coffee, CheckCircle2 } from 'lucide-react';

export default function Onboarding({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="fixed inset-0 bg-paper z-[100] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white p-12 rounded-[2rem] shadow-2xl space-y-8 text-center border border-soft-clay/20"
      >
        <div className="w-20 h-20 bg-soft-clay/30 rounded-full flex items-center justify-center mx-auto mb-8">
          <Coffee className="w-10 h-10 text-ink" />
        </div>
        
        <div className="space-y-4">
          <h2 className="text-4xl font-serif">Welcome to Hours</h2>
          <p className="text-muted-ink italic leading-relaxed">
            A simple space to log your life, hour by hour. Be honest, be mindful, and watch how you grow.
          </p>
        </div>

        <ul className="text-left space-y-4">
          <li className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-ink flex-shrink-0 mt-0.5" />
            <span className="text-sm">Log your activities hourly to see where time goes.</span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-ink flex-shrink-0 mt-0.5" />
            <span className="text-sm">Set intentions and track progress towards goals.</span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-ink flex-shrink-0 mt-0.5" />
            <span className="text-sm">Reflect daily in your mindful journal.</span>
          </li>
        </ul>

        <button 
          onClick={onComplete}
          className="w-full py-4 bg-ink text-white rounded-2xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-ink/20"
        >
          Begin tracking
        </button>
      </motion.div>
    </div>
  );
}
