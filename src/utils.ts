import { AnswersState, AnswerValue, AssessmentResult, MaturityLevel, ActionPlanItem, CategoryData, Submission, RespondentData, TimeFrame } from './types';
import { CATEGORIES } from './constants';
import { db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, writeBatch } from 'firebase/firestore';

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

// --- DATA PERSISTENCE ---
const COLLECTION_NAME = 'submissions';
const LOCAL_STORAGE_KEY = 'esg_submissions_backup';

export interface SaveResult {
    savedToCloud: boolean;
    savedLocal: boolean;
    error?: string;
}

export const saveSubmission = async (respondent: RespondentData, answers: AnswersState, result: AssessmentResult): Promise<SaveResult> => {
  const submissionData = {
    timestamp: new Date().toISOString(),
    respondent,
    answers,
    result
  };

  let saveResult: SaveResult = { savedToCloud: false, savedLocal: false };

  // Helper to create a promise with timeout
  const withTimeout = (promise: Promise<any>, ms: number, errorMsg: string) => {
      let timer: any;
      const timeout = new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error(errorMsg)), ms);
      });
      return Promise.race([
          promise.then(res => { clearTimeout(timer); return res; }),
          timeout
      ]);
  }

  // 1. Try Firebase (Cloud) - PRIMARY with RETRY Logic
  try {
    const colRef = collection(db, COLLECTION_NAME);
    
    try {
        // Attempt 1: 15 seconds
        await withTimeout(addDoc(colRef, submissionData), 15000, "Tentativa 1 excedida");
        saveResult.savedToCloud = true;
    } catch (firstErr) {
        console.warn("Primeira tentativa de salvar falhou, tentando novamente...", firstErr);
        
        // Attempt 2: 30 seconds (Retry)
        // Wait 1 second before retrying to let network stabilize
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await withTimeout(addDoc(colRef, submissionData), 30000, "Tempo limite de conexão excedido (30s)");
        saveResult.savedToCloud = true;
    }

    console.log("SUCESSO: Dados salvos no Firebase.");
  } catch (e: any) {
    console.error("ERRO FIREBASE:", e);
    
    // Check for Permission Denied (Common issue)
    if (e.code === 'permission-denied') {
        saveResult.error = "Permissão negada. Verifique as 'Firestore Rules' no console do Firebase.";
    } else {
        saveResult.error = e.message || "Erro de conexão com o banco de dados.";
    }
  }

  // 2. Always Save to LocalStorage (Backup)
  try {
    const existing = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    existing.push({ 
        id: `local-${Date.now()}`, 
        ...submissionData,
        _synced: saveResult.savedToCloud 
    });
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(existing));
    saveResult.savedLocal = true;
    console.log("BACKUP: Dados salvos localmente.");
  } catch (e) {
    console.error("ERRO LOCAL STORAGE:", e);
  }

  return saveResult;
};

export const getSubmissions = async (): Promise<Submission[]> => {
  let submissions: Submission[] = [];
  let cloudError = null;

  // 1. Fetch from Firebase
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);
    
    submissions = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Submission[];
  } catch (e: any) {
    console.error("Error getting documents from cloud: ", e);
    cloudError = e;
    if (e.code === 'permission-denied') {
        console.warn("ADMIN: Não foi possível ler o banco de dados. Permissão negada.");
    }
  }

  // 2. Fetch from LocalStorage and Merge
  // This is vital for mobile: even if cloud fails, show local + try to sync mentally
  try {
    const localData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    
    localData.forEach((localSub: any) => {
        // Simple deduplication check based on timestamp and name
        const exists = submissions.some(s => s.timestamp === localSub.timestamp && s.respondent.name === localSub.respondent.name);
        if (!exists) {
            submissions.push({ ...localSub, isLocal: true } as Submission);
        }
    });
    
    // Re-sort combined list
    submissions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  } catch (e) {
    console.error("Error reading local storage:", e);
  }

  // If we have 0 submissions and a cloud error occurred, throw it so UI can show "Network Error" instead of "Empty"
  if (submissions.length === 0 && cloudError) {
      console.warn("Retornando lista vazia devido a erro de conexão principal.");
  }

  return submissions;
};

// --- DELETE FUNCTIONS ---

export const deleteSubmission = async (id: string): Promise<boolean> => {
  try {
    if (id.startsWith('local-')) {
       // LocalStorage deletion
       const existing = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
       const updated = existing.filter((s: any) => s.id !== id);
       localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
       return true;
    } else {
       // Firebase deletion
       await deleteDoc(doc(db, COLLECTION_NAME, id));
       return true;
    }
  } catch (error) {
    console.error("Erro ao deletar:", error);
    return false;
  }
};

