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

  const getScoreLabel = (score: number) => {
    if (score < 40) return 'CRÍTICO';
    if (score < 80) return 'EM DESENVOLVIMENTO';
    return 'EXCELENTE';
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

      {/* --- PRINT LAYOUT --- */}
      <div className="print:block">
        
        {/* HEADER CORPORATIVO */}
        <div className="hidden print:flex justify-between items-start border-b-2 border-slate-200 pb-4 mb-6">
            <div>
                <h1 className="corp-header-main">Diagnóstico ESG Municipal</h1>
                <p className="corp-header-sub">Relatório de Inteligência Estratégica</p>
            </div>
            <div className="text-right">
                <div className="text-[9pt] font-bold uppercase text-slate-900">Mogi das Cruzes</div>
                <div className="text-[8pt] text-slate-500">{new Date().toLocaleDateString('pt-BR')}</div>
            </div>
        </div>

        {/* SECTION 1: OVERVIEW & RADAR (Grid 1:2 ratio preferred for Gartner style info panels) */}
        <div className="corp-grid-header">
            
            {/* Left: Key Metrics Card */}
            <div className="corp-card flex flex-col justify-between h-full bg-slate-50">
                <div>
                    <h3 className="text-[9pt] font-bold uppercase text-slate-500 mb-2">Índice Geral de Maturidade</h3>
                    <div className="flex items-center gap-2 mb-2">
                         <div className="text-5xl font-black tracking-tighter" style={{ color: getScoreColor(result.percentage) }}>
                            {result.percentage.toFixed(0)}%
                         </div>
                    </div>
                    <div className="corp-badge bg-white border border-slate-200 text-slate-900">
                        {getScoreLabel(result.percentage)}
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-200">
                    <h4 className="text-[8pt] font-bold text-slate-400 uppercase mb-1">Responsável</h4>
                    <div className="text-[10pt] font-bold text-slate-900 leading-tight">{respondentData?.name || 'Não informado'}</div>
                    <div className="text-[8pt] text-slate-600">{respondentData?.sector || '-'}</div>
                </div>
            </div>

            {/* Right: Radar Analysis */}
            <div className="corp-card">
                <h3 className="corp-section-title text-[10pt] mb-0 border-none pl-0">Raio-X Temático</h3>
                <div className="chart-container relative">
                     <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
                            <PolarGrid stroke="#e2e8f0" strokeWidth={1} />
                            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                            <Radar name="Pontuação" dataKey="A" stroke={getScoreColor(result.percentage)} strokeWidth={2} fill={getScoreColor(result.percentage)} fillOpacity={0.25} />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

        {/* SECTION 2: STRATEGIC ACTION PLAN */}
        <div>
            <h2 className="corp-section-title">Plano de Ação Cronológico</h2>
            
            {/* Grid layout for actions: Uniform horizontal blocks */}
            <div className="corp-grid-3">
                {(['1 Mês', '3 Meses', '6 Meses', '1 Ano', '5 Anos'] as TimeFrame[]).map((timeframe) => {
                    const timeActions = groupedActions[timeframe];
                    if (timeActions.length === 0) return null;

                    // Color accents for cards
                    const accentColor = timeframe.includes('Mês') ? 'border-t-red-500' : 
                                        timeframe.includes('Ano') && !timeframe.includes('5') ? 'border-t-amber-500' : 
                                        'border-t-emerald-500';

                    return (
                        <div key={timeframe} className={`corp-card border-t-4 ${accentColor} flex flex-col h-full`}>
                            {/* Card Header */}
                            <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100">
                                <span className="font-bold text-[10pt] text-slate-800 uppercase">{timeframe}</span>
                                <span className="text-[7pt] text-slate-400 uppercase font-medium">
                                    {timeframe.includes('Mês') ? 'Curto Prazo' : 'Longo Prazo'}
                                </span>
                            </div>

                            {/* Actions List */}
                            <div className="flex-1 space-y-3">
                                {timeActions.map((action, idx) => (
                                    <div key={idx} className="relative">
                                        <div className="flex justify-between items-start mb-0.5">
                                            <span className="corp-badge bg-slate-100 text-slate-500 border border-slate-200">
                                                {action.category}
                                            </span>
                                            {action.priority === 'Alta' && <span className="corp-badge bg-slate-900 text-white">Alta</span>}
                                        </div>
                                        <h4 className="text-[9pt] font-bold text-slate-900 leading-tight mb-0.5 mt-1">
                                            {action.title}
                                        </h4>
                                        <p className="text-[8pt] text-slate-600 leading-snug text-justify">
                                            {action.description}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Footer */}
        <div className="hidden print:block border-t border-slate-200 mt-6 pt-2">
             <div className="flex justify-between text-[7pt] text-slate-400 uppercase">
                 <span>ESG Municipal Intelligence System</span>
                 <span>Confidencial • Uso Interno</span>
                 <span>Página 1</span>
             </div>
        </div>

      </div>
      {/* --- END PRINT LAYOUT --- */}

      {/* WEB FALLBACK CONTENT */}
      <div className="mx-4 md:mx-0 no-print block">
         <div className="bg-slate-50 p-4 rounded border border-slate-200 mb-6">
            <h3 className="font-bold text-lg mb-2">Visão Geral Web</h3>
            <p className="text-sm text-slate-600">Para visualizar o relatório no formato executivo, utilize o botão de impressão acima.</p>
         </div>
         {/* Simple web view reuse */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white p-6 rounded shadow-sm border">
                <div className="text-sm text-slate-500 uppercase font-bold">Score Geral</div>
                <div className="text-5xl font-black text-slate-800 mb-2">{result.percentage.toFixed(0)}%</div>
                <div className="text-sm font-bold text-emerald-600">{getScoreLabel(result.percentage)}</div>
            </div>
            <div className="bg-white p-6 rounded shadow-sm border h-[300px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subject" />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} />
                        <Radar dataKey="A" stroke="#059669" fill="#059669" fillOpacity={0.6} />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
         </div>
      </div>

    </div>
  );
};

export default Dashboard;