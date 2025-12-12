import React, { useState, useEffect, useRef } from 'react';
import { CATEGORIES } from './constants';
import { AnswersState, AssessmentResult, RespondentData, EvidencesState } from './types';
import { calculateScore, saveSubmission, loadDraft, clearLocalProgress, loginUser } from './utils';
import Assessment from './components/Assessment';
import Dashboard from './components/Dashboard'; 
import AdminDashboard from './components/AdminDashboard';
import LogoutButton from './components/LogoutButton';
import { auth } from './firebase';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';

enum View {
  HOME = 'HOME',
  ASSESSMENT = 'ASSESSMENT',
  SUCCESS = 'SUCCESS',
  ADMIN_LOGIN = 'ADMIN_LOGIN',
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD'
}

// --- DISCLAIMER MODAL ---
const DisclaimerModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[110] p-4 backdrop-blur-sm animate-fade-in">
        <div className="bg-white p-8 rounded-2xl max-w-lg w-full shadow-2xl border border-emerald-500/30">
            <h3 className="text-2xl font-black text-slate-900 mb-4 flex items-center gap-2">
                <span className="text-3xl">⚠️</span> Atenção Importante
            </h3>
            <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
                <p>Para garantir a segurança e a qualidade das informações, observe as seguintes recomendações:</p>
                <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Dispositivo:</strong> Recomendamos o uso de computador ou notebook para anexar arquivos com facilidade.</li>
                    <li><strong>Evidências:</strong> O tamanho máximo permitido por arquivo é <strong>1MB</strong> (PDF, JPG, PNG, DOCX, XLSX).</li>
                    <li><strong>Autosave:</strong> Seu progresso é salvo automaticamente neste dispositivo e na nuvem.</li>
                    <li><strong>Segurança:</strong> Por segurança, sua sessão expira após <strong>10 minutos</strong> de inatividade.</li>
                </ul>
            </div>
            <button 
                onClick={onClose}
                className="mt-8 w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-lg"
            >
                Entendi, vamos começar
            </button>
        </div>
    </div>
  );
};

// --- INACTIVITY TIMER ---
const InactivityTimer: React.FC<{ isActive: boolean; onTimeout: () => void }> = ({ isActive, onTimeout }) => {
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const [showWarning, setShowWarning] = useState(false);
  const timerRef = useRef<any>(null);

  const resetTimer = () => {
    setTimeLeft(600);
    setShowWarning(false);
  };

  useEffect(() => {
    if (!isActive) return;

    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    const handleActivity = () => resetTimer();

    events.forEach(e => window.addEventListener(e, handleActivity));

    timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
            if (prev <= 1) {
                clearInterval(timerRef.current);
                onTimeout();
                return 0;
            }
            if (prev <= 120) setShowWarning(true); // Warn at 2 mins
            return prev - 1;
        });
    }, 1000);

    return () => {
        events.forEach(e => window.removeEventListener(e, handleActivity));
        if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, onTimeout]);

  if (!showWarning) return null;

  return (
    <div className="fixed top-0 left-0 w-full bg-red-600 text-white text-center py-2 z-[120] font-bold animate-pulse">
        Sessão expirando em {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}. Mova o mouse para continuar.
    </div>
  );
};

