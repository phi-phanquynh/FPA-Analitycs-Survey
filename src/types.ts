export type ManagementDomainId =
  | "data"
  | "planning"
  | "analysis"
  | "decision"
  | "action";

export type RoundLevelKey = "basic" | "applied" | "ai";

export type AnswerValue = "done" | "partial" | "none";

export type AnswerOption = {
  value: AnswerValue;
  label: string;
  score: 0 | 1 | 2;
  description: string;
};

export type ManagementDomain = {
  id: ManagementDomainId;
  name: string;
  shortName: string;
  description: string;
  accent: string;
};

export type DiagnosticRound = {
  key: RoundLevelKey;
  label: string;
  headline: string;
  summary: string;
};

export type IllustrationKey =
  | "q1-consolidation"
  | "q2-variance"
  | "q3-domain-compare"
  | "q4-meeting-ready"
  | "q5-task-tracking"
  | "q6-field-link"
  | "q7-forecast-update"
  | "q8-profit-bridge"
  | "q9-option-compare"
  | "q10-action-loop"
  | "q11-ai-data"
  | "q12-ai-forecast"
  | "q13-ai-alert"
  | "q14-ai-agenda"
  | "q15-ai-next-action";

export type DiagnosticQuestion = {
  id: string;
  order: number;
  round: RoundLevelKey;
  domainId: ManagementDomainId;
  question: string;
  examples: string;
  illustrationKey: IllustrationKey;
  illustrationAlt: string;
};

export type MaturityStageKey = "immature" | "standard" | "advanced" | "frontier";

export type MaturityStage = {
  key: MaturityStageKey;
  label: "未熟" | "標準" | "高度" | "先端";
  summary: string;
  actionTone: string;
};

export type RoundDiagnosis = {
  round: RoundLevelKey;
  label: string;
  score: number;
  maxScore: number;
  answeredCount: number;
};

export type DomainDiagnosis = {
  domainId: ManagementDomainId;
  domainName: string;
  shortName: string;
  accent: string;
  totalScore: number;
  maxScore: number;
  basicScore: number;
  appliedScore: number;
  aiScore: number;
  maturityStage: MaturityStage;
};

export type RecommendedAction = {
  domainId: ManagementDomainId;
  domainName: string;
  accent: string;
  priority: number;
  round: RoundLevelKey | "maintain";
  title: string;
  action: string;
  reason: string;
  answerValue?: AnswerValue;
};

export type ProgressSummary = {
  answeredCount: number;
  totalQuestions: number;
  missingCount: number;
  nextQuestionId: string | null;
  roundDiagnostics: RoundDiagnosis[];
};

export type IncompleteDiagnosis = ProgressSummary & {
  status: "incomplete";
};

export type CompletedDiagnosis = ProgressSummary & {
  status: "diagnosed";
  overallStage: MaturityStage;
  summary: string;
  evidence: string[];
  domainDiagnostics: DomainDiagnosis[];
  recommendedActions: RecommendedAction[];
};

export type DiagnosisResult = IncompleteDiagnosis | CompletedDiagnosis;

export type AppMode = "home" | "deck" | "roundBreak" | "leadGate" | "result";

export type LeadForm = {
  company: string;
  title: string;
  name: string;
  email: string;
};

export type SubmissionPayload = {
  recipientEmail: string;
  lead: LeadForm;
  diagnosticAnswers: Record<string, AnswerValue>;
  diagnosisResult: CompletedDiagnosis;
  summaryText: string;
  submittedAt: string;
};
