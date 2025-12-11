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

      {/* --- PRINT LAYOUT (COMPACT 2 PAGES) --- */}
      <div className="print:block">
          
          {/* 1. HEADER INTEGRADO (Substitui capa full page) */}
          <div className="hidden print:flex print-header-container">
              <div>
                  <div className="print-small font-bold uppercase tracking-widest text-slate-500">Relatório Oficial ESG</div>
                  <h1 className="print-h1">Diagnóstico Municipal<br/>Consolidado</h1>
              </div>
              <div className="text-right">
                  <div className="print-bold text-[12px]">Prefeitura Municipal de Mogi das Cruzes</div>
                  <div className="print-small">{new Date().toLocaleDateString('pt-BR')} | Sistema Joi.a</div>
              </div>
          </div>

          {/* 2. SUMÁRIO & KPIs (Grid Compacto) */}
          <div className="print-grid-4">
              <div className="print-card bg-slate-50">
                  <div className="print-small font-bold uppercase">Total Diag.</div>
                  <div className="text-xl font-black text-[#001f3f]">{submissions.length}</div>
              </div>
              <div className="print-card bg-slate-50">
                  <div className="print-small font-bold uppercase">Maturidade</div>
                  <div className="text-xl font-black text-[#001f3f]">{aggregateResult?.percentage.toFixed(0)}%</div>
              </div>
              <div className="print-card bg-slate-50 col-span-2">
                  <div className="print-small font-bold uppercase">Destaque Engajamento</div>
                  <div className="text-sm font-bold truncate">{sectorData[0]?.name || '-'}</div>
              </div>
          </div>

          {/* 3. GRÁFICOS LADO A LADO (Altura Reduzida) */}
          <div className="print-grid-2">
              <div className="print-card">
                  <h3 className="print-h3 text-center mb-1">Distribuição Setorial</h3>
                  <div className="chart-container">
                      <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie 
                                data={sectorData} 
                                dataKey="value" 
                                nameKey="name" 
                                cx="50%" 
                                cy="50%" 
                                outerRadius={40} 
                                fill="#001f3f"
                                labelLine={false}
                            />
                            <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{fontSize: '7px', width: '40%'}} />
                          </PieChart>
                      </ResponsiveContainer>
                  </div>
              </div>
              <div className="print-card">
                  <h3 className="print-h3 text-center mb-1">Performance por Eixo</h3>
                  <div className="chart-container">
                     <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={Object.entries(aggregateResult?.categoryScores || {}).map(([k,v]) => ({name:k, score:v.percentage}))}>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                            <XAxis dataKey="name" tick={{fontSize: 7}} interval={0} tickFormatter={(v) => v.substring(0,3).toUpperCase()} />
                            <YAxis hide domain={[0,100]} />
                            <Bar dataKey="score" fill="#001f3f" />
                        </BarChart>
                      </ResponsiveContainer>
                  </div>
              </div>
          </div>

          {/* 4. ANÁLISE EXECUTIVA (Texto Condensado) */}
          <div className="mb-4">
              <h2 className="print-h2">Análise Executiva</h2>
              <div className="print-text border-l-2 border-[#001f3f] pl-2">
                  <p className="mb-1">
                      O índice de <strong>{aggregateResult?.percentage.toFixed(0)}%</strong> classifica a gestão como <strong>{aggregateResult?.level}</strong>. 
                      Há variações significativas entre eixos, exigindo padronização de processos.
                  </p>
                  <p>
                      <strong>Recomendação:</strong> Priorizar ações de curto prazo (1-3 meses) listadas abaixo para ganhos rápidos de conformidade (Quick Wins) e institucionalizar a governança ESG via decretos.
                  </p>
              </div>
          </div>

          {/* 5. PLANO DE AÇÃO INTEGRADO (Compacto 2 colunas) */}
          <div className="print-section">
             <h2 className="print-h2">Plano de Ação Estratégico</h2>
             <div className="print-grid-2">
                 {(['1 Mês', '3 Meses', '6 Meses', '1 Ano'] as TimeFrame[]).map(tf => {
                     const actions = groupedAggregateActions[tf] || [];
                     if(actions.length === 0) return null;
                     
                     return (
                         <div key={tf} className="print-card border-t-2 border-t-[#001f3f]">
                             <div className="flex justify-between items-center border-b border-dashed border-slate-300 mb-1 pb-1">
                                <h3 className="print-h3">{tf}</h3>
                                <span className="print-small font-bold uppercase">
                                    {tf.includes('Mês') ? 'Curto Prazo' : 'Médio Prazo'}
                                </span>
                             </div>
                             <div>
                                 {actions.slice(0, 3).map((act, i) => (
                                     <div key={i} className="print-list-item">
                                         <div className="print-bold text-[9px] leading-tight">• {act.title}</div>
                                         <div className="print-text text-[8px] leading-tight text-slate-500 pl-1">{act.description}</div>
                                     </div>
                                 ))}
                                 {actions.length > 3 && <div className="print-small italic text-center">+ {actions.length - 3} itens</div>}
                             </div>
                         </div>
                     )
                 })}
             </div>
          </div>

          {/* 6. LONGO PRAZO E TABELA (Rodapé da pág 2 se possível) */}
          <div className="print-section">
             <div className="print-grid-2">
                <div>
                     <h2 className="print-h2" style={{marginTop: 0}}>Visão 2030 (5 Anos)</h2>
                     <div className="print-card">
                        {groupedAggregateActions['5 Anos']?.slice(0, 3).map((act, i) => (
                             <div key={i} className="print-list-item">
                                 <div className="print-bold text-[9px]">→ {act.title}</div>
                                 <div className="print-text text-[8px] pl-2">{act.description}</div>
                             </div>
                        ))}
                     </div>
                </div>
                <div>
                     <h2 className="print-h2" style={{marginTop: 0}}>Últimos Registros</h2>
                     <table className="w-full text-left border-collapse text-[8px]">
                          <thead>
                              <tr className="border-b border-slate-400">
                                  <th className="py-0.5 font-bold">Setor</th>
                                  <th className="py-0.5 font-bold text-right">Score</th>
                              </tr>
                          </thead>
                          <tbody>
                              {submissions.slice(0, 5).map(sub => (
                                  <tr key={sub.id} className="border-b border-slate-100">
                                      <td className="py-0.5 truncate max-w-[100px]">{sub.respondent.sector}</td>
                                      <td className="py-0.5 text-right font-bold">{sub.result.percentage.toFixed(0)}%</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                </div>
             </div>
          </div>

          <div className="print-footer">
              <span>Relatório ESG Municipal - Gerado Automaticamente</span>
              <span>Página 1-2</span>
          </div>

      </div>
    </div>
  );
};

export default AdminDashboard;