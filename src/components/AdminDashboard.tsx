import React, { useMemo, useState, useEffect } from 'react';
import { getSubmissions, generateFullActionPlan, deleteSubmission, clearAllSubmissions } from '../utils';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, PieChart, Pie, Legend, Tooltip } from 'recharts';
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
      const displayName = sector.length > 20 ? sector.substring(0, 20) + '.' : sector;
      counts[displayName] = (counts[displayName] || 0) + 1;
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

      {/* --- PREMIUM PRINT LAYOUT --- */}
      <div className="print:block">
          
          {/* COVER PAGE */}
          <div className="hidden print:flex animus-cover">
              <div className="animus-cover-decor-top"></div>
              
              <div className="animus-cover-content pt-10">
                  <div className="flex items-center gap-4 mb-8">
                      {/* Logo Placeholder */}
                      <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-indigo-900 font-bold text-xl">E</div>
                      <span className="text-sm tracking-[0.2em] font-bold uppercase opacity-70">ESG Municipal</span>
                  </div>
                  <h1 className="animus-title">Relatório de<br/>Inteligência<br/>Estratégica</h1>
              </div>

              <div className="animus-cover-content">
                  <div className="animus-subtitle mb-8">
                      Prefeitura Municipal de<br/>
                      <strong className="text-white text-2xl">Mogi das Cruzes</strong>
                  </div>
                  <div className="flex justify-between items-end border-t border-white/20 pt-4">
                      <div className="text-xs opacity-60">
                          Versão 2.0 • Confidencial<br/>
                          Gerado em {new Date().toLocaleDateString('pt-BR')}
                      </div>
                      <div className="text-right">
                          <span className="block text-3xl font-bold">{aggregateResult?.percentage.toFixed(0)}%</span>
                          <span className="text-xs uppercase tracking-wider opacity-80">Score Global</span>
                      </div>
                  </div>
              </div>
              
              <div className="animus-cover-decor-bottom"></div>
          </div>

          {/* PAGE 2: TOC & OVERVIEW */}
          <div className="print-page-content break-page">
              <h2 className="animus-section-title">Sumário Executivo</h2>
              <div className="mb-10 px-2">
                  <div className="animus-toc-item"><span>01. Diagnóstico Geral</span><span className="animus-toc-dots"></span><span>02</span></div>
                  <div className="animus-toc-item"><span>02. Análise por Eixos</span><span className="animus-toc-dots"></span><span>02</span></div>
                  <div className="animus-toc-item"><span>03. Plano de Ação (Curto Prazo)</span><span className="animus-toc-dots"></span><span>03</span></div>
                  <div className="animus-toc-item"><span>04. Plano de Ação (Longo Prazo)</span><span className="animus-toc-dots"></span><span>03</span></div>
                  <div className="animus-toc-item"><span>05. Conclusões</span><span className="animus-toc-dots"></span><span>04</span></div>
              </div>

              <h2 className="animus-section-title">1. Diagnóstico Geral</h2>
              <div className="animus-cols-2">
                  <p className="animus-text">
                      O presente relatório consolida os dados de <strong>{submissions.length} diagnósticos setoriais</strong> realizados pela administração municipal. 
                      O índice global de maturidade ESG atingiu a marca de <strong>{aggregateResult?.percentage.toFixed(0)}%</strong>, classificando a gestão no nível <strong>{aggregateResult?.level}</strong>.
                  </p>
                  <p className="animus-text">
                      Esta pontuação reflete o comprometimento da gestão com práticas sustentáveis, mas aponta para disparidades significativas entre os eixos temáticos.
                      A seguir, apresentamos a decomposição analítica dos resultados e o plano de ação sugerido.
                  </p>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-8">
                  <div className="bg-slate-50 p-4 rounded border border-slate-200 break-inside-avoid">
                      <h3 className="font-bold text-slate-700 mb-4 text-center text-xs uppercase tracking-wider">Distribuição por Setor</h3>
                      <div className="chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={sectorData} 
                                    dataKey="value" 
                                    nameKey="name" 
                                    cx="50%" 
                                    cy="50%" 
                                    outerRadius={50} 
                                    innerRadius={30}
                                    fill="#6366f1"
                                    paddingAngle={2}
                                    labelLine={false}
                                    label={({cx, cy, midAngle, innerRadius, outerRadius, percent}) => {
                                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                        const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
                                        const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
                                        return percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : '';
                                    }}
                                >
                                    {sectorData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={['#1e1b4b', '#4338ca', '#6366f1', '#818cf8', '#94a3b8'][index % 5]} />
                                    ))}
                                </Pie>
                                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{fontSize: '8px'}} />
                            </PieChart>
                        </ResponsiveContainer>
                      </div>
                  </div>
                  
                  <div className="bg-slate-50 p-4 rounded border border-slate-200 break-inside-avoid">
                      <h3 className="font-bold text-slate-700 mb-4 text-center text-xs uppercase tracking-wider">Maturidade por Eixo</h3>
                      <div className="chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={Object.entries(aggregateResult?.categoryScores || {}).map(([k, v]) => ({
                                name: CATEGORIES.find(c => c.id === k)?.title.split(' ')[1].substring(0,3).toUpperCase(), 
                                score: v.percentage
                            }))}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="name" tick={{fontSize: 8, fill: '#64748b'}} axisLine={false} tickLine={false} />
                                <YAxis hide domain={[0, 100]} />
                                <Bar dataKey="score" fill="#6366f1" radius={[2, 2, 0, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                      </div>
                  </div>
              </div>
          </div>

          {/* PAGE 3: ACTION PLAN */}
          <div className="print-page-content">
             <h2 className="animus-section-title">2. Plano de Ação Integrado</h2>
             
             <div className="animus-grid-actions">
                 {(['1 Mês', '3 Meses', '6 Meses', '1 Ano'] as TimeFrame[]).map(tf => {
                     const actions = groupedAggregateActions[tf] || [];
                     if(actions.length === 0) return null;
                     
                     return (
                         <div key={tf} className="animus-action-group">
                             <div className="animus-action-header">{tf}</div>
                             {actions.slice(0, 4).map((act, i) => (
                                 <div key={i} className="animus-action-card">
                                     <div className="flex items-start gap-2">
                                         <span className="text-sm pt-0.5">{getActionIcon(act.title)}</span>
                                         <div>
                                             <div className="font-bold text-[9pt] text-slate-800 leading-tight">{act.title}</div>
                                             <div className="text-[8pt] text-slate-500 leading-tight mt-0.5">{act.description}</div>
                                         </div>
                                     </div>
                                 </div>
                             ))}
                             {actions.length > 4 && (
                                 <div className="text-[8pt] text-center text-slate-400 italic mt-1">+ {actions.length - 4} ações complementares</div>
                             )}
                         </div>
                     )
                 })}
             </div>

             <div className="mt-6">
                 <h2 className="animus-section-title">3. Visão de Longo Prazo (5 Anos)</h2>
                 <div className="animus-action-card bg-slate-50 border-none p-4">
                     <div className="grid grid-cols-2 gap-4">
                        {(groupedAggregateActions['5 Anos'] || []).slice(0, 4).map((act, i) => (
                             <div key={i} className="flex items-start gap-2">
                                 <span className="text-sm">🚀</span>
                                 <div>
                                     <div className="font-bold text-[9pt] text-indigo-900 leading-tight">{act.title}</div>
                                     <div className="text-[8pt] text-slate-500 leading-tight">{act.description}</div>
                                 </div>
                             </div>
                        ))}
                     </div>
                 </div>
             </div>
          </div>

          <div className="print-footer">
              <span className="font-bold uppercase tracking-widest text-[7pt]">Relatório ESG Municipal</span>
              <span className="text-[7pt]">Confidencial • Uso Interno</span>
          </div>
      </div>
    </div>
  );
};

export default AdminDashboard;