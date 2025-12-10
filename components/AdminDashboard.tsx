import React, { useMemo, useState, useEffect } from 'react';
import { getSubmissions, generateFullActionPlan } from '../utils';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts';
import { CATEGORIES } from '../constants';
import { Submission, TimeFrame, ActionPlanItem, AssessmentResult } from '../types';
import Dashboard from './Dashboard';

const AdminDashboard: React.FC = () => {
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch data asynchronously on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getSubmissions();
        setSubmissions(data);
      } catch (error) {
        console.error("Failed to fetch submissions", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // --- AGGREGATE LOGIC ---
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

    return {
        totalScore: totalAvgScore,
        maxScore: totalAvgMax,
        percentage: globalPercentage,
        level,
        categoryScores: categoryAverages
    };

  }, [submissions]);

  const aggregateActions = useMemo(() => {
     if (!aggregateResult) return [];
     return generateFullActionPlan(aggregateResult);
  }, [aggregateResult]);

  const groupedAggregateActions = useMemo(() => {
    const groups: Record<TimeFrame, ActionPlanItem[]> = {
      '1 Mês': [],
      '3 Meses': [],
      '6 Meses': [],
      '1 Ano': [],
      '5 Anos': []
    };
    aggregateActions.forEach(action => {
      if (groups[action.timeline]) groups[action.timeline].push(action);
    });
    return groups;
  }, [aggregateActions]);

  const sectorData = useMemo(() => {
    const counts: Record<string, number> = {};
    submissions.forEach(s => {
      const sector = s.respondent.sector.trim() || 'Não informado';
      counts[sector] = (counts[sector] || 0) + 1;
    });
    // Sort by value desc for better visualization in bar chart
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [submissions]);

  // --- RENDER ---

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-emerald-800 font-bold animate-pulse">Sincronizando dados...</p>
      </div>
    );
  }

  // 1. If viewing a specific submission
  if (selectedSubmission) {
    return (
        <div className="animate-fade-in">
            <div className="mb-6 flex items-center justify-between no-print">
                <button 
                    onClick={() => setSelectedSubmission(null)}
                    className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                    Voltar ao Painel Geral
                </button>
            </div>
            <Dashboard result={selectedSubmission.result} respondentData={selectedSubmission.respondent} />
        </div>
    );
  }

  // 2. Empty State
  if (submissions.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="text-6xl mb-4">📂</div>
        <h2 className="text-2xl font-bold text-slate-700">Ainda não há dados na nuvem.</h2>
        <p className="text-slate-500">O painel será ativado assim que o primeiro diagnóstico for enviado.</p>
      </div>
    );
  }

  // 3. Main Dashboard
  return (
    <div className="space-y-12 animate-fade-in pb-20">
      
      {/* Print-only Cover Page Header */}
      <div className="hidden print:block mb-10 border-b-4 border-slate-900 pb-6">
          <h1 className="text-5xl font-black text-slate-900 tracking-tight">Relatório Gerencial ESG</h1>
          <p className="text-2xl text-slate-600 mt-2 font-medium">Consolidado Municipal e Inteligência de Dados</p>
          <div className="mt-6 flex justify-between text-base font-bold text-slate-400 uppercase tracking-widest">
             <span>Prefeitura Municipal de Mogi das Cruzes</span>
             <span>{new Date().toLocaleDateString('pt-BR')}</span>
          </div>
      </div>

      {/* Admin Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 no-print">
         <div className="w-full">
            <div className="bg-slate-900 text-white p-8 md:p-10 rounded-3xl shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center">
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -translate-y-1/2 translate-x-1/3"></div>
                
                <div className="relative z-10 mb-6 md:mb-0">
                    <h2 className="text-4xl font-black tracking-tight">Centro de Comando ESG</h2>
                    <p className="text-emerald-400 font-medium mt-2 text-lg">Visão estratégica consolidada.</p>
                </div>
                
                <div className="relative z-10 flex gap-6">
                    <div className="text-center px-8 py-4 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/10">
                        <span className="block text-4xl font-black">{submissions.length}</span>
                        <span className="text-xs uppercase tracking-widest opacity-80 font-bold">Diagnósticos</span>
                    </div>
                    {aggregateResult && (
                        <div className="text-center px-8 py-4 bg-emerald-600/20 rounded-2xl backdrop-blur-sm border border-emerald-500/30">
                            <span className="block text-4xl font-black text-emerald-400">{aggregateResult.percentage.toFixed(0)}%</span>
                            <span className="text-xs uppercase tracking-widest opacity-80 font-bold">Média Global</span>
                        </div>
                    )}
                </div>
            </div>
         </div>
      </div>

      <div className="flex justify-end no-print">
        <button 
            onClick={() => window.print()}
            className="flex items-center gap-3 bg-slate-800 hover:bg-slate-700 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Baixar Relatório Gerencial (PDF)</span>
        </button>
      </div>

      {/* AGGREGATE ACTION PLAN (MACRO VIEW) */}
      {aggregateResult && (
          <div className="bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden print:border-2 print:border-slate-800 print:shadow-none">
              <div className="bg-slate-50 px-8 py-8 border-b border-slate-200">
                  <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                      <span className="text-3xl">🌍</span> Plano de Ação Municipal Integrado
                  </h3>
                  <p className="text-slate-600 text-base mt-2">
                      Prioridades estratégicas baseadas na média de maturidade de {submissions.length} secretarias/setores.
                  </p>
              </div>

              <div className="p-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6 print:grid-cols-3 print:gap-4">
                  {(['1 Mês', '3 Meses', '6 Meses', '1 Ano', '5 Anos'] as TimeFrame[]).map((timeframe) => {
                      const actions = groupedAggregateActions[timeframe];
                      if(!actions || actions.length === 0) return null;
                      
                      const colorClass = timeframe.includes('Mês') ? 'border-red-200 bg-red-50 text-red-900' : 
                                         timeframe.includes('Ano') && !timeframe.includes('5') ? 'border-yellow-200 bg-yellow-50 text-yellow-900' : 
                                         'border-emerald-200 bg-emerald-50 text-emerald-900';

                      return (
                          <div key={timeframe} className="flex flex-col h-full print:break-inside-avoid">
                              <div className={`px-4 py-3 rounded-t-xl border-t border-x font-black text-center text-sm uppercase tracking-wider shadow-sm ${colorClass}`}>
                                  {timeframe}
                              </div>
                              <div className="border border-slate-200 rounded-b-xl p-5 flex-1 bg-white space-y-4 shadow-sm">
                                  {actions.slice(0, 4).map((action, i) => ( 
                                      <div key={i} className="border-b border-slate-100 last:border-0 pb-3 last:pb-0">
                                          <div className="font-bold text-slate-800 text-sm mb-1 leading-snug">{action.title}</div>
                                          <div className="text-slate-500 text-xs leading-relaxed">{action.description}</div>
                                      </div>
                                  ))}
                                  {actions.length > 4 && (
                                      <div className="text-center text-xs font-bold text-slate-400 pt-2">
                                          + {actions.length - 4} ações mapeadas
                                      </div>
                                  )}
                              </div>
                          </div>
                      )
                  })}
              </div>
          </div>
      )}

      {/* CHARTS SECTION - PREMIUM REDESIGN */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 print:grid-cols-1 print:break-inside-avoid">
          
          {/* Participação por Setor - Horizontal Bar Chart */}
          <div className="bg-white p-8 md:p-10 rounded-3xl shadow-lg border border-slate-200 print:shadow-none print:border-2 print:border-slate-800">
             <div className="mb-8">
                 <h3 className="text-2xl font-black text-slate-800 mb-2">Engajamento por Setor</h3>
                 <p className="text-slate-500 font-medium">Quantidade de diagnósticos realizados por secretaria/departamento.</p>
             </div>
             <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                        layout="vertical"
                        data={sectorData}
                        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                        <XAxis type="number" hide />
                        <YAxis 
                            dataKey="name" 
                            type="category" 
                            width={150} 
                            tick={{fontSize: 12, fontWeight: 600, fill: '#475569'}} 
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip 
                            cursor={{fill: '#f1f5f9'}} 
                            contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '12px'}}
                            itemStyle={{color: '#1e293b', fontWeight: 'bold'}}
                        />
                        <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={32}>
                             {sectorData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill="#3b82f6" /> 
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* Média de Maturidade - Vertical Bar Chart */}
          <div className="bg-white p-8 md:p-10 rounded-3xl shadow-lg border border-slate-200 print:shadow-none print:border-2 print:border-slate-800">
             <div className="mb-8">
                <h3 className="text-2xl font-black text-slate-800 mb-2">Maturidade por Eixo Temático</h3>
                <p className="text-slate-500 font-medium">Média percentual de conformidade de todos os respondentes.</p>
             </div>
             <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={Object.entries(aggregateResult?.categoryScores || {}).map(([k, v]) => ({
                        name: CATEGORIES.find(c => c.id === k)?.title.split(' ')[1] || k, 
                        fullName: CATEGORIES.find(c => c.id === k)?.title,
                        score: v.percentage
                    }))}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis 
                            dataKey="name" 
                            tick={{fontSize: 11, fontWeight: 600, fill: '#64748b'}} 
                            axisLine={false} 
                            tickLine={false} 
                            interval={0}
                        />
                        <YAxis 
                            domain={[0, 100]} 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fontSize: 12, fontWeight: 600, fill: '#94a3b8'}} 
                        />
                        <Tooltip 
                            cursor={{fill: '#f8fafc'}} 
                            content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                return (
                                    <div className="bg-white p-4 shadow-xl rounded-xl border border-slate-100">
                                        <p className="font-bold text-slate-900 mb-1">{payload[0].payload.fullName}</p>
                                        <p className="text-emerald-600 font-black text-lg">
                                            {Number(payload[0].value).toFixed(1)}%
                                        </p>
                                    </div>
                                );
                                }
                                return null;
                            }}
                        />
                        <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={50}>
                            {Object.entries(aggregateResult?.categoryScores || {}).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry[1].percentage < 40 ? '#ef4444' : entry[1].percentage < 80 ? '#eab308' : '#10b981'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
             </div>
          </div>
      </div>

      {/* DETAILED SUBMISSIONS TABLE */}
      <div className="bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden print:border-2 print:border-slate-800 print:shadow-none print:break-before-page">
         <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div>
                <h3 className="font-black text-2xl text-slate-900">Diagnósticos Individuais</h3>
                <p className="text-slate-600 text-base mt-1">Detalhamento dos {submissions.length} registros realizados.</p>
            </div>
         </div>
         <div className="overflow-x-auto">
             <table className="min-w-full divide-y divide-slate-100">
                 <thead className="bg-white">
                     <tr>
                         <th className="px-10 py-5 text-left text-sm font-black text-slate-400 uppercase tracking-wider">Respondente</th>
                         <th className="px-10 py-5 text-left text-sm font-black text-slate-400 uppercase tracking-wider">Setor</th>
                         <th className="px-10 py-5 text-left text-sm font-black text-slate-400 uppercase tracking-wider">Data</th>
                         <th className="px-10 py-5 text-left text-sm font-black text-slate-400 uppercase tracking-wider">Maturidade</th>
                         <th className="px-10 py-5 text-left text-sm font-black text-slate-400 uppercase tracking-wider no-print">Ação</th>
                     </tr>
                 </thead>
                 <tbody className="bg-white divide-y divide-slate-50">
                     {submissions.map((sub) => (
                         <tr key={sub.id} className="hover:bg-slate-50 transition-colors group">
                             <td className="px-10 py-6">
                                 <div className="font-bold text-lg text-slate-900">{sub.respondent.name}</div>
                             </td>
                             <td className="px-10 py-6 text-base font-medium text-slate-600">{sub.respondent.sector}</td>
                             <td className="px-10 py-6 text-base font-medium text-slate-500">{new Date(sub.timestamp).toLocaleDateString('pt-BR')}</td>
                             <td className="px-10 py-6">
                                 <div className="flex items-center gap-3">
                                     <span className={`font-black text-xl ${sub.result.percentage < 40 ? 'text-red-600' : sub.result.percentage < 80 ? 'text-amber-500' : 'text-emerald-600'}`}>
                                         {sub.result.percentage.toFixed(0)}%
                                     </span>
                                     <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${sub.result.percentage < 40 ? 'bg-red-50 text-red-700 border-red-200' : sub.result.percentage < 80 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                         {sub.result.level}
                                     </span>
                                 </div>
                             </td>
                             <td className="px-10 py-6 no-print">
                                 <button 
                                    onClick={() => setSelectedSubmission(sub)}
                                    className="text-emerald-700 font-bold text-sm bg-emerald-50 border border-emerald-100 px-5 py-3 rounded-xl hover:bg-emerald-600 hover:text-white hover:shadow-lg transition-all active:scale-95 flex items-center gap-2"
                                 >
                                     Ver Detalhes
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
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
      
      <div className="hidden print:block text-center text-sm text-slate-400 pt-8 mt-12 border-t border-slate-200">
          Relatório gerado digitalmente pelo Sistema ESG Municipal. Documento confidencial para uso da gestão pública.
      </div>
    </div>
  );
};

export default AdminDashboard;