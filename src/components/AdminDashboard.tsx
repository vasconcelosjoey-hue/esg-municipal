import React, { useMemo, useState, useEffect } from 'react';
import { getSubmissions, generateFullActionPlan, deleteSubmission, clearAllSubmissions } from '../utils';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, PieChart, Pie, Legend, Tooltip, AreaChart, Area } from 'recharts';
import { CATEGORIES } from '../constants';
import { Submission, TimeFrame, ActionPlanItem, AssessmentResult } from '../types';
import Dashboard from './Dashboard';

// Premium Color Palette
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

// ... (Keep existing aggregate logic / components same, only update the Details view)

const AdminDashboard: React.FC = () => {
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // ... (Keep useEffect fetch logic)
  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await getSubmissions();
        if (mounted) {
          setSubmissions(data);
          setLoading(false);
        }
      } catch (error) {
        console.error("Failed to fetch", error);
        if (mounted) setLoading(false);
      }
    };
    fetchData();
    return () => { mounted = false; };
  }, [refreshKey]);

  const handleRefresh = () => setRefreshKey(prev => prev + 1);

  // ... (Keep aggregate calculations: aggregateResult, sectorData, etc.)
  const aggregateResult: AssessmentResult | null = useMemo(() => {
    if (submissions.length === 0) return null;
    const categorySums: Record<string, number> = {};
    submissions.forEach(sub => {
        Object.entries(sub.result.categoryScores).forEach(([catId, scoreData]) => {
            const data = scoreData as { percentage: number };
            categorySums[catId] = (categorySums[catId] || 0) + data.percentage;
        });
    });
    const categoryAverages: Record<string, { score: number; max: number; percentage: number }> = {};
    let totalAvgScore = 0;
    let totalAvgMax = 0;
    CATEGORIES.forEach(cat => {
        const avgPct = (categorySums[cat.id] || 0) / submissions.length;
        const max = cat.questions.length; 
        const score = (avgPct / 100) * max;
        categoryAverages[cat.id] = { score, max, percentage: avgPct };
        totalAvgScore += score;
        totalAvgMax += max;
    });
    const globalPercentage = (totalAvgScore / totalAvgMax) * 100;
    let level: any = 'Crítico';
    if (globalPercentage >= 80) level = 'Excelente';
    else if (globalPercentage >= 40) level = 'Em Desenvolvimento';
    return { totalScore: totalAvgScore, maxScore: totalAvgMax, percentage: globalPercentage, level, categoryScores: categoryAverages };
  }, [submissions]);

  const groupedAggregateActions = useMemo(() => {
     if (!aggregateResult) return {};
     const allActions = generateFullActionPlan(aggregateResult);
     const groups: Record<string, ActionPlanItem[]> = { '1 Mês': [], '3 Meses': [], '6 Meses': [], '1 Ano': [], '5 Anos': [] };
     allActions.forEach(action => { if (groups[action.timeline]) groups[action.timeline].push(action); });
     return groups;
  }, [aggregateResult]);

  const sectorData = useMemo(() => {
    const counts: Record<string, number> = {};
    submissions.forEach(s => {
      const sector = s.respondent.sector.trim() || 'N/A';
      counts[sector] = (counts[sector] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [submissions]);

  const getActionIcon = (title: string) => {
     // ... (Keep existing icon logic)
      const lower = title.toLowerCase();
      if (lower.includes('diagnóstico') || lower.includes('análise')) return '🔍';
      if (lower.includes('lei') || lower.includes('jurídico') || lower.includes('decreto')) return '⚖️';
      if (lower.includes('obra') || lower.includes('construção')) return '🏗️';
      if (lower.includes('educação') || lower.includes('capacitação')) return '🎓';
      if (lower.includes('tecnologia') || lower.includes('digital') || lower.includes('sistema')) return '💻';
      if (lower.includes('financeiro') || lower.includes('recurso')) return '💰';
      return '⚡';
  };

  if (loading) return <div className="p-10 text-center">Carregando...</div>;

  // --- DETAIL VIEW WITH EVIDENCE ---
  if (selectedSubmission) {
      return (
        <div className="animate-fade-in">
             <div className="mb-6 flex items-center justify-between no-print px-4 md:px-0">
                <button onClick={() => setSelectedSubmission(null)} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold px-4 py-2 rounded-lg bg-white border border-slate-200">
                    ← Voltar
                </button>
             </div>
             
             {/* Evidence Section in Admin View */}
             <div className="mb-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                 <h3 className="text-xl font-bold mb-4 border-b pb-2">Evidências e Respostas Detalhadas</h3>
                 <div className="space-y-6">
                     {CATEGORIES.map(cat => (
                         <div key={cat.id}>
                             <h4 className="font-bold text-emerald-800 uppercase text-xs tracking-wider mb-2 mt-4">{cat.title}</h4>
                             <div className="space-y-2">
                                 {cat.questions.map(q => {
                                     const answer = selectedSubmission.answers[q.id];
                                     const evidence = selectedSubmission.evidences?.[q.id];
                                     const hasEvidence = evidence && (evidence.comment || evidence.fileUrl);

                                     if (!hasEvidence && answer === 'YES') return null; // Show only relevant or evidenced items to save space? Or all? Let's show all for audit.

                                     return (
                                         <div key={q.id} className="text-sm border-l-2 border-slate-200 pl-3 py-1 hover:bg-slate-50">
                                             <div className="flex justify-between">
                                                <span className="text-slate-700 font-medium w-2/3">{q.text}</span>
                                                <span className={`font-bold ${answer === 'YES' ? 'text-emerald-600' : answer === 'NO' ? 'text-red-600' : 'text-amber-600'}`}>{answer}</span>
                                             </div>
                                             {hasEvidence && (
                                                 <div className="mt-2 bg-slate-100 p-2 rounded text-xs text-slate-600">
                                                     {evidence.comment && <p className="mb-1"><strong>Nota:</strong> {evidence.comment}</p>}
                                                     {evidence.fileUrl && (
                                                         <a href={evidence.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
                                                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                                             Baixar Evidência ({evidence.fileName})
                                                         </a>
                                                     )}
                                                 </div>
                                             )}
                                         </div>
                                     );
                                 })}
                             </div>
                         </div>
                     ))}
                 </div>
             </div>

             <Dashboard result={selectedSubmission.result} respondentData={selectedSubmission.respondent} />
        </div>
      );
  }

  // --- MAIN ADMIN DASHBOARD ---
  if (submissions.length === 0) return <div className="p-10 text-center">Sem dados. <button onClick={handleRefresh}>Atualizar</button></div>;

  return (
    // ... (Keep existing Admin Dashboard layout exactly as is, just ensure <AdminDashboard> logic above handles the view switch)
    <div className="animate-fade-in pb-20 print:pb-0">
      <div className="no-print mb-8 flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-lg border border-slate-100 gap-4">
         <div>
             <h2 className="text-2xl font-black text-slate-800">Painel Administrativo</h2>
             <p className="text-slate-500 text-sm">Visão consolidada de {submissions.length} diagnósticos</p>
         </div>
         <div className="flex gap-3">
            <button onClick={handleRefresh} className="px-5 py-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl font-bold text-slate-600 transition-colors border border-slate-200">Atualizar</button>
            <button onClick={() => window.print()} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg hover:shadow-indigo-200 transition-all flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                Gerar Relatório PDF
            </button>
         </div>
      </div>
      
      {/* Existing content reused... */}
      <div className="print:block">
          <div className="hidden print:flex animus-cover">
              <div className="animus-cover-decor-top"></div>
              <div className="animus-cover-content pt-10">
                  <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center text-white font-bold text-xl border border-white/20">E</div>
                      <span className="text-sm tracking-[0.3em] font-bold uppercase opacity-80 text-indigo-100">ESG Intelligence</span>
                  </div>
                  <h1 className="animus-title leading-tight">Relatório de<br/>Performance<br/><span className="text-indigo-400">Integrada</span></h1>
              </div>
              <div className="animus-cover-content">
                  <div className="animus-subtitle mb-8 border-indigo-400">
                      Prefeitura Municipal de<br/>
                      <strong className="text-white text-3xl tracking-tight">Mogi das Cruzes</strong>
                  </div>
                  <div className="flex justify-between items-end border-t border-white/10 pt-6">
                      <div className="text-xs font-medium opacity-60 leading-relaxed">
                          Relatório Oficial v2.0<br/>
                          Gerado em {new Date().toLocaleDateString('pt-BR')}
                      </div>
                      <div className="text-right">
                          <span className="block text-5xl font-black tracking-tighter text-white">{aggregateResult?.percentage.toFixed(0)}%</span>
                          <span className="text-xs uppercase tracking-widest font-bold opacity-80 text-emerald-400">Índice Global</span>
                      </div>
                  </div>
              </div>
              <div className="animus-cover-decor-bottom"></div>
          </div>

          <div className="print-page-content">
              <h2 className="animus-section-title">1. Diagnóstico Geral</h2>
              <div className="animus-cols-2 mb-8">
                  <p className="animus-text">
                      O presente relatório consolida os dados dos diagnósticos setoriais realizados pela administração municipal. 
                      O índice global de maturidade ESG atingiu a marca de <strong className="text-indigo-900">{aggregateResult?.percentage.toFixed(0)}%</strong>, classificando a gestão no nível <strong className="text-indigo-900 uppercase">{aggregateResult?.level}</strong>.
                  </p>
                  <p className="animus-text">
                      Esta pontuação reflete o comprometimento da gestão com práticas sustentáveis. A análise dos dados indica que, embora existam iniciativas isoladas de sucesso, a padronização de processos e a integração de dados entre as secretarias participantes continuam sendo os principais desafios para a evolução do indicador.
                  </p>
              </div>

              <div className="grid grid-cols-3 gap-6 mb-8 break-inside-avoid">
                  <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-center">
                     <div className="text-4xl font-black text-indigo-900">{submissions.length}</div>
                     <div className="text-[10px] uppercase font-bold text-slate-500 mt-2 tracking-wider">Diagnósticos Realizados</div>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-center">
                     <div className="text-4xl font-black text-emerald-600">{sectorData.length}</div>
                     <div className="text-[10px] uppercase font-bold text-slate-500 mt-2 tracking-wider">Setores Participantes</div>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-center">
                      <div className="text-4xl font-black text-indigo-900">{aggregateResult?.percentage.toFixed(0)}%</div>
                      <div className="text-[10px] uppercase font-bold text-slate-500 mt-2 tracking-wider">Score Global Médio</div>
                  </div>
              </div>

             <h2 className="animus-section-title">2. Plano de Ação Integrado</h2>
             <div className="animus-grid-actions">
                 {(['1 Mês', '3 Meses', '6 Meses', '1 Ano'] as TimeFrame[]).map(tf => {
                     const actions = groupedAggregateActions[tf] || [];
                     if(actions.length === 0) return null;
                     return (
                         <div key={tf} className="animus-action-group">
                             <div className="animus-action-header flex justify-between items-center">
                                <span>{tf}</span>
                                <span className="text-[7pt] bg-slate-100 px-2 rounded-full text-slate-500 font-normal normal-case">
                                    {tf.includes('Mês') ? 'Prioridade Alta' : 'Estratégico'}
                                </span>
                             </div>
                             {actions.slice(0, 5).map((act, i) => (
                                 <div key={i} className="animus-action-card">
                                     <div className="flex items-start gap-2.5">
                                         <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs shadow-sm border border-slate-100 shrink-0">{getActionIcon(act.title)}</div>
                                         <div>
                                             <div className="font-bold text-[9pt] text-slate-800 leading-tight mb-0.5">{act.title}</div>
                                             <div className="text-[8pt] text-slate-500 leading-tight">{act.description}</div>
                                         </div>
                                     </div>
                                 </div>
                             ))}
                         </div>
                     )
                 })}
             </div>
             
             {/* ... Long term vision ... */}
          </div>
          <div className="print-footer">
              <span className="font-bold uppercase tracking-widest text-[7pt] text-slate-400">Relatório ESG Municipal</span>
              <span className="text-[7pt] text-slate-400">Confidencial • Uso Interno</span>
          </div>
      </div>
      
      {/* Table for Admin View (Web) */}
       <div className="mx-4 md:mx-0 bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden print:hidden mt-8">
         <div className="px-6 py-6 md:px-10 md:py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div>
                <h3 className="font-black text-xl md:text-2xl text-slate-900">Diagnósticos Individuais</h3>
                <p className="text-slate-600 text-sm md:text-base mt-1">Clique em "Ver Detalhes" para acessar evidências e anexos.</p>
            </div>
         </div>
         <div className="overflow-x-auto">
             <table className="min-w-full divide-y divide-slate-100">
                 <thead className="bg-white">
                     <tr>
                         <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase">Respondente</th>
                         <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase">Setor</th>
                         <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase">Maturidade</th>
                         <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase">Ação</th>
                     </tr>
                 </thead>
                 <tbody className="bg-white divide-y divide-slate-50">
                     {submissions.map((sub) => (
                         <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                             <td className="px-6 py-4 font-bold text-slate-900">{sub.respondent.name}</td>
                             <td className="px-6 py-4 text-slate-600">{sub.respondent.sector}</td>
                             <td className="px-6 py-4"><span className={`font-black ${sub.result.percentage < 40 ? 'text-red-600' : 'text-emerald-600'}`}>{sub.result.percentage.toFixed(0)}%</span></td>
                             <td className="px-6 py-4">
                                 <button onClick={() => setSelectedSubmission(sub)} className="text-emerald-700 font-bold text-xs bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-xl hover:bg-emerald-600 hover:text-white transition-all">
                                     Ver Detalhes & Evidências
                                 </button>
                             </td>
                         </tr>
                     ))}
                 </tbody>
             </table>
         </div>
      </div>
    </div>
  );
};

export default AdminDashboard;