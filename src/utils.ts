import { AnswersState, AnswerValue, AssessmentResult, MaturityLevel, ActionPlanItem, CategoryData, Submission, RespondentData, TimeFrame } from './types';
import { CATEGORIES } from './constants';
import { db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, writeBatch } from 'firebase/firestore';

const COLLECTION_NAME = "submissions";

// --- CORE CALCULATION LOGIC (Mantida para funcionamento do App) ---

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
    });

    const percentage = catMax > 0 ? (catScore / catMax) * 100 : 0;
    categoryScores[cat.id] = { score: catScore, max: catMax, percentage };

    totalScore += catScore;
    maxScore += catMax;
  });

  const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

  let level = MaturityLevel.CRITICAL;
  if (percentage >= 80) level = MaturityLevel.EXCELLENT;
  else if (percentage >= 40) level = MaturityLevel.REGULAR;
  else level = MaturityLevel.CRITICAL;

  return { totalScore, maxScore, percentage, level, categoryScores };
};

// --- DATA PERSISTENCE (Substituída conforme solicitado - Sem LocalStorage) ---

export interface SaveResult {
    savedToCloud: boolean;
    savedLocal: boolean;
    error?: string;
}

export const saveSubmission = async (respondent: RespondentData, answers: AnswersState, result: AssessmentResult): Promise<SaveResult> => {
  const submission = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    respondent,
    answers,
    result
  };

  try {
    await addDoc(collection(db, COLLECTION_NAME), submission);
    return { savedToCloud: true, savedLocal: false };
  } catch (err: any) {
    console.error("Erro ao salvar no Firebase:", err);
    alert("Erro ao enviar dados. Verifique sua conexão e tente novamente.");
    return { savedToCloud: false, savedLocal: false, error: err.message };
  }
};

export const getSubmissions = async (): Promise<Submission[]> => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy("timestamp", "desc"));
    const snap = await getDocs(q);

    return snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    })) as Submission[];
  } catch (err) {
    console.error("Erro ao buscar dados no Firebase:", err);
    return [];
  }
};

export const deleteSubmission = async (id: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
    return true;
  } catch (error) {
    console.error("Erro ao deletar:", error);
    return false;
  }
};

export const clearAllSubmissions = async (): Promise<boolean> => {
  try {
    const q = query(collection(db, COLLECTION_NAME));
    const snapshot = await getDocs(q);
    
    const batch = writeBatch(db);
    let count = 0;
    
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
      count++;
    });

    if (count > 0) {
       await batch.commit();
    }
    return true;
  } catch (error) {
    console.error("Erro ao limpar banco de dados:", error);
    return false;
  }
};

// --- ACTION PLAN GENERATOR (Mantida para funcionamento do Dashboard) ---

