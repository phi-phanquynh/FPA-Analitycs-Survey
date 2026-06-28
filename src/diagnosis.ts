import { actionCopy, answerOptionByValue, diagnosticQuestions, diagnosticRounds, domainById, domains, roundByKey } from "./data";
import type {
  AnswerValue,
  CompletedDiagnosis,
  DiagnosisResult,
  DomainDiagnosis,
  ManagementDomainId,
  MaturityStage,
  MaturityStageKey,
  ProgressSummary,
  RecommendedAction,
  RoundLevelKey
} from "./types";

const ROUND_MAX_SCORE = 10;
const DOMAIN_MAX_SCORE = 6;
const ANSWER_MAX_SCORE = 2;
const OVERALL_BASIC_FLOOR_SCORE = 5;
const OVERALL_STANDARD_TOTAL_SCORE = 12;
const OVERALL_ADVANCED_TOTAL_SCORE = 18;
const OVERALL_FRONTIER_TOTAL_SCORE = 24;
const OVERALL_ADVANCED_BASIC_SCORE = 6;
const OVERALL_ADVANCED_APPLIED_SCORE = 5;
const OVERALL_FRONTIER_BASIC_SCORE = 7;
const OVERALL_FRONTIER_APPLIED_SCORE = 7;
const OVERALL_FRONTIER_AI_SCORE = 6;
const DOMAIN_FRONTIER_TOTAL_SCORE = 5;

const roundOrder: RoundLevelKey[] = ["basic", "applied", "ai"];
const roundPriority: Record<RoundLevelKey, number> = { basic: 3, applied: 2, ai: 1 };

const maturityStages: Record<MaturityStageKey, MaturityStage> = {
  immature: {
    key: "immature",
    label: "未熟",
    summary: "経営管理の基本となる数字の揃え方、差の説明、会議での使い方を先に整える段階です。",
    actionTone: "土台整備"
  },
  standard: {
    key: "standard",
    label: "標準",
    summary: "基本は回り始めています。次は数字を現場の動きや見通し、打ち手の比較へつなげる段階です。",
    actionTone: "応用強化"
  },
  advanced: {
    key: "advanced",
    label: "高度",
    summary: "応用まで進んでいます。次はAIや自動化で、検知、下書き、提案の範囲を広げる段階です。",
    actionTone: "AI化余地"
  },
  frontier: {
    key: "frontier",
    label: "先端",
    summary: "基本、応用、AI活用まで一通り整っています。次は横展開と継続的な精度改善の段階です。",
    actionTone: "横展開"
  }
};

function scoreOf(answer: AnswerValue | undefined) {
  return answer ? answerOptionByValue[answer].score : 0;
}

function stageFromRoundScores(scores: Record<RoundLevelKey, number>) {
  const totalScore = scores.basic + scores.applied + scores.ai;

  if (scores.basic < OVERALL_BASIC_FLOOR_SCORE || totalScore < OVERALL_STANDARD_TOTAL_SCORE) {
    return maturityStages.immature;
  }

  if (
    totalScore >= OVERALL_FRONTIER_TOTAL_SCORE &&
    scores.basic >= OVERALL_FRONTIER_BASIC_SCORE &&
    scores.applied >= OVERALL_FRONTIER_APPLIED_SCORE &&
    scores.ai >= OVERALL_FRONTIER_AI_SCORE
  ) {
    return maturityStages.frontier;
  }

  if (
    totalScore >= OVERALL_ADVANCED_TOTAL_SCORE &&
    scores.basic >= OVERALL_ADVANCED_BASIC_SCORE &&
    scores.applied >= OVERALL_ADVANCED_APPLIED_SCORE
  ) {
    return maturityStages.advanced;
  }

  return maturityStages.standard;
}

function stageFromDomainScores(scores: Record<RoundLevelKey, number>) {
  const totalScore = scores.basic + scores.applied + scores.ai;

  if (scores.basic === 0) return maturityStages.immature;
  if (scores.applied === 0) return maturityStages.standard;
  if (scores.ai > 0 && totalScore >= DOMAIN_FRONTIER_TOTAL_SCORE) return maturityStages.frontier;
  return maturityStages.advanced;
}

function getAnsweredCount(answers: Record<string, AnswerValue>) {
  return diagnosticQuestions.filter((question) => answers[question.id]).length;
}

function firstMissingQuestionId(answers: Record<string, AnswerValue>) {
  return diagnosticQuestions.find((question) => !answers[question.id])?.id ?? null;
}

function roundScore(answers: Record<string, AnswerValue>, round: RoundLevelKey) {
  const questions = diagnosticQuestions.filter((question) => question.round === round);
  return questions.reduce((sum, question) => sum + scoreOf(answers[question.id]), 0);
}

function roundAnsweredCount(answers: Record<string, AnswerValue>, round: RoundLevelKey) {
  return diagnosticQuestions.filter((question) => question.round === round && answers[question.id]).length;
}

export function buildProgressSummary(answers: Record<string, AnswerValue>): ProgressSummary {
  const answeredCount = getAnsweredCount(answers);
  return {
    answeredCount,
    totalQuestions: diagnosticQuestions.length,
    missingCount: diagnosticQuestions.length - answeredCount,
    nextQuestionId: firstMissingQuestionId(answers),
    roundDiagnostics: diagnosticRounds.map((round) => ({
      round: round.key,
      label: round.label,
      score: roundScore(answers, round.key),
      maxScore: ROUND_MAX_SCORE,
      answeredCount: roundAnsweredCount(answers, round.key)
    }))
  };
}

