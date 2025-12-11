import React, { useMemo, useState, useEffect } from 'react';
import { fetchAllSubmissions, generateFullActionPlan, fetchSubmissionDetails } from '../utils';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, PieChart, Pie, Legend, Tooltip, AreaChart, Area } from 'recharts';
import { CATEGORIES } from '../constants';
import { Submission, TimeFrame, ActionPlanItem, AssessmentResult, Evidence, EvidencesState } from '../types';
import Dashboard from './Dashboard';
import AdminEvidenceViewer from './AdminEvidenceViewer';

const AdminDashboard: React.FC = () => {
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [detailedEvidences, setDetailedEvidences] = useState<EvidencesState>({});
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Use fetchAllSubmissions instead of getSubmissions to ensure joined data
  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Busca lista completa já formatada como array
        const data = await fetchAllSubmissions();
        
        if (mounted) {
          // 2. Atribuição direta (O utilitário já retorna Submission[])
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

  const handleSelectSubmission = async (sub: Submission) => {
      // 1. Set preliminary state from list data to ensure immediate feedback
      setSelectedSubmission(sub);
      setDetailedEvidences({}); 

      try {
          // 2. Fetch full details including subcollections
          const details = await fetchSubmissionDetails(sub.id);

          if (!details) {
              // Safety: Clear state if not found (deleted remotely etc)
              setSelectedSubmission(null);
              setDetailedEvidences({});
              return;
          }

          // 3. Update with fresh data from subcollections
          // Construct full submission object ensuring no nulls
          const updatedSubmission: Submission = {
              id: sub.id,
              timestamp: sub.timestamp,
              respondent: details.respondent,
              result: details.result, // Use result from details (recalculated if needed)
              answers: details.answers ?? {}
          };

          setSelectedSubmission(updatedSubmission);
          setDetailedEvidences(details.evidences ?? {});

      } catch (e) {
          console.error("Erro ao carregar evidências:", e);
          // Fallback: keep the list-based submission but with empty evidences
          setDetailedEvidences({});
      }
  };

  // --- AGGREGATE CALCS ---
  const aggregateResult: AssessmentResult | null = useMemo(() => {
    if (submissions.length === 0) return null;
    const categorySums: Record<string, number> = {};
    let validSubmissionsCount = 0;

    submissions.forEach(sub => {
        if (!sub.result || !sub.result.categoryScores) return;
        validSubmissionsCount++;
        Object.entries(sub.result.categoryScores).forEach(([catId, scoreData]) => {
            const data = scoreData as { percentage: number };
            categorySums[catId] = (categorySums[catId] || 0) + data.percentage;
        });
    });

    if (validSubmissionsCount === 0) return null;

    const categoryAverages: Record<string, { score: number; max: number; percentage: number }> = {};
    let totalAvgScore = 0;
    let totalAvgMax = 0;

    CATEGORIES.forEach(cat => {
        const avgPct = (categorySums[cat.id] || 0) / validSubmissionsCount;
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
      const sector = s.respondent.sector.trim() || 'Não informado';
      counts[sector] = (counts[sector] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [submissions]);

  const getActionIcon = (title: string) => {
      const lower = title.toLowerCase();
      if (lower.includes('diagnóstico') || lower.includes('análise')) return '🔍';
      if (lower.includes('lei') || lower.includes('jurídico') || lower.includes('decreto')) return '⚖️';
      if (lower.includes('obra') || lower.includes('construção')) return '🏗️';
      if (lower.includes('educação') || lower.includes('capacitação')) return '🎓';
      if (lower.includes('tecnologia') || lower.includes('digital') || lower.includes('sistema')) return '💻';
      if (lower.includes('financeiro') || lower.includes('recurso')) return '💰';
      return '⚡';
  };

  if (loading) return <div className="p-10 text-center flex flex-col items-center justify-center h-64"><div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div><span className="text-slate-500 font-bold">Carregando dados da nuvem...</span></div>;
  
  // --- DETAIL VIEW ---
  if (selectedSubmission) {
      return (
        <div className="animate-fade-in">
             <div className="mb-6 flex items-center justify-between no-print px-4 md:px-0">
                <button onClick={() => setSelectedSubmission(null)} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold px-4 py-2 rounded-lg bg-white border border-slate-200 shadow-sm hover:shadow">
                    ← Voltar ao Painel
                </button>
             </div>
             
             {/* Evidence Section for Admin - Fetched from DetailedEvidences */}
             {Object.keys(detailedEvidences).length > 0 ? (
                 <div className="no-print mx-4 md:mx-0 mb-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                     <h3 className="font-bold text-lg mb-4 text-slate-800 flex items-center gap-2">
                        <span className="bg-emerald-100 text-emerald-700 p-1.5 rounded-lg">📂</span>
                        Evidências e Comentários
                     </h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                         {Object.values(detailedEvidences)
                             .map((ev: Evidence, idx) => (
                                 <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col hover:border-emerald-200 transition-colors">
                                     <div className="flex justify-between items-start mb-3">
                                        <span className="text-[10px] font-black uppercase text-white bg-slate-400 px-2 py-0.5 rounded">ID: {ev.questionId}</span>
                                        <span className="text-[10px] text-slate-400">{new Date(ev.timestamp).toLocaleDateString('pt-BR')}</span>
                                     </div>
                                     <AdminEvidenceViewer evidence={ev} />
                                 </div>
                             ))
                         }
                     </div>
                 </div>
             ) : (
                 <div className="no-print mx-4 md:mx-0 mb-8 bg-slate-50 p-6 rounded-2xl border border-slate-200 border-dashed text-center flex flex-col items-center justify-center">
                     <span className="text-4xl mb-2 opacity-30">📭</span>
                     <span className="text-slate-400 text-sm font-bold">Nenhuma evidência ou comentário anexado a este diagnóstico.</span>
                 </div>
             )}

             <Dashboard result={selectedSubmission.result} respondentData={selectedSubmission.respondent} evidences={detailedEvidences} />
        </div>
      );
  }

  if (submissions.length === 0) return (
      <div className="p-20 text-center flex flex-col items-center justify-center bg-white rounded-3xl mx-4 my-8 shadow-sm border border-slate-200">
          <div className="text-6xl mb-4 opacity-50">📂</div>
          <h3 className="text-xl font-bold text-slate-800">Sem dados disponíveis</h3>
          <p className="text-slate-500 mb-6">Nenhum diagnóstico foi sincronizado com a nuvem ainda.</p>
          <button onClick={handleRefresh} className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors">Atualizar Agora</button>
      </div>
  );

  // ... (Rest of dashboard remains same)
  return (
    <div className="animate-fade-in pb-20 print:pb-0">
      
      {/* WEB CONTROLS */}
      <div className="no-print mb-8 flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-lg border border-slate-100 gap-4">
         <div>
             <h2 className="text-2xl font-black text-slate-800">Painel Administrativo</h2>
             <p className="text-slate-500 text-sm">Visão consolidada de {submissions.length} diagnósticos</p>
         </div>
         <div className="flex gap-3">
            <button onClick={handleRefresh} className="px-5 py-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl font-bold text-slate-600 transition-colors border border-slate-200 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Atualizar
            </button>
            <button onClick={() => window.print()} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg hover:shadow-indigo-200 transition-all flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                Gerar Relatório PDF
            </button>
         </div>
      </div>

      {/* --- PREMIUM PRINT LAYOUT --- */}
      <div className="print:block">
          
          {/* COVER PAGE */}
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

          {/* PAGE 2: GENERAL ANALYSIS & KPIs (No Charts, No TOC) */}
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

              {/* KPIs / Big Numbers instead of Charts */}
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
                                         <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs shadow-sm border border-slate-100 shrink-0">
                                            {getActionIcon(act.title)}
                                         </div>
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

             <div className="mt-4 break-inside-avoid">
                 <h2 className="animus-section-title">3. Visão de Longo Prazo (5 Anos)</h2>
                 <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 break-inside-avoid">
                     <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                        {(groupedAggregateActions['5 Anos'] || []).slice(0, 6).map((act, i) => (
                             <div key={i} className="flex items-start gap-3">
                                 <span className="text-sm mt-0.5">🚀</span>
                                 <div>
                                     <div className="font-bold text-[9pt] text-indigo-900 leading-tight">{act.title}</div>
                                     <div className="text-[8pt] text-slate-500 leading-tight mt-0.5">{act.description}</div>
                                 </div>
                             </div>
                        ))}
                     </div>
                 </div>
             </div>
          </div>

          <div className="print-footer">
              <span className="font-bold uppercase tracking-widest text-[7pt] text-slate-400">Relatório ESG Municipal</span>
              <span className="text-[7pt] text-slate-400">Confidencial • Uso Interno</span>
          </div>
      </div>

      {/* DETAILED SUBMISSIONS TABLE */}
      <div className="mx-4 md:mx-0 bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden print:border-2 print:border-slate-800 print:shadow-none print:break-before-page">
         <div className="px-6 py-6 md:px-10 md:py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div>
                <h3 className="font-black text-xl md:text-2xl text-slate-900">Diagnósticos Individuais</h3>
                <p className="text-slate-600 text-sm md:text-base mt-1">Detalhamento dos {submissions.length} registros realizados.</p>
            </div>
         </div>
         <div className="overflow-x-auto">
             <table className="min-w-full divide-y divide-slate-100">
                 <thead className="bg-white">
                     <tr>
                         <th className="px-6 py-4 md:px-10 md:py-5 text-left text-xs md:text-sm font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">Respondente</th>
                         <th className="px-6 py-4 md:px-10 md:py-5 text-left text-xs md:text-sm font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">Setor</th>
                         <th className="px-6 py-4 md:px-10 md:py-5 text-left text-xs md:text-sm font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">Data</th>
                         <th className="px-6 py-4 md:px-10 md:py-5 text-left text-xs md:text-sm font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">Maturidade</th>
                         <th className="px-6 py-4 md:px-10 md:py-5 text-left text-xs md:text-sm font-black text-slate-400 uppercase tracking-wider no-print whitespace-nowrap">Ação</th>
                     </tr>
                 </thead>
                 <tbody className="bg-white divide-y divide-slate-50">
                     {submissions.map((sub) => (
                         <tr key={sub.id} className="hover:bg-slate-50 transition-colors group">
                             <td className="px-6 py-4 md:px-10 md:py-6">
                                 <div className="font-bold text-sm md:text-lg text-slate-900">{sub.respondent.name}</div>
                             </td>
                             <td className="px-6 py-4 md:px-10 md:py-6 text-sm md:text-base font-medium text-slate-600">{sub.respondent.sector}</td>
                             <td className="px-6 py-4 md:px-10 md:py-6 text-sm md:text-base font-medium text-slate-500">{new Date(sub.timestamp).toLocaleDateString('pt-BR')}</td>
                             <td className="px-6 py-4 md:px-10 md:py-6">
                                 <div className="flex items-center gap-3">
                                     <span className={`font-black text-lg md:text-xl ${sub.result?.percentage < 40 ? 'text-red-600' : sub.result?.percentage < 80 ? 'text-amber-500' : 'text-emerald-600'}`}>
                                         {sub.result?.percentage?.toFixed(0) || 0}%
                                     </span>
                                     <span className={`px-2 py-1 md:px-3 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wide border whitespace-nowrap ${sub.result?.percentage < 40 ? 'bg-red-50 text-red-700 border-red-200' : sub.result?.percentage < 80 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                         {sub.result?.level || 'N/A'}
                                     </span>
                                 </div>
                             </td>
                             <td className="px-6 py-4 md:px-10 md:py-6 no-print">
                                 <button 
                                    onClick={() => handleSelectSubmission(sub)}
                                    className="text-emerald-700 font-bold text-xs md:text-sm bg-emerald-50 border border-emerald-100 px-3 py-2 md:px-5 md:py-3 rounded-xl hover:bg-emerald-600 hover:text-white hover:shadow-lg transition-all active:scale-95 flex items-center gap-2 whitespace-nowrap"
                                 >
                                     Ver Detalhes
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 hidden md:block" viewBox="0 0 20 20" fill="currentColor">
                                         <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                     </svg>
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