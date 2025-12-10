import React, { useState } from 'react';
import { CATEGORIES } from '../constants';
import { AnswerValue, AnswersState } from '../types';

interface Props {
  answers: AnswersState;
  onAnswerChange: (id: string, value: AnswerValue) => void;
  onFinish: () => void;
}

const Assessment: React.FC<Props> = ({ answers, onAnswerChange, onFinish }) => {
  const [missingIds, setMissingIds] = useState<string[]>([]);

  // Calculate total progress
  const totalQuestions = CATEGORIES.reduce((acc, cat) => acc + cat.questions.length, 0);
  const answeredCount = Object.keys(answers).length;
  const progressPercentage = Math.round((answeredCount / totalQuestions) * 100);
  
  // Circle geometry for progress ring
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  // Global question counter for sequential numbering
  let globalQuestionCounter = 0;

  const handleFinishAttempt = () => {
    const missing: string[] = [];
    CATEGORIES.forEach(cat => {
      cat.questions.forEach(q => {
        if (!answers[q.id]) {
          missing.push(q.id);
        }
      });
    });

    if (missing.length > 0) {
      setMissingIds(missing);
      // Scroll to first missing
      const firstMissingElement = document.getElementById(`question-${missing[0]}`);
      if (firstMissingElement) {
        firstMissingElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      setMissingIds([]);
      onFinish();
    }
  };

  const jumpToNextMissing = () => {
    const missing: string[] = [];
    CATEGORIES.forEach(cat => {
      cat.questions.forEach(q => {
        if (!answers[q.id]) {
          missing.push(q.id);
        }
      });
    });

    if (missing.length > 0) {
      setMissingIds(missing);
      // Always jump to the first one found to guide the user sequentially
      const el = document.getElementById(`question-${missing[0]}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add a highlight effect temporarily
        el.classList.add('ring-4', 'ring-red-400');
        setTimeout(() => el.classList.remove('ring-4', 'ring-red-400'), 1000);
      }
    } else {
       // If clicked and solved, remove the button
       setMissingIds([]);
    }
  };

  return (
    <div className="space-y-12 pb-20 relative">
      
      {/* Floating Progress Bubble (Bottom Left) */}
      <div className="fixed bottom-6 left-4 sm:left-8 z-[70] animate-fade-in-up print:hidden">
        <div className="relative group cursor-default">
           {/* Glow effect */}
           <div className="absolute inset-0 bg-emerald-500 rounded-full blur opacity-30 group-hover:opacity-50 transition-opacity duration-500"></div>
           
           <div className="relative bg-white rounded-full p-1 shadow-2xl border border-slate-100 w-24 h-24 flex items-center justify-center transform group-hover:scale-105 transition-transform duration-300">
              {/* SVG Circle Progress */}
              <svg className="transform -rotate-90 w-full h-full absolute inset-0 pointer-events-none" width="96" height="96" viewBox="0 0 96 96">
                {/* Background Ring */}
                <circle 
                  cx="48" cy="48" r={radius} 
                  stroke="#f1f5f9" 
                  strokeWidth="8" 
                  fill="none" 
                />
                {/* Progress Ring */}
                <circle
                   cx="48" cy="48" r={radius}
                   stroke="url(#progressGradient)" 
                   strokeWidth="8"
                   fill="none"
                   strokeDasharray={circumference}
                   strokeDashoffset={strokeDashoffset}
                   strokeLinecap="round"
                   className="transition-all duration-700 ease-out"
                />
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#0d9488" />
                  </linearGradient>
                </defs>
              </svg>
              
              <div className="flex flex-col items-center justify-center relative z-10">
                <span className="text-2xl font-black text-slate-800 leading-none tracking-tight">
                  {progressPercentage}<span className="text-xs align-top">%</span>
                </span>
                <span className="text-[8px] font-bold text-slate-400 uppercase mt-1 tracking-wider">Concluído</span>
              </div>
           </div>
        </div>
      </div>

      {CATEGORIES.map((category) => (
        <div key={category.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Stronger Header Color */}
          <div className="bg-emerald-700 px-6 py-5 border-b border-emerald-800 flex items-center gap-3">
            <div className="h-8 w-1 bg-white rounded-full"></div>
            <h3 className="text-xl font-bold text-white tracking-wide">{category.title}</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {category.questions.map((q) => {
              const isMissing = missingIds.includes(q.id) && !answers[q.id];
              globalQuestionCounter++; // Increment global counter
              
              return (
                <div 
                  id={`question-${q.id}`}
                  key={q.id} 
                  className={`p-6 md:p-8 transition-all duration-300 ${isMissing ? 'bg-red-50/50' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1 flex gap-3">
                        <span className="text-lg font-black text-emerald-600/40 select-none pt-1 min-w-[30px]">
                            {globalQuestionCounter}.
                        </span>
                        <div className="flex-1">
                            <p className={`text-lg font-medium mb-4 ${isMissing ? 'text-red-800' : 'text-slate-700'}`}>
                                {q.text}
                                {isMissing && (
                                    <span className="block mt-1 text-xs font-bold text-red-600 bg-red-100 w-fit px-2 py-1 rounded uppercase tracking-wide animate-pulse">
                                        Resposta Obrigatória
                                    </span>
                                )}
                            </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 md:min-w-[300px] justify-end ml-10 md:ml-0">
                        {[
                        { label: 'SIM', value: AnswerValue.YES, color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' },
                        { label: 'PARCIAL', value: AnswerValue.PARTIAL, color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' },
                        { label: 'NÃO', value: AnswerValue.NO, color: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' },
                        { label: 'N/A', value: AnswerValue.NA, color: 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100' },
                        ].map((option) => (
                        <button
                            key={option.value}
                            onClick={() => {
                                onAnswerChange(q.id, option.value);
                                if(missingIds.includes(q.id)) {
                                    setMissingIds(prev => prev.filter(id => id !== q.id));
                                }
                            }}
                            className={`
                            px-4 py-3 rounded-xl text-sm font-bold border transition-all transform active:scale-95 flex-1 md:flex-none text-center
                            ${answers[q.id] === option.value 
                                ? 'ring-2 ring-offset-1 ring-emerald-500 shadow-md ' + option.color.replace('50', '600').replace('text-', 'text-white bg-').replace('border-', 'border-transparent ') 
                                : option.color}
                            `}
                        >
                            {option.label}
                        </button>
                        ))}
                      </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {missingIds.length > 0 && (
         <div className="fixed bottom-8 right-4 md:right-8 z-[60] animate-bounce">
            <button 
              onClick={jumpToNextMissing}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-4 rounded-full shadow-2xl font-bold flex items-center gap-3 transition-all transform hover:scale-105 border-4 border-white"
            >
              <div className="bg-white text-red-600 h-6 w-6 rounded-full flex items-center justify-center text-xs font-black">!</div>
              <span>Clique aqui para corrigir {missingIds.length} pendência(s)</span>
            </button>
         </div>
      )}

      <div className="flex justify-center pt-12">
        <button
          onClick={handleFinishAttempt}
          className="bg-slate-900 text-white px-12 py-5 rounded-2xl text-xl font-bold shadow-xl hover:bg-slate-800 transition-all transform hover:-translate-y-1 flex items-center gap-3"
        >
          <span>Gerar Plano de Ação</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Assessment;