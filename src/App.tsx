import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  ClipboardList,
  ExternalLink,
  FileDown,
  LockKeyhole,
  Mail,
  RotateCcw,
  Send,
  Sparkles
} from "lucide-react";
import type { CSSProperties, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { QuestionIllustration } from "./QuestionIllustration";
import { answerOptions, diagnosticQuestions, diagnosticRounds, domainById, domains, roundByKey } from "./data";
import { buildDiagnosis, buildProgressSummary, getNextQuestionIndex } from "./diagnosis";
import type {
  AnswerValue,
  AppMode,
  CompletedDiagnosis,
  DiagnosticQuestion,
  LeadForm,
  MaturityStageKey,
  RoundLevelKey,
  SubmissionPayload
} from "./types";

const STORAGE_KEY = "fpa-analytics-quest-state-v4";
const FORMSPREE_ENDPOINT = import.meta.env.VITE_FORMSPREE_ENDPOINT as string | undefined;
const SUBMISSION_RECIPIENT_EMAIL = "pphanquynh@tohmatsu.co.jp";
const ANALYTICS_CATALOG_URL = "https://dtcon-eto.com/analytics-catalog/";

type SavedState = {
  mode: AppMode;
  currentQuestionIndex: number;
  answers: Record<string, AnswerValue>;
  lead: LeadForm;
  submittedAt: string | null;
};

type AnswerFeedback = {
  id: number;
  label: string;
  message: string;
};

const emptyLead: LeadForm = {
  company: "",
  title: "",
  name: "",
  email: ""
};

const activeModes: AppMode[] = ["home", "deck", "roundBreak", "leadGate", "result"];
const validAnswerValues = new Set(answerOptions.map((option) => option.value));

const stageClassMap: Record<MaturityStageKey, string> = {
  immature: "stage-immature",
  standard: "stage-standard",
  advanced: "stage-advanced",
  frontier: "stage-frontier"
};

const managementLevelNames: Record<MaturityStageKey, string> = {
  immature: "基礎整備段階",
  standard: "標準運用段階",
  advanced: "高度運用段階",
  frontier: "先端活用段階"
};

const managementLevelShortNames: Record<MaturityStageKey, string> = {
  immature: "基礎整備",
  standard: "標準運用",
  advanced: "高度運用",
  frontier: "先端活用"
};

const roundExperienceLabels: Record<RoundLevelKey, string> = {
  basic: "土台を整える",
  applied: "判断に使う",
  ai: "先回りする"
};

function managementLevelName(stageKey: MaturityStageKey) {
  return managementLevelNames[stageKey];
}

function managementLevelShortName(stageKey: MaturityStageKey) {
  return managementLevelShortNames[stageKey];
}

function scrollToPageTop() {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
}

function normalizeMode(mode: unknown): AppMode {
  return typeof mode === "string" && activeModes.includes(mode as AppMode) ? (mode as AppMode) : "home";
}

function normalizeQuestionIndex(index: unknown) {
  const numeric = typeof index === "number" && Number.isFinite(index) ? index : 0;
  return Math.max(0, Math.min(diagnosticQuestions.length - 1, Math.trunc(numeric)));
}

function normalizeAnswers(value: unknown): Record<string, AnswerValue> {
  if (!value || typeof value !== "object") return {};
  const raw = value as Record<string, unknown>;
  const questionIds = new Set(diagnosticQuestions.map((question) => question.id));

  return Object.fromEntries(
    Object.entries(raw).filter(([questionId, answer]) => questionIds.has(questionId) && typeof answer === "string" && validAnswerValues.has(answer as AnswerValue))
  ) as Record<string, AnswerValue>;
}

function loadState(): SavedState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) throw new Error("no saved state");
    const parsed = JSON.parse(saved) as Partial<SavedState> & { mode?: unknown };
    return {
      mode: normalizeMode(parsed.mode),
      currentQuestionIndex: normalizeQuestionIndex(parsed.currentQuestionIndex),
      answers: normalizeAnswers(parsed.answers),
      lead: { ...emptyLead, ...parsed.lead },
      submittedAt: parsed.submittedAt ?? null
    };
  } catch {
    return {
      mode: "home",
      currentQuestionIndex: 0,
      answers: {},
      lead: emptyLead,
      submittedAt: null
    };
  }
}

function stageClass(stage: MaturityStageKey) {
  return stageClassMap[stage];
}

function completedDiagnosisOrNull(diagnosis: ReturnType<typeof buildDiagnosis>): CompletedDiagnosis | null {
  return diagnosis.status === "diagnosed" ? diagnosis : null;
}

function answerLabel(value?: AnswerValue) {
  return answerOptions.find((option) => option.value === value)?.label ?? "未回答";
}

function answerFeedbackLabel(value: AnswerValue) {
  return answerOptions.find((option) => option.value === value)?.label ?? "回答";
}

function questionAnswerLines(answers: Record<string, AnswerValue>) {
  return diagnosticQuestions
    .map((question) => `${question.order}. ${question.question}\n   回答: ${answerLabel(answers[question.id])}\n   補足: ${question.examples}`)
    .join("\n");
}