const ACTION_TEMPLATES: Record<'CRITICAL' | 'REGULAR' | 'EXCELLENT', Record<TimeFrame, { title: string, desc: string, priority: 'Alta' | 'Média' | 'Baixa' }>> = {
  CRITICAL: {
    '1 Mês': { title: 'Diagnóstico e Contenção de Riscos', desc: 'Instituir comitê de crise imediato e mapear passivos críticos em {cat} para evitar sanções.', priority: 'Alta' },
    '3 Meses': { title: 'Adequação Normativa Emergencial', desc: 'Revisar decretos e publicar portarias para garantir conformidade legal mínima em {cat}.', priority: 'Alta' },
    '6 Meses': { title: 'Estruturação de Projetos Básicos', desc: 'Elaborar termos de referência e buscar linhas de financiamento para resolver gargalos de {cat}.', priority: 'Alta' },
    '1 Ano': { title: 'Início de Obras e Serviços Prioritários', desc: 'Executar as primeiras intervenções físicas ou contratações estruturantes para {cat}.', priority: 'Média' },
    '5 Anos': { title: 'Recuperação e Estabilidade', desc: 'Atingir a média estadual de qualidade em {cat} e eliminar passivos históricos.', priority: 'Média' }
  },
  REGULAR: {
    '1 Mês': { title: 'Análise de Gaps Operacionais', desc: 'Realizar auditoria rápida de processos em {cat} para identificar pontos de ineficiência.', priority: 'Média' },
    '3 Meses': { title: 'Capacitação e Otimização', desc: 'Treinar equipes técnicas e revisar fluxos de trabalho para aumentar produtividade em {cat}.', priority: 'Média' },
    '6 Meses': { title: 'Expansão de Cobertura', desc: 'Lançar projetos para ampliar o atendimento de {cat} para bairros periféricos ou não atendidos.', priority: 'Alta' },
    '1 Ano': { title: 'Modernização e Digitalização', desc: 'Implementar sistemas de monitoramento digital e indicadores de desempenho para {cat}.', priority: 'Média' },
    '5 Anos': { title: 'Universalização do Serviço', desc: 'Garantir acesso universal e padrões de qualidade elevados em todas as regiões para {cat}.', priority: 'Baixa' }
  },
  EXCELLENT: {
    '1 Mês': { title: 'Validação e Integridade de Dados', desc: 'Auditar indicadores de {cat} para assegurar transparência e confiabilidade total.', priority: 'Baixa' },
    '3 Meses': { title: 'Gestão do Conhecimento', desc: 'Documentar boas práticas de {cat} e criar programas de mentoria para outros setores.', priority: 'Baixa' },
    '6 Meses': { title: 'Benchmarking Internacional', desc: 'Comparar métricas de {cat} com padrões globais e identificar oportunidades de inovação.', priority: 'Média' },
    '1 Ano': { title: 'Certificações e Prêmios', desc: 'Submeter a gestão de {cat} a auditorias para obtenção de selos verdes e prêmios (ISO, etc).', priority: 'Média' },
    '5 Anos': { title: 'Liderança Global e Resiliência', desc: 'Tornar {cat} um case global de sucesso, integrado a conceitos de Cidades Inteligentes e Regenerativas.', priority: 'Baixa' }
  }
};

const generateActionsForCategory = (cat: CategoryData, pct: number): ActionPlanItem[] => {
  const actions: ActionPlanItem[] = [];
  let templateGroup = ACTION_TEMPLATES.CRITICAL;
  if (pct >= 80) templateGroup = ACTION_TEMPLATES.EXCELLENT;
  else if (pct >= 40) templateGroup = ACTION_TEMPLATES.REGULAR;

  const cleanCatTitle = cat.title.includes('. ') ? cat.title.split('. ')[1] : cat.title;

  (['1 Mês', '3 Meses', '6 Meses', '1 Ano', '5 Anos'] as TimeFrame[]).forEach(timeframe => {
    const template = templateGroup[timeframe];
    let responsible = 'Equipe Técnica';
    if (timeframe === '1 Mês') responsible = 'Gestão / Gabinete';
    else if (timeframe === '3 Meses') responsible = 'Coordenação Jurídica/Técnica';
    else if (timeframe === '6 Meses') responsible = 'Planejamento e Projetos';
    else if (timeframe === '1 Ano') responsible = 'Secretaria Executiva';
    else if (timeframe === '5 Anos') responsible = 'Conselho Municipal / Prefeito';

    actions.push({
      title: template.title.replace('{cat}', cleanCatTitle),
      description: template.desc.replace('{cat}', cleanCatTitle),
      deadline: timeframe,
      timeline: timeframe,
      responsible: responsible,
      impact: pct < 40 ? 'Mitigação de Risco' : (pct < 80 ? 'Eficiência Operacional' : 'Inovação e Legado'),
      priority: template.priority,
      category: cleanCatTitle
    });
  });

  return actions;
};

export const generateFullActionPlan = (result: AssessmentResult): ActionPlanItem[] => {
  let allActions: ActionPlanItem[] = [];
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