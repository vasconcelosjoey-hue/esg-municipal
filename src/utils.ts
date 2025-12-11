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

// --- ACTION PLAN GENERATOR (Atualizado para ser mais realista e estratégico) ---

const ACTION_TEMPLATES: Record<'CRITICAL' | 'REGULAR' | 'EXCELLENT', Record<TimeFrame, { title: string, desc: string, priority: 'Alta' | 'Média' | 'Baixa' }>> = {
  CRITICAL: {
    '1 Mês': { 
        title: 'Força-Tarefa de Conformidade', 
        desc: 'Criar grupo de trabalho imediato para mapear riscos legais e evitar sanções do MP/Tribunais em {cat}. Foco em "estancar a sangria".', 
        priority: 'Alta' 
    },
    '3 Meses': { 
        title: 'Diagnóstico e Regularização Documental', 
        desc: 'Levantamento de passivos e elaboração de minutas de decretos para regulamentação básica de {cat}.', 
        priority: 'Alta' 
    },
    '6 Meses': { 
        title: 'Captação de Recursos Emergencial', 
        desc: 'Protocolar projetos básicos nos ministérios/bancos de fomento para viabilizar obras essenciais em {cat}.', 
        priority: 'Alta' 
    },
    '1 Ano': { 
        title: 'Execução de Obras Estruturantes', 
        desc: 'Início das intervenções físicas ou contratação de serviços terceirizados para sair do índice crítico em {cat}.', 
        priority: 'Média' 
    },
    '5 Anos': { 
        title: 'Estabilidade e Nivelamento Estadual', 
        desc: 'Alcançar os índices médios do estado em {cat}, eliminando completamente os passivos históricos.', 
        priority: 'Média' 
    }
  },
  REGULAR: {
    '1 Mês': { 
        title: 'Auditoria de Processos', 
        desc: 'Revisar fluxos de trabalho em {cat} para identificar gargalos burocráticos que impedem a nota excelente.', 
        priority: 'Média' 
    },
    '3 Meses': { 
        title: 'Capacitação Técnica e Tecnologia', 
        desc: 'Treinamento intensivo das equipes e aquisição de softwares de gestão para otimizar {cat}.', 
        priority: 'Média' 
    },
    '6 Meses': { 
        title: 'Expansão da Cobertura do Serviço', 
        desc: 'Ampliar o atendimento de {cat} para áreas rurais ou bairros periféricos ainda não atendidos.', 
        priority: 'Alta' 
    },
    '1 Ano': { 
        title: 'Digitalização e Monitoramento', 
        desc: 'Implantar centro de controle operacional com indicadores em tempo real para {cat}.', 
        priority: 'Média' 
    },
    '5 Anos': { 
        title: 'Universalização com Qualidade', 
        desc: 'Garantir que 100% da população tenha acesso a {cat} com padrões de qualidade certificados.', 
        priority: 'Baixa' 
    }
  },
  EXCELLENT: {
    '1 Mês': { 
        title: 'Blindagem e Governança de Dados', 
        desc: 'Validar integridade dos indicadores de {cat} para garantir que o resultado seja auditável e sustentável. Não permitir retrocesso.', 
        priority: 'Alta' 
    },
    '3 Meses': { 
        title: 'Gestão do Conhecimento e Mentoria', 
        desc: 'Documentar os POPs (Procedimentos Operacionais Padrão) de {cat} para que a excelência não dependa de pessoas específicas.', 
        priority: 'Média' 
    },
    '6 Meses': { 
        title: 'Inovação e Benchmarking Global', 
        desc: 'Buscar tecnologias disruptivas (IoT/AI) aplicadas a {cat} para superar os padrões nacionais.', 
        priority: 'Média' 
    },
    '1 Ano': { 
        title: 'Certificações Internacionais (ISO)', 
        desc: 'Submeter a gestão de {cat} a auditorias externas para obtenção de selos de qualidade globais.', 
        priority: 'Média' 
    },
    '5 Anos': { 
        title: 'Legado e Cidade Inteligente', 
        desc: 'Consolidar {cat} como case de referência mundial, integrando-o totalmente ao ecossistema de Smart Cities.', 
        priority: 'Baixa' 
    }
  }
};

const generateActionsForCategory = (cat: CategoryData, pct: number): ActionPlanItem[] => {
  const actions: ActionPlanItem[] = [];
  
  // Select Template Group based on Percentage
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

  // Sort categories by lowest score first to prioritize urgent needs in the list order
  // However, for the consolidated plan, we might want to group by timeframe which is handled in the UI
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