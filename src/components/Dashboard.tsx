import React, { useMemo } from 'react';
import { AssessmentResult, MaturityLevel, ActionPlanItem, RespondentData, TimeFrame } from '../types';
import { generateFullActionPlan } from '../utils';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, PieChart, Pie, Cell } from 'recharts';

interface Props {
  result: AssessmentResult;
  respondentData: RespondentData | null;
}

const Dashboard: React.FC<Props> = ({ result, respondentData }) => {
  const actions = useMemo(() => generateFullActionPlan(result), [result]);
  
  const chartData = Object.entries(result.categoryScores).map(([key, val]) => ({
    subject: key.length > 10 ? key.substring(0, 10) + '...' : key,
    fullSubject: key,
    A: (val as { percentage: number }).percentage,
    fullMark: 100,
  }));

  const getScoreColor = (score: number) => {
    if (score < 40) return '#dc2626'; // Red
    if (score < 80) return '#d97706'; // Amber
    return '#059669'; // Emerald
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
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-lg font-bold transition-colors shadow-lg hover:shadow-xl"
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
                <h1 className="animus-title" style={{fontSize: '32pt'}}>Diagnóstico<br/>Individual</h1>
                <p className="text-white opacity-80 mt-2 text-xl font-light">{respondentData?.name}</p>
            </div>

            <div className="animus-cover-content">
                <div className="border-l-4 border-indigo-400 pl-4 mb-10">
                    <div className="uppercase tracking-widest text-sm opacity-70">Setor Avaliado</div>
                    <div className="text-3xl font-bold">{respondentData?.sector}</div>
                </div>
                <div className="flex justify-between items-end border-t border-white/20 pt-4">
                     <div className="text-sm">Resultado Preliminar</div>
                     <div className="text-4xl font-bold">{result.percentage.toFixed(0)}%</div>
                </div>
            </div>
        </div>

        {/* PAGE 2: ANALYSIS */}
        <div className="print-page-content">
            <h2 className="animus-section-title">Análise de Performance</h2>
            
            <div className="animus-grid-actions mb-8">
                <div className="bg-slate-50 p-6 rounded border border-slate-200 flex flex-col items-center justify-center">
                    <div className="text-sm uppercase font-bold text-slate-500 mb-2">Score Geral</div>
                    <div className="text-5xl font-black text-slate-900 mb-2">{result.percentage.toFixed(0)}%</div>
                    <div className="px-3 py-1 bg-white border rounded text-xs uppercase font-bold text-slate-600">
                        {result.percentage < 40 ? 'Crítico' : result.percentage < 80 ? 'Em Desenv.' : 'Excelente'}
                    </div>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-200">
                     <div className="chart-container" style={{height: '160px'}}>
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="65%" data={chartData}>
                                <PolarGrid stroke="#e2e8f0" strokeWidth={1} />
                                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 7, fontWeight: 700, fill: '#64748b' }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar name="Pontuação" dataKey="A" stroke="#6366f1" strokeWidth={2} fill="#6366f1" fillOpacity={0.3} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <h2 className="animus-section-title">Plano de Ação Sugerido</h2>
            <div className="animus-grid-actions">
                {(['1 Mês', '3 Meses', '6 Meses', '1 Ano'] as TimeFrame[]).map((timeframe) => {
                    const timeActions = groupedActions[timeframe];
                    if (timeActions.length === 0) return null;

                    return (
                        <div key={timeframe} className="animus-action-group">
                            <div className="animus-action-header">{timeframe}</div>
                            {timeActions.slice(0, 3).map((action, idx) => (
                                <div key={idx} className="animus-action-card">
                                    <div className="font-bold text-[9pt] text-slate-900 leading-tight">• {action.title}</div>
                                    <div className="text-[8pt] text-slate-500 leading-tight pl-2 mt-0.5">{action.description}</div>
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