// --- LOGIN MODAL (AUTHENTICATION) ---
const LoginModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  onLoginSuccess: (data: RespondentData) => void; 
}> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [name, setName] = useState('');
  const [sector, setSector] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    
    if (!name.trim() || !sector.trim() || !pin.trim()) {
      setError('Por favor, preencha todos os campos.');
      return;
    }
    
    if (pin.length !== 6 || isNaN(Number(pin))) {
        setError('A senha deve conter 6 números.');
        return;
    }

    setLoading(true);
    try {
        const user = await loginUser(name, pin);
        onLoginSuccess({
            name,
            sector,
            uid: user.uid
        });
    } catch (err: any) {
        setError(err.message || 'Erro ao realizar login.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] p-4 animate-fade-in backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-slate-200 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-100 rounded-full blur-2xl opacity-50"></div>
        
        <div className="text-center mb-8 relative z-10">
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-emerald-50 mb-4 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">Acesso Seguro</h3>
          <p className="text-sm text-slate-500 mt-2">Identifique-se para iniciar o diagnóstico.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Nome Completo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 text-white placeholder-slate-400 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-inner"
              placeholder="Ex: João Silva"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Setor / Secretaria</label>
            <input
              type="text"
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 text-white placeholder-slate-400 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-inner"
              placeholder="Ex: Meio Ambiente"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Senha Numérica (6 dígitos)</label>
            <input
              type="password"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 text-white placeholder-slate-400 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-inner tracking-widest text-center text-lg"
              placeholder="••••••"
            />
          </div>
          {error && <p className="text-red-500 text-sm font-medium bg-red-50 p-2 rounded text-center">{error}</p>}

          <div className="mt-8 flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold hover:shadow-lg hover:scale-[1.02] transition-all duration-200 ${loading ? 'opacity-70 cursor-wait' : ''}`}
            >
              {loading ? 'Autenticando...' : 'Entrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Animated SVG Components for Home
const CloudIcon = ({ className }: { className: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.5,19c-0.83,0-1.5-0.67-1.5-1.5c0-0.83,0.67-1.5,1.5-1.5c0.83,0,1.5,0.67,1.5,1.5C19,18.33,18.33,19,17.5,19z M19,6c-3.31,0-6,2.69-6,6c0,3.31,2.69,6,6,6s6-2.69,6-6C25,8.69,22.31,6,19,6z M5.5,11C2.46,11,0,13.46,0,16.5C0,19.54,2.46,22,5.5,22c3.04,0,5.5-2.46,5.5-5.5C11,13.46,8.54,11,5.5,11z" opacity="0.4"/>
  </svg>
);

const LeafIcon = ({ className }: { className: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17,8C8,10,5.9,16.17,3.82,21.34L5.71,22l1-2.3A4.49,4.49,0,0,0,8,20C19,20,22,3,22,3C21,5,14,5.25,9,6.25C4,7.25,2,11.5,2,13.5C2,15.5,3.75,17.25,3.75,17.25C7,8,17,8,17,8Z" />
  </svg>
);

const App: React.FC = () => {
  const [view, setView] = useState<View>(View.HOME);
  const [answers, setAnswers] = useState<AnswersState>({});
  const [evidences, setEvidences] = useState<EvidencesState>({});
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [respondentData, setRespondentData] = useState<RespondentData | null>(null);
  
  const [showModal, setShowModal] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isAdminLoggingIn, setIsAdminLoggingIn] = useState(false); // State for admin loader
  const [isSaving, setIsSaving] = useState(false);

  // Persistence Check on Mount
  useEffect(() => {
    // 1. Check LocalStorage
    const draft = loadDraft();
    if (draft) {
      if (confirm('Encontramos um diagnóstico em andamento salvo neste dispositivo. Deseja continuar de onde parou?')) {
        setRespondentData(draft.respondent);
        setAnswers(draft.answers);
        setEvidences(draft.evidences);
        setView(View.ASSESSMENT);
        return; // Don't check auth if we restored local
      } else {
        clearLocalProgress();
      }
    }

    // 2. Check Auth Status (Persistence)
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user && view === View.HOME && !draft) {
            // Logic to restore session if needed
        }
    });
    return () => unsubscribe();
  }, []);

  // FIX: Scroll to top whenever the view changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };
  
  const handleEvidenceChange = (questionId: string, evidence: any) => {
      setEvidences(prev => ({ ...prev, [questionId]: evidence }));
  };

  useEffect(() => {
    if (Object.keys(answers).length > 0) {
      setResult(calculateScore(answers));
    }
  }, [answers]);

  const handleStartAssessment = () => {
    if (respondentData) {
      setView(View.ASSESSMENT);
    } else {
      setShowModal(true);
    }
  };

  const handleLoginSuccess = (data: RespondentData) => {
    setRespondentData(data);
    setShowModal(false);
    setShowDisclaimer(true);
  };
  
  const handleDisclaimerClose = () => {
      setShowDisclaimer(false);
      setView(View.ASSESSMENT);
  };

  const handleFinishAssessment = async () => {
    const finalResult = calculateScore(answers);
    setResult(finalResult);

    if (finalResult && respondentData) {
      setIsSaving(true);
      
      try {
        const { savedToCloud, error } = await saveSubmission(respondentData, answers, evidences, finalResult);
        
        if (savedToCloud) {
            setView(View.SUCCESS);
        } else {
            alert(`ATENÇÃO: Seus dados foram salvos no seu aparelho, mas NÃO foram enviados para a central (Nuvem).\n\nMotivo: ${error}\n\nO Administrador NÃO conseguirá ver suas respostas. Tente novamente mais tarde com uma conexão melhor.`);
            setView(View.SUCCESS);
        }

      } catch (error: any) {
        console.error("Critical Save failed:", error);
        alert(`Erro crítico: ${error.message}. Tente novamente.`);
      } finally {
        setIsSaving(false);
      }
    } else {
        if (!respondentData) {
            alert("Erro: Dados de identificação não encontrados. Por favor, reinicie o processo.");
            setView(View.HOME);
        } else {
            alert("Houve um erro no processamento dos resultados. Tente novamente.");
        }
    }
  };

  const handleAdminLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (adminPassword === 'esgmogi') {
      setIsAdminLoggingIn(true);
      setLoginError('');
      
      try {
        // 1. Autenticação obrigatória antes de acessar o painel
        await signInAnonymously(auth);
        
        // 2. Só muda a visualização se a autenticação tiver sucesso
        setView(View.ADMIN_DASHBOARD);
        setAdminPassword('');
      } catch (error: any) {
        console.error("Erro no login do Admin:", error);
        setLoginError('Falha ao autenticar Admin no Firebase. Verifique sua conexão.');
      } finally {
        setIsAdminLoggingIn(false);
      }
    } else {
      setLoginError('Senha incorreta.');
    }
  };
  
  const handleSessionTimeout = () => {
      alert("Sua sessão expirou por inatividade. O progresso foi salvo automaticamente.");
      setView(View.HOME);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans overflow-x-hidden">
      <InactivityTimer isActive={view === View.ASSESSMENT} onTimeout={handleSessionTimeout} />
      
      <LoginModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        onLoginSuccess={handleLoginSuccess} 
      />
      
      <DisclaimerModal isOpen={showDisclaimer} onClose={handleDisclaimerClose} />

      {/* Navbar Responsive Fix */}
      <nav className="bg-white/90 backdrop-blur-md text-emerald-900 shadow-sm sticky top-0 z-50 no-print border-b border-emerald-100 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            
            {/* Logo Section */}
            <div className="flex items-center cursor-pointer group shrink min-w-0" onClick={() => setView(View.HOME)}>
              <div className="h-8 w-8 md:h-10 md:w-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center mr-2 md:mr-3 shadow-md group-hover:rotate-6 transition-transform shrink-0">
                 <LeafIcon className="h-4 w-4 md:h-6 md:w-6 text-white" />
              </div>
              <div className="flex flex-col truncate pr-2">
                <span className="text-lg md:text-2xl font-bold tracking-tight leading-none truncate">ESG <span className="text-emerald-600">Municipal</span></span>
                <span className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-slate-500 mt-1 hidden sm:block truncate">Etapa Mogi das Cruzes</span>
              </div>
            </div>

            {/* Buttons Section */}
            <div className="flex items-center gap-2 shrink-0">
              {respondentData && <LogoutButton />}
              <button 
                onClick={handleStartAssessment}
                className={`px-3 py-2 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-bold transition-all shadow-sm hover:shadow-md whitespace-nowrap ${view === View.ASSESSMENT ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-100'}`}
              >
                Diagnóstico
              </button>
              <button 
                onClick={() => setView(View.ADMIN_LOGIN)}
                className={`px-3 py-2 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-bold transition-all whitespace-nowrap ${[View.ADMIN_LOGIN, View.ADMIN_DASHBOARD].includes(view) ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-emerald-600 border border-transparent hover:border-slate-200'}`}
              >
                Admin
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow w-full mx-auto">
        {view === View.HOME && (
          <div className="relative w-full overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
              <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
              <div className="absolute top-0 right-1/4 w-96 h-96 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
              <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-lime-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-24 lg:pt-24 lg:pb-32">
              <div className="flex flex-col-reverse lg:flex-row items-center gap-12 lg:gap-20">
                <div className="flex-1 text-center lg:text-left animate-fade-in-up">
                  <div className="inline-block px-4 py-1.5 rounded-full bg-emerald-100/50 border border-emerald-200 text-emerald-800 text-sm font-bold tracking-wide mb-6 backdrop-blur-sm">
                    🌿 Gestão Pública Sustentável
                  </div>
                  <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-slate-900 tracking-tight leading-tight mb-6">
                    O Futuro é <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400">
                       Verde & Digital
                    </span>
                  </h1>
                  <p className="mt-4 text-xl text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                    Transforme Mogi das Cruzes com inteligência de dados. Gere diagnósticos precisos e planos de ação automatizados para elevar o nível de maturidade ESG.
                  </p>
                  
                  <div className="mt-10 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                    <button
                      onClick={handleStartAssessment}
                      className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-lg shadow-xl shadow-emerald-200 hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 group"
                    >
                      <span>Iniciar Diagnóstico Agora</span>
                      <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                    </button>
                  </div>

                  <div className="mt-12 flex items-center justify-center lg:justify-start gap-8 text-slate-400 grayscale opacity-70">
                    <div className="flex flex-col items-center">
                       <span className="text-2xl font-black">10+</span>
                       <span className="text-xs font-bold uppercase">Eixos ESG</span>
                    </div>
                    <div className="h-8 w-px bg-slate-300"></div>
                    <div className="flex flex-col items-center">
                       <span className="text-2xl font-black">100%</span>
                       <span className="text-xs font-bold uppercase">Digital</span>
                    </div>
                    <div className="h-8 w-px bg-slate-300"></div>
                    <div className="flex flex-col items-center">
                       <span className="text-2xl font-black">AI</span>
                       <span className="text-xs font-bold uppercase">Powered</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 w-full max-w-lg lg:max-w-none relative animate-float">
                  <div className="relative aspect-square">
                     <div className="absolute inset-0 bg-gradient-to-tr from-emerald-100 to-teal-50 rounded-[3rem] transform rotate-3 shadow-2xl"></div>
                     <div className="absolute inset-0 bg-white/40 backdrop-blur-xl rounded-[3rem] transform -rotate-2 border border-white/50 shadow-lg flex items-center justify-center p-8 overflow-hidden">
                        <div className="relative w-full h-full">
                           <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-400 rounded-full opacity-20 blur-xl animate-pulse"></div>
                           <div className="absolute bottom-10 left-4 w-3/4 h-32 flex items-end gap-2 z-10">
                              <div className="w-1/4 h-[40%] bg-emerald-200 rounded-t-lg animate-pulse"></div>
                              <div className="w-1/4 h-[60%] bg-emerald-300 rounded-t-lg animate-pulse animation-delay-2000"></div>
                              <div className="w-1/4 h-[80%] bg-emerald-400 rounded-t-lg animate-pulse animation-delay-4000"></div>
                              <div className="w-1/4 h-[100%] bg-emerald-500 rounded-t-lg shadow-lg"></div>
                           </div>
                           <LeafIcon className="absolute top-10 left-10 w-12 h-12 text-emerald-500 animate-sway opacity-80" />
                           <LeafIcon className="absolute top-20 right-20 w-8 h-8 text-teal-500 animate-sway animation-delay-2000 opacity-60" />
                           <LeafIcon className="absolute bottom-32 right-10 w-10 h-10 text-lime-500 animate-sway animation-delay-4000 opacity-70" />
                           <CloudIcon className="absolute top-4 left-20 w-24 h-16 text-slate-400 animate-float-delayed" />
                           <CloudIcon className="absolute bottom-20 right-[-20px] w-32 h-20 text-slate-300 animate-float" />
                           <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-md px-6 py-3 rounded-2xl shadow-xl border border-emerald-100 text-center z-20">
                              <span className="block text-3xl font-black text-emerald-600">85%</span>
                              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Meta de Sustentabilidade</span>
                           </div>
                        </div>
                     </div>
                  </div>
                </div>
              </div>

              <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  {
                    title: "Crítico",
                    range: "0-39%",
                    desc: "Ações urgentes necessárias.",
                    icon: "🚨",
                    color: "from-red-500 to-rose-600",
                    bg: "bg-red-50",
                    border: "border-red-100"
                  },
                  {
                    title: "Em Desenvolvimento",
                    range: "40-79%",
                    desc: "Expansão e melhoria contínua.",
                    icon: "📈",
                    color: "from-yellow-400 to-amber-500",
                    bg: "bg-amber-50",
                    border: "border-amber-100"
                  },
                  {
                    title: "Excelente",
                    range: "80-100%",
                    desc: "Liderança e inovação regional.",
                    icon: "🏆",
                    color: "from-emerald-500 to-teal-600",
                    bg: "bg-emerald-50",
                    border: "border-emerald-100"
                  }
                ].map((level, idx) => (
                  <div key={idx} className={`group relative glass-card p-8 rounded-3xl transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${level.bg} ${level.border} border`}>
                    <div className={`absolute top-0 right-0 -mt-4 -mr-4 w-16 h-16 rounded-2xl bg-gradient-to-br ${level.color} shadow-lg flex items-center justify-center text-3xl transform group-hover:scale-110 transition-transform`}>
                      {level.icon}
                    </div>
                    <div className="mt-4">
                       <span className="text-sm font-bold uppercase tracking-wider text-slate-500">{level.range}</span>
                       <h3 className="text-2xl font-bold text-slate-900 mt-1 mb-3">{level.title}</h3>
                       <p className="text-slate-600 leading-relaxed">{level.desc}</p>
                    </div>
                    <div className={`h-1.5 w-full mt-6 rounded-full bg-slate-200 overflow-hidden`}>
                       <div className={`h-full bg-gradient-to-r ${level.color} w-1/3 group-hover:w-full transition-all duration-700 ease-out`}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {view === View.ASSESSMENT && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Assessment 
              answers={answers} 
              evidences={evidences}
              respondent={respondentData!}
              onAnswerChange={handleAnswerChange} 
              onEvidenceChange={handleEvidenceChange}
              onFinish={handleFinishAssessment}
              isSaving={isSaving}
            />
          </div>
        )}

        {view === View.SUCCESS && (
          <div className="text-center py-24 animate-fade-in bg-white/50 backdrop-blur-lg rounded-3xl mx-4 my-8 shadow-xl max-w-4xl lg:mx-auto border border-emerald-100">
            {isSaving ? (
                 <div className="flex flex-col items-center justify-center h-32 mb-8">
                     <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                     <p className="mt-4 text-emerald-800 font-bold">Salvando...</p>
                 </div>
            ) : (
                <>
                <div className="mx-auto flex items-center justify-center h-32 w-32 rounded-full bg-emerald-100 mb-8 animate-bounce">
                <svg className="h-16 w-16 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                </div>
                <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Relatório Enviado!</h2>
                <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
                Obrigado, <span className="font-bold text-emerald-700 bg-emerald-50 px-2 rounded">{respondentData?.name}</span>. <br/>
                Suas respostas foram registradas com segurança no banco de dados ESG Municipal.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4 px-4">
                  <button 
                  onClick={() => {
                      setAnswers({});
                      setEvidences({});
                      setRespondentData(null);
                      setResult(null);
                      setView(View.HOME);
                  }}
                  className="px-8 py-4 rounded-full bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors shadow-lg w-full sm:w-auto"
                  >
                  Voltar ao Início
                  </button>
                </div>
                </>
            )}
          </div>
        )}

        {view === View.ADMIN_LOGIN && (
          <div className="flex items-center justify-center min-h-[60vh] px-4">
            <div className="w-full max-w-md bg-white p-10 rounded-3xl shadow-2xl border border-slate-100 animate-fade-in-up">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-slate-900 rounded-2xl mx-auto flex items-center justify-center text-white text-2xl mb-4">
                   🔐
                </div>
                <h2 className="text-3xl font-black text-slate-900">Área Restrita</h2>
                <p className="text-slate-500 mt-2">Acesso exclusivo para administradores.</p>
              </div>
               <form onSubmit={handleAdminLogin}>
                 <input
                   type="password"
                   className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all mb-4 font-medium"
                   placeholder="Digite a senha mestra"
                   value={adminPassword}
                   onChange={(e) => setAdminPassword(e.target.value)}
                   disabled={isAdminLoggingIn}
                 />
                 {loginError && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-bold text-center mb-4">{loginError}</div>}
                 <button
                   type="submit"
                   disabled={isAdminLoggingIn}
                   className={`w-full bg-gradient-to-r from-slate-900 to-slate-800 text-white py-4 rounded-xl font-bold hover:shadow-lg transform active:scale-95 transition-all ${isAdminLoggingIn ? 'opacity-70 cursor-wait' : ''}`}
                 >
                   {isAdminLoggingIn ? 'Autenticando...' : 'Acessar Dashboard'}
                 </button>
               </form>
            </div>
          </div>
        )}

        {view === View.ADMIN_DASHBOARD && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <AdminDashboard />
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 text-slate-500 py-12 text-center mt-auto relative overflow-hidden">
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-lime-400"></div>
        <p className="font-medium mb-2">&copy; {new Date().getFullYear()} ESG Municipal Diagnostic.</p>
        <p className="text-[10px] font-black tracking-[0.2em] text-emerald-600 opacity-80 uppercase">POWERED BY JOI.A.</p>
      </footer>
    </div>
  );
};

export default App;