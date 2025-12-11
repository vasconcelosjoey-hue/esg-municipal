import React, { useState, useRef, useEffect } from 'react';
import { CATEGORIES } from '../constants';
import { AnswerValue, AnswersState, EvidencesState, RespondentData } from '../types';
import { saveDraft, saveAnswerToFirestore, fetchRespondentProgress, saveEvidenceComment } from '../utils';
import EvidenceUploader from './EvidenceUploader';

interface Props {
  answers: AnswersState;
  evidences: EvidencesState;
  respondent: RespondentData;
  onAnswerChange: (id: string, value: AnswerValue) => void;
  onEvidenceChange: (id: string, evidence: any) => void;
  onFinish: () => void;
  isSaving?: boolean;
}

const Assessment: React.FC<Props> = ({ answers, evidences, respondent, onAnswerChange, onEvidenceChange, onFinish, isSaving = false }) => {
  const [missingIds, setMissingIds] = useState<string[]>([]);
  const [expandedEvidenceId, setExpandedEvidenceId] = useState<string | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState<'saved' | 'saving'>('saved');

  const allQuestionIds = useRef<string[]>(CATEGORIES.flatMap(c => c.questions.map(q => q.id)));

  // Load Progress from Firestore
  useEffect(() => {
      if (respondent.uid) {
          fetchRespondentProgress(respondent.uid).then(progress => {
              Object.entries(progress.answers).forEach(([k, v]) => onAnswerChange(k, v));
              Object.entries(progress.evidences).forEach(([k, v]) => onEvidenceChange(k, v));
          });
      }
  }, [respondent.uid]);

  // Trigger Local Autosave on changes
  useEffect(() => {
    setAutosaveStatus('saving');
    const timer = setTimeout(() => {
        saveDraft(respondent, answers, evidences);
        setAutosaveStatus('saved');
    }, 1000); 
    return () => clearTimeout(timer);
  }, [answers, evidences, respondent]);

  const totalQuestions = CATEGORIES.reduce((acc, cat) => acc + cat.questions.length, 0);
  const answeredCount = Object.keys(answers).length;
  const progressPercentage = Math.round((answeredCount / totalQuestions) * 100);
  
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  let globalQuestionCounter = 0;

  const handleOptionSelect = (questionId: string, value: AnswerValue) => {
      onAnswerChange(questionId, value);
      
      // REALTIME CLOUD SAVE
      if (respondent.uid) {
          saveAnswerToFirestore(respondent.uid, questionId, value);
      }

      if(missingIds.includes(questionId)) {
          setMissingIds(prev => prev.filter(id => id !== questionId));
      }

      const currentIndex = allQuestionIds.current.indexOf(questionId);
      if (currentIndex !== -1 && currentIndex < allQuestionIds.current.length - 1) {
          const nextQuestionId = allQuestionIds.current[currentIndex + 1];
          setTimeout(() => {
              const nextEl = document.getElementById(`question-${nextQuestionId}`);
              if (nextEl) {
                  nextEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
          }, 300); 
      }
  };

  const handleCommentChange = (questionId: string, comment: string) => {
      // Update Local State immediately
      const currentEvidence = evidences[questionId] || { questionId, timestamp: new Date().toISOString() };
      onEvidenceChange(questionId, { ...currentEvidence, comment });
  };
  
  const handleCommentBlur = (questionId: string, comment: string) => {
      // Trigger Cloud Autosave on Blur
      if (respondent.uid) {
          saveEvidenceComment(respondent.uid, questionId, comment);
      }
  };

  const toggleEvidence = (id: string) => {
      setExpandedEvidenceId(prev => prev === id ? null : id);
  };

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
      alert(`Atenção: Você ainda precisa responder ${missing.length} pergunta(s) antes de finalizar.`);
      const firstMissingElement = document.getElementById(`question-${missing[0]}`);
      if (firstMissingElement) firstMissingElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      setMissingIds([]);
      onFinish();
    }
  };

  const jumpToNextMissing = () => {
    const missing: string[] = [];
    CATEGORIES.forEach(cat => {
      cat.questions.forEach(q => {
        if (!answers[q.id]) missing.push(q.id);
      });
    });

    if (missing.length > 0) {
      setMissingIds(missing);
      const el = document.getElementById(`question-${missing[0]}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-4', 'ring-red-400');
        setTimeout(() => el.classList.remove('ring-4', 'ring-red-400'), 1000);
      }
    }
  };

  return (
    <div className="space-y-12 pb-20 relative">
      
      {/* Autosave Indicator */}
      <div className="fixed top-24 right-4 z-40 bg-white/90 backdrop-blur border border-slate-200 px-3 py-1 rounded-full shadow-sm text-xs font-bold text-slate-500 flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${autosaveStatus === 'saving' ? 'bg-yellow-400 animate-pulse' : 'bg-emerald-500'}`}></div>
          {autosaveStatus === 'saving' ? 'Salvando...' : 'Salvo na Nuvem'}
      </div>

      {/* Floating Progress Bubble */}
      <div className="fixed bottom-6 left-4 sm:left-8 z-[70] animate-fade-in-up print:hidden">
        <div className="relative group cursor-default">
           <div className="absolute inset-0 bg-emerald-500 rounded-full blur opacity-30 group-hover:opacity-50 transition-opacity duration-500"></div>
           <div className="relative bg-white rounded-full p-1 shadow-2xl border border-slate-100 w-24 h-24 flex items-center justify-center transform group-hover:scale-105 transition-transform duration-300">
              <svg className="transform -rotate-90 w-full h-full absolute inset-0 pointer-events-none" width="96" height="96" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r={radius} stroke="#f1f5f9" strokeWidth="8" fill="none" />
                <circle cx="48" cy="48" r={radius} stroke="url(#progressGradient)" strokeWidth="8" fill="none" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className="transition-all duration-700 ease-out" />
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
          <div className="bg-emerald-700 px-6 py-5 border-b border-emerald-800 flex items-center gap-3">
            <div className="h-8 w-1 bg-white rounded-full"></div>
            <h3 className="text-xl font-bold text-white tracking-wide">{category.title}</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {category.questions.map((q) => {
              const isMissing = missingIds.includes(q.id) && !answers[q.id];
              globalQuestionCounter++;
              const hasEvidence = evidences[q.id] && (evidences[q.id].fileName || evidences[q.id].comment);
              const evidenceData = evidences[q.id];
              const isExpanded = expandedEvidenceId === q.id;

              return (
                <div id={`question-${q.id}`} key={q.id} className={`p-6 md:p-8 transition-all duration-300 ${isMissing ? 'bg-red-50/50' : 'hover:bg-slate-50'}`}>
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1 flex gap-3">
                        <span className="text-lg font-black text-emerald-600/40 select-none pt-1 min-w-[30px]">{globalQuestionCounter}.</span>
                        <div className="flex-1">
                            <p className={`text-lg font-medium mb-4 ${isMissing ? 'text-red-800' : 'text-slate-700'}`}>
                                {q.text}
                                {isMissing && <span className="block mt-1 text-xs font-bold text-red-600 bg-red-100 w-fit px-2 py-1 rounded uppercase tracking-wide animate-pulse">Resposta Obrigatória</span>}
                            </p>
                            
                            {/* Evidence Toggle Button with Badge */}
                            <button 
                                onClick={() => toggleEvidence(q.id)}
                                className={`text-xs font-bold flex items-center gap-2 transition-all px-3 py-2 rounded-lg border ${hasEvidence ? 'text-emerald-700 bg-emerald-50 border-emerald-200 shadow-sm' : 'text-slate-500 bg-white border-slate-200 hover:border-emerald-300 hover:text-emerald-600'}`}
                            >
                                {hasEvidence ? (
                                    <>
                                        <span className="flex items-center justify-center w-5 h-5 bg-emerald-600 text-white rounded-full text-[10px]">✔</span>
                                        <span>Evidência / Comentário</span>
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                        </svg>
                                        <span>Adicionar Evidência (Opcional)</span>
                                    </>
                                )}
                            </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 md:min-w-[300px] justify-end ml-10 md:ml-0">
                        {[
                          { label: 'SIM', value: AnswerValue.YES, baseClass: 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100', activeClass: 'bg-emerald-600 text-white border-emerald-600 ring-emerald-300' },
                          { label: 'PARCIAL', value: AnswerValue.PARTIAL, baseClass: 'bg-amber-50 text-slate-900 border-amber-200 hover:bg-amber-100', activeClass: 'bg-amber-300 text-black border-amber-400 ring-amber-200' },
                          { label: 'NÃO', value: AnswerValue.NO, baseClass: 'bg-red-50 text-slate-900 border-red-200 hover:bg-red-100', activeClass: 'bg-red-300 text-black border-red-400 ring-red-200' },
                        ].map((option) => {
                           const isActive = answers[q.id] === option.value;
                           return (
                            <button
                                key={option.value}
                                onClick={() => handleOptionSelect(q.id, option.value)}
                                className={`px-4 py-3 rounded-xl text-sm font-bold border transition-all transform active:scale-95 flex-1 md:flex-none text-center shadow-sm ${isActive ? `ring-2 ring-offset-1 shadow-md scale-105 ${option.activeClass}` : option.baseClass}`}
                            >
                                {option.label}
                            </button>
                           );
                        })}
                      </div>
                  </div>

                  {/* Evidence Section (Accordion) */}
                  {isExpanded && (
                      <div className="mt-4 ml-10 bg-slate-50 border border-slate-200 rounded-xl p-5 animate-fade-in shadow-inner">
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-2 tracking-wide">Comentários / Justificativa</label>
                          <textarea 
                              className="w-full p-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none mb-4 bg-white"
                              rows={3}
                              placeholder="Descreva a evidência ou justifique a resposta..."
                              value={evidences[q.id]?.comment || ''}
                              onChange={(e) => handleCommentChange(q.id, e.target.value)}
                              onBlur={(e) => handleCommentBlur(q.id, e.target.value)}
                          />
                          
                          <div className="border-t border-slate-200 pt-4">
                              <EvidenceUploader 
                                  uid={respondent.uid!}
                                  questionId={q.id}
                                  comment={evidences[q.id]?.comment}
                                  currentEvidence={evidenceData}
                                  onUploadComplete={(metadata) => onEvidenceChange(q.id, { ...evidences[q.id], ...metadata })}
                                  onDelete={() => {
                                      const { fileUrl, fileName, fileType, fileSize, storagePath, ...rest } = evidences[q.id] || {};
                                      onEvidenceChange(q.id, { ...rest, timestamp: new Date().toISOString() });
                                  }}
                              />
                          </div>
                      </div>
                  )}
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
          disabled={isSaving}
          className={`px-12 py-5 rounded-2xl text-xl font-bold shadow-xl transition-all transform flex items-center gap-3 ${isSaving ? 'bg-slate-400 text-slate-200 cursor-wait' : 'bg-slate-900 text-white hover:bg-slate-800 hover:-translate-y-1'}`}
        >
          {isSaving ? (
            <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <span>Enviando Respostas...</span>
            </>
          ) : (
            <>
                <span>Gerar Plano de Ação</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Assessment;