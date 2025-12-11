import React, { useMemo, useState, useEffect } from 'react';
import { getSubmissions, generateFullActionPlan, deleteSubmission, clearAllSubmissions } from '../utils';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts';
import { CATEGORIES } from '../constants';
import { Submission, TimeFrame, ActionPlanItem, AssessmentResult } from '../types';
import Dashboard from './Dashboard';

const AdminDashboard: React.FC = () => {
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

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

  const handleDelete = async (id: string, name: string) => {
      if (confirm(`Excluir registro de "${name}"?`)) {
          const success = await deleteSubmission(id);
          if (success) setSubmissions(prev => prev.filter(s => s.id !== id));
      }
  };

  const handleClearAll = async () => {
      if (prompt('⚠️ Digite "APAGAR" para limpar tudo:') === 'APAGAR') {
          setLoading(true);
          const success = await clearAllSubmissions();
          setLoading(false);
          if (success) setSubmissions([]);
      }
  };

  // --- AGGREGATE CALCS ---
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
      const displayName = sector.length > 15 ? sector.substring(0, 15) + '.' : sector;
      counts[displayName] = (counts[displayName] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [submissions]);

  const timeframeColors: Record<TimeFrame, string> = {
      '1 Mês': 'border-red-500 bg-red-50 text-red-900',
      '3 Meses': 'border-orange-500 bg-orange-50 text-orange-900',
      '6 Meses': 'border-amber-500 bg-amber-50 text-amber-900',
      '1 Ano': 'border-blue-500 bg-blue-50 text-blue-900',
      '5 Anos': 'border-indigo-500 bg-indigo-50 text-indigo-900',
  };

  if (loading) return <div className="p-10 text-center">Carregando...</div>;
  if (selectedSubmission) return <div className="animate-fade-in"><button onClick={() => setSelectedSubmission(null)} className="no-print mb-4 px-4 py-2 border rounded">Voltar</button><Dashboard result={selectedSubmission.result} respondentData={selectedSubmission.respondent} /></div>;
  if (submissions.length === 0) return <div className="p-10 text-center">Sem dados. <button onClick={handleRefresh}>Atualizar</button></div>;

  return (
    <div className="animate-fade-in pb-20 print:pb-0">
      
      {/* WEB CONTROLS */}
      <div className="no-print mb-8 flex justify-between items-center bg-slate-100 p-4 rounded-xl">
         <h2 className="text-xl font-bold">Painel Administrativo</h2>
         <div className="flex gap-2">
            <button onClick={handleRefresh} className="px-4 py-2 bg-white rounded border">Atualizar</button>
            <button onClick={() => window.print()} className="px-4 py-2 bg-slate-900 text-white rounded font-bold">Imprimir Relatório</button>
         </div>
      </div>

      {/* --- PRINT LAYOUT --- */}
      <div className="print:block">
          
          {/* HEADER */}
          <div className="hidden print:flex justify-between items-end border-b-4 border-slate-900 pb-4 mb-6">
              <div>
                  <h1 className="print-title-main">Relatório Gerencial Consolidado</h1>
                  <p className="print-subtitle mt-2 text-slate-500">Visão Sistêmica & Indicadores de Performance</p>
              </div>
              <div className="text-right">
                  <div className="print-caption font-bold uppercase">Prefeitura Municipal</div>
                  <div className="print-caption">{new Date().toLocaleDateString('pt-BR')}</div>
              </div>
          </div>

          {/* KEY METRICS GRID */}
          <div className="print-grid-3 mb-6">
              <div className="print-border p-3 bg-slate-50">
                  <div className="print-caption uppercase font-bold text-slate-400">Diagnósticos</div>
                  <div className="text-3xl font-serif font-black text-slate-900">{submissions.length}</div>
              </div>
              <div className="print-border p-3 bg-slate-50">
                  <div className="print-caption uppercase font-bold text-slate-400">Média Global</div>
                  <div className="text-3xl font-serif font-black text-slate-900">{aggregateResult?.percentage.toFixed(0)}%</div>
              </div>
              <div className="print-border p-3 bg-slate-50">
                  <div className="print-caption uppercase font-bold text-slate-400">Setor +Engajado</div>
                  <div className="text-xl font-bold text-slate-900 mt-1">{sectorData[0]?.name || '-'}</div>
              </div>
          </div>

          {/* CHARTS ROW (Compact) */}
          <div className="print-grid-exec mb-6 h-[180px]">
              <div className="print-border p-3 h-full">
                  <h3 className="print-subtitle mb-2">Engajamento por Setor</h3>
                  <div className="h-[130px] w-full">
                    <ResponsiveContainer>
                        <BarChart layout="vertical" data={sectorData} margin={{top:0, bottom:0}}>
                            <CartesianGrid horizontal={true} vertical={false} strokeDasharray="3 3"/>
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 9}} axisLine={false} tickLine={false} />
                            <Bar dataKey="value" fill="#3b82f6" barSize={12} radius={[0,2,2,0]} />
                        </BarChart>
                    </ResponsiveContainer>
                  </div>
              </div>
              <div className="print-border p-3 h-full">
                  <h3 className="print-subtitle mb-2">Maturidade por Eixo</h3>
                  <div className="h-[130px] w-full">
                     <ResponsiveContainer>
                        <BarChart data={Object.entries(aggregateResult?.categoryScores || {}).map(([k,v]) => ({name:k, score:v.percentage}))}>
                            <CartesianGrid vertical={false} strokeDasharray="3 3"/>
                            <XAxis dataKey="name" tick={{fontSize: 8}} interval={0} tickFormatter={(v)=>v.substring(0,3).toUpperCase()} axisLine={false} tickLine={false} />
                            <YAxis hide domain={[0,100]} />
                            <Bar dataKey="score" fill="#059669" barSize={20} radius={[2,2,0,0]}>
                                {Object.entries(aggregateResult?.categoryScores || {}).map((e,i) => (
                                    <Cell key={i} fill={e[1].percentage < 40 ? '#ef4444' : e[1].percentage < 80 ? '#eab308' : '#059669'} />
                                ))}
                            </Bar>
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
              </div>
          </div>

          {/* AGGREGATE ACTION PLAN (5 COLUMNS STRIP) */}
          <div className="mb-6">
             <h2 className="print-title-section">Plano de Ação Integrado</h2>
             <div className="print-grid-5">
                 {(['1 Mês', '3 Meses', '6 Meses', '1 Ano', '5 Anos'] as TimeFrame[]).map(tf => {
                     const actions = groupedAggregateActions[tf] || [];
                     const colorClass = timeframeColors[tf];
                     // Show max 5 items to keep it compact
                     const displayActions = actions.slice(0, 5);
                     
                     return (
                         <div key={tf} className="print-border h-full flex flex-col">
                             <div className={`text-center py-1 font-bold text-[8pt] uppercase tracking-wider border-b ${colorClass} bg-opacity-20`}>
                                 {tf}
                             </div>
                             <div className="p-1 space-y-1 bg-white flex-1">
                                 {displayActions.map((act, i) => (
                                     <div key={i} className="border-b border-slate-100 pb-1 last:border-0">
                                         <div className="font-bold text-[7pt] text-slate-900 leading-tight">{act.title}</div>
                                         <div className="text-[6pt] text-slate-500 leading-none truncate">{act.description}</div>
                                     </div>
                                 ))}
                                 {actions.length > 5 && (
                                     <div className="text-center bg-slate-800 text-white text-[7pt] font-bold rounded py-0.5 mt-1">
                                         +{actions.length - 5} OUTROS
                                     </div>
                                 )}
                             </div>
                         </div>
                     )
                 })}
             </div>
          </div>

          {/* COMPACT TABLE */}
          <div>
              <h2 className="print-title-section">Registros Individuais</h2>
              <table className="w-full text-left border-collapse">
                  <thead>
                      <tr className="border-b-2 border-slate-800">
                          <th className="py-1 text-[8pt] font-bold uppercase text-slate-600">Respondente</th>
                          <th className="py-1 text-[8pt] font-bold uppercase text-slate-600">Setor</th>
                          <th className="py-1 text-[8pt] font-bold uppercase text-slate-600">Data</th>
                          <th className="py-1 text-[8pt] font-bold uppercase text-slate-600 text-right">Score</th>
                          <th className="no-print w-10"></th>
                      </tr>
                  </thead>
                  <tbody>
                      {submissions.map(sub => (
                          <tr key={sub.id} className="border-b border-slate-200">
                              <td className="py-1 text-[8pt] font-bold text-slate-900">{sub.respondent.name}</td>
                              <td className="py-1 text-[8pt] text-slate-600">{sub.respondent.sector}</td>
                              <td className="py-1 text-[8pt] text-slate-500 font-mono">{new Date(sub.timestamp).toLocaleDateString('pt-BR')}</td>
                              <td className="py-1 text-[8pt] font-black text-right" style={{color: sub.result.percentage < 40 ? '#dc2626' : sub.result.percentage < 80 ? '#d97706' : '#059669'}}>
                                  {sub.result.percentage.toFixed(0)}%
                              </td>
                              <td className="no-print text-right">
                                  <button onClick={() => handleDelete(sub.id, sub.respondent.name)} className="text-red-500 text-xs">✕</button>
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