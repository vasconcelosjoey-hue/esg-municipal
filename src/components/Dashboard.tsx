import React, { useMemo } from 'react';
import { AssessmentResult, MaturityLevel, ActionPlanItem, RespondentData, TimeFrame, EvidencesState } from '../types';
import { generateFullActionPlan } from '../utils';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { CATEGORIES } from '../constants';

interface ExtendedProps {
  result: AssessmentResult;
  respondentData: RespondentData | null;
  evidences?: EvidencesState;
}

const Dashboard: React.FC<ExtendedProps> = ({ result, respondentData, evidences }) => {
  const actions = useMemo(() => generateFullActionPlan(result), [result]);
  
  const chartData = Object.entries(result.categoryScores).map(([key, val]) => ({
    subject: key.length > 10 ? key.substring(0, 10) + '...' : key,
    fullSubject: key,
    A: (val as { percentage: number }).percentage,
    fullMark: 100,
  }));

  const getScoreColor = (score: number) => {
    if (score < 40) return '#ef4444'; // Red
    if (score < 80) return '#f59e0b'; // Amber
    return '#10b981'; // Emerald
  };

  const groupedActions = useMemo(() => {
    const groups: Record<TimeFrame, ActionPlanItem[]> = {
      '1 Mês': [],
      '3 Meses': [],
      '6 Meses': [],
      '1 Ano': [],
      '5 Anos': []
    };

    actions.forEach(action => {
      if (groups[action.timeline]) {
        groups[action.timeline].push(action);
      }
    });

    return groups;
  }, [actions]);

  // Gauge Data
  const gaugeData = [
    { name: 'Score', value: result.percentage },
    { name: 'Remaining', value: 100 - result.percentage }
  ];

  return (
    <div className="animate-fade-in pb-20 print:pb-0 bg-white sm:bg-transparent">
      
      {/* HEADER WEB (No Print) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 no-print px-4 md:px-0 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900">Dashboard Estratégico</h1>
          <p className="text-slate-500 mt-1 text-sm md:text-base">Visão integrada de meio ambiente e governança.</p>
        </div>
        <button 
            onClick={() => window.print()} 
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-bold transition-colors shadow-lg hover:shadow-xl"
        >
            Imprimir Relatório
        </button>
      </div>

      {/* --- PREMIUM PRINT LAYOUT (Individual) --- */}
      <div className="print:block">
        
        {/* COVER PAGE (Simpler for Individual) */}
        <div className="hidden print:flex animus-cover" style={{height: '297mm', padding: '20mm'}}>
            <div className="animus-cover-decor-top" style={{background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0) 70%)'}}></div>
            
            <div className="animus-cover-content pt-20">
                <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-white text-2xl font-bold mb-6 border border-white/20">
                    {respondentData?.name.charAt(0)}
                </div>
                <h1 className="animus-title print:text-slate-900" style={{fontSize: '32pt'}}>Diagnóstico<br/>Individual</h1>
                <p className="text-white opacity-80 mt-4 text-xl font-light tracking-wide print:text-slate-600">{respondentData?.name}</p>
            </div>

            <div className="animus-cover-content">
                <div className="border-l-4 border-indigo-400 pl-6 mb-12">
                    <div className="uppercase tracking-widest text-xs font-bold opacity-60 mb-1 print:text-slate-500">Setor Avaliado</div>
                    <div className="text-4xl font-bold print:text-slate-900">{respondentData?.sector}</div>
                </div>
                <div className="flex justify-between items-end border-t border-white/20 pt-6">
                     <div className="text-sm font-medium opacity-70 print:text-slate-500">
                         Relatório Confidencial<br/>
                         Gerado em {new Date().toLocaleDateString('pt-BR')}
                     </div>
                     <div className="text-right">
                         <div className="text-6xl font-black tracking-tighter" style={{color: getScoreColor(result.percentage)}}>
                             {result.percentage.toFixed(0)}%
                         </div>
                         <div className="text-xs uppercase font-bold tracking-widest opacity-80 print:text-slate-500">Score Preliminar</div>
                     </div>
                </div>
            </div>
        </div>

        {/* PAGE 2: ANALYSIS */}
        <div className="print-page-content">
            <h2 className="animus-section-title">Análise de Performance</h2>
            
            <div className="animus-grid-actions mb-8">
                {/* Score Card */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col items-center justify-center shadow-sm">
                    <div className="text-xs uppercase font-bold text-slate-400 tracking-widest mb-4">Maturidade Geral</div>
                    <div className="relative w-32 h-32 flex items-center justify-center mb-2">
                        <ResponsiveContainer width="100%" height="100%">
                             <PieChart>
                                <Pie
                                    data={gaugeData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={60}
                                    startAngle={90}
                                    endAngle={-270}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    <Cell fill={getScoreColor(result.percentage)} />
                                    <Cell fill="#f1f5f9" />
                                </Pie>
                             </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-3xl font-black text-slate-800">{result.percentage.toFixed(0)}%</span>
                        </div>
                    </div>
                    <div className={`px-4 py-1.5 rounded-full text-xs uppercase font-bold border ${result.percentage < 40 ? 'bg-red-50 text-red-700 border-red-100' : result.percentage < 80 ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                        {result.percentage < 40 ? 'Crítico' : result.percentage < 80 ? 'Em Desenvolvimento' : 'Excelente'}
                    </div>
                </div>

                {/* Radar Chart */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                     <div className="chart-container" style={{height: '180px'}}>
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                                <PolarGrid stroke="#e2e8f0" strokeWidth={1} />
                                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 8, fontWeight: 700, fill: '#64748b' }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar name="Pontuação" dataKey="A" stroke={getScoreColor(result.percentage)} strokeWidth={2} fill={getScoreColor(result.percentage)} fillOpacity={0.4} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Evidence Section - Added for Print Transparency */}
            {evidences && Object.keys(evidences).length > 0 && (
                <div className="mb-8 break-inside-avoid">
                    <h2 className="animus-section-title">Evidências e Observações</h2>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        {CATEGORIES.map(cat => {
                            const catEvidences = cat.questions.filter(q => evidences[q.id] && (evidences[q.id].comment || evidences[q.id].fileUrl));
                            if (catEvidences.length === 0) return null;
                            
                            return (
                                <div key={cat.id} className="mb-4 last:mb-0">
                                    <h4 className="font-bold text-xs uppercase text-slate-500 mb-2">{cat.title}</h4>
                                    {catEvidences.map(q => (
                                        <div key={q.id} className="mb-2 text-sm bg-white p-2 rounded border border-slate-100">
                                            <p className="font-bold text-slate-800 text-xs mb-1">{q.text}</p>
                                            {evidences[q.id].comment && <p className="text-slate-600 mb-1">"{evidences[q.id].comment}"</p>}
                                            {evidences[q.id].fileUrl && <p className="text-[10px] text-blue-600 italic">📎 Anexo: {evidences[q.id].fileName}</p>}
                                        </div>
                                    ))}
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            <h2 className="animus-section-title">Plano de Ação Sugerido</h2>
            <div className="animus-grid-actions">
                {(['1 Mês', '3 Meses', '6 Meses', '1 Ano'] as TimeFrame[]).map((timeframe) => {
                    const timeActions = groupedActions[timeframe];
                    if (timeActions.length === 0) return null;

                    return (
                        <div key={timeframe} className="animus-action-group">
                            <div className="animus-action-header flex justify-between items-center">
                                {timeframe}
                                <div className="h-0.5 w-full bg-slate-200 ml-4 rounded-full opacity-50"></div>
                            </div>
                            {timeActions.slice(0, 4).map((action, idx) => (
                                <div key={idx} className="animus-action-card relative overflow-hidden">
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${action.priority === 'Alta' ? 'bg-red-500' : 'bg-indigo-500'}`}></div>
                                    <div className="pl-2">
                                        <div className="font-bold text-[9pt] text-slate-800 leading-tight mb-1 flex justify-between">
                                            <span>{action.title}</span>
                                        </div>
                                        <div className="text-[8pt] text-slate-500 leading-tight text-justify">{action.description}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>
        </div>

        <div className="print-footer">
            <span>Diagnóstico Individual - Joi.a</span>
            <span>Confidencial</span>
        </div>

      </div>
      
      {/* WEB FALLBACK */}
      <div className="mx-4 md:mx-0 no-print block">
         <div className="bg-slate-50 p-4 rounded border border-slate-200 mb-6">
            <h3 className="font-bold text-lg mb-2">Visão Web</h3>
            <p className="text-sm text-slate-600">Use o botão de impressão para o relatório formatado.</p>
         </div>
      </div>

    </div>
  );
};

export default Dashboard;