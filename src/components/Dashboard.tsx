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

      {/* --- PRINT LAYOUT (Individual Compact) --- */}
      <div className="print:block">
        
        {/* HEADER COMPACTO */}
        <div className="hidden print:flex print-header-container">
            <div>
                <h1 className="print-h1">Diagnóstico Individual</h1>
                <p className="print-small text-slate-600">{respondentData?.name} | {respondentData?.sector}</p>
            </div>
            <div className="text-right print-small">
                {new Date().toLocaleDateString('pt-BR')}
            </div>
        </div>

        {/* METRICS & CHARTS */}
        <div className="print-grid-2">
            
            {/* Left: Key Metrics */}
            <div className="print-card bg-slate-50 flex flex-col justify-center items-center">
                <h3 className="print-h3 text-slate-500 mb-1">Score do Setor</h3>
                <div className="text-[32px] font-black tracking-tighter leading-none mb-1" style={{ color: getScoreColor(result.percentage) }}>
                    {result.percentage.toFixed(0)}%
                </div>
                <div className="print-small font-bold uppercase border border-slate-300 px-2 rounded bg-white">
                    {result.percentage < 40 ? 'Crítico' : result.percentage < 80 ? 'Em Desenv.' : 'Excelente'}
                </div>
            </div>

            {/* Right: Radar Analysis */}
            <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="65%" data={chartData}>
                        <PolarGrid stroke="#e2e8f0" strokeWidth={1} />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 7, fontWeight: 700, fill: '#64748b' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name="Pontuação" dataKey="A" stroke={getScoreColor(result.percentage)} strokeWidth={2} fill={getScoreColor(result.percentage)} fillOpacity={0.25} />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* ACTION PLAN */}
        <div>
            <h2 className="print-h2 mt-2">Plano de Ação Sugerido</h2>
            
            <div className="print-grid-2">
                {(['1 Mês', '3 Meses', '6 Meses', '1 Ano'] as TimeFrame[]).map((timeframe) => {
                    const timeActions = groupedActions[timeframe];
                    if (timeActions.length === 0) return null;

                    return (
                        <div key={timeframe} className="print-card">
                            <h3 className="print-h3 border-b border-slate-200 mb-1">{timeframe}</h3>
                            <div>
                                {timeActions.slice(0, 3).map((action, idx) => (
                                    <div key={idx} className="print-list-item">
                                        <div className="print-bold text-[9px] leading-tight">• {action.title}</div>
                                        <div className="print-text text-[8px] leading-tight pl-1">{action.description}</div>
                                    </div>
                                ))}
                            </div>
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