import { AnswersState, AnswerValue, AssessmentResult, MaturityLevel, ActionPlanItem, CategoryData, Submission, RespondentData, TimeFrame, Evidence, EvidencesState } from './types';
import { CATEGORIES } from './constants';
import { db, storage, auth } from './firebase';
import { collection, getDocs, query, orderBy, deleteDoc, doc, writeBatch, setDoc, serverTimestamp, getDoc, updateDoc, deleteField, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";

const COLLECTION_NAME = "submissions";
const DRAFT_KEY = "esg_diagnostic_draft";

// --- 1. AUTH SYSTEM ---

export const loginUser = async (name: string, pin: string) => {
  const cleanName = name.trim().toLowerCase().replace(/\s+/g, '');
  const email = `${cleanName}-${pin}@fake.esg`;
  const password = `pwd-${pin}-secure`;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
      try {
        const newUserCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Save user profile separately for reference
        await setDoc(doc(db, 'users', newUserCredential.user.uid), {
          nome: name,
          senha: pin,
          setor: 'Geral',
          uid: newUserCredential.user.uid,
          createdAt: serverTimestamp()
        });
        return newUserCredential.user;
      } catch (createError: any) {
        throw new Error("Erro ao criar conta: " + createError.message);
      }
    } else {
      throw new Error("Erro no login: " + error.message);
    }
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (e) {
    console.error("Erro ao desconectar:", e);
  }

  localStorage.removeItem("esg-progress");
  localStorage.removeItem("esg-uid");
  localStorage.removeItem("esg-respondent");
  clearLocalProgress();

  window.location.href = "/";
};

// --- CORE CALCULATION LOGIC ---

