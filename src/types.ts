export enum AnswerValue {
  YES = 'YES',
  PARTIAL = 'PARTIAL',
  NO = 'NO'
}

export enum MaturityLevel {
  CRITICAL = 'Crítico', // 0-39%
  REGULAR = 'Em Desenvolvimento', // 40-79%
  GOOD = 'Bom', // (Legacy, merged into above or kept for fine tuning)
  EXCELLENT = 'Excelente' // 80-100%
}

export interface Question {
  id: string;
  text: string;
  category: string;
}

export interface CategoryData {
  id: string;
  title: string;
  questions: Question[];
}

export type TimeFrame = '1 Mês' | '3 Meses' | '6 Meses' | '1 Ano' | '5 Anos';

export interface ActionPlanItem {
  title: string;
  description: string;
  deadline: string; // Display text
  timeline: TimeFrame; // Sorting key
  responsible: string;
  impact: string;
  priority: 'Alta' | 'Média' | 'Baixa';
  category: string;
}

export interface RespondentData {
  name: string;
  sector: string;
  uid?: string; // Firebase Auth UID
}

export interface Evidence {
  questionId: string;
  comment: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  timestamp: string;
}

export interface AssessmentResult {
  totalScore: number;
  maxScore: number;
  percentage: number;
  level: MaturityLevel;
  categoryScores: Record<string, { score: number; max: number; percentage: number }>;
}

export interface Submission {
  id: string;
  timestamp: string;
  respondent: RespondentData;
  answers: AnswersState;
  evidences?: Record<string, Evidence>;
  result: AssessmentResult;
  isLocal?: boolean;
}

export type AnswersState = Record<string, AnswerValue>;
export type EvidencesState = Record<string, Evidence>;