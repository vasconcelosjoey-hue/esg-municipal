import React, { useMemo, useState, useEffect } from 'react';
import { getSubmissions, generateFullActionPlan, deleteSubmission, clearAllSubmissions } from '../utils';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, PieChart, Pie, Legend } from 'recharts';
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
          
          {/* PÁGINA 1: CAPA */}
          <div className="hidden print:flex print-cover">
              <div className="pt-20 px-4">
                  <div className="text-[12px] font-bold uppercase tracking-widest text-slate-500 mb-4">Relatório Oficial</div>
                  <h1 className="text-[48px] font-black text-[#001f3f] leading-none mb-4">Relatório ESG<br/>Municipal</h1>
                  <h2 className="text-[24px] font-light text-slate-600">Diagnóstico, Inteligência e<br/>Plano de Ação Integrado</h2>
              </div>
              
              <div className="px-4 mb-20">
                  <div className="mb-8">
                      <div className="text-[14px] font-bold text-slate-900">Prefeitura Municipal de Mogi das Cruzes</div>
                      <div className="text-[12px] text-slate-500">Sistema de Gestão Sustentável</div>
                  </div>
                  <div className="text-[12px] text-slate-400">
                      Gerado em: {new Date().toLocaleDateString('pt-BR')}
                  </div>
              </div>

              <div className="print-cover-footer"></div>
          </div>

          {/* RODAPÉ FIXO */}
          <div className="hidden print:flex print-footer-fixed">
              <span>Relatório ESG Municipal — Sistema de Diagnóstico Automatizado</span>
              <span>Uso Interno e Confidencial</span>
          </div>

          {/* PÁGINA 2: SUMÁRIO E DIAGNÓSTICO GERAL */}
          <div className="print:break-after-page">
              <h2 className="print-h2">Sumário Executivo</h2>
              <div className="mb-8">
                  <div className="print-toc-item"><span>1. Diagnósticos Gerais e KPIs</span> <span>02</span></div>
                  <div className="print-toc-item"><span>2. Dashboards de Performance</span> <span>02</span></div>
                  <div className="print-toc-item"><span>3. Análise Executiva</span> <span>02</span></div>
                  <div className="print-toc-item"><span>4. Plano de Ação (Curto e Médio Prazo)</span> <span>03</span></div>
                  <div className="print-toc-item"><span>5. Plano de Ação (Longo Prazo)</span> <span>03</span></div>
              </div>

              <h2 className="print-h2 mt-8">1. Diagnósticos Gerais</h2>
              <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="border p-2 bg-slate-50">
                      <div className="print-small font-bold uppercase text-slate-500">Total de Diagnósticos</div>
                      <div className="print-h1 text-[#001f3f]">{submissions.length}</div>
                  </div>
                  <div className="border p-2 bg-slate-50">
                      <div className="print-small font-bold uppercase text-slate-500">Maturidade Geral</div>
                      <div className="print-h1 text-[#001f3f]">{aggregateResult?.percentage.toFixed(0)}%</div>
                  </div>
                  <div className="border p-2 bg-slate-50">
                      <div className="print-small font-bold uppercase text-slate-500">Maior Engajamento</div>
                      <div className="print-h3 text-slate-900 truncate">{sectorData[0]?.name || '-'}</div>
                  </div>
              </div>

              <h2 className="print-h2">2. Dashboards de Performance</h2>
              <div className="print-grid-2">
                  <div className="chart-container">
                      <h3 className="print-h3 text-center mb-2">Distribuição por Setor</h3>
                      <ResponsiveContainer width="100%" height={160}>
                          <PieChart>
                            <Pie 
                                data={sectorData} 
                                dataKey="value" 
                                nameKey="name" 
                                cx="50%" 
                                cy="50%" 
                                outerRadius={50} 
                                fill="#001f3f"
                                labelLine={false}
                            />
                            <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{fontSize: '8px'}} />
                          </PieChart>
                      </ResponsiveContainer>
                  </div>
                  <div className="chart-container">
                      <h3 className="print-h3 text-center mb-2">Maturidade por Eixo</h3>
                      <ResponsiveContainer width="100%" height={160}>
                         <BarChart data={Object.entries(aggregateResult?.categoryScores || {}).map(([k,v]) => ({name:k, score:v.percentage}))}>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                            <XAxis dataKey="name" tick={{fontSize: 8}} interval={0} tickFormatter={(v) => v.substring(0,3).toUpperCase()} />
                            <YAxis hide domain={[0,100]} />
                            <Bar dataKey="score" fill="#001f3f" />
                        </BarChart>
                      </ResponsiveContainer>
                  </div>
              </div>

              <h2 className="print-h2 mt-4">3. Análise Executiva</h2>
              <div className="print-p mb-8 border-l-2 border-[#001f3f] pl-3">
                  <p className="mb-2">
                      <strong>Interpretação:</strong> O índice geral de {aggregateResult?.percentage.toFixed(0)}% indica um estágio de {aggregateResult?.level}. 
                      Os eixos temáticos demonstram variações que exigem atenção específica, especialmente nas áreas com pontuação inferior a 40%.
                  </p>
                  <p className="mb-2">
                      <strong>Pontos Críticos:</strong> A disparidade entre setores sugere necessidade de padronização de processos. 
                      Recomenda-se focar esforços imediatos nas ações de "1 Mês" listadas abaixo para ganhos rápidos de conformidade (Quick Wins).
                  </p>
                  <p>
                      <strong>Evolução:</strong> Para atingir o próximo nível de maturidade, é crucial institucionalizar a governança ESG 
                      através de portarias e capacitação técnica contínua dos servidores envolvidos.
                  </p>
              </div>
          </div>

          {/* PÁGINA 3: PLANO DE AÇÃO */}
          <div>
             <h2 className="print-h2">4. Plano de Ação Integrado</h2>
             
             <div className="grid grid-cols-2 gap-6">
                 {(['1 Mês', '3 Meses', '6 Meses', '1 Ano'] as TimeFrame[]).map(tf => {
                     const actions = groupedAggregateActions[tf] || [];
                     if(actions.length === 0) return null;
                     
                     return (
                         <div key={tf} className="print-section">
                             <h3 className="print-h3 uppercase border-b border-slate-300 pb-1 mb-2">{tf}</h3>
                             <div className="print-compact-list">
                                 {actions.slice(0, 4).map((act, i) => (
                                     <div key={i}>
                                         <span className="font-bold text-[11px] text-[#001f3f] block">• {act.title}</span>
                                         <span className="text-[10px] text-slate-600 block pl-2 leading-tight">{act.description}</span>
                                     </div>
                                 ))}
                             </div>
                         </div>
                     )
                 })}
             </div>

             <div className="mt-4">
                 <h2 className="print-h2">5. Visão de Longo Prazo (5 Anos)</h2>
                 <div className="print-section">
                     <div className="print-compact-list grid grid-cols-2 gap-4">
                        {(groupedAggregateActions['5 Anos'] || []).slice(0, 4).map((act, i) => (
                             <div key={i}>
                                 <span className="font-bold text-[11px] text-[#001f3f] block">→ {act.title}</span>
                                 <span className="text-[10px] text-slate-600 block pl-3 leading-tight">{act.description}</span>
                             </div>
                        ))}
                     </div>
                 </div>
             </div>

             {/* Tabela de Registros - Compacta no final */}
             <h2 className="print-h2 mt-6">Anexo: Registros Individuais</h2>
             <table className="w-full text-left border-collapse text-[9px]">
                  <thead>
                      <tr className="border-b border-slate-400">
                          <th className="py-1 font-bold">Respondente</th>
                          <th className="py-1 font-bold">Setor</th>
                          <th className="py-1 font-bold text-right">Score</th>
                      </tr>
                  </thead>
                  <tbody>
                      {submissions.slice(0, 10).map(sub => (
                          <tr key={sub.id} className="border-b border-slate-200">
                              <td className="py-1">{sub.respondent.name}</td>
                              <td className="py-1">{sub.respondent.sector}</td>
                              <td className="py-1 text-right font-bold">{sub.result.percentage.toFixed(0)}%</td>
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