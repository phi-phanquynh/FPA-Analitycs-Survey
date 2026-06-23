export type ChartType =
  | "scorecard"
  | "line"
  | "waterfall"
  | "bridge"
  | "gauge"
  | "matrix"
  | "scatter"
  | "bubble"
  | "pareto"
  | "funnel"
  | "treemap"
  | "bar"
  | "heatmap"
  | "forecast"
  | "scenario"
  | "stacked"
  | "network"
  | "narrative";

export type Category = {
  id: string;
  name: string;
  description: string;
  question: string;
  promise: string;
  poc: string;
  tags: string[];
  accent: string;
  chart: ChartType;
};

export type AnalyticsItem = {
  id: string;
  category: string;
  title: string;
  question: string;
  capability: string;
  data: string;
  decision: string;
  horizon: string;
  chart: ChartType;
  chartLabel?: string;
};

export type QuestionnaireItem = {
  q: string;
  options: string[];
};

export type MaturityLevel = {
  level: 1 | 2 | 3 | 4 | 5;
  label: string;
  range: string;
  summary: string;
};

export type DiagnosisSignal = {
  source: "card" | "questionnaire" | "uncertainty";
  label: string;
  categories: string[];
  weight: number;
  reason: string;
};

export type CategoryDiagnosis = {
  categoryId: string;
  categoryName: string;
  categoryDescription: string;
  issueScore: number;
  cardScore: number;
  questionnaireScore: number;
  selectedCount: number;
  selectedTitles: string[];
  maturity: MaturityLevel;
  signals: DiagnosisSignal[];
  reason: string;
  firstAction: string;
};

export type DiagnosisResult = {
  status: "diagnosed" | "insufficient";
  overallIssueScore: number;
  overallMaturity: MaturityLevel;
  summary: string;
  evidence: string[];
  topCategories: CategoryDiagnosis[];
  categoryDiagnostics: CategoryDiagnosis[];
  uncertaintySignals: DiagnosisSignal[];
  nextChecks: string[];
  isPocReferenceOnly: boolean;
};

export type AppMode =
  | "home"
  | "intro"
  | "deck"
  | "roundBreak"
  | "list"
  | "detail"
  | "questionnaire"
  | "leadGate"
  | "result"
  | "catalogGift";

export type LeadForm = {
  company: string;
  title: string;
  name: string;
  email: string;
};

export type SubmissionPayload = {
  recipientEmail: string;
  lead: LeadForm;
  selectedAnalytics: Array<{
    id: string;
    title: string;
    category: string;
    data: string;
    decision: string;
    horizon: string;
  }>;
  dismissedAnalytics: string[];
  questionnaireAnswers: Record<string, string[]>;
  diagnosisResult: DiagnosisResult;
  summaryText: string;
  submittedAt: string;
};