function generateSummaryText(diagnosis: CompletedDiagnosis, answers: Record<string, AnswerValue>, lead?: LeadForm) {
  const roundLines = diagnosis.roundDiagnostics
    .map((round) => `・${round.label}: ${round.score}/${round.maxScore}`)
    .join("\n");
  const domainLines = diagnosis.domainDiagnostics
    .map((domain) => `・${domain.domainName}: ${domain.totalScore}/${domain.maxScore} / ${managementLevelShortName(domain.maturityStage.key)}`)
    .join("\n");
  const actionLines = diagnosis.recommendedActions
    .map((action) => `${action.priority}. ${action.domainName}: ${action.title}\n   ${action.action}`)
    .join("\n");

  return [
    "【回答者】",
    lead ? `${lead.company} / ${lead.title} / ${lead.name} / ${lead.email}` : "未入力",
    "",
    "【総合成熟度】",
    `貴社の経営管理レベルは「${managementLevelName(diagnosis.overallStage.key)}」です。`,
    diagnosis.overallStage.summary,
    "",
    "【ラウンド別スコア】",
    roundLines,
    "",
    "【領域別スコア】",
    domainLines,
    "",
    "【次に取り組むべき5つのアクション】",
    actionLines,
    "",
    "【プレゼントURL】",
    ANALYTICS_CATALOG_URL,
    "",
    "【15問の回答】",
    questionAnswerLines(answers)
  ].join("\n");
}

function buildSubmissionMailtoUrl(lead: LeadForm, summaryText: string) {
  const subject = `FP&A診断結果: ${lead.company}`;
  const body = [
    "FP&A診断結果",
    "",
    "以下の内容で診断結果を送信します。",
    "",
    summaryText
  ].join("\n");
  const limitedBody = body.length > 7500 ? `${body.slice(0, 7500)}\n\n※本文が長いため一部を省略しています。` : body;

  return `mailto:${SUBMISSION_RECIPIENT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(limitedBody)}`;
}