export const calculateScore = (answers: AnswersState): AssessmentResult => {
  let totalScore = 0;
  let maxScore = 0;
  const categoryScores: Record<string, { score: number; max: number; percentage: number }> = {};

  CATEGORIES.forEach((cat) => {
    let catScore = 0;
    let catMax = 0;

    cat.questions.forEach((q) => {
      const answer = answers[q.id];

      // Since NA is removed, all questions count towards maxScore
      // Assuming questions not answered yet are treated as NO or simply reduce the potential score until answered.
      // Here we increment max for every question in the category to reflect true potential.
      // OR if we only count answered questions:
      if (answer) {
          catMax += 1;
          if (answer === AnswerValue.YES) {
            catScore += 1;
          } else if (answer === AnswerValue.PARTIAL) {
            catScore += 0.5;
          }
      } else {
          // If we want to penalize unanswered questions, uncomment below:
          // catMax += 1; 
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

// --- DRAFT & LOCAL STORAGE ---

export interface DraftData {
  respondent: RespondentData;
  answers: AnswersState;
  evidences: EvidencesState;
  timestamp: number;
}

export const saveDraft = (respondent: RespondentData | null, answers: AnswersState, evidences: EvidencesState) => {
  if (!respondent) return; 
  const draft: DraftData = {
    respondent,
    answers,
    evidences,
    timestamp: Date.now()
  };
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
};

export const loadDraft = (): DraftData | null => {
  const data = localStorage.getItem(DRAFT_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as DraftData;
  } catch (e) {
    console.error("Failed to parse draft", e);
    return null;
  }
};

export const clearLocalProgress = () => {
  localStorage.removeItem(DRAFT_KEY);
};

// --- 2. REALTIME FIRESTORE SAVING ---

export const saveAnswerToFirestore = async (uid: string, questionId: string, value: AnswerValue, comment?: string) => {
  if (!uid) return;
  try {
    const docRef = doc(db, 'submissions', uid, 'respostas', questionId);
    
    const payload: any = {
      resposta: value,
      timestamp: serverTimestamp()
    };

    if (comment !== undefined) {
      payload.comentario = comment;
    }

    await setDoc(docRef, payload, { merge: true });
  } catch (e) {
    console.error("Erro no autosave nuvem:", e);
  }
};

export const saveEvidenceComment = async (uid: string, questionId: string, comment: string) => {
  if (!uid) return;
  try {
    const docRef = doc(db, 'submissions', uid, 'respostas', questionId);
    await setDoc(docRef, {
      comentario: comment,
      atualizadoEm: serverTimestamp()
    }, { merge: true });
  } catch (e) {
    console.error("Erro ao salvar comentário:", e);
  }
};

// --- 3. UPLOAD EVIDENCE ---

export const uploadEvidence = async (
  uid: string, 
  questionId: string, 
  file: File,
  comment?: string
): Promise<{ metadata: Partial<Evidence> }> => {
  
  if (!uid) throw new Error("Usuário não identificado.");

  const MAX_SIZE = 1 * 1024 * 1024; // 1MB
  const ALLOWED_TYPES = [
      'image/jpeg', 'image/jpg', 'image/png', 'application/pdf', 
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (file.size > MAX_SIZE) throw new Error("Arquivo excede o limite de 1MB.");
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error("Formato inválido. Use PDF, JPG, PNG, DOCX ou XLSX.");

  const answerDocRef = doc(db, 'submissions', uid, 'respostas', questionId);
  
  // Use a safer path structure
  const storagePath = `evidencias/${uid}/${questionId}/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, storagePath);

  try {
      await uploadBytes(storageRef, file);
      
      let url = '';
      try {
          url = await getDownloadURL(storageRef);
      } catch (readError) {
          console.warn("Usuário não tem permissão de leitura pública (esperado).");
      }

      const metadata: Partial<Evidence> = {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          fileUrl: url,
          storagePath: storagePath,
          comment: comment || '',
          questionId: questionId,
          timestamp: new Date().toISOString()
      };

      await setDoc(answerDocRef, {
          evidenciaPath: storagePath,
          evidenciaUrl: url, 
          evidenciaNome: file.name,
          evidenciaTipo: file.type,
          evidenciaTamanho: file.size,
          comentario: comment || '',
          atualizadoEm: serverTimestamp()
      }, { merge: true });

      return { metadata };
  } catch (error: any) {
      console.error("Upload error:", error);
      throw new Error("Falha no upload: " + error.message);
  }
};

export const deleteEvidence = async (uid: string, questionId: string, storagePath: string) => {
    if(!uid || !storagePath) return;

    try {
        const storageRef = ref(storage, storagePath);
        await deleteObject(storageRef);

        const answerDocRef = doc(db, 'submissions', uid, 'respostas', questionId);
        await updateDoc(answerDocRef, {
            evidenciaPath: deleteField(),
            evidenciaUrl: deleteField(),
            evidenciaNome: deleteField(),
            evidenciaTipo: deleteField(),
            evidenciaTamanho: deleteField(),
            atualizadoEm: serverTimestamp()
        });
        
    } catch (e: any) {
        console.error("Erro ao deletar evidência:", e);
        if (e.code === 'storage/object-not-found') {
             // Force cleanup if file is gone
             const answerDocRef = doc(db, 'submissions', uid, 'respostas', questionId);
             await updateDoc(answerDocRef, {
                evidenciaPath: deleteField(),
                evidenciaUrl: deleteField(),
                evidenciaNome: deleteField(),
                evidenciaTipo: deleteField(),
                evidenciaTamanho: deleteField(),
                atualizadoEm: serverTimestamp()
            });
            return;
        }
        throw new Error("Falha ao remover arquivo. " + e.message);
    }
};

// --- 5. SAVE SUBMISSION ---

export interface SaveResult {
  savedToCloud: boolean;
  savedLocal: boolean;
  error?: string;
}

export const saveSubmission = async (
    respondent: RespondentData, 
    answers: AnswersState, 
    evidences: EvidencesState,
    result: AssessmentResult
): Promise<SaveResult> => {
  
  const docId = respondent.uid;

  if (!docId) {
      return { savedToCloud: false, savedLocal: false, error: "ID do usuário inválido (UID)." };
  }
  
  const submission = {
    id: docId,
    timestamp: new Date().toISOString(),
    respondent,
    result
  };

  try {
    await setDoc(doc(db, COLLECTION_NAME, docId), submission, { merge: true });
    
    await setDoc(doc(db, 'users', docId), {
        nome: respondent.name,
        setor: respondent.sector,
        uid: docId,
        lastSubmission: serverTimestamp()
    }, { merge: true });

    clearLocalProgress();
    return { savedToCloud: true, savedLocal: false };
  } catch (err: any) {
    console.error("Erro ao salvar no Firebase:", err);
    return { savedToCloud: false, savedLocal: true, error: err.message };
  }
};

// --- 5.1 DELETE SUBMISSION (FULL) ---

export const deleteFullSubmission = async (uid: string): Promise<boolean> => {
    if (!auth.currentUser) throw new Error("Ação não permitida. Usuário não autenticado.");
    
    try {
        // 1. Delete Sub-collection 'respostas' (Batch delete)
        // Note: Firestore does not support deleting a collection directly. We must fetch and delete docs.
        const subColRef = collection(db, 'submissions', uid, 'respostas');
        const snapshot = await getDocs(subColRef);
        
        // Firestore batch limit is 500. Assuming typical questionnaire size < 500.
        const batch = writeBatch(db);
        
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        
        // Commit batch deletion of subcollection
        await batch.commit();

        // 2. Delete Parent Document
        await deleteDoc(doc(db, 'submissions', uid));

        return true;
    } catch (error) {
        console.error("Erro ao excluir submissão:", error);
        throw error;
    }
};

// --- 6. FETCH SUBMISSIONS (ADMIN LIST - OPTIMIZED) ---

export const fetchAllSubmissions = async (): Promise<Submission[] | null> => {
  try {
    const subQuery = query(collection(db, COLLECTION_NAME), orderBy("timestamp", "desc"));
    const subSnapshot = await getDocs(subQuery);

    const submissions: Submission[] = subSnapshot.docs.map(doc => {
        const data = doc.data();
        const uid = doc.id;

        // Fallback to data.respondent if available, otherwise unknown
        const respondent: RespondentData = data.respondent || {
            uid: uid,
            name: 'Desconhecido',
            sector: 'Não informado'
        };

        return {
            id: uid,
            timestamp: data.timestamp || new Date().toISOString(),
            respondent: respondent,
            result: data.result,
            answers: {} // Loaded on demand
        };
    });

    return submissions;
  } catch (err) {
    console.error("Erro ao buscar submissões:", err);
    return null; // Return null on error to notify UI
  }
};

// Alias for compatibility if needed
export const getSubmissions = fetchAllSubmissions;

// --- 7. FETCH SUBMISSION DETAILS (ROBUST) ---

export const fetchSubmissionDetails = async (uid: string): Promise<{
    respondent: RespondentData;
    result: AssessmentResult;
    answers: AnswersState;
    evidences: EvidencesState;
} | null> => {
    try {
        const subDocRef = doc(db, COLLECTION_NAME, uid);
        const subSnap = await getDoc(subDocRef);
        
        // Try to fetch user doc for latest name update, but optional
        let userData = null;
        try {
            const userSnap = await getDoc(doc(db, 'users', uid));
            if(userSnap.exists()) userData = userSnap.data();
        } catch (e) { /* ignore auth errors reading users */ }

        if (!subSnap.exists() && !userData) return null;

        const subData = subSnap.exists() ? subSnap.data() : {};

        const respondent: RespondentData = {
            uid: uid,
            name: userData?.nome || subData?.respondent?.name || 'Desconhecido',
            sector: userData?.setor || subData?.respondent?.sector || 'Não informado'
        };

        const reconstructedAnswers: AnswersState = {};
        const reconstructedEvidences: EvidencesState = {};

        const q = query(collection(db, 'submissions', uid, 'respostas'));
        const snapshot = await getDocs(q);

        snapshot.forEach(doc => {
            const data = doc.data();
            const qId = doc.id;

            // FIX: Safe Enum Casting
            if (data.resposta) {
                // Normalize string to match Enum keys if needed, or trust strict typing if autosave works
                reconstructedAnswers[qId] = data.resposta as AnswerValue; 
            }

            if (data.evidenciaPath || data.comentario) {
                reconstructedEvidences[qId] = {
                    questionId: qId,
                    comment: data.comentario || '',
                    fileUrl: data.evidenciaUrl || '',
                    fileName: data.evidenciaNome,
                    fileType: data.evidenciaTipo,
                    fileSize: data.evidenciaTamanho,
                    storagePath: data.evidenciaPath,
                    // Robust timestamp handling
                    timestamp: data.atualizadoEm?.toDate?.().toISOString() || new Date().toISOString()
                };
            }
        });

        // Always recalculate score based on fetched answers to ensure integrity
        const freshResult = calculateScore(reconstructedAnswers);

        return {
            respondent,
            result: freshResult,
            answers: reconstructedAnswers,
            evidences: reconstructedEvidences
        };

    } catch (e) {
        console.error("Error fetching submission details:", e);
        return null;
    }
};

export const fetchRespondentProgress = async (uid: string): Promise<{ answers: AnswersState, evidences: EvidencesState }> => {
    const answers: AnswersState = {};
    const evidences: EvidencesState = {};
    
    try {
        const q = query(collection(db, 'submissions', uid, 'respostas'));
        const snapshot = await getDocs(q);
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const qId = doc.id;
            
            if (data.resposta) {
                answers[qId] = data.resposta as AnswerValue;
            }
            
            if (data.evidenciaPath || data.comentario) {
                evidences[qId] = {
                    questionId: qId,
                    comment: data.comentario || '',
                    fileUrl: data.evidenciaUrl || '', 
                    fileName: data.evidenciaNome,
                    fileType: data.evidenciaTipo,
                    fileSize: data.evidenciaTamanho,
                    storagePath: data.evidenciaPath,
                    timestamp: data.atualizadoEm?.toDate?.().toISOString() || new Date().toISOString()
                };
            }
        });
    } catch (e) {
        console.error("Erro ao recuperar progresso:", e);
    }
    
    return { answers, evidences };
};

// --- ACTION PLAN GENERATOR (UNCHANGED BUT INCLUDED FOR COMPLETENESS) ---

type ActionDefinition = { title: string; desc: string; priority: 'Alta' | 'Média' | 'Baixa' };
type MaturityActions = Record<'CRITICAL' | 'REGULAR' | 'EXCELLENT', Record<TimeFrame, ActionDefinition>>;

const CATEGORY_ACTIONS: Record<string, MaturityActions> = {
  'legislacao': {
    CRITICAL: {
      '1 Mês': { title: 'Diagnóstico Jurídico', desc: 'Levantar todas as leis ambientais municipais faltantes ou obsoletas.', priority: 'Alta' },
      '3 Meses': { title: 'Grupo de Trabalho', desc: 'Criar comissão para redigir o Código Ambiental Municipal.', priority: 'Alta' },
      '6 Meses': { title: 'Marcos Regulatórios', desc: 'Publicar decretos essenciais para licenciamento e fiscalização.', priority: 'Alta' },
      '1 Ano': { title: 'Aprovação Legislativa', desc: 'Aprovar o novo Código Ambiental na Câmara Municipal.', priority: 'Média' },
      '5 Anos': { title: 'Consolidação Legal', desc: 'Revisão quinquenal automática de toda legislação ambiental.', priority: 'Baixa' }
    },
    REGULAR: {
      '1 Mês': { title: 'Revisão de Decretos', desc: 'Identificar gargalos na aplicação das leis atuais.', priority: 'Média' },
      '3 Meses': { title: 'Capacitação Fiscal', desc: 'Treinar fiscais sobre as novas normativas vigentes.', priority: 'Média' },
      '6 Meses': { title: 'Digitalização de Processos', desc: 'Implantar sistema digital para trâmite de processos legais.', priority: 'Média' },
      '1 Ano': { title: 'Integração Regional', desc: 'Harmonizar leis com municípios vizinhos (consórcios).', priority: 'Média' },
      '5 Anos': { title: 'Referência Jurídica', desc: 'Tornar o município modelo estadual em legislação verde.', priority: 'Baixa' }
    },
    EXCELLENT: {
      '1 Mês': { title: 'Compliance Ativo', desc: 'Auditoria preventiva para garantir segurança jurídica total.', priority: 'Alta' },
      '3 Meses': { title: 'Simplificação', desc: 'Desburocratizar fluxos sem perder o rigor técnico.', priority: 'Baixa' },
      '6 Meses': { title: 'Incentivos Fiscais', desc: 'Criar leis de IPTU Verde e pagamentos por serviços ambientais.', priority: 'Média' },
      '1 Ano': { title: 'Certificação ISO', desc: 'Preparar base legal para certificações internacionais de gestão.', priority: 'Baixa' },
      '5 Anos': { title: 'Vanguarda Legislativa', desc: 'Propor leis inovadoras sobre clima e créditos de carbono.', priority: 'Baixa' }
    }
  },
  'agua': {
    CRITICAL: {
      '1 Mês': { title: 'Plano de Emergência', desc: 'Mapear áreas sem abastecimento e acionar caminhões-pipa/ações paliativas.', priority: 'Alta' },
      '3 Meses': { title: 'Revisão do PMSB', desc: 'Contratar revisão urgente do Plano Municipal de Saneamento.', priority: 'Alta' },
      '6 Meses': { title: 'Caça a Vazamentos', desc: 'Programa intensivo de combate a perdas na rede de distribuição.', priority: 'Alta' },
      '1 Ano': { title: 'Obras de Captação', desc: 'Iniciar ampliação da estação de tratamento de água (ETA).', priority: 'Alta' },
      '5 Anos': { title: 'Universalização', desc: 'Atingir 99% de cobertura de água potável no município.', priority: 'Média' }
    },
    REGULAR: {
      '1 Mês': { title: 'Monitoramento de Perdas', desc: 'Instalar macromedidores em setores críticos da cidade.', priority: 'Alta' },
      '3 Meses': { title: 'Qualidade da Água', desc: 'Ampliar pontos de coleta para análise de potabilidade.', priority: 'Média' },
      '6 Meses': { title: 'Esgotamento Sanitário', desc: 'Expandir rede coletora para bairros em regularização.', priority: 'Alta' },
      '1 Ano': { title: 'Eficiência Energética', desc: 'Trocar bombas antigas da ETA por modelos de alto rendimento.', priority: 'Média' },
      '5 Anos': { title: 'Ciclo Fechado', desc: 'Implementar reúso de água tratada para fins industriais/urbanos.', priority: 'Baixa' }
    },
    EXCELLENT: {
      '1 Mês': { title: 'Manutenção Preditiva', desc: 'Usar sensores IoT para detectar falhas na rede antes que ocorram.', priority: 'Média' },
      '3 Meses': { title: 'Tarifa Social', desc: 'Garantir que a excelência técnica chegue às populações vulneráveis.', priority: 'Alta' },
      '6 Meses': { title: 'Drenagem Sustentável', desc: 'Implantar jardins de chuva e biovaletas integradas.', priority: 'Média' },
      '1 Ano': { title: 'Segurança Hídrica', desc: 'Proteger 100% dos mananciais com cercamento e reflorestamento.', priority: 'Baixa' },
      '5 Anos': { title: 'Cidade Esponja', desc: 'Consolidar conceito de cidade sensível à água (Water Sensitive City).', priority: 'Baixa' }
    }
  },
  'residuos': {
    CRITICAL: {
      '1 Mês': { title: 'Erradicação de Lixões', desc: 'Encerrar imediatamente vazadouros a céu aberto (crime ambiental).', priority: 'Alta' },
      '3 Meses': { title: 'Coleta Regular', desc: 'Regularizar contratos de coleta convencional para evitar acúmulo.', priority: 'Alta' },
      '6 Meses': { title: 'Plano de Resíduos', desc: 'Elaborar o PMGIRS integrado com municípios vizinhos.', priority: 'Alta' },
      '1 Ano': { title: 'Transbordo/Aterro', desc: 'Construir estação de transbordo ou licenciar aterro sanitário.', priority: 'Alta' },
      '5 Anos': { title: 'Fim dos Passivos', desc: 'Remediar todas as áreas contaminadas por antigos lixões.', priority: 'Média' }
    },
    REGULAR: {
      '1 Mês': { title: 'Apoio a Catadores', desc: 'Fornecer EPIs e galpão estruturado para cooperativas.', priority: 'Alta' },
      '3 Meses': { title: 'Ecopontos', desc: 'Instalar pontos de entrega voluntária para entulho e volumosos.', priority: 'Média' },
      '6 Meses': { title: 'Logística Reversa', desc: 'Firmar acordos setoriais (lâmpadas, pneus, eletrônicos).', priority: 'Média' },
      '1 Ano': { title: 'Coleta Seletiva', desc: 'Expandir a coleta seletiva porta a porta para 50% da cidade.', priority: 'Média' },
      '5 Anos': { title: 'Valorização Energética', desc: 'Estudar viabilidade de biogás ou recuperação energética de rejeitos.', priority: 'Baixa' }
    },
    EXCELLENT: {
      '1 Mês': { title: 'Métrica de Reciclagem', desc: 'Auditar gravimetria para comprovar desvio do aterro.', priority: 'Média' },
      '3 Meses': { title: 'Compostagem Urbana', desc: 'Incentivar composteiras domésticas e pátios de compostagem.', priority: 'Média' },
      '6 Meses': { title: 'Economia Circular', desc: 'Fomentar indústrias que usem resíduos locais como matéria-prima.', priority: 'Média' },
      '1 Ano': { title: 'Lixo Zero', desc: 'Certificar prédios públicos e eventos municipais como Lixo Zero.', priority: 'Baixa' },
      '5 Anos': { title: 'Aterro Mínimo', desc: 'Enviar apenas rejeitos (<10%) para aterro sanitário.', priority: 'Baixa' }
    }
  },
  'energia': {
    CRITICAL: {
      '1 Mês': { title: 'Inventário de Contas', desc: 'Mapear gastos com energia em todos os prédios públicos.', priority: 'Média' },
      '3 Meses': { title: 'Combate ao Desperdício', desc: 'Campanha interna de desligamento de luzes e ar-condicionado.', priority: 'Média' },
      '6 Meses': { title: 'Troca de Lâmpadas', desc: 'Iniciar substituição de iluminação pública por LED (mais econômica).', priority: 'Alta' },
      '1 Ano': { title: 'Eficiência Predial', desc: 'Revisar contratos de demanda contratada junto à concessionária.', priority: 'Média' },
      '5 Anos': { title: 'Infraestrutura Básica', desc: 'Garantir rede elétrica segura em todas as escolas e postos.', priority: 'Alta' }
    },
    REGULAR: {
      '1 Mês': { title: 'Gestão Telemetrizada', desc: 'Instalar medidores inteligentes em grandes consumidores municipais.', priority: 'Média' },
      '3 Meses': { title: 'Inventário de GEE', desc: 'Realizar o primeiro inventário de emissões de gases estufa.', priority: 'Média' },
      '6 Meses': { title: 'Energia Solar (Piloto)', desc: 'Instalar painéis fotovoltaicos no prédio da prefeitura.', priority: 'Média' },
      '1 Ano': { title: 'PPP de Iluminação', desc: 'Estruturar Parceria Público-Privada para 100% LED na cidade.', priority: 'Alta' },
      '5 Anos': { title: 'Frota Limpa', desc: 'Iniciar transição da frota de ônibus/carros para elétricos/híbridos.', priority: 'Baixa' }
    },
    EXCELLENT: {
      '1 Mês': { title: 'Monitoramento Real-Time', desc: 'Dashboard público de geração e consumo de energia limpa.', priority: 'Baixa' },
      '3 Meses': { title: 'Mercado Livre', desc: 'Migrar grandes unidades consumidoras para o Mercado Livre de Energia.', priority: 'Média' },
      '6 Meses': { title: 'Edifícios NZEB', desc: 'Projetar novos prédios públicos com consumo "Zero Energy".', priority: 'Média' },
      '1 Ano': { title: 'Fazenda Solar', desc: 'Construir usina solar municipal para abater 100% da conta de luz.', priority: 'Baixa' },
      '5 Anos': { title: 'Smart Grid', desc: 'Integrar a rede municipal a sistemas inteligentes de distribuição.', priority: 'Baixa' }
    }
  },
  'governanca': {
    CRITICAL: {
      '1 Mês': { title: 'Nomear Responsável', desc: 'Designar servidor ou comitê oficial para responder por ESG.', priority: 'Alta' },
      '3 Meses': { title: 'Dados Básicos', desc: 'Organizar planilhas dispersas em um banco de dados centralizado.', priority: 'Alta' },
      '6 Meses': { title: 'Portal Transparência', desc: 'Publicar contratos e licitações ambientais no site oficial.', priority: 'Alta' },
      '1 Ano': { title: 'Orçamento (LOA)', desc: 'Criar rubrica específica para Meio Ambiente no orçamento anual.', priority: 'Alta' },
      '5 Anos': { title: 'Cultura Institucional', desc: 'Inserir critérios de sustentabilidade em todas as decisões.', priority: 'Média' }
    },
    REGULAR: {
      '1 Mês': { title: 'Capacitação ESG', desc: 'Curso de atualização para secretários e diretores sobre ODS.', priority: 'Média' },
      '3 Meses': { title: 'Conselhos Ativos', desc: 'Fortalecer o COMDEMA com reuniões mensais e deliberativas.', priority: 'Alta' },
      '6 Meses': { title: 'Compras Sustentáveis', desc: 'Incluir critérios verdes nos editais de licitação (Lei 14.133).', priority: 'Média' },
      '1 Ano': { title: 'Relatório Anual', desc: 'Publicar Relatório de Sustentabilidade no padrão GRI ou ODS.', priority: 'Média' },
      '5 Anos': { title: 'Governo Digital', desc: 'Eliminar 100% do papel na tramitação interna (Paperless).', priority: 'Baixa' }
    },
    EXCELLENT: {
      '1 Mês': { title: 'Auditoria Externa', desc: 'Contratar verificação independente dos indicadores publicados.', priority: 'Alta' },
      '3 Meses': { title: 'Captação Internacional', desc: 'Apresentar projetos a fundos internacionais (BID, Banco Mundial).', priority: 'Alta' },
      '6 Meses': { title: 'Open Data', desc: 'Disponibilizar APIs abertas com dados ambientais da cidade.', priority: 'Baixa' },
      '1 Ano': { title: 'Compliance Officer', desc: 'Criar cargo de controladoria focado em riscos climáticos/ESG.', priority: 'Média' },
      '5 Anos': { title: 'Referência Global', desc: 'Ser case de estudo em fóruns mundiais de gestão pública.', priority: 'Baixa' }
    }
  },
  'default': {
    CRITICAL: {
      '1 Mês': { title: 'Diagnóstico de Crise', desc: 'Identificar as causas raiz do baixo desempenho em {cat}.', priority: 'Alta' },
      '3 Meses': { title: 'Plano de Recuperação', desc: 'Estabelecer metas curtas para sair da zona crítica em {cat}.', priority: 'Alta' },
      '6 Meses': { title: 'Estruturação Básica', desc: 'Contratar equipe ou equipamentos mínimos para {cat}.', priority: 'Alta' },
      '1 Ano': { title: 'Regularização', desc: 'Cumprir as exigências legais mínimas pendentes em {cat}.', priority: 'Média' },
      '5 Anos': { title: 'Nivelamento', desc: 'Alcançar a média dos municípios vizinhos em {cat}.', priority: 'Média' }
    },
    REGULAR: {
      '1 Mês': { title: 'Otimização de Fluxos', desc: 'Melhorar a eficiência dos processos atuais de {cat}.', priority: 'Média' },
      '3 Meses': { title: 'Treinamento', desc: 'Capacitar a equipe nas melhores práticas de {cat}.', priority: 'Média' },
      '6 Meses': { title: 'Investimento Tecnológico', desc: 'Adquirir softwares ou ferramentas para modernizar {cat}.', priority: 'Alta' },
      '1 Ano': { title: 'Ampliação de Escopo', desc: 'Levar as ações de {cat} para mais bairros da cidade.', priority: 'Média' },
      '5 Anos': { title: 'Universalização', desc: 'Garantir atendimento de qualidade em {cat} para todos.', priority: 'Baixa' }
    },
    EXCELLENT: {
      '1 Mês': { title: 'Manutenção da Qualidade', desc: 'Monitorar indicadores para não permitir retrocessos em {cat}.', priority: 'Alta' },
      '3 Meses': { title: 'Mentoria', desc: 'Usar a experiência em {cat} para ajudar outras secretarias.', priority: 'Baixa' },
      '6 Meses': { title: 'Inovação', desc: 'Testar novas tecnologias piloto aplicadas a {cat}.', priority: 'Média' },
      '1 Ano': { title: 'Certificação', desc: 'Buscar prêmios ou selos de qualidade para {cat}.', priority: 'Média' },
      '5 Anos': { title: 'Legado', desc: 'Transformar {cat} em política de estado, independente de gestão.', priority: 'Baixa' }
    }
  }
};

const generateActionsForCategory = (cat: CategoryData, pct: number): ActionPlanItem[] => {
  const actions: ActionPlanItem[] = [];
  
  let maturity: 'CRITICAL' | 'REGULAR' | 'EXCELLENT' = 'CRITICAL';
  if (pct >= 80) maturity = 'EXCELLENT';
  else if (pct >= 40) maturity = 'REGULAR';

  const catId = cat.id;
  const specificTemplates = CATEGORY_ACTIONS[catId] || CATEGORY_ACTIONS['default'];
  const maturityTemplates = specificTemplates[maturity] || CATEGORY_ACTIONS['default'][maturity];

  const cleanCatTitle = cat.title.includes('. ') ? cat.title.split('. ')[1] : cat.title;

  (['1 Mês', '3 Meses', '6 Meses', '1 Ano', '5 Anos'] as TimeFrame[]).forEach(timeframe => {
    const template = maturityTemplates[timeframe];
    
    let responsible = 'Equipe Técnica';
    if (timeframe === '1 Mês') responsible = 'Gestão / Gabinete';
    else if (timeframe === '3 Meses') responsible = 'Coordenação Setorial';
    else if (timeframe === '6 Meses') responsible = 'Planejamento';
    else if (timeframe === '1 Ano') responsible = 'Secretaria Executiva';
    else if (timeframe === '5 Anos') responsible = 'Prefeito / Conselho';

    const title = template.title.replace('{cat}', cleanCatTitle);
    const desc = template.desc.replace('{cat}', cleanCatTitle);

    actions.push({
      title: title,
      description: desc,
      deadline: timeframe,
      timeline: timeframe,
      responsible: responsible,
      impact: maturity === 'CRITICAL' ? 'Correção de Rumo' : (maturity === 'REGULAR' ? 'Melhoria de Performance' : 'Excelência e Inovação'),
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