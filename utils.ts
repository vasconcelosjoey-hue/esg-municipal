import { AnswersState, AnswerValue, AssessmentResult, MaturityLevel, ActionPlanItem, CategoryData, Submission, RespondentData, TimeFrame } from './types';
import { CATEGORIES } from './constants';

export const calculateScore = (answers: AnswersState): AssessmentResult => {
  let totalScore = 0;
  let maxScore = 0;
  const categoryScores: Record<string, { score: number; max: number; percentage: number }> = {};

  CATEGORIES.forEach((cat) => {
    let catScore = 0;
    let catMax = 0;

    cat.questions.forEach((q) => {
      const answer = answers[q.id];
      if (answer === AnswerValue.YES) {
        catScore += 1;
        catMax += 1;
      } else if (answer === AnswerValue.PARTIAL) {
        catScore += 0.5;
        catMax += 1;
      } else if (answer === AnswerValue.NO) {
        catMax += 1;
      }
      // NA does not add to maxScore
    });

    const percentage = catMax > 0 ? (catScore / catMax) * 100 : 0;
    categoryScores[cat.id] = { score: catScore, max: catMax, percentage };

    totalScore += catScore;
    maxScore += catMax;
  });

  const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

  // Atualizado conforme solicitação:
  // 0-39% Crítico (Vermelho)
  // 40-79% Em Desenvolvimento (Amarelo)
  // 80-100% Excelente (Verde)
  let level = MaturityLevel.CRITICAL;
  if (percentage >= 80) level = MaturityLevel.EXCELLENT;
  else if (percentage >= 40) level = MaturityLevel.REGULAR;
  else level = MaturityLevel.CRITICAL;

  return {
    totalScore,
    maxScore,
    percentage,
    level,
    categoryScores,
  };
};

// --- DATA PERSISTENCE (MOCK DB) ---
const STORAGE_KEY = 'esg_municipal_submissions';

export const saveSubmission = (respondent: RespondentData, answers: AnswersState, result: AssessmentResult) => {
  const submission: Submission = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    respondent,
    answers,
    result
  };
  
  const existing = getSubmissions();
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, submission]));
};

export const getSubmissions = (): Submission[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};


// --- DYNAMIC ACTION PLAN GENERATOR ---

const generateActionsForCategory = (cat: CategoryData, pct: number): ActionPlanItem[] => {
  const actions: ActionPlanItem[] = [];
  
  // Logic:
  // < 40% (Crítico) -> Foco em 1 Mês (Diagnóstico) e 3 Meses (Legislação)
  // 40-79% (Desenv) -> Foco em 6 Meses (Projetos) e 1 Ano (Execução)
  // > 80% (Excelente) -> Foco em 5 Anos (Futuro/Inovação)

  if (pct < 40) {
    // Ações de Choque (1 a 3 meses)
    actions.push({
      title: `Decreto de Emergência/Prioridade: ${cat.title}`,
      description: `Criar grupo de trabalho imediato para estancar riscos em ${cat.title} e levantar passivos.`,
      deadline: 'Imediato',
      timeline: '1 Mês',
      responsible: 'Gabinete do Prefeito',
      impact: 'Mitigação de Riscos Legais',
      priority: 'Alta',
      category: cat.title
    });
    actions.push({
      title: `Revisão Legal de ${cat.title}`,
      description: `Enviar projeto de lei à câmara atualizando o código municipal sobre ${cat.title}.`,
      deadline: 'Curto Prazo',
      timeline: '3 Meses',
      responsible: 'Procuradoria Jurídica',
      impact: 'Segurança Jurídica',
      priority: 'Alta',
      category: cat.title
    });
  } else if (pct < 80) {
    // Ações de Estruturação (6 meses a 1 ano)
    actions.push({
      title: `Projeto Executivo - ${cat.title}`,
      description: `Contratar ou elaborar projetos técnicos para captação de recursos em ${cat.title}.`,
      deadline: 'Médio Prazo',
      timeline: '6 Meses',
      responsible: 'Secretaria de Planejamento',
      impact: 'Captação de Recursos',
      priority: 'Média',
      category: cat.title
    });
    actions.push({
      title: `Implementação de Indicadores de ${cat.title}`,
      description: `Estabelecer rotina de medição e publicação de dados sobre ${cat.title} no portal da transparência.`,
      deadline: 'Anual',
      timeline: '1 Ano',
      responsible: 'Equipe Técnica',
      impact: 'Transparência Ativa',
      priority: 'Média',
      category: cat.title
    });
  } else {
    // Ações de Futuro (5 anos)
    actions.push({
      title: `Plano Mogi 2030 - ${cat.title}`,
      description: `Estabelecer metas de longo prazo para ${cat.title} alinhadas aos ODS da ONU, visando certificação internacional.`,
      deadline: 'Longo Prazo',
      timeline: '5 Anos',
      responsible: 'Conselho Municipal',
      impact: 'Legado e Reconhecimento',
      priority: 'Baixa',
      category: cat.title
    });
  }

  return actions;
};

export const generateFullActionPlan = (result: AssessmentResult): ActionPlanItem[] => {
  let allActions: ActionPlanItem[] = [];

  // Sort categories by lowest score first to prioritize urgent needs
  const sortedCategories = [...CATEGORIES].sort((a, b) => {
    const scoreA = result.categoryScores[a.id]?.percentage || 0;
    const scoreB = result.categoryScores[b.id]?.percentage || 0;
    return scoreA - scoreB;
  });

  sortedCategories.forEach(cat => {
    const pct = result.categoryScores[cat.id]?.percentage || 0;
    const catActions = generateActionsForCategory(cat, pct);
    allActions = [...allActions, ...catActions];
  });

  return allActions;
};