function domainScores(answers: Record<string, AnswerValue>, domainId: ManagementDomainId) {
  return roundOrder.reduce((scores, round) => {
    const question = diagnosticQuestions.find((item) => item.domainId === domainId && item.round === round);
    scores[round] = scoreOf(question ? answers[question.id] : undefined);
    return scores;
  }, {} as Record<RoundLevelKey, number>);
}

function buildDomainDiagnostics(answers: Record<string, AnswerValue>): DomainDiagnosis[] {
  return domains.map((domain) => {
    const scores = domainScores(answers, domain.id);
    const totalScore = scores.basic + scores.applied + scores.ai;
    return {
      domainId: domain.id,
      domainName: domain.name,
      shortName: domain.shortName,
      accent: domain.accent,
      totalScore,
      maxScore: DOMAIN_MAX_SCORE,
      basicScore: scores.basic,
      appliedScore: scores.applied,
      aiScore: scores.ai,
      maturityStage: stageFromDomainScores(scores)
    };
  });
}

function selectBottleneckRound(scores: Record<RoundLevelKey, number>): RoundLevelKey | "maintain" {
  const candidates = roundOrder
    .filter((round) => scores[round] < ANSWER_MAX_SCORE)
    .map((round) => ({
      round,
      severity: (ANSWER_MAX_SCORE - scores[round]) * roundPriority[round],
      order: roundOrder.indexOf(round)
    }))
    .sort((a, b) => b.severity - a.severity || a.order - b.order);

  return candidates[0]?.round ?? "maintain";
}

function actionReason(round: RoundLevelKey | "maintain", answerValue?: AnswerValue) {
  if (round === "maintain") return "全ラウンドで大きな詰まりは見えないため、維持と横展開を優先します。";
  if (answerValue === "none") return `${roundByKey[round].label}が未実施のため、この段階から整えるのが最短です。`;
  if (answerValue === "partial") return `${roundByKey[round].label}は一部できていますが、手直しや確認が残るため、会議前にそのまま使える状態へ近づけます。`;
  return `${roundByKey[round].label}は大きな詰まりではありません。維持、横展開、継続的な精度改善を進めます。`;
}

function buildRecommendedActions(answers: Record<string, AnswerValue>, domainDiagnostics: DomainDiagnosis[]): RecommendedAction[] {
  const actions = domainDiagnostics
    .map((diagnosis) => {
      const scores = {
        basic: diagnosis.basicScore,
        applied: diagnosis.appliedScore,
        ai: diagnosis.aiScore
      };
      const round = selectBottleneckRound(scores);
      const domain = domainById[diagnosis.domainId];
      const question = round === "maintain"
        ? undefined
        : diagnosticQuestions.find((item) => item.domainId === diagnosis.domainId && item.round === round);
      const answerValue = question ? answers[question.id] : undefined;
      const copy = actionCopy[diagnosis.domainId][round];
      const severity = round === "maintain" ? 0 : (ANSWER_MAX_SCORE - scores[round]) * roundPriority[round];

      return {
        domainId: diagnosis.domainId,
        domainName: diagnosis.domainName,
        accent: domain.accent,
        priority: 0,
        round,
        title: copy.title,
        action: copy.action,
        reason: actionReason(round, answerValue),
        answerValue,
        severity
      };
    })
    .sort((a, b) => b.severity - a.severity || domains.findIndex((domain) => domain.id === a.domainId) - domains.findIndex((domain) => domain.id === b.domainId))
    .map(({ severity: _severity, ...action }, index) => ({ ...action, priority: index + 1 }));

  return actions;
}

function buildEvidence(diagnosis: CompletedDiagnosis) {
  const basic = diagnosis.roundDiagnostics.find((round) => round.round === "basic")?.score ?? 0;
  const applied = diagnosis.roundDiagnostics.find((round) => round.round === "applied")?.score ?? 0;
  const ai = diagnosis.roundDiagnostics.find((round) => round.round === "ai")?.score ?? 0;

  return [
    `15問すべてに回答済み`,
    `基本 ${basic}pt/${ROUND_MAX_SCORE}pt、応用 ${applied}pt/${ROUND_MAX_SCORE}pt、AI ${ai}pt/${ROUND_MAX_SCORE}pt`,
    `5領域それぞれに、次に取り組むべきアクションを1つずつ提示`
  ];
}

export function buildDiagnosis(answers: Record<string, AnswerValue>): DiagnosisResult {
  const progress = buildProgressSummary(answers);
  if (progress.missingCount > 0) {
    return {
      status: "incomplete",
      ...progress
    };
  }

  const roundScores = roundOrder.reduce((scores, round) => {
    scores[round] = roundScore(answers, round);
    return scores;
  }, {} as Record<RoundLevelKey, number>);
  const overallStage = stageFromRoundScores(roundScores);
  const domainDiagnostics = buildDomainDiagnostics(answers);
  const recommendedActions = buildRecommendedActions(answers, domainDiagnostics);

  const result: CompletedDiagnosis = {
    status: "diagnosed",
    ...progress,
    overallStage,
    summary: overallStage.summary,
    evidence: [],
    domainDiagnostics,
    recommendedActions
  };

  return {
    ...result,
    evidence: buildEvidence(result)
  };
}

export function getNextQuestionIndex(answers: Record<string, AnswerValue>) {
  const missingId = firstMissingQuestionId(answers);
  if (!missingId) return diagnosticQuestions.length - 1;
  return Math.max(0, diagnosticQuestions.findIndex((question) => question.id === missingId));
}
