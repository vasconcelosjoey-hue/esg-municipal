import React, { useMemo } from 'react';
import { AssessmentResult, MaturityLevel, ActionPlanItem, RespondentData, TimeFrame } from '../types';
import { generateFullActionPlan } from '../utils';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, PieChart, Pie, Cell, Tooltip } from 'recharts';

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

  // Helper colors
  const getScoreColor = (score: number) => {
    if (score < 40) return '#ef4444'; // Red
    if (score < 80) return '#eab308'; // Yellow
    return '#10b981'; // Green
  };

  const getScoreLabel = (score: number) => {
    if (score < 40) return 'Crítico - Ação Urgente';
    if (score < 80) return 'Em Desenvolvimento - Atenção';
    return 'Excelente - Resultado Positivo';
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
    <div className="space-y-8 md:space-y-12 animate-fade-in pb-20 print:space-y-8 print:pb-0 bg-white sm:bg-transparent">
      
      {/* Print-only Header / Cover Page Elements */}
      <div className="hidden print:block mb-12 border-b-2 border-emerald-600 pb-4">
          <h1 className="text-4xl font-black text-slate-900">Relatório Diagnóstico ESG</h1>
          <p className="text-xl text-slate-500 mt-2">Plano de Ação e Análise de Maturidade</p>
          <div className="mt-4 flex justify-between text-sm text-slate-400">
             <span>Gerado automaticamente por Joi.a</span>
             <span>{new Date().toLocaleDateString('pt-BR')}</span>
          </div>
      </div>

      {/* Header with Print Button */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 no-print px-4 md:px-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900">Dashboard Estratégico</h1>
          <p className="text-slate-500 mt-1 text-sm md:text-base">Visão integrada de meio ambiente e governança.</p>
        </div>
        <button 
            onClick={() => window.print()} 
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-bold transition-colors shadow-lg hover:shadow-xl"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Baixar PDF / Imprimir
        </button>
      </div>

      {/* Respondent Info Card */}
      <div className="mx-4 md:mx-0 bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm print:border-2 print:border-slate-800 print:shadow-none print:rounded-lg">
        <div className="flex flex-col md:flex-row flex-wrap gap-4 md:gap-8 text-sm md:text-base md:items-center">
            <div className="flex-1">
                <span className="block text-xs uppercase font-bold text-slate-400 mb-1">Responsável</span>
                <span className="font-bold text-slate-900 text-base md:text-lg break-words">{respondentData?.name || '-'}</span>
            </div>
            <div className="flex-1">
                <span className="block text-xs uppercase font-bold text-slate-400 mb-1">Setor</span>
                <span className="font-bold text-slate-900 text-base md:text-lg break-words">{respondentData?.sector || '-'}</span>
            </div>
            <div className="print:hidden hidden md:block">
                <span className="block text-xs uppercase font-bold text-slate-400 mb-1">Data</span>
                <span className="font-bold text-slate-900">{new Date().toLocaleDateString('pt-BR')}</span>
            </div>
            <div className="md:ml-auto w-full md:w-auto mt-2 md:mt-0">
                <span className="block text-xs uppercase font-bold text-slate-400 mb-1 md:text-right">Status Geral</span>
                <div className={`px-4 py-2 rounded-full text-sm font-black uppercase border text-center md:text-left
                    ${result.percentage < 40 ? 'bg-red-50 text-red-700 border-red-200' : 
                      result.percentage < 80 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 
                      'bg-emerald-50 text-emerald-700 border-emerald-200'}
                `}>
                    {getScoreLabel(result.percentage)}
                </div>
            </div>
        </div>
      </div>

      {/* Critical Vision Section - Stack on mobile, grid on desktop */}
      <div className="mx-4 md:mx-0 grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 print:grid-cols-2 print:gap-4 print:break-inside-avoid">
        {/* Gauge Chart */}
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center relative overflow-hidden print:border print:p-4 print:border-slate-300 min-h-[300px]">
            <h3 className="text-lg font-bold text-slate-800 mb-4 z-10">Índice de Maturidade</h3>
            <div className="relative w-full max-w-[250px] aspect-square z-10 print:w-48 print:h-48">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={gaugeData}
                            cx="50%"
                            cy="50%"
                            startAngle={180}
                            endAngle={0}
                            innerRadius="60%"
                            outerRadius="80%"
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                        >
                            <Cell fill={getScoreColor(result.percentage)} />
                            <Cell fill="#f1f5f9" />
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-0 text-center mt-[-10%]">
                    <span className="text-4xl md:text-5xl font-black text-slate-900 block print:text-4xl" style={{ color: getScoreColor(result.percentage) }}>
                        {result.percentage.toFixed(0)}%
                    </span>
                    <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase mt-1 block">Performance</span>
                </div>
            </div>
            
            <div className="w-full mt-4 flex justify-between text-xs font-bold text-slate-400 px-4 print:hidden">
                <span>0%</span>
                <span>100%</span>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 via-yellow-400 to-emerald-500 opacity-20 print:opacity-10"></div>
        </div>

        {/* Radar Chart */}
        <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2 print:col-span-1 print:border print:border-slate-300 min-h-[350px]">
            <h3 className="text-lg font-bold text-slate-800 mb-4 text-center md:text-left">Raio-X dos Eixos Temáticos</h3>
            <div className="h-[300px] w-full print:h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="Pontuação" dataKey="A" stroke={getScoreColor(result.percentage)} fill={getScoreColor(result.percentage)} fillOpacity={0.5} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>

      {/* Action Plans by Timeline */}
      <div className="space-y-6 md:space-y-8 print:space-y-6 mx-4 md:mx-0">
        <div className="flex items-center gap-3 mb-6 print:break-before-page print:mt-8">
            <div className="h-8 w-2 md:h-10 bg-slate-900 rounded-full"></div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900">Plano de Ação Cronológico</h2>
        </div>

        {(['1 Mês', '3 Meses', '6 Meses', '1 Ano', '5 Anos'] as TimeFrame[]).map((timeframe) => {
            const timeActions = groupedActions[timeframe];
            if (timeActions.length === 0) return null;

            return (
                <div key={timeframe} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:border print:border-slate-300 print:shadow-none mb-6 print:break-inside-avoid">
                    <div className={`px-4 md:px-6 py-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-2
                        ${timeframe.includes('Mês') ? 'bg-red-50 border-red-100 print:bg-slate-100 print:text-black' : 
                          timeframe.includes('Ano') && !timeframe.includes('5') ? 'bg-yellow-50 border-yellow-100 print:bg-slate-50' : 
                          'bg-emerald-50 border-emerald-100 print:bg-slate-50'}
                    `}>
                        <h3 className={`font-bold text-base md:text-lg flex items-center gap-2
                             ${timeframe.includes('Mês') ? 'text-red-800' : 
                               timeframe.includes('Ano') && !timeframe.includes('5') ? 'text-yellow-800' : 
                               'text-emerald-800'}
                             print:text-slate-900
                        `}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {timeframe}
                        </h3>
                        <span className="text-[10px] md:text-xs font-bold uppercase opacity-60">
                            {timeframe.includes('Mês') ? 'Ações Imediatas & Urgentes' : timeframe === '5 Anos' ? 'Visão de Futuro' : 'Estruturação'}
                        </span>
                    </div>
                    <div className="divide-y divide-slate-100 print:divide-slate-200">
                        {timeActions.map((action, idx) => (
                            <div key={idx} className="p-4 md:p-6 hover:bg-slate-50 transition-colors print:p-4">
                                <div className="flex flex-col md:flex-row justify-between mb-2 gap-2">
                                    <span className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded w-fit border border-slate-200">{action.category}</span>
                                    {action.priority === 'Alta' && <span className="text-[10px] md:text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded w-fit border border-red-200">PRIORIDADE MÁXIMA</span>}
                                </div>
                                <h4 className="text-base md:text-lg font-bold text-slate-900 mb-2">{action.title}</h4>
                                <p className="text-slate-600 text-sm mb-4 leading-relaxed text-justify">{action.description}</p>
                                <div className="flex flex-wrap gap-2 md:gap-4 text-xs font-medium text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100 print:bg-white print:border-slate-200">
                                    <div className="flex items-center gap-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                        Resp: {action.responsible}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                        Impacto: {action.impact}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        })}
      </div>
      
      <div className="hidden print:block text-center text-xs text-slate-400 pt-8 mt-12 border-t border-slate-200">
         Relatório gerado pelo Sistema ESG Municipal - Joi.a
      </div>
    </div>
  );
};

export default Dashboard;