function App() {
  const [state, setState] = useState<SavedState>(() => loadState());
  const [submitState, setSubmitState] = useState<"idle" | "sending" | "error">("idle");
  const [submitError, setSubmitError] = useState("");
  const [answerFeedback, setAnswerFeedback] = useState<AnswerFeedback | null>(null);

  const progress = useMemo(() => buildProgressSummary(state.answers), [state.answers]);
  const diagnosis = useMemo(() => buildDiagnosis(state.answers), [state.answers]);
  const completedDiagnosis = completedDiagnosisOrNull(diagnosis);
  const currentQuestion = diagnosticQuestions[state.currentQuestionIndex] ?? diagnosticQuestions[0];
  const currentRoundIndex = diagnosticRounds.findIndex((round) => round.key === currentQuestion.round);
  const isComplete = progress.missingCount === 0;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(scrollToPageTop);
    return () => window.cancelAnimationFrame(frame);
  }, [state.mode, state.currentQuestionIndex]);

  useEffect(() => {
    if ((state.mode === "leadGate" || state.mode === "result") && !isComplete) {
      setState((current) => ({
        ...current,
        mode: "deck",
        currentQuestionIndex: getNextQuestionIndex(current.answers)
      }));
    }
  }, [isComplete, state.mode]);

  useEffect(() => {
    if (!answerFeedback) return;
    const timeout = window.setTimeout(() => setAnswerFeedback(null), 1200);
    return () => window.clearTimeout(timeout);
  }, [answerFeedback]);

  useEffect(() => {
    if (state.mode !== "deck" && answerFeedback) {
      setAnswerFeedback(null);
    }
  }, [answerFeedback, state.mode]);

  function resetAll() {
    setSubmitState("idle");
    setSubmitError("");
    setAnswerFeedback(null);
    setState({
      mode: "home",
      currentQuestionIndex: 0,
      answers: {},
      lead: emptyLead,
      submittedAt: null
    });
  }

  function setMode(mode: AppMode) {
    setState((current) => ({ ...current, mode }));
  }

  function startDeck() {
    setState((current) => ({
      ...current,
      mode: "deck",
      currentQuestionIndex: current.answers[diagnosticQuestions[current.currentQuestionIndex]?.id]
        ? getNextQuestionIndex(current.answers)
        : normalizeQuestionIndex(current.currentQuestionIndex)
    }));
  }

  function chooseAnswer(question: DiagnosticQuestion, answer: AnswerValue) {
    const domain = domainById[question.domainId];
    setAnswerFeedback({
      id: Date.now(),
      label: answerFeedbackLabel(answer),
      message: `${domain.shortName}領域を更新しました`
    });

    setState((current) => {
      const answers = { ...current.answers, [question.id]: answer };
      const isLastQuestion = question.order === diagnosticQuestions.length;
      const shouldBreak = question.order === 5 || question.order === 10;
      const nextIndex = Math.min(question.order, diagnosticQuestions.length - 1);

      return {
        ...current,
        answers,
        currentQuestionIndex: isLastQuestion || shouldBreak ? current.currentQuestionIndex : nextIndex,
        mode: isLastQuestion ? "leadGate" : shouldBreak ? "roundBreak" : "deck"
      };
    });
  }

  function backOneQuestion() {
    setState((current) => {
      const nextIndex = Math.max(0, current.currentQuestionIndex - 1);
      return {
        ...current,
        currentQuestionIndex: nextIndex,
        mode: "deck"
      };
    });
  }

  function continueFromBreak() {
    setState((current) => ({
      ...current,
      currentQuestionIndex: Math.min(current.currentQuestionIndex + 1, diagnosticQuestions.length - 1),
      mode: "deck"
    }));
  }

  function updateLead(field: keyof LeadForm, value: string) {
    setState((current) => ({
      ...current,
      lead: {
        ...current.lead,
        [field]: value
      }
    }));
  }

  async function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");

    const latestDiagnosis = buildDiagnosis(state.answers);
    if (latestDiagnosis.status !== "diagnosed") {
      setState((current) => ({
        ...current,
        mode: "deck",
        currentQuestionIndex: getNextQuestionIndex(current.answers)
      }));
      return;
    }

    const lead = state.lead;
    const missing = !lead.company.trim() || !lead.title.trim() || !lead.name.trim() || !lead.email.trim();
    if (missing) {
      setSubmitState("error");
      setSubmitError("会社名、役職、お名前、メールアドレスを入力してください。");
      return;
    }

    const submittedAt = new Date().toISOString();
    const summaryText = generateSummaryText(latestDiagnosis, state.answers, lead);
    const payload: SubmissionPayload = {
      recipientEmail: SUBMISSION_RECIPIENT_EMAIL,
      lead,
      diagnosticAnswers: state.answers,
      diagnosisResult: latestDiagnosis,
      summaryText,
      submittedAt
    };

    const formEndpoint = FORMSPREE_ENDPOINT?.trim();
    if (!formEndpoint || formEndpoint.includes("REPLACE")) {
      window.location.href = buildSubmissionMailtoUrl(lead, summaryText);
      setSubmitState("idle");
      setState((current) => ({ ...current, submittedAt, mode: "result" }));
      return;
    }

    setSubmitState("sending");
    try {
      const response = await fetch(formEndpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          recipient_email: SUBMISSION_RECIPIENT_EMAIL,
          _subject: "FP&A診断結果",
          _replyto: lead.email,
          company: lead.company,
          title: lead.title,
          name: lead.name,
          email: lead.email,
          overall_stage: managementLevelName(latestDiagnosis.overallStage.key),
          answered_count: latestDiagnosis.answeredCount,
          summary: summaryText,
          payload
        })
      });

      if (!response.ok) throw new Error("送信に失敗しました。");

      setSubmitState("idle");
      setState((current) => ({ ...current, submittedAt, mode: "result" }));
    } catch {
      setSubmitState("error");
      setSubmitError("送信できませんでした。時間をおいて再度お試しください。");
    }
  }

  const visibleMode = !isComplete && (state.mode === "leadGate" || state.mode === "result") ? "deck" : state.mode;

  return (
    <div className="app-shell">
      <Topbar answeredCount={progress.answeredCount} onHome={() => setMode("home")} onReset={resetAll} />
      <AnswerFeedbackToast feedback={answerFeedback} />
      <AnimatePresence mode="wait">
        {visibleMode === "home" && <HomeScreen key="home" onStart={startDeck} />}
        {visibleMode === "deck" && (
          <DeckScreen
            key={`deck-${currentQuestion.id}`}
            question={currentQuestion}
            answer={state.answers[currentQuestion.id]}
            answers={state.answers}
            progress={progress}
            roundIndex={currentRoundIndex}
            canGoBack={state.currentQuestionIndex > 0}
            onBackOne={backOneQuestion}
            onAnswer={chooseAnswer}
          />
        )}
        {visibleMode === "roundBreak" && (
          <RoundBreakScreen
            key={`break-${currentQuestion.round}`}
            completedQuestionIndex={state.currentQuestionIndex}
            onContinue={continueFromBreak}
          />
        )}
        {visibleMode === "leadGate" && completedDiagnosis && (
          <LeadGateScreen
            key="lead"
            lead={state.lead}
            diagnosis={completedDiagnosis}
            submitState={submitState}
            submitError={submitError}
            onBack={() => setState((current) => ({ ...current, mode: "deck", currentQuestionIndex: diagnosticQuestions.length - 1 }))}
            onUpdate={updateLead}
            onSubmit={submitLead}
          />
        )}
        {visibleMode === "result" && completedDiagnosis && (
          <ResultScreen
            key="result"
            diagnosis={completedDiagnosis}
            lead={state.lead}
            submittedAt={state.submittedAt}
            onReset={resetAll}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function AnswerFeedbackToast({ feedback }: { feedback: AnswerFeedback | null }) {
  return (
    <AnimatePresence>
      {feedback && (
        <motion.div
          className="answer-feedback"
          key={feedback.id}
          initial={{ opacity: 0, y: -10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          aria-live="polite"
        >
          <Check size={16} />
          <span>{feedback.label}</span>
          <strong>{feedback.message}</strong>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Topbar({ answeredCount, onHome, onReset }: { answeredCount: number; onHome: () => void; onReset: () => void }) {
  return (
    <header className="topbar">
      <button className="brand-mark" type="button" onClick={onHome} aria-label="ホームへ戻る">
        <span>FP&A</span>
        <strong>経営管理レベル診断</strong>
      </button>
      <div className="status-strip" aria-label={`回答済み ${answeredCount} 問、全15問`}>
        <span>回答</span>
        <strong>{answeredCount}</strong>
        <span>/ 15問</span>
      </div>
      <div className="top-actions">
        <button type="button" onClick={onReset}>
          <RotateCcw size={17} />
          <span>最初から</span>
        </button>
      </div>
    </header>
  );
}

function ProgressQuestMap({
  answers,
  currentQuestionId,
  className = ""
}: {
  answers: Record<string, AnswerValue>;
  currentQuestionId?: string;
  className?: string;
}) {
  return (
    <div className={`quest-map ${className}`} aria-label="診断進捗マップ">
      {diagnosticRounds.map((round) => {
        const roundQuestions = diagnosticQuestions.filter((question) => question.round === round.key);
        const completedCount = roundQuestions.filter((question) => answers[question.id]).length;

        return (
          <div className="quest-map-round" key={round.key}>
            <span>
              {round.label}
              <small>{roundExperienceLabels[round.key]}</small>
            </span>
            <div className="quest-map-dots">
              {roundQuestions.map((question) => {
                const isDone = Boolean(answers[question.id]);
                const isCurrent = question.id === currentQuestionId;

                return (
                  <i
                    aria-label={`${round.label} ${question.order}問目 ${isDone ? "回答済み" : isCurrent ? "回答中" : "未回答"}`}
                    className={`${isDone ? "is-done" : ""} ${isCurrent ? "is-current" : ""}`}
                    key={question.id}
                  />
                );
              })}
            </div>
            <em>{completedCount} / {roundQuestions.length}</em>
          </div>
        );
      })}
    </div>
  );
}

function HomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <motion.main className="home-screen" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
      <section className="home-hero">
        <div className="home-copy">
          <p className="eyebrow">FP&A Management Diagnosis</p>
          <h1 className="home-title">
            <span>経営管理の5領域を、</span>
            <span>どこまでできているか</span>
            <span>見える化します</span>
          </h1>
          <p>
            15問に答えるだけで、5領域の現在地と、次に取り組むべき5つのアクションを確認できます。
          </p>
          <div className="home-benefits" aria-label="診断で分かること">
            <span><ClipboardList size={18} /> 5領域の達成度</span>
            <span><BarChart3 size={18} /> 経営管理の現在地</span>
            <span><Check size={18} /> 取り組むべき5アクション</span>
          </div>
        </div>
      </section>

      <section className="home-framework" aria-labelledby="home-framework-heading">
        <div className="section-intro">
          <p className="eyebrow">Five Domains</p>
          <h2 id="home-framework-heading">経営管理の5領域</h2>
          <p>
            経営管理を、数字の土台から会議後の実行まで一連の流れとして確認します。どこが整っていて、どこが次の制約になっているかを領域別に見ます。
          </p>
        </div>
        <div className="domain-explainer-grid">
          {domains.map((domain, index) => (
            <article className="domain-explainer-card" key={domain.id} style={{ "--accent": domain.accent } as CSSProperties}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{domain.name}</h3>
              <p>{domain.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-outcome" aria-labelledby="home-outcome-heading">
        <div className="section-intro">
          <p className="eyebrow">After Visualization</p>
          <h2 id="home-outcome-heading">見える化のあと、貴社が取り組むべき5つのアクションを提案します</h2>
          <p>
            診断結果はスコアで終わらせません。5領域それぞれに対して、基本・応用・AIのどこから手をつけるべきかを整理し、次に進める行動に落とし込みます。
          </p>
        </div>
        <div className="outcome-list" aria-label="診断後のアウトプット">
          <article>
            <span><Check size={18} /></span>
            <strong>5領域それぞれに、次の一手を提示</strong>
            <p>診断結果から優先度を見て、会議・データ・分析・実行へつながる具体的なアクションに落とし込みます。</p>
          </article>
        </div>
      </section>

      <section className="home-bottom-cta" aria-label="診断開始">
        <motion.div
          className="floating-cta-hint"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24, duration: 0.4, ease: "easeOut" }}
        >
          <Sparkles size={16} />
          <span>一番下のボタンから診断を始められます</span>
        </motion.div>
        <button className="primary-action home-start-final" type="button" onClick={onStart}>
          診断を始める
          <ArrowRight size={19} />
        </button>
      </section>
    </motion.main>
  );
}

type DeckScreenProps = {
  question: DiagnosticQuestion;
  answer?: AnswerValue;
  answers: Record<string, AnswerValue>;
  progress: ReturnType<typeof buildProgressSummary>;
  roundIndex: number;
  canGoBack: boolean;
  onBackOne: () => void;
  onAnswer: (question: DiagnosticQuestion, answer: AnswerValue) => void;
};

function DeckScreen({ question, answer, answers, progress, roundIndex, canGoBack, onBackOne, onAnswer }: DeckScreenProps) {
  const domain = domainById[question.domainId];
  const round = roundByKey[question.round];
  const progressPercent = Math.round((progress.answeredCount / progress.totalQuestions) * 100);

  return (
    <motion.main className="deck-screen" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
      <aside className="round-panel">
        <span>Round {roundIndex + 1}</span>
        <strong>{round.label}</strong>
        <em>{question.order} / 15問</em>
        <ProgressQuestMap answers={answers} currentQuestionId={question.id} className="compact-map" />
      </aside>

      <section className="question-card" style={{ "--accent": domain.accent } as CSSProperties}>
        <div className="question-card-head">
          <span>{round.label}ラウンド / {roundExperienceLabels[round.key]}</span>
          <em>{domain.name}</em>
        </div>
        <QuestionIllustration kind={question.illustrationKey} accent={domain.accent} alt={question.illustrationAlt} />
        <div className="question-body">
          <h1>{question.question}</h1>
          <p><strong>補足:</strong> {question.examples}</p>
        </div>
        <div className="answer-options" aria-label="回答選択肢">
          {answerOptions.map((option) => (
            <button
              className={answer === option.value ? "is-selected" : ""}
              key={option.value}
              type="button"
              onClick={() => onAnswer(question, option.value)}
            >
              <span className="answer-option-label">
                <i className="answer-option-check" aria-hidden="true"><Check size={14} /></i>
                <span>{option.label}</span>
              </span>
              <small>{option.description}</small>
            </button>
          ))}
        </div>
      </section>

      <div className="deck-back-corner">
        <button className="card-back-action" type="button" onClick={onBackOne} disabled={!canGoBack}>
          <ArrowLeft size={15} />
          1問戻る
        </button>
      </div>

      <aside className="progress-panel" aria-label="回答進捗">
        <span>進捗</span>
        <strong>{progressPercent}%</strong>
        <div className="progress-track"><i style={{ width: `${progressPercent}%` }} /></div>
        <p>15問すべてに回答すると、詳細レポートへ進めます。</p>
      </aside>
    </motion.main>
  );
}

function RoundBreakScreen({
  completedQuestionIndex,
  onContinue
}: {
  completedQuestionIndex: number;
  onContinue: () => void;
}) {
  const completedQuestion = diagnosticQuestions[completedQuestionIndex];
  const completedRound = roundByKey[completedQuestion.round];
  const nextRound = diagnosticRounds[diagnosticRounds.findIndex((round) => round.key === completedQuestion.round) + 1];
  const encouragement = nextRound
    ? `${completedRound.label}まで完了しました。次は${nextRound.label}で、経営管理をもう一段深く見ていきます。`
    : "15問の回答が揃いました。ここから、貴社の現在地と次の一手をレポートにまとめます。";

  return (
    <motion.main className="break-screen" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
      <section className="break-simple-card">
        <p>{encouragement}</p>
        <button className="primary-action continue-round-action" type="button" onClick={onContinue}>
          {nextRound ? "次の5問へ進む" : "詳細レポートへ進む"}
          <ArrowRight size={18} />
        </button>
      </section>
    </motion.main>
  );
}

type LeadGateScreenProps = {
  lead: LeadForm;
  diagnosis: CompletedDiagnosis;
  submitState: "idle" | "sending" | "error";
  submitError: string;
  onBack: () => void;
  onUpdate: (field: keyof LeadForm, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function LeadGateScreen({ lead, diagnosis, submitState, submitError, onBack, onUpdate, onSubmit }: LeadGateScreenProps) {
  const firstAction = diagnosis.recommendedActions[0];

  return (
    <motion.main className="lead-screen" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
      <section className="lead-preview">
        <p className="eyebrow">Report Ready</p>
        <h1>15問の回答が揃いました</h1>
        <p>
          まず1つだけ提案を表示します。会社情報を送信すると、詳細スコアと5つのアクションをすべて確認できます。
        </p>
        <div className="lead-visual-summary" aria-label="生成済みレポートの簡易プレビュー">
          <div className="lead-stage-chip">
            <Check size={18} />
            <span>現在地</span>
            <strong>{managementLevelName(diagnosis.overallStage.key)}</strong>
          </div>
          <div className="lead-mini-bars" aria-label="基本、応用、AIの簡易スコア">
            {diagnosis.roundDiagnostics.map((round) => {
              const percent = Math.round((round.score / round.maxScore) * 100);
              return (
                <article key={round.round}>
                  <span>{round.label}</span>
                  <div className="lead-mini-track"><i style={{ width: `${percent}%` }} /></div>
                </article>
              );
            })}
          </div>
        </div>
        {firstAction && (
          <div className="first-action-preview">
            <span>提案アクションの一部</span>
            <strong>{firstAction.domainName}</strong>
            <p>{firstAction.title}</p>
          </div>
        )}
        <p className="report-unlock-copy">送信後、成熟度・領域別スコア・5つの推奨アクションをすべて表示します。</p>
      </section>

      <form className="lead-form" onSubmit={onSubmit}>
        <div className="form-title">
          <LockKeyhole size={20} />
          <div>
            <p className="eyebrow">Create Report</p>
            <h2>詳細レポートを表示する</h2>
          </div>
        </div>
        <div className="form-grid">
          <label>
            会社名
            <input value={lead.company} onChange={(event) => onUpdate("company", event.target.value)} required />
          </label>
          <label>
            役職
            <input value={lead.title} onChange={(event) => onUpdate("title", event.target.value)} required />
          </label>
          <label>
            お名前
            <input value={lead.name} onChange={(event) => onUpdate("name", event.target.value)} required />
          </label>
          <label>
            メールアドレス
            <input type="email" value={lead.email} onChange={(event) => onUpdate("email", event.target.value)} required />
          </label>
        </div>
        <p className="consent-copy">入力情報と回答内容をもとに、アクション付きの診断レポートを表示します。</p>
        {submitError && <p className="form-error">{submitError}</p>}
        <div className="flow-actions">
          <button className="secondary-action compact" type="button" onClick={onBack}>
            <ArrowLeft size={18} />
            15問目に戻る
          </button>
          <button className="primary-action compact" type="submit" disabled={submitState === "sending"}>
            <Send size={18} />
            {submitState === "sending" ? "送信中" : "診断結果を見る"}
          </button>
        </div>
      </form>
    </motion.main>
  );
}

function ResultScreen({
  diagnosis,
  lead,
  submittedAt,
  onReset
}: {
  diagnosis: CompletedDiagnosis;
  lead: LeadForm;
  submittedAt: string | null;
  onReset: () => void;
}) {
  function handlePrintReport() {
    window.requestAnimationFrame(() => window.print());
  }

  return (
    <motion.main className="result-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -8 }}>
      <section className="result-head">
        <div>
          <p className="eyebrow">Diagnostic Report</p>
          <h1>{lead.company} 向け FP&A診断結果</h1>
          <p>{submittedAt ? new Date(submittedAt).toLocaleString("ja-JP") : ""}</p>
        </div>
        <button className="primary-action compact report-print-action no-print" type="button" onClick={handlePrintReport}>
          <FileDown size={18} />
          PDF保存
        </button>
      </section>

      <section className={`overall-card print-summary-card ${stageClass(diagnosis.overallStage.key)}`}>
        <div className="overall-copy">
          <span>貴社の現在地</span>
          <h2>
            貴社の経営管理レベルは
            <strong>{managementLevelName(diagnosis.overallStage.key)}</strong>
            です
          </h2>
          <p>{diagnosis.overallStage.summary}</p>
        </div>
        <MaturityPyramid currentStage={diagnosis.overallStage.key} />
      </section>

      <section className="result-section round-print-section">
        <div className="result-section-title">
          <h2>ラウンド別スコア</h2>
          <p>基本が弱い場合は基礎整備段階、基本が整い応用が弱い場合は標準運用段階、応用まで整いAIが弱い場合は高度運用段階として判定します。</p>
        </div>
        <RoundJourneyChart diagnosis={diagnosis} />
      </section>

      <section className="result-section radar-print-section">
        <div className="result-section-title">
          <h2>領域別スコア</h2>
          <p>5領域のスコアをレーダーチャートで見ます。外側に近いほど、その領域の基本・応用・AIが揃っています。</p>
        </div>
        <DomainRadarChart diagnosis={diagnosis} />
      </section>

      <section className="result-section actions-print-section">
        <div className="result-section-title">
          <h2>次に取り組むべき5つのアクション</h2>
          <p>基本・応用・AIの順にボトルネックを見て、5領域それぞれに1つずつアクションを出しています。</p>
        </div>
        <div className="action-list">
          {diagnosis.recommendedActions.map((action) => (
            <article key={action.domainId} style={{ "--accent": action.accent } as CSSProperties}>
              <span>{action.priority}</span>
              <div>
                <p>{action.domainName} / {action.round === "maintain" ? "横展開" : roundByKey[action.round].label}</p>
                <h3>{action.title}</h3>
                <strong>{action.action}</strong>
                <em>{action.reason}</em>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="catalog-gift">
        <div>
          <p className="eyebrow">Gift URL</p>
          <h2>診断完了のプレゼント</h2>
          <p>FP&Aで検討できる分析テーマを後から見返せるよう、カタログURLをお渡しします。</p>
          <a href={ANALYTICS_CATALOG_URL} target="_blank" rel="noreferrer">
            <ExternalLink size={18} />
            <span>{ANALYTICS_CATALOG_URL}</span>
          </a>
        </div>
        <Sparkles size={38} aria-hidden="true" />
      </section>

      <div className="flow-actions result-actions">
        <button className="secondary-action compact" type="button" onClick={onReset}>
          <Mail size={18} />
          新しく診断する
        </button>
      </div>
    </motion.main>
  );
}

function MaturityPyramid({ currentStage }: { currentStage: MaturityStageKey }) {
  const levels: Array<{ key: MaturityStageKey; short: string; caption: string; width: string }> = [
    { key: "frontier", short: "先端活用", caption: "AIまで活用できている", width: "58%" },
    { key: "advanced", short: "高度運用", caption: "応用まで整っている", width: "72%" },
    { key: "standard", short: "標準運用", caption: "基本が回っている", width: "86%" },
    { key: "immature", short: "基礎整備", caption: "まず土台を整える", width: "100%" }
  ];

  return (
    <motion.div
      className="maturity-pyramid"
      aria-label={`貴社の現在地は${managementLevelName(currentStage)}です`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <span className="pyramid-label">貴社の現在地</span>
      {levels.map((level) => {
        const levelIndex = levels.findIndex((item) => item.key === level.key);
        const isActive = currentStage === level.key;
        return (
          <motion.div
            className={`maturity-pyramid-row ${stageClass(level.key)} ${isActive ? "is-active" : ""}`}
            key={level.key}
            style={{ "--level-width": level.width } as CSSProperties}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            whileHover={{ y: -2, scale: isActive ? 1.012 : 1.006 }}
            transition={{ type: "spring", stiffness: 260, damping: 24, delay: levelIndex * 0.08 }}
          >
            <div>
              <strong>{level.short}</strong>
              <small>{level.caption}</small>
            </div>
            {isActive && (
              <motion.em initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.36 }}>
                現在地
              </motion.em>
            )}
          </motion.div>
        );
      })}
    </motion.div>
  );
}

function RoundJourneyChart({ diagnosis }: { diagnosis: CompletedDiagnosis }) {
  const roundMeta: Record<RoundLevelKey, { tone: string; note: string }> = {
    basic: {
      tone: "#2f766d",
      note: "数字を揃え、差を説明し、会議で使える状態"
    },
    applied: {
      tone: "#4e6e94",
      note: "現場の動き、見通し、要因分解へつなぐ状態"
    },
    ai: {
      tone: "#6b5d88",
      note: "AIが検知、下書き、提案を支援する状態"
    }
  };

  return (
    <div className="round-journey" aria-label="基本、応用、AIのラウンド別スコア">
      <svg className="round-journey-line" viewBox="0 0 600 120" aria-hidden="true">
        <path d="M70 60 C170 8 230 112 300 60 S430 8 530 60" fill="none" stroke="#d7ded7" strokeWidth="10" strokeLinecap="round" />
        <motion.path
          d="M70 60 C170 8 230 112 300 60 S430 8 530 60"
          fill="none"
          stroke="#2f766d"
          strokeWidth="10"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        />
      </svg>
      <div className="round-journey-cards">
        {diagnosis.roundDiagnostics.map((round, index) => {
          const ratio = round.score / round.maxScore;
          const percent = Math.round(ratio * 100);
          const meta = roundMeta[round.round];

          return (
            <motion.article
              key={round.round}
              className="round-journey-card"
              style={{ "--round-accent": meta.tone, "--round-percent": `${percent}%` } as CSSProperties}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.38, delay: index * 0.12 }}
            >
              <motion.div
                className="round-orb"
                initial={{ scale: 0.72 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.45, delay: 0.24 + index * 0.1 }}
              >
                <span>{index + 1}</span>
              </motion.div>
              <div>
                <span>{round.label}</span>
                <strong>{round.score} / {round.maxScore}</strong>
                <p>{meta.note}</p>
                <div className="round-motion-bar">
                  <motion.i
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 0.7, delay: 0.34 + index * 0.12, ease: "easeOut" }}
                  />
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>
    </div>
  );
}

function DomainRadarChart({ diagnosis }: { diagnosis: CompletedDiagnosis }) {
  const shouldReduceMotion = useReducedMotion();
  const size = 320;
  const center = size / 2;
  const radius = 112;
  const domainsForRadar = diagnosis.domainDiagnostics;
  const maxRadarScore = domainsForRadar[0]?.maxScore ?? 6;
  const gridLevels = [maxRadarScore / 3, (maxRadarScore / 3) * 2, maxRadarScore];
  const pointFor = (index: number, value: number, maxValue = maxRadarScore) => {
    const angle = -Math.PI / 2 + (index / domainsForRadar.length) * Math.PI * 2;
    const distance = radius * (value / maxValue);
    return {
      x: center + Math.cos(angle) * distance,
      y: center + Math.sin(angle) * distance
    };
  };
  const polygonPoints = domainsForRadar.map((domain, index) => {
    const point = pointFor(index, domain.totalScore, domain.maxScore);
    return `${point.x},${point.y}`;
  }).join(" ");
  const firstRadarPoint = domainsForRadar[0] ? pointFor(0, domainsForRadar[0].totalScore, domainsForRadar[0].maxScore) : { x: center, y: center };
  const radarOutlinePoints = `${polygonPoints} ${firstRadarPoint.x},${firstRadarPoint.y}`;
  const scanPath = [
    `M ${center} ${center}`,
    `L ${center} ${center - radius}`,
    `A ${radius} ${radius} 0 0 1 ${center + 76} ${center - 82}`,
    "Z"
  ].join(" ");
  const labelPoints = domainsForRadar.map((domain, index) => ({
    domain,
    ...pointFor(index, maxRadarScore * 1.2, maxRadarScore)
  }));

  return (
    <div className="radar-panel">
      <div className="radar-chart-wrap">
        <svg className="radar-chart" viewBox={`0 0 ${size} ${size}`} role="img" aria-label="5領域の領域別スコアを示すレーダーチャート">
          {gridLevels.map((level, index) => (
            <motion.polygon
              className="radar-grid"
              key={level}
              points={domainsForRadar.map((_, index) => {
                const point = pointFor(index, level, maxRadarScore);
                return `${point.x},${point.y}`;
              }).join(" ")}
              initial={{ opacity: 0, scale: 0.86 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, delay: index * 0.08, ease: "easeOut" }}
              style={{ transformOrigin: `${center}px ${center}px` }}
            />
          ))}
          {domainsForRadar.map((domain, index) => {
            const point = pointFor(index, maxRadarScore, maxRadarScore);
            return (
              <motion.line
                className="radar-axis"
                key={domain.domainId}
                x1={center}
                y1={center}
                x2={point.x}
                y2={point.y}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.48, delay: 0.18 + index * 0.06, ease: "easeOut" }}
              />
            );
          })}
          <g className="radar-scan">
            <path className="radar-scan-fill" d={scanPath} />
            <line className="radar-scan-line" x1={center} y1={center} x2={center} y2={center - radius} />
          </g>
          <motion.polygon
            className="radar-shape"
            points={polygonPoints}
            initial={{ opacity: 0, scale: 0.72 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.75, ease: "easeOut" }}
          />
          <motion.polyline
            className="radar-sweep"
            points={radarOutlinePoints}
            initial={{ pathLength: 0 }}
            animate={shouldReduceMotion ? { pathLength: 1, opacity: 0.46 } : { pathLength: [0, 1, 1], opacity: [0.2, 0.82, 0.36] }}
            transition={shouldReduceMotion ? { duration: 0.6, delay: 0.22 } : { duration: 2.8, ease: "easeInOut", delay: 0.22, repeat: Infinity, repeatDelay: 0.65 }}
          />
          <motion.circle
            className="radar-center-pulse"
            cx={center}
            cy={center}
            r="4"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={shouldReduceMotion ? { opacity: 0.18, scale: 1 } : { opacity: [0.34, 0.08, 0.34], scale: [0.9, 2.4, 0.9] }}
            transition={shouldReduceMotion ? { duration: 0.35 } : { duration: 2.6, ease: "easeInOut", repeat: Infinity }}
          />
          {domainsForRadar.map((domain, index) => {
            const point = pointFor(index, domain.totalScore, domain.maxScore);
            return (
              <g className="radar-point" key={domain.domainId}>
                <motion.circle
                  className="radar-dot-pulse"
                  cx={point.x}
                  cy={point.y}
                  r="7"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={shouldReduceMotion ? { opacity: 0.18, scale: 1 } : { opacity: [0.32, 0, 0.32], scale: [0.75, 1.9, 0.75] }}
                  transition={shouldReduceMotion ? { duration: 0.3, delay: 0.55 + index * 0.08 } : { duration: 2.4, delay: 0.7 + index * 0.18, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.circle
                  className="radar-dot"
                  cx={point.x}
                  cy={point.y}
                  r="6"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={shouldReduceMotion ? { opacity: 1, scale: 1 } : { opacity: 1, scale: [1, 1.12, 1] }}
                  transition={shouldReduceMotion ? { duration: 0.28, delay: 0.55 + index * 0.08 } : { duration: 1.8, delay: 0.55 + index * 0.08, repeat: Infinity, repeatDelay: 0.8, ease: "easeInOut" }}
                />
              </g>
            );
          })}
          {labelPoints.map(({ domain, x, y }) => (
            <text className="radar-label" key={domain.domainId} x={x} y={y} textAnchor="middle" dominantBaseline="middle">
              {domain.shortName}
            </text>
          ))}
        </svg>
      </div>
      <aside className="radar-breakdown" aria-label="領域別スコアの内訳">
        <div className="radar-breakdown-head">
          <span>領域別の内訳</span>
          <p>合計点と、基本・応用・AIの3段階を領域ごとに表示しています。</p>
        </div>
        <div className="radar-score-list">
          {domainsForRadar.map((domain) => {
            const scorePercent = domain.maxScore > 0 ? Math.round((domain.totalScore / domain.maxScore) * 100) : 0;
            return (
              <article
                className={stageClass(domain.maturityStage.key)}
                key={domain.domainId}
                style={{ "--accent": domain.accent, "--score-width": `${scorePercent}%` } as CSSProperties}
              >
                <div className="domain-score-main">
                  <div className="domain-score-head">
                    <span>{managementLevelShortName(domain.maturityStage.key)}</span>
                    <strong>{domain.domainName}</strong>
                  </div>
                  <p>{domain.totalScore}<small>/ {domain.maxScore}</small></p>
                </div>
                <div className="domain-score-bar" aria-label={`${domain.domainName}の合計スコアは${domain.totalScore}点中${domain.maxScore}点です`}>
                  <i />
                </div>
                <div className="domain-round-mini" aria-label={`${domain.domainName}のラウンド別内訳`}>
                  <i><span>基本</span><strong>{domain.basicScore}</strong></i>
                  <i><span>応用</span><strong>{domain.appliedScore}</strong></i>
                  <i><span>AI</span><strong>{domain.aiScore}</strong></i>
                </div>
              </article>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

export default App;