export const clearAllSubmissions = async (): Promise<boolean> => {
  try {
    // 1. Clear Firebase
    const q = query(collection(db, COLLECTION_NAME));
    const snapshot = await getDocs(q);
    
    // Batch delete (limit 500 per batch, simple implementation for now)
    const batch = writeBatch(db);
    let count = 0;
    
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
      count++;
    });

    if (count > 0) {
       await batch.commit();
    }

    // 2. Clear LocalStorage
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    
    return true;
  } catch (error) {
    console.error("Erro ao limpar banco de dados:", error);
    return false;
  }
};


// --- DYNAMIC ACTION PLAN GENERATOR ---

const ACTION_TEMPLATES: Record<'CRITICAL' | 'REGULAR' | 'EXCELLENT', Record<TimeFrame, { title: string, desc: string, priority: 'Alta' | 'Média' | 'Baixa' }>> = {
  CRITICAL: {
    '1 Mês': { 
      title: 'Diagnóstico e Contenção de Riscos', 
      desc: 'Instituir comitê de crise imediato e mapear passivos críticos em {cat} para evitar sanções.', 
      priority: 'Alta' 
    },
    '3 Meses': { 
      title: 'Adequação Normativa Emergencial', 
      desc: 'Revisar decretos e publicar portarias para garantir conformidade legal mínima em {cat}.', 
      priority: 'Alta' 
    },
    '6 Meses': { 
      title: 'Estruturação de Projetos Básicos', 
      desc: 'Elaborar termos de referência e buscar linhas de financiamento para resolver gargalos de {cat}.', 
      priority: 'Alta' 
    },
    '1 Ano': { 
      title: 'Início de Obras e Serviços Prioritários', 
      desc: 'Executar as primeiras intervenções físicas ou contratações estruturantes para {cat}.', 
      priority: 'Média' 
    },
    '5 Anos': { 
      title: 'Recuperação e Estabilidade', 
      desc: 'Atingir a média estadual de qualidade em {cat} e eliminar passivos históricos.', 
      priority: 'Média' 
    }
  },
  REGULAR: {
    '1 Mês': { 
      title: 'Análise de Gaps Operacionais', 
      desc: 'Realizar auditoria rápida de processos em {cat} para identificar pontos de ineficiência.', 
      priority: 'Média' 
    },
    '3 Meses': { 
      title: 'Capacitação e Otimização', 
      desc: 'Treinar equipes técnicas e revisar fluxos de trabalho para aumentar produtividade em {cat}.', 
      priority: 'Média' 
    },
    '6 Meses': { 
      title: 'Expansão de Cobertura', 
      desc: 'Lançar projetos para ampliar o atendimento de {cat} para bairros periféricos ou não atendidos.', 
      priority: 'Alta' 
    },
    '1 Ano': { 
      title: 'Modernização e Digitalização', 
      desc: 'Implementar sistemas de monitoramento digital e indicadores de desempenho para {cat}.', 
      priority: 'Média' 
    },
    '5 Anos': { 
      title: 'Universalização do Serviço', 
      desc: 'Garantir acesso universal e padrões de qualidade elevados em todas as regiões para {cat}.', 
      priority: 'Baixa' 
    }
  },
  EXCELLENT: {
    '1 Mês': { 
      title: 'Validação e Integridade de Dados', 
      desc: 'Auditar indicadores de {cat} para assegurar transparência e confiabilidade total.', 
      priority: 'Baixa' 
    },
    '3 Meses': { 
      title: 'Gestão do Conhecimento', 
      desc: 'Documentar boas práticas de {cat} e criar programas de mentoria para outros setores.', 
      priority: 'Baixa' 
    },
    '6 Meses': { 
      title: 'Benchmarking Internacional', 
      desc: 'Comparar métricas de {cat} com padrões globais e identificar oportunidades de inovação.', 
      priority: 'Média' 
    },
    '1 Ano': { 
      title: 'Certificações e Prêmios', 
      desc: 'Submeter a gestão de {cat} a auditorias para obtenção de selos verdes e prêmios (ISO, etc).', 
      priority: 'Média' 
    },
    '5 Anos': { 
      title: 'Liderança Global e Resiliência', 
      desc: 'Tornar {cat} um case global de sucesso, integrado a conceitos de Cidades Inteligentes e Regenerativas.', 
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

  // Clean category title for display (removes "1. ", "2. ")
  const cleanCatTitle = cat.title.includes('. ') ? cat.title.split('. ')[1] : cat.title;

  // Generate actions for ALL timeframes to create a complete roadmap
  (['1 Mês', '3 Meses', '6 Meses', '1 Ano', '5 Anos'] as TimeFrame[]).forEach(timeframe => {
    const template = templateGroup[timeframe];
    
    // Determine responsible based on timeframe/nature implies hierarchy of action
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