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
    if (score < 40) return '#dc2626'; // Red-600
    if (score < 80) return '#d97706'; // Amber-600
    return '#059669'; // Emerald-600
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
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-bold transition-colors shadow-lg hover:shadow-xl"
        >
            Imprimir Briefing
        </button>
      </div>

      {/* --- PRINT LAYOUT START --- */}
      <div className="print:block">
        
        {/* 1. EXECUTIVE HEADER */}
        <div className="hidden print:flex justify-between items-end border-b-4 border-slate-900 pb-4 mb-6">
            <div>
                <h1 className="print-title-main">Diagnóstico ESG Municipal</h1>
                <p className="print-subtitle mt-2 text-slate-500">Relatório Executivo de Inteligência & Estratégia</p>
            </div>
            <div className="text-right">
                <div className="print-caption font-bold uppercase tracking-widest mb-1">Mogi das Cruzes</div>
                <div className="print-caption">{new Date().toLocaleDateString('pt-BR')}</div>
            </div>
        </div>

        {/* 2. EXECUTIVE SUMMARY GRID (2 Columns) */}
        <div className="print-grid-exec mb-8">
            
            {/* LEFT COLUMN: KPI & INFO */}
            <div className="flex flex-col gap-4">
                {/* Respondent Card */}
                <div className="print-border p-4 bg-slate-50">
                     <h3 className="print-subtitle uppercase tracking-wider text-slate-400 mb-2 border-b border-slate-200 pb-1">Responsável Técnico</h3>
                     <div className="flex justify-between items-baseline">
                        <div>
                            <div className="print-subtitle font-bold text-slate-900">{respondentData?.name || '-'}</div>
                            <div className="print-text text-slate-600">{respondentData?.sector || '-'}</div>
                        </div>
                        <div className="text-right">
                             <span className="print-caption block">ID Protocolo</span>
                             <span className="font-mono text-xs text-slate-400">#{Math.floor(Math.random() * 10000)}</span>
                        </div>
                     </div>
                </div>

                {/* Main KPI Card */}
                <div className="print-border p-4 flex items-center justify-between">
                    <div>
                        <h3 className="print-subtitle uppercase tracking-wider text-slate-400 mb-1">Índice de Maturidade</h3>
                        <div className="text-4xl font-serif font-black" style={{ color: getScoreColor(result.percentage) }}>
                            {result.percentage.toFixed(0)}%
                        </div>
                        <div className="print-caption font-bold mt-1 uppercase text-slate-500">
                             {getScoreLabel(result.percentage)}
                        </div>
                    </div>
                    {/* Gauge Chart (Small) */}
                    <div className="w-24 h-24 relative">
                         <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={gaugeData} cx="50%" cy="50%"
                                    startAngle={180} endAngle={0}
                                    innerRadius="60%" outerRadius="90%"
                                    paddingAngle={0} dataKey="value" stroke="none"
                                >
                                    <Cell fill={getScoreColor(result.percentage)} />
                                    <Cell fill="#e2e8f0" />
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN: RADAR CHART */}
            <div className="print-border p-4 h-full">
                <h3 className="print-subtitle uppercase tracking-wider text-slate-400 mb-2 border-b border-slate-200 pb-1">Raio-X Temático</h3>
                <div className="h-[200px] w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                            <PolarGrid stroke="#e2e8f0" strokeWidth={0.5} />
                            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fontWeight: 700, fill: '#475569' }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                            <Radar name="Pontuação" dataKey="A" stroke={getScoreColor(result.percentage)} strokeWidth={2} fill={getScoreColor(result.percentage)} fillOpacity={0.2} />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

        {/* 3. STRATEGIC ACTION PLAN (Grid 3 Columns) */}
        <div>
            <h2 className="print-title-section">Plano de Ação Estratégico</h2>
            
            <div className="print-grid-3">
                {(['1 Mês', '3 Meses', '6 Meses', '1 Ano', '5 Anos'] as TimeFrame[]).map((timeframe) => {
                    const timeActions = groupedActions[timeframe];
                    if (timeActions.length === 0) return null;

                    const borderColor = timeframe.includes('Mês') ? 'border-l-4 border-l-red-500' : 
                                        timeframe.includes('Ano') && !timeframe.includes('5') ? 'border-l-4 border-l-amber-500' : 
                                        'border-l-4 border-l-emerald-500';

                    return (
                        <div key={timeframe} className={`print-border p-3 print-break-inside-avoid ${borderColor} mb-2`}>
                            {/* Header */}
                            <div className="flex justify-between items-center mb-3 border-b border-slate-100 pb-2">
                                <h3 className="print-subtitle uppercase font-bold text-slate-800">{timeframe}</h3>
                                <span className="print-caption bg-slate-100 px-1 rounded">
                                    {timeframe.includes('Mês') ? 'Tático' : 'Estratégico'}
                                </span>
                            </div>
                            
                            {/* Actions List */}
                            <div className="space-y-3">
                                {timeActions.map((action, idx) => (
                                    <div key={idx} className="relative pl-0">
                                        <div className="flex justify-between items-start">
                                            <span className="text-[7pt] font-black uppercase text-slate-400 tracking-wider mb-0.5 block">
                                                {action.category}
                                            </span>
                                            {action.priority === 'Alta' && <span className="text-[6pt] bg-black text-white px-1 font-bold">ALTA</span>}
                                        </div>
                                        <h4 className="print-subtitle text-[9pt] leading-tight mb-1 text-slate-900 font-bold">
                                            {action.title}
                                        </h4>
                                        <p className="print-text text-[8pt] text-slate-600 leading-snug">
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

        {/* Footer info */}
        <div className="hidden print:block border-t border-slate-200 mt-6 pt-2 text-center">
             <span className="print-caption">Documento gerado automaticamente pelo Sistema ESG Municipal. Confidencial.</span>
        </div>

      </div>
      {/* --- PRINT LAYOUT END --- */}


      {/* --- WEB LAYOUT (Simplified Fallback for non-print) --- */}
      <div className="mx-4 md:mx-0 no-print block">
        {/* Web content logic remains similar but hidden during print via CSS */}
         <div className="bg-yellow-50 p-4 rounded border border-yellow-200 text-yellow-800 text-sm mb-4">
            ⚠️ Modo de visualização Web. Para ver o layout executivo, clique em "Imprimir Briefing".
         </div>
         {/* Reuse the print layout structure but styled for web roughly */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white p-6 rounded shadow-sm border">
                <h3 className="font-bold text-lg mb-2">Índice Geral</h3>
                <div className="text-5xl font-black text-slate-800 mb-2">{result.percentage.toFixed(0)}%</div>
                <div className="text-sm text-slate-500 uppercase font-bold">{getScoreLabel(result.percentage)}</div>
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
         {/* Web Timeline */}
         <div className="space-y-6">
            {Object.entries(groupedActions).map(([tf, acts]) => {
                const actionItems = acts as ActionPlanItem[];
                return (
                actionItems.length > 0 && (
                    <div key={tf} className="bg-white p-6 rounded border shadow-sm">
                        <h3 className="font-bold text-lg mb-4 border-b pb-2">{tf}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {actionItems.map((a, i) => (
                                <div key={i} className="bg-slate-50 p-3 rounded">
                                    <div className="font-bold text-sm text-slate-900">{a.title}</div>
                                    <div className="text-xs text-slate-600 mt-1">{a.description}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            )})}
         </div>
      </div>

    </div>
  );
};

export default Dashboard;