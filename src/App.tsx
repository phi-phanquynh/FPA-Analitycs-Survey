import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardList,
  ExternalLink,
  Eye,
  Layers3,
  ListChecks,
  Mail,
  RotateCcw,
  Send,
  Sparkles,
  Target,
  ThumbsUp,
  TriangleAlert,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { chartName, chartSvg } from "./chart";
import { analytics, categories, questionnaire } from "./data";
import { buildDiagnosis } from "./diagnosis";
import type { AnalyticsItem, AppMode, Category, DiagnosisResult, LeadForm, MaturityStageKey, SubmissionPayload } from "./types";

const STORAGE_KEY = "fpa-analytics-quest-state-v2";
const FORMSPREE_ENDPOINT = import.meta.env.VITE_FORMSPREE_ENDPOINT as string | undefined;
const SUBMISSION_RECIPIENT_EMAIL = "pphanquynh@tohmatsu.co.jp";
const ANALYTICS_CATALOG_URL = "https://dtcon-eto.com/analytics-catalog/";

function scrollToPageTop() {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
}

type SavedState = {
  mode: AppMode;
  currentRound: number;
  currentCard: number;
  selectedIds: string[];
  dismissedIds: string[];
  selectionOrder: string[];
  answers: Record<string, string[]>;
  otherAnswers: Record<string, string>;
  lead: LeadForm;
  detailId: string | null;
  submittedAt: string | null;
};

const emptyLead: LeadForm = {
  company: "",
  title: "",
  name: "",
  email: ""
};

const categoryById = Object.fromEntries(categories.map((category) => [category.id, category])) as Record<string, Category>;
const analyticsById = Object.fromEntries(analytics.map((item) => [item.id, item])) as Record<string, AnalyticsItem>;

const starterCandidateIds = ["kpi-command-center", "rolling-landing-forecast", "cashflow-forecast"];

function rotate<T>(items: T[], offset: number) {
  return items.map((_, index) => items[(index + offset) % items.length]);
}

function buildRounds() {
  const grouped = categories.map((category) => analytics.filter((item) => item.category === category.id));
  const roundCount = Math.max(...grouped.map((items) => items.length));

  return Array.from({ length: roundCount }, (_, roundIndex) => {
    const rotatedCategories = rotate(categories, roundIndex * 3);
    return rotatedCategories
      .map((category) => analytics.filter((item) => item.category === category.id)[roundIndex])
      .filter(Boolean);
  });
}

const rounds = buildRounds();

function loadState(): SavedState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) throw new Error("no saved state");
    const parsed = JSON.parse(saved) as Partial<SavedState>;
    return {
      mode: parsed.mode ?? "home",
      currentRound: Math.min(parsed.currentRound ?? 0, rounds.length - 1),
      currentCard: parsed.currentCard ?? 0,
      selectedIds: parsed.selectedIds ?? [],
      dismissedIds: parsed.dismissedIds ?? [],
      selectionOrder: parsed.selectionOrder ?? [],
      answers: parsed.answers ?? {},
      otherAnswers: parsed.otherAnswers ?? {},
      lead: { ...emptyLead, ...parsed.lead },
      detailId: parsed.detailId ?? null,
      submittedAt: parsed.submittedAt ?? null
    };
  } catch {
    return {
      mode: "home",
      currentRound: 0,
      currentCard: 0,
      selectedIds: [],
      dismissedIds: [],
      selectionOrder: [],
      answers: {},
      otherAnswers: {},
      lead: emptyLead,
      detailId: null,
      submittedAt: null
    };
  }
}

function uniqAdd(items: string[], id: string) {
  return items.includes(id) ? items : [...items, id];
}

function removeId(items: string[], id: string) {
  return items.filter((item) => item !== id);
}

function selectPocCandidates(selectedItems: AnalyticsItem[], selectionOrder: string[], diagnosis: DiagnosisResult) {
  if (selectedItems.length === 0) {
    return starterCandidateIds.map((id) => analyticsById[id]).filter(Boolean);
  }

  const orderedSelected = selectionOrder.map((id) => analyticsById[id]).filter(Boolean);
  const candidates: AnalyticsItem[] = [];

  diagnosis.topCategories.forEach(({ categoryId }) => {
    const item = orderedSelected.find((selected) => selected.category === categoryId && !candidates.includes(selected));
    if (item && candidates.length < 3) candidates.push(item);
  });

  diagnosis.topCategories.forEach(({ categoryId }) => {
    const item = analytics.find((candidate) => candidate.category === categoryId && !candidates.includes(candidate));
    if (item && candidates.length < 3) candidates.push(item);
  });

  orderedSelected.forEach((item) => {
    if (candidates.length < 3 && !candidates.includes(item)) candidates.push(item);
  });

  analytics.forEach((item) => {
    if (candidates.length < 3 && !candidates.includes(item)) candidates.push(item);
  });

  return candidates.slice(0, 3);
}

function answerLines(answers: Record<string, string[]>) {
  return questionnaire
    .map((item, index) => {
      const values = answers[String(index)] ?? [];
      return values.length ? `・${item.q}\n  回答: ${values.join("、")}` : "";
    })
    .filter(Boolean)
    .join("\n");
}

function normalizedAnswers(answers: Record<string, string[]>, otherAnswers: Record<string, string>) {
  return Object.fromEntries(
    questionnaire.map((_, index) => {
      const key = String(index);
      const values = (answers[key] ?? []).filter((value) => value !== "その他");
      const other = otherAnswers[key]?.trim();
      return [key, other ? [...values, `その他: ${other}`] : values];
    })
  );
}

function maturityLabel(diagnosis: DiagnosisResult) {
  return diagnosis.overallStage.label;
}

const MATURITY_FRAME_HELP = "成熟度は、課題カードと質問票から10領域を「未熟・標準・先進」で整理した初期診断です。正式な監査やベンチマークではありません。";
const REPORT_BENEFITS = [
  "10領域の成熟度",
  "優先して整える領域",
  "領域別の次アクション",
  "初回PoC候補"
];

const STAGE_META: Record<MaturityStageKey, { shortLabel: string; description: string }> = {
  immature: {
    shortLabel: "未熟",
    description: "優先して整備したい領域"
  },
  standard: {
    shortLabel: "標準",
    description: "運用をそろえる領域"
  },
  advanced: {
    shortLabel: "先進",
    description: "維持・高度化する領域"
  },
  pending: {
    shortLabel: "保留",
    description: "入力を増やして判定する領域"
  }
};

function stageClassName(stage: MaturityStageKey) {
  return `stage-${stage}`;
}

function stageCountItems(diagnosis: DiagnosisResult) {
  return (["immature", "standard", "advanced"] as MaturityStageKey[]).map((key) => ({
    key,
    label: STAGE_META[key].shortLabel,
    count: diagnosis.stageCounts[key]
  }));
}

function diagnosisActionLabel(diagnosis: DiagnosisResult) {
  return diagnosis.overallStage.actionTone;
}

function pocThemeLabel(diagnosis: DiagnosisResult) {
  return diagnosis.isPocReferenceOnly ? "参考テーマ" : "初回検証テーマ";
}

function pocThemeValue(diagnosis: DiagnosisResult, count: number) {
  return diagnosis.isPocReferenceOnly ? `${count}件を参考提示` : `${count}件を提案`;
}

function pocThemeHelp(diagnosis: DiagnosisResult) {
  return diagnosis.isPocReferenceOnly
    ? "入力が少ないため、診断確定ではなく参考テーマとして表示しています。"
    : "診断上位カテゴリを、小さく試して妥当性を確認するPoC案です。導入決定ではありません。";
}

function generateSummaryText(
  selectedItems: AnalyticsItem[],
  candidates: AnalyticsItem[],
  answers: Record<string, string[]>,
  diagnosis: DiagnosisResult,
  lead?: LeadForm
) {
  const selectedTitles = selectedItems.map((item) => `・${item.title}（${categoryById[item.category].name}）`).join("\n") || "・未選択";
  const candidateLines = candidates
    .map((item, index) => `${index + 1}. ${item.title}（${categoryById[item.category].name}）\n   ${item.decision}`)
    .join("\n");
  const dataLines =
    Array.from(new Set(candidates.flatMap((item) => item.data.split(/[、,]/).map((data) => data.trim()).filter(Boolean))))
      .slice(0, 12)
      .map((data) => `・${data}`)
      .join("\n") || "・会計、売上、予算、部門KPI";
  const topCategoryLines =
    diagnosis.topCategories
      .map((category, index) => (
        `${index + 1}. ${category.categoryName} / 判定 ${category.maturityStage.label}\n`
        + `   ${category.reason}\n`
        + `   次のアクション: ${category.recommendedAction}\n`
        + `   確認すること: ${category.nextCheck}`
      ))
      .join("\n") || "・入力不足のため未判定";
  const evidenceLines = diagnosis.evidence.map((item) => `・${item}`).join("\n");
  const nextCheckLines = diagnosis.nextChecks.map((item) => `・${item}`).join("\n");

  return [
    "【回答者】",
    lead ? `${lead.company} / ${lead.title} / ${lead.name} / ${lead.email}` : "未入力",
    "",
    "【総合診断】",
    `総合判定: ${maturityLabel(diagnosis)} / ${diagnosis.overallStage.actionTone}`,
    diagnosis.summary,
    MATURITY_FRAME_HELP,
    "",
    "【診断根拠】",
    evidenceLines || "・未入力",
    "",
    "【優先確認カテゴリ】",
    topCategoryLines,
    "",
    "【課題あり分析】",
    selectedTitles,
    "",
    diagnosis.isPocReferenceOnly ? "【参考テーマ】" : "【初回検証テーマ（PoC案）】",
    candidateLines,
    "",
    "【質問票の回答】",
    answerLines(answers) || "・未回答",
    "",
    "【次の検討で確認すること】",
    nextCheckLines,
    "",
    "【確認すべき主要データ】",
    dataLines
  ].join("\n");
}

function buildSubmissionMailtoUrl(lead: LeadForm, summaryText: string) {
  const subject = `FP&A Analytics Quest 診断結果: ${lead.company}`;
  const body = [
    "FP&A Analytics Quest 診断結果",
    "",
    "以下の内容で診断結果を送信します。内容を変更せず、このまま送信してください。",
    "",
    summaryText
  ].join("\n");
  const limitedBody =
    body.length > 7500 ? `${body.slice(0, 7500)}\n\n※本文が長いため一部を省略しています。` : body;

  return `mailto:${SUBMISSION_RECIPIENT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(limitedBody)}`;
}

function App() {
  const [state, setState] = useState<SavedState>(() => loadState());
  const [submitState, setSubmitState] = useState<"idle" | "sending" | "error">("idle");
  const [submitError, setSubmitError] = useState("");
  const [otherErrors, setOtherErrors] = useState<Record<string, string>>({});

  const selectedItems = useMemo(
    () => state.selectionOrder.map((id) => analyticsById[id]).filter((item) => item && state.selectedIds.includes(item.id)),
    [state.selectedIds, state.selectionOrder]
  );
  const dismissedItems = useMemo(() => state.dismissedIds.map((id) => analyticsById[id]).filter(Boolean), [state.dismissedIds]);
  const questionnaireAnswers = useMemo(
    () => normalizedAnswers(state.answers, state.otherAnswers),
    [state.answers, state.otherAnswers]
  );
  const diagnosisResult = useMemo(
    () => buildDiagnosis({ selectedItems, answers: questionnaireAnswers, categories }),
    [selectedItems, questionnaireAnswers]
  );
  const deckDiagnosisResult = useMemo(
    () => buildDiagnosis({ selectedItems, answers: {}, categories }),
    [selectedItems]
  );
  const pocCandidates = useMemo(
    () => selectPocCandidates(selectedItems, state.selectionOrder, diagnosisResult),
    [selectedItems, state.selectionOrder, diagnosisResult]
  );
  const currentRoundItems = rounds[state.currentRound] ?? [];
  const currentItem = currentRoundItems[state.currentCard];
  const detailItem = analyticsById[state.detailId ?? ""] ?? analytics[0];

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(scrollToPageTop);
    return () => window.cancelAnimationFrame(frame);
  }, [state.mode, state.currentRound, state.currentCard, state.detailId]);

  function setMode(mode: AppMode) {
    setState((current) => ({ ...current, mode }));
    scrollToPageTop();
  }

  function resetAll() {
    setSubmitState("idle");
    setSubmitError("");
    setState({
      mode: "home",
      currentRound: 0,
      currentCard: 0,
      selectedIds: [],
      dismissedIds: [],
      selectionOrder: [],
      answers: {},
      otherAnswers: {},
      lead: emptyLead,
      detailId: null,
      submittedAt: null
    });
  }

  function startDeck() {
    setState((current) => ({
      ...current,
      mode: "deck",
      currentRound: Math.min(current.currentRound, rounds.length - 1),
      currentCard: Math.min(current.currentCard, (rounds[current.currentRound] ?? []).length - 1)
    }));
  }

  function chooseCard(item: AnalyticsItem, interested: boolean) {
    setState((current) => {
      const selectedIds = interested ? uniqAdd(current.selectedIds, item.id) : removeId(current.selectedIds, item.id);
      const dismissedIds = interested ? removeId(current.dismissedIds, item.id) : uniqAdd(current.dismissedIds, item.id);
      const selectionOrder = interested ? uniqAdd(current.selectionOrder, item.id) : current.selectionOrder;
      const roundItems = rounds[current.currentRound] ?? [];
      const nextCard = current.currentCard + 1;
      const roundDone = nextCard >= roundItems.length;

      return {
        ...current,
        selectedIds,
        dismissedIds,
        selectionOrder,
        currentCard: roundDone ? current.currentCard : nextCard,
        mode: roundDone ? "roundBreak" : "deck"
      };
    });
  }

  function continueRound() {
    setState((current) => {
      const nextRound = current.currentRound + 1;
      if (nextRound >= rounds.length) {
        return { ...current, mode: "questionnaire" };
      }
      return { ...current, currentRound: nextRound, currentCard: 0, mode: "deck" };
    });
  }

  function addCandidate(item: AnalyticsItem) {
    setState((current) => ({
      ...current,
      selectedIds: uniqAdd(current.selectedIds, item.id),
      dismissedIds: removeId(current.dismissedIds, item.id),
      selectionOrder: uniqAdd(current.selectionOrder, item.id)
    }));
  }

  function toggleListCandidate(item: AnalyticsItem) {
    setState((current) => {
      const selected = current.selectedIds.includes(item.id);
      return {
        ...current,
        selectedIds: selected ? removeId(current.selectedIds, item.id) : uniqAdd(current.selectedIds, item.id),
        dismissedIds: selected ? current.dismissedIds : removeId(current.dismissedIds, item.id),
        selectionOrder: selected ? current.selectionOrder : uniqAdd(current.selectionOrder, item.id)
      };
    });
  }

  function openDetail(item: AnalyticsItem) {
    setState((current) => ({ ...current, detailId: item.id, mode: "detail" }));
    scrollToPageTop();
  }

  function openNextDetail(item: AnalyticsItem) {
    const currentIndex = analytics.findIndex((entry) => entry.id === item.id);
    const nextItem = analytics[(currentIndex + 1) % analytics.length] ?? analytics[0];
    setState((current) => ({ ...current, detailId: nextItem.id, mode: "detail" }));
    scrollToPageTop();
  }

  function updateAnswer(questionIndex: number, option: string, checked: boolean) {
    setState((current) => {
      const key = String(questionIndex);
      const currentAnswers = current.answers[key] ?? [];
      const nextAnswers = checked ? uniqAdd(currentAnswers, option) : removeId(currentAnswers, option);
      const otherAnswers = option === "その他" && !checked
        ? { ...current.otherAnswers, [key]: "" }
        : current.otherAnswers;
      return {
        ...current,
        answers: {
          ...current.answers,
          [key]: nextAnswers
        },
        otherAnswers
      };
    });
    if (option === "その他" && !checked) {
      setOtherErrors((current) => {
        const next = { ...current };
        delete next[String(questionIndex)];
        return next;
      });
    }
  }

  function updateOtherAnswer(questionIndex: number, value: string) {
    const key = String(questionIndex);
    setState((current) => ({
      ...current,
      otherAnswers: {
        ...current.otherAnswers,
        [key]: value
      }
    }));
    if (value.trim()) {
      setOtherErrors((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    }
  }

  function proceedFromQuestionnaire() {
    const errors = Object.fromEntries(
      questionnaire
        .map((_, index) => {
          const key = String(index);
          const hasOther = state.answers[key]?.includes("その他");
          const missingOther = hasOther && !state.otherAnswers[key]?.trim();
          return missingOther ? [key, "その他の内容を入力してください。"] : null;
        })
        .filter(Boolean) as Array<[string, string]>
    );

    setOtherErrors(errors);
    if (Object.keys(errors).length === 0) {
      setMode("leadGate");
    }
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

    const lead = state.lead;
    const missing = !lead.company.trim() || !lead.title.trim() || !lead.name.trim() || !lead.email.trim();
    if (missing) {
      setSubmitState("error");
      setSubmitError("会社名・役職・お名前・メールアドレスを入力してください。");
      return;
    }

    const submittedAt = new Date().toISOString();
    const summaryText = generateSummaryText(selectedItems, pocCandidates, questionnaireAnswers, diagnosisResult, lead);
    const payload: SubmissionPayload = {
      recipientEmail: SUBMISSION_RECIPIENT_EMAIL,
      lead,
      selectedAnalytics: selectedItems.map((item) => ({
        id: item.id,
        title: item.title,
        category: categoryById[item.category].name,
        data: item.data,
        decision: item.decision,
        horizon: item.horizon
      })),
      dismissedAnalytics: dismissedItems.map((item) => item.id),
      questionnaireAnswers,
      diagnosisResult,
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
          _subject: "FP&A Analytics Quest 診断結果",
          _replyto: lead.email,
          company: lead.company,
          title: lead.title,
          name: lead.name,
          email: lead.email,
          interested_count: selectedItems.length,
          recommended_poc: pocCandidates.map((item) => item.title).join(" / "),
          diagnosis_maturity: maturityLabel(diagnosisResult),
          diagnosis_issue_score: diagnosisResult.overallIssueScore,
          diagnosis_top_categories: diagnosisResult.topCategories.map((category) => category.categoryName).join(" / "),
          diagnosis_reference_only: diagnosisResult.isPocReferenceOnly ? "true" : "false",
          summary: summaryText,
          payload_json: JSON.stringify(payload, null, 2)
        })
      });

      if (!response.ok) throw new Error(`send failed: ${response.status}`);
      setSubmitState("idle");
      setState((current) => ({ ...current, submittedAt, mode: "result" }));
    } catch {
      setSubmitState("error");
      setSubmitError("送信に失敗しました。入力内容と回答は保持しています。時間をおいて再送してください。");
    }
  }

  const shellClass = `app-shell mode-${state.mode}`;

  return (
    <main className={shellClass}>
      <TopBar
        mode={state.mode}
        selectedCount={selectedItems.length}
        roundLabel={`Round ${state.currentRound + 1}`}
        onHome={() => setMode("home")}
        onList={() => setMode("list")}
        onReset={resetAll}
      />

      <AnimatePresence mode="wait">
        {state.mode === "home" && (
          <HomeScreen
            key="home"
            onStart={() => setMode("intro")}
            onList={() => setMode("list")}
          />
        )}

        {state.mode === "intro" && (
          <IntroScreen
            key="intro"
            onStart={startDeck}
            onBack={() => setMode("home")}
          />
        )}

        {state.mode === "deck" && currentItem && (
          <DeckScreen
            key="deck"
            item={currentItem}
            roundIndex={state.currentRound}
            cardIndex={state.currentCard}
            roundCardCount={currentRoundItems.length}
            selectedCount={selectedItems.length}
            onInterested={() => chooseCard(currentItem, true)}
            onDismiss={() => chooseCard(currentItem, false)}
          />
        )}

        {state.mode === "roundBreak" && (
          <RoundBreakScreen
            key="roundBreak"
            roundIndex={state.currentRound}
            selectedItems={selectedItems}
            roundItems={currentRoundItems}
            diagnosis={deckDiagnosisResult}
            onContinue={continueRound}
            onQuestionnaire={() => setMode("questionnaire")}
          />
        )}

        {state.mode === "list" && (
          <ListScreen
            key="list"
            selectedIds={state.selectedIds}
            onToggle={toggleListCandidate}
            onDetail={openDetail}
            onQuestionnaire={() => setMode("questionnaire")}
          />
        )}

        {state.mode === "detail" && (
          <DetailScreen
            key="detail"
            item={detailItem}
            selected={state.selectedIds.includes(detailItem.id)}
            onAdd={addCandidate}
            onBack={() => setMode("list")}
            onNext={openNextDetail}
          />
        )}

        {state.mode === "questionnaire" && (
          <QuestionnaireScreen
            key="questionnaire"
            answers={state.answers}
            otherAnswers={state.otherAnswers}
            otherErrors={otherErrors}
            onChange={updateAnswer}
            onOtherChange={updateOtherAnswer}
            onBack={() => setMode("roundBreak")}
            onNext={proceedFromQuestionnaire}
          />
        )}

        {state.mode === "leadGate" && (
          <LeadGateScreen
            key="leadGate"
            lead={state.lead}
            diagnosis={diagnosisResult}
            pocCandidates={pocCandidates}
            submitState={submitState}
            submitError={submitError}
            onUpdate={updateLead}
            onSubmit={submitLead}
            onBack={() => setMode("questionnaire")}
          />
        )}

        {state.mode === "result" && (
          <ResultScreen
            key="result"
            lead={state.lead}
            pocCandidates={pocCandidates}
            diagnosis={diagnosisResult}
            submittedAt={state.submittedAt}
            onList={() => setMode("list")}
            onCatalogGift={() => setMode("catalogGift")}
            onReset={resetAll}
          />
        )}

        {state.mode === "catalogGift" && (
          <CatalogGiftScreen
            key="catalogGift"
            diagnosis={diagnosisResult}
            pocCandidates={pocCandidates}
            onBack={() => setMode("result")}
            onReset={resetAll}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

type TopBarProps = {
  mode: AppMode;
  selectedCount: number;
  roundLabel: string;
  onHome: () => void;
  onList: () => void;
  onReset: () => void;
};

function TopBar({ mode, selectedCount, roundLabel, onHome, onList, onReset }: TopBarProps) {
  return (
    <header className="topbar">
      <button className="brand-mark" type="button" onClick={onHome}>
        <span>FP&A</span>
        <strong>Analytics Quest</strong>
      </button>
      <div className="status-strip" aria-live="polite">
        <span>{mode === "deck" ? roundLabel : "課題ありカード"}</span>
        <motion.strong
          key={selectedCount}
          initial={{ scale: 0.72, opacity: 0.2 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 420, damping: 18 }}
        >
          {selectedCount}
        </motion.strong>
      </div>
      <nav className="top-actions" aria-label="Primary navigation">
        <button type="button" onClick={onList}>
          <ListChecks size={17} />
          一覧
        </button>
        <button type="button" onClick={onReset}>
          <RotateCcw size={16} />
          Reset
        </button>
      </nav>
    </header>
  );
}

type HomeScreenProps = {
  onStart: () => void;
  onList: () => void;
};

function HomeScreen({ onStart, onList }: HomeScreenProps) {
  return (
    <motion.section className="home-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="home-copy">
        <p className="eyebrow">Executive Analytics Quest</p>
        <h1 className="home-title">
          <span className="home-title-line">あなたの会社に求められる</span>
          <span className="home-title-line">経営管理とは</span>
        </h1>
        <p>
          経営管理に関する質問カードに答えると、FP&Aの10領域を「未熟・標準・先進」で整理し、次に取るべきアクションまで診断します。
        </p>
        <div className="home-benefits" aria-label="診断後に分かること">
          {REPORT_BENEFITS.map((benefit) => (
            <span key={benefit}>
              <Check size={14} />
              {benefit}
            </span>
          ))}
        </div>
        <div className="home-actions">
          <button className="primary-action" type="button" onClick={onStart}>
            <Sparkles size={20} />
            さっそく始める
          </button>
          <button className="secondary-action" type="button" onClick={onList}>
            <ListChecks size={19} />
            一覧を見る
          </button>
        </div>
      </div>
      <div className="deck-preview" aria-hidden="true">
        {categories.slice(0, 5).map((category, index) => (
          <motion.div
            className="preview-card"
            key={category.id}
            style={{ "--accent": category.accent, rotate: `${-8 + index * 4}deg`, zIndex: 10 - index } as React.CSSProperties}
            initial={{ y: 28, opacity: 0 }}
            animate={{ y: index * 11, opacity: 1 }}
            transition={{ delay: 0.08 * index, type: "spring", stiffness: 140, damping: 18 }}
          >
            <span>Round Card</span>
            <strong>{category.name}</strong>
            <em>{category.question}</em>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}

type IntroScreenProps = {
  onStart: () => void;
  onBack: () => void;
};

function IntroScreen({ onStart, onBack }: IntroScreenProps) {
  const steps = [
    {
      label: "1",
      title: "できている領域と課題領域を分ける",
      text: "各カードで、自社でその分析や判断ができているかを短く確認します。"
    },
    {
      label: "2",
      title: "10領域の暫定診断を見ながら進む",
      text: "小休止ごとに、未熟・標準・先進の分布と重点領域を確認できます。"
    },
    {
      label: "3",
      title: "最後にアクションまで受け取る",
      text: "診断結果では、領域別の次アクションと初回PoC候補まで整理します。"
    }
  ];

  return (
    <motion.section className="intro-screen" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <div className="intro-copy">
        <p className="eyebrow">How It Works</p>
        <h1>3分で、FP&Aの現在地を整理します</h1>
        <p>各カードは、自社でその分析や判断ができているかを確認するための問いです。回答が増えるほど、10領域の判定とアクション提案の精度が高まります。</p>
        <div className="intro-actions">
          <button className="primary-action" type="button" onClick={onStart}>
            <Target size={20} />
            カードをめくる
          </button>
          <button className="ghost-action" type="button" onClick={onBack}>
            <ArrowLeft size={18} />
            戻る
          </button>
        </div>
      </div>
      <div className="intro-steps">
        {steps.map((step) => (
          <article className="intro-step" key={step.label}>
            <span>{step.label}</span>
            <div>
              <h2>{step.title}</h2>
              <p>{step.text}</p>
            </div>
          </article>
        ))}
      </div>
    </motion.section>
  );
}

type DeckScreenProps = {
  item: AnalyticsItem;
  roundIndex: number;
  cardIndex: number;
  roundCardCount: number;
  selectedCount: number;
  onInterested: () => void;
  onDismiss: () => void;
};

function DeckScreen({ item, roundIndex, cardIndex, roundCardCount, selectedCount, onInterested, onDismiss }: DeckScreenProps) {
  const category = categoryById[item.category];
  const remaining = Math.max(0, roundCardCount - cardIndex - 1);

  return (
    <motion.section className="deck-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="round-panel">
        <span>Round {roundIndex + 1}</span>
        <strong>このラウンド {cardIndex + 1}枚目</strong>
        <em>あと{remaining}枚でちょっと休憩</em>
      </div>

      <div className="candidate-stack" aria-live="polite">
        <Layers3 size={18} />
        <span>課題ありカード</span>
        <motion.strong key={selectedCount} initial={{ y: -8 }} animate={{ y: 0 }}>
          {selectedCount}
        </motion.strong>
      </div>

      <motion.article
        key={item.id}
        className="quest-card"
        style={{ "--accent": category.accent } as React.CSSProperties}
        initial={{ rotateY: -82, scale: 0.94, opacity: 0 }}
        animate={{ rotateY: 0, scale: 1, opacity: 1 }}
        exit={{ rotateY: 70, opacity: 0 }}
        transition={{ type: "spring", stiffness: 180, damping: 19 }}
      >
        <div className="quest-card-face">
          <div className="card-topline">
            <span>{category.name}</span>
            <em>{item.horizon}</em>
          </div>
          <div className="capability-prompt">
            <span>あなたの会社ではできていますか</span>
            <h2>{item.capability}</h2>
          </div>
          <div className="prompt-connector" aria-hidden="true">
            <span />
          </div>
          <div className="reveal-panel">
            <div className="reveal-heading">
              <span>実現のために必要な分析</span>
              <em>分析イメージ: {chartName(item.chart)}</em>
            </div>
            <strong>{item.title}</strong>
            <p className="analysis-description">{item.analysisDescription}</p>
            <div className="chart-frame analysis-image" dangerouslySetInnerHTML={{ __html: chartSvg(item.chart, item.title, category.accent, "large") }} />
            <div className="action-note">
              <span>打てるアクション</span>
              <p>{item.decision}</p>
            </div>
          </div>
        </div>
      </motion.article>

      <div className="deck-actions">
        <button className="reject-action" type="button" onClick={onDismiss}>
          <ThumbsUp size={22} />
          できている
        </button>
        <button className="accept-action issue-hover-action" type="button" onClick={onInterested}>
          <TriangleAlert size={22} />
          課題あり
        </button>
      </div>
    </motion.section>
  );
}

type RoundBreakScreenProps = {
  roundIndex: number;
  selectedItems: AnalyticsItem[];
  roundItems: AnalyticsItem[];
  diagnosis: DiagnosisResult;
  onContinue: () => void;
  onQuestionnaire: () => void;
};

function RoundBreakScreen({ roundIndex, selectedItems, roundItems, diagnosis, onContinue, onQuestionnaire }: RoundBreakScreenProps) {
  const roundSelected = roundItems.filter((item) => selectedItems.some((selected) => selected.id === item.id));
  const isFinalRound = roundIndex >= rounds.length - 1;
  const diagnosisActionClassName = `primary-action${isFinalRound ? " final-diagnosis-action" : ""}`;
  const completedCardCount = rounds
    .slice(0, roundIndex + 1)
    .reduce((sum, round) => sum + round.length, 0);
  const remainingCardCount = Math.max(0, analytics.length - completedCardCount);
  const confidencePercent = Math.round((completedCardCount / analytics.length) * 100);
  const nextRoundCount = Math.min(remainingCardCount, rounds[roundIndex + 1]?.length ?? remainingCardCount);
  const nextPrecisionTargets = (diagnosis.topCategories.length ? diagnosis.topCategories : diagnosis.categoryDiagnostics)
    .slice(0, 3)
    .map((category) => category.categoryName);
  const progressMessage = remainingCardCount > 0
    ? `全${analytics.length}枚のうち${completedCardCount}枚を確認しました。次の${nextRoundCount}問で、重点領域の確からしさを高めます。`
    : `全${analytics.length}枚の確認が完了しました。ここまでの選択内容で最終診断に進めます。`;
  const breakTitles = [
    "10領域の現在地が見え始めています",
    "重点領域の輪郭がはっきりしてきました",
    "診断に必要な全体像がそろいました"
  ];
  const breakDescriptions = [
    "ここまでの回答を、最終結果と同じ「未熟・標準・先進」のフレームで暫定整理しています。",
    "次のラウンドに進むと、いま見えている重点領域が本当に優先かを確認できます。",
    "このあと質問票で会議体やデータの状況を補足すると、次アクションまで具体化できます。"
  ];
  const breakTitle = breakTitles[Math.min(roundIndex, breakTitles.length - 1)];
  const breakDescription = breakDescriptions[Math.min(roundIndex, breakDescriptions.length - 1)];

  return (
    <motion.section className="break-screen" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <div className="break-copy">
        <p className="eyebrow">Round {roundIndex + 1} Complete</p>
        <h1>{breakTitle}</h1>
        <p>{breakDescription}</p>
        <p className="break-progress-note">{progressMessage}</p>
      </div>
      <div className="break-diagnosis-panel">
        <div className="break-confidence">
          <span>ここまでの診断精度</span>
          <strong>{confidencePercent}%</strong>
          <div className="confidence-track" aria-hidden="true">
            <i style={{ width: `${confidencePercent}%` }} />
          </div>
          <p>回答数が増えるほど、領域別の判定とアクション提案が具体化します。</p>
        </div>
        <StageDistribution diagnosis={diagnosis} />
        <div className="break-focus-list">
          <span>現時点の重点領域トップ3</span>
          {diagnosis.topCategories.slice(0, 3).map((category, index) => (
            <article key={category.categoryId} className={stageClassName(category.maturityStage.key)}>
              <em>{index + 1}</em>
              <div>
                <strong>{category.categoryName}</strong>
                <small>{category.maturityStage.label} / {category.maturityStage.actionTone}</small>
              </div>
            </article>
          ))}
        </div>
        {remainingCardCount > 0 && (
          <div className="break-next-focus">
            <span>次の10問で精度が上がる領域</span>
            <p>{nextPrecisionTargets.join("、")}を中心に、判定の根拠を増やします。</p>
          </div>
        )}
      </div>
      <div className="mini-cards">
        {roundSelected.length ? (
          roundSelected.map((item) => <SmallCandidate key={item.id} item={item} />)
        ) : (
          <p className="empty-note">このラウンドでは「課題あり」はありませんでした。次のラウンドで別の観点を確認できます。</p>
        )}
      </div>
      <div className="break-actions">
        {isFinalRound ? (
          <>
            <button className={diagnosisActionClassName} type="button" onClick={onQuestionnaire}>
              <ClipboardList size={19} />
              診断に進む
            </button>
          </>
        ) : (
          <>
            <button className="primary-action continue-round-action" type="button" onClick={onContinue}>
              続けてめくる
              <ArrowRight size={20} />
            </button>
            <button className="secondary-action compact diagnosis-shortcut-action" type="button" onClick={onQuestionnaire}>
              <ClipboardList size={17} />
              ここまでで診断に進む
            </button>
          </>
        )}
      </div>
    </motion.section>
  );
}

function SmallCandidate({ item }: { item: AnalyticsItem }) {
  const category = categoryById[item.category];
  return (
    <article className="small-candidate" style={{ "--accent": category.accent } as React.CSSProperties}>
      <span>{category.name}</span>
      <strong>{item.title}</strong>
    </article>
  );
}

function StageDistribution({ diagnosis, compact = false }: { diagnosis: DiagnosisResult; compact?: boolean }) {
  const visibleItems = diagnosis.status === "insufficient"
    ? ([{ key: "pending" as MaturityStageKey, label: STAGE_META.pending.shortLabel, count: diagnosis.stageCounts.pending }])
    : stageCountItems(diagnosis);

  return (
    <div className={`stage-distribution ${compact ? "is-compact" : ""} ${diagnosis.status === "insufficient" ? "is-pending-only" : ""}`} aria-label="成熟度分布">
      {visibleItems.map((item) => (
        <div className={stageClassName(item.key)} key={item.key}>
          <span>{item.label}</span>
          <strong>{item.count}</strong>
          <small>{STAGE_META[item.key].description}</small>
        </div>
      ))}
    </div>
  );
}

type ListScreenProps = {
  selectedIds: string[];
  onToggle: (item: AnalyticsItem) => void;
  onDetail: (item: AnalyticsItem) => void;
  onQuestionnaire: () => void;
};

function ListScreen({ selectedIds, onToggle, onDetail, onQuestionnaire }: ListScreenProps) {
  return (
    <motion.section className="list-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="section-title">
        <p className="eyebrow">Analytics Library</p>
        <h1>分析カード一覧</h1>
        <button className="primary-action compact" type="button" onClick={onQuestionnaire}>
          <ClipboardList size={18} />
          診断に進む
        </button>
      </div>
      <div className="analysis-grid">
        {analytics.map((item) => {
          const category = categoryById[item.category];
          const selected = selectedIds.includes(item.id);
          return (
            <article className={`library-card ${selected ? "is-selected" : ""}`} key={item.id} style={{ "--accent": category.accent } as React.CSSProperties}>
              <div className="library-viz" dangerouslySetInnerHTML={{ __html: chartSvg(item.chart, item.title, category.accent) }} />
              <div className="library-body">
                <span>{category.name}</span>
                <h2>{item.title}</h2>
                <p>{item.question}</p>
              </div>
              <div className="library-actions">
                <button type="button" className="select-button issue-hover-action" onClick={() => onToggle(item)}>
                  <TriangleAlert size={17} />
                  {selected ? "課題ありに追加済み" : "課題あり"}
                </button>
                <button type="button" className="detail-button" onClick={() => onDetail(item)}>
                  <Eye size={17} />
                  詳細を見る
                </button>
              </div>
            </article>
          );
        })}
      </div>
      <div className="mobile-list-cta">
        <button className="primary-action" type="button" onClick={onQuestionnaire}>
          <ClipboardList size={18} />
          診断に進む
        </button>
      </div>
    </motion.section>
  );
}

type DetailScreenProps = {
  item: AnalyticsItem;
  selected: boolean;
  onAdd: (item: AnalyticsItem) => void;
  onBack: () => void;
  onNext: (item: AnalyticsItem) => void;
};

function DetailScreen({ item, selected, onAdd, onBack, onNext }: DetailScreenProps) {
  const category = categoryById[item.category];

  return (
    <motion.section className="detail-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <button className="back-link" type="button" onClick={onBack}>
        <ArrowLeft size={17} />
        一覧に戻る
      </button>
      <div className="detail-layout">
        <article className="atlas-card" style={{ "--accent": category.accent } as React.CSSProperties}>
          <span className="atlas-category">{category.name}</span>
          <h1>{item.title}</h1>
          <div className="atlas-chart" dangerouslySetInnerHTML={{ __html: chartSvg(item.chart, item.title, category.accent, "large") }} />
          <p>{item.question}</p>
          <div className="atlas-tags">
            {category.tags.slice(0, 4).map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </article>
        <div className="detail-copy">
          <p className="eyebrow">Analysis Card</p>
          <h2>この分析で見えること</h2>
          <p>{category.promise}</p>
          <dl>
            <div>
              <dt>必要データ</dt>
              <dd>{item.data}</dd>
            </div>
            <div>
              <dt>意思決定にどう使うか</dt>
              <dd>{item.decision}</dd>
            </div>
            <div>
              <dt>PoCで最初に作るもの</dt>
              <dd>{category.poc}</dd>
            </div>
            <div>
              <dt>確認サイクル</dt>
              <dd>{item.horizon}</dd>
            </div>
          </dl>
          <div className="detail-actions">
            <button className="primary-action compact issue-hover-action" type="button" onClick={() => onAdd(item)} disabled={selected}>
              <Check size={18} />
              {selected ? "課題ありに追加済み" : "課題ありに追加"}
            </button>
            <button className="secondary-action compact" type="button" onClick={() => onNext(item)}>
              <ArrowRight size={18} />
              次の分析を見る
            </button>
            <button className="secondary-action compact" type="button" onClick={onBack}>
              <ArrowLeft size={18} />
              一覧に戻る
            </button>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

type QuestionnaireScreenProps = {
  answers: Record<string, string[]>;
  otherAnswers: Record<string, string>;
  otherErrors: Record<string, string>;
  onChange: (questionIndex: number, option: string, checked: boolean) => void;
  onOtherChange: (questionIndex: number, value: string) => void;
  onBack: () => void;
  onNext: () => void;
};

function QuestionnaireScreen({ answers, otherAnswers, otherErrors, onChange, onOtherChange, onBack, onNext }: QuestionnaireScreenProps) {
  return (
    <motion.section className="questionnaire-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="section-title questionnaire-title">
        <p className="eyebrow">Workshop Questionnaire</p>
        <h1>診断に必要な追加情報</h1>
        <div className="questionnaire-badge-row">
          <div className="questionnaire-final-badge" aria-label="この画面が最後です">
            <Check size={16} />
            この画面が最後です
          </div>
          <div className="questionnaire-multiple-badge" aria-label="アンケートは複数選択できます">
            <ListChecks size={16} />
            複数選択可
          </div>
        </div>
        <p>カードで残した課題と合わせて、10領域の成熟度と次に取るべきアクションを具体化します。</p>
      </div>
      <div className="question-grid">
        {questionnaire.map((item, questionIndex) => (
          <article
            className="question-block"
            key={item.q}
            role="group"
            aria-labelledby={`question-${questionIndex}`}
          >
            <h2 id={`question-${questionIndex}`}>{questionIndex + 1}. {item.q}</h2>
            <div className="answer-options">
              {[...item.options, "その他"].map((option) => {
                const checked = answers[String(questionIndex)]?.includes(option) ?? false;
                const id = `q-${questionIndex}-${option}`;
                return (
                  <label key={option} htmlFor={id} className={checked ? "is-checked" : ""}>
                    <input
                      id={id}
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => onChange(questionIndex, option, event.target.checked)}
                    />
                    {option}
                  </label>
                );
              })}
            </div>
            {answers[String(questionIndex)]?.includes("その他") && (
              <label className="other-answer" htmlFor={`q-${questionIndex}-other-text`}>
                その他の内容
                <input
                  id={`q-${questionIndex}-other-text`}
                  type="text"
                  value={otherAnswers[String(questionIndex)] ?? ""}
                  onChange={(event) => onOtherChange(questionIndex, event.target.value)}
                  placeholder="例: 自社固有のKPI、海外拠点、代理店別など"
                  aria-invalid={Boolean(otherErrors[String(questionIndex)])}
                />
              </label>
            )}
            {otherErrors[String(questionIndex)] && (
              <p className="question-error">{otherErrors[String(questionIndex)]}</p>
            )}
          </article>
        ))}
      </div>
      <div className="flow-actions">
        <button className="secondary-action compact" type="button" onClick={onBack}>
          <ArrowLeft size={18} />
          戻る
        </button>
        <button className="primary-action compact" type="button" onClick={onNext}>
          <ArrowRight size={18} />
          結果プレビューへ
        </button>
      </div>
    </motion.section>
  );
}

type LeadGateScreenProps = {
  lead: LeadForm;
  diagnosis: DiagnosisResult;
  pocCandidates: AnalyticsItem[];
  submitState: "idle" | "sending" | "error";
  submitError: string;
  onUpdate: (field: keyof LeadForm, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
};

function LeadGateScreen({
  lead,
  diagnosis,
  pocCandidates,
  submitState,
  submitError,
  onUpdate,
  onSubmit,
  onBack
}: LeadGateScreenProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.section className="lead-screen" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <div className="preview-panel">
        <p className="eyebrow">Result Preview</p>
        <h1>詳細レポートを作成できます</h1>
        <p className="preview-summary">{diagnosis.summary}</p>
        <div className="preview-stats">
          <div className="preview-maturity-stat">
            <span>総合判定</span>
            <strong>{maturityLabel(diagnosis)}</strong>
            <MaturityIndicator diagnosis={diagnosis} compact />
          </div>
          <div>
            <span>診断の方向性</span>
            <strong>{diagnosisActionLabel(diagnosis)}</strong>
            <em>{diagnosis.overallStage.summary}</em>
          </div>
          <div>
            <span>{pocThemeLabel(diagnosis)}（PoC案）</span>
            <strong>{pocThemeValue(diagnosis, pocCandidates.length)}</strong>
            <em>{pocThemeHelp(diagnosis)}</em>
          </div>
        </div>
        <StageDistribution diagnosis={diagnosis} compact />
        <div className="diagnosis-preview-list">
          {diagnosis.topCategories.slice(0, 3).map((category) => (
            <div key={category.categoryId} className={stageClassName(category.maturityStage.key)}>
              <span>{category.categoryName}</span>
              <div className="priority-stack">
                <strong>{category.maturityStage.label}</strong>
                <em>{category.maturityStage.actionTone}</em>
              </div>
            </div>
          ))}
        </div>
        <div className="candidate-preview">
          {pocCandidates.map((item) => (
            <SmallCandidate key={item.id} item={item} />
          ))}
        </div>
        <p className="diagnosis-note">{MATURITY_FRAME_HELP}</p>
      </div>

      <div className="report-depth-cue" aria-label="送信後に確認できる詳細レポート">
        <div className="depth-cue-copy">
          <p className="eyebrow">Full Report</p>
          <h2>入力後に、アクション付きの詳細レポートを表示します</h2>
          <p>プレビューは要点だけです。次の画面では、10領域の判定、優先整備領域、領域別の次アクション、初回PoC候補まで整理して表示します。</p>
        </div>
        <div className="depth-report-visual" aria-hidden="true">
          <motion.div
            className="depth-arrow"
            style={{ x: "-50%", rotate: 90 }}
            animate={shouldReduceMotion ? undefined : { y: [0, 7, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <ArrowRight size={20} />
          </motion.div>
          <div className="depth-report-card score-map">
            <span>10領域の成熟度</span>
            <strong>未熟・標準・先進で整理</strong>
            <div className="depth-stage-bars">
              {stageCountItems(diagnosis).map((item) => (
                <i className={stageClassName(item.key)} key={item.key}>
                  {item.label} {item.count}
                </i>
              ))}
            </div>
          </div>
          <div className="depth-report-card">
            <span>優先整備領域</span>
            <strong>上位3領域</strong>
          </div>
          <div className="depth-report-card">
            <span>{pocThemeLabel(diagnosis)}</span>
            <strong>{pocThemeValue(diagnosis, pocCandidates.length)}</strong>
          </div>
          <div className="depth-report-card">
            <span>次アクション</span>
            <strong>領域別に提示</strong>
          </div>
        </div>
      </div>

      <form className="lead-form" onSubmit={onSubmit}>
        <p className="eyebrow">Create Report</p>
        <h2>詳細レポートを表示する</h2>
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
        <p className="consent-copy">入力情報と回答結果を送信し、アクション付きの診断レポートを表示します。</p>
        {submitError && <p className="form-error">{submitError}</p>}
        <div className="flow-actions">
          <button className="secondary-action compact" type="button" onClick={onBack}>
            <ArrowLeft size={18} />
            戻る
          </button>
          <button className="primary-action compact" type="submit" disabled={submitState === "sending"}>
            <Send size={18} />
            {submitState === "sending" ? "送信中" : "詳細レポートを見る"}
          </button>
        </div>
      </form>
    </motion.section>
  );
}

type ResultScreenProps = {
  lead: LeadForm;
  pocCandidates: AnalyticsItem[];
  diagnosis: DiagnosisResult;
  submittedAt: string | null;
  onList: () => void;
  onCatalogGift: () => void;
  onReset: () => void;
};

function MaturityIndicator({ diagnosis, compact = false }: { diagnosis: DiagnosisResult; compact?: boolean }) {
  const shouldReduceMotion = useReducedMotion();
  const stageKeys = ["immature", "standard", "advanced"] as MaturityStageKey[];
  const activeStage = diagnosis.overallStage.key;
  const helpText = diagnosis.status === "insufficient"
    ? "入力が少ないため、総合判定は保留です。カードと質問票の回答を増やすと判定できます。"
    : diagnosis.overallStage.summary;

  return (
    <div
      className={`maturity-indicator ${compact ? "is-compact" : ""} ${diagnosis.status === "insufficient" ? "is-insufficient" : ""}`}
      aria-label={`総合判定 ${maturityLabel(diagnosis)}。${helpText}`}
    >
      <p>{helpText}</p>
      <div className="maturity-stage-track" aria-hidden="true">
        {stageKeys.map((stageKey, index) => (
          <motion.span
            className={`${stageClassName(stageKey)} ${activeStage === stageKey ? "is-active" : ""}`}
            key={stageKey}
            initial={shouldReduceMotion ? false : { opacity: 0.55, y: 5 }}
            animate={{ opacity: activeStage === stageKey ? 1 : 0.72, y: 0 }}
            transition={{ delay: shouldReduceMotion ? 0 : index * 0.04, duration: shouldReduceMotion ? 0 : 0.25 }}
          >
            {STAGE_META[stageKey].shortLabel}
          </motion.span>
        ))}
      </div>
      {diagnosis.status === "insufficient" && <small className="maturity-pending-note">判定保留</small>}
    </div>
  );
}

function DiagnosisVisualization({ diagnosis }: { diagnosis: DiagnosisResult }) {
  const shouldReduceMotion = useReducedMotion();
  const priorityIds = new Set(diagnosis.topCategories.slice(0, 3).map((category) => category.categoryId));
  const categoriesForViz = diagnosis.categoryDiagnostics;
  const stageKeys = ["immature", "standard", "advanced"] as MaturityStageKey[];

  return (
    <section className="diagnosis-visualization" aria-labelledby="diagnosis-viz-title">
      <div className="viz-head">
        <p className="eyebrow">Diagnosis Map</p>
        <h2 id="diagnosis-viz-title">10領域の成熟度マップ</h2>
        <p>各領域を「未熟・標準・先進」で整理します。上位カテゴリほど、先に整える価値が高い領域です。</p>
      </div>
      <div className="viz-axis" aria-hidden="true">
        <span>未熟</span>
        <span>標準</span>
        <span>先進</span>
      </div>
      <div className="viz-list">
        {categoriesForViz.map((category, index) => {
          const isPriority = priorityIds.has(category.categoryId);

          return (
            <motion.div
              className={`viz-row ${stageClassName(category.maturityStage.key)} ${isPriority ? "is-priority" : ""}`}
              key={category.categoryId}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: shouldReduceMotion ? 0 : index * 0.05, duration: shouldReduceMotion ? 0 : 0.35 }}
            >
              <div className="viz-row-label">
                <span>{index + 1}</span>
                <div>
                  <strong>{category.categoryName}</strong>
                  <em>{category.maturityStage.actionTone}</em>
                </div>
              </div>
              <div className="viz-stage-wrap">
                <div className="viz-stage-road" aria-label={`${category.categoryName} ${category.maturityStage.label}`}>
                  {category.maturityStage.key === "pending" ? (
                    <span className="stage-pending is-active">保留</span>
                  ) : (
                    stageKeys.map((stageKey) => (
                      <span
                        className={`${stageClassName(stageKey)} ${category.maturityStage.key === stageKey ? "is-active" : ""}`}
                        key={stageKey}
                      >
                        {STAGE_META[stageKey].shortLabel}
                      </span>
                    ))
                  )}
                </div>
                <div className="viz-priority-value">
                  <strong>{category.maturityStage.label}</strong>
                  <small>{isPriority ? "優先確認" : category.maturityStage.actionTone}</small>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

type CatalogGiftScreenProps = {
  diagnosis: DiagnosisResult;
  pocCandidates: AnalyticsItem[];
  onBack: () => void;
  onReset: () => void;
};

function CatalogGiftScreen({ diagnosis, pocCandidates, onBack, onReset }: CatalogGiftScreenProps) {
  const topCategories = diagnosis.topCategories.slice(0, 3);
  const featuredItems = pocCandidates.slice(0, 3);

  return (
    <motion.section className="catalog-gift-screen" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <div className="catalog-gift-hero">
        <div className="catalog-gift-heading">
          <p className="eyebrow">Analytics Catalog</p>
          <h1 className="catalog-gift-title">
            <span>FP&A分析カタログ：やりたいことが目で見てすぐ分かる</span>
            <span className="catalog-gift-note">※期間限定公開になりますので閉鎖時はご容赦ください</span>
          </h1>
        </div>

        <div className="catalog-gift-copy">
          <p>
            お礼として、FP&Aの分析テーマを課題別・用途別に探せる分析カタログをご紹介します。
            以下の公開リンクからカタログを確認できます。
          </p>
          <a className="catalog-link-status" href={ANALYTICS_CATALOG_URL} target="_blank" rel="noreferrer" aria-label="分析カタログを開く">
            <ExternalLink size={18} />
            <span>分析カタログを開く</span>
            <strong>{ANALYTICS_CATALOG_URL}</strong>
          </a>
          <div className="flow-actions">
            <button className="secondary-action compact" type="button" onClick={onBack}>
              <ArrowLeft size={18} />
              診断レポートに戻る
            </button>
          </div>
        </div>

        <div className="catalog-showcase" aria-label="分析カタログの概要">
          <div className="catalog-window-bar">
            <span />
            <span />
            <span />
            <strong>FP&A Analytics Catalog</strong>
          </div>
          <div className="catalog-window-body">
            <div className="catalog-search-row">
              <span>課題から探す</span>
              <span>検証テーマ</span>
              <span>必要データ</span>
            </div>
            <div className="catalog-window-grid">
              {featuredItems.map((item) => {
                const category = categoryById[item.category];
                return (
                  <article key={item.id} style={{ "--accent": category.accent } as React.CSSProperties}>
                    <div dangerouslySetInnerHTML={{ __html: chartSvg(item.chart, item.title, category.accent) }} />
                    <span>{category.name}</span>
                    <strong>{item.title}</strong>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="catalog-feature-grid">
        <article>
          <span><Target size={18} /></span>
          <h2>課題起点で探せる</h2>
          <p>売上成長、収益性、キャッシュ、予算、リスクなど、経営管理の論点から分析テーマを選べます。</p>
        </article>
        <article>
          <span><Layers3 size={18} /></span>
          <h2>分析の型を比較できる</h2>
          <p>必要データ、意思決定、検証の型を並べ、次に試す分析を検討しやすくしています。</p>
        </article>
        <article>
          <span><ClipboardList size={18} /></span>
          <h2>診断結果とつながる</h2>
          <p>今回の診断で見えた重点カテゴリから、関連する分析候補へ進める設計です。</p>
        </article>
      </div>

      <section className="catalog-diagnosis-bridge" aria-labelledby="catalog-bridge-title">
        <div>
          <p className="eyebrow">Recommended Entry</p>
          <h2 id="catalog-bridge-title">今回の診断から見る入口</h2>
          <p>着手判断が早い領域を、カタログで最初に確認するテーマとして整理しました。</p>
        </div>
        <div className="catalog-topic-list">
          {topCategories.map((category, index) => (
            <article key={category.categoryId}>
              <span>{index + 1}</span>
              <div>
                <h3>{category.categoryName}</h3>
                <p>判定 {category.maturityStage.label} / {category.maturityStage.actionTone}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="catalog-preview-grid">
        {featuredItems.map((item) => {
          const category = categoryById[item.category];
          return (
            <article className="catalog-preview-card" key={item.id} style={{ "--accent": category.accent } as React.CSSProperties}>
              <span>{category.name}</span>
              <h2>{item.title}</h2>
              <p>{item.decision}</p>
              <dl>
                <div>
                  <dt>確認するデータ</dt>
                  <dd>{item.data}</dd>
                </div>
                <div>
                  <dt>検証の型</dt>
                  <dd>{category.poc}</dd>
                </div>
              </dl>
            </article>
          );
        })}
      </div>

      <div className="flow-actions">
        <button className="secondary-action compact" type="button" onClick={onBack}>
          <ArrowLeft size={18} />
          診断レポートに戻る
        </button>
        <button className="primary-action compact" type="button" onClick={onReset}>
          <Mail size={18} />
          新しく診断する
        </button>
      </div>
    </motion.section>
  );
}

function ResultScreen({ lead, pocCandidates, diagnosis, submittedAt, onList, onCatalogGift, onReset }: ResultScreenProps) {
  return (
    <motion.section className="result-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="result-head">
        <p className="eyebrow">Diagnostic Report</p>
        <h1>{lead.company} 向け FP&A初期診断</h1>
        <p>{submittedAt ? new Date(submittedAt).toLocaleString("ja-JP") : ""}</p>
      </div>

      <div className="diagnosis-overview">
        <article className={`maturity-card ${diagnosis.status === "insufficient" ? "is-warning" : ""}`}>
          <span>いまの状態</span>
          <h2>{maturityLabel(diagnosis)}</h2>
          <p>{diagnosis.summary}</p>
          <MaturityIndicator diagnosis={diagnosis} />
          <StageDistribution diagnosis={diagnosis} compact />
        </article>
        <article className="diagnosis-evidence">
          <h2>入力から分かったこと</h2>
          <ul>
            {diagnosis.evidence.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p>{MATURITY_FRAME_HELP}</p>
        </article>
      </div>

      <DiagnosisVisualization diagnosis={diagnosis} />

      <div className="result-section-title">
        <h2>優先整備領域トップ3</h2>
        <p>課題カードと質問票回答を合わせて、先に整える価値が高い領域を並べています。</p>
      </div>
      <div className="diagnosis-card-grid">
        {diagnosis.topCategories.map((category) => (
          <article className={`diagnosis-category-card ${stageClassName(category.maturityStage.key)}`} key={category.categoryId}>
            <div className="category-card-head">
              <span>{category.maturityStage.actionTone}</span>
              <strong>{category.maturityStage.label}</strong>
            </div>
            <h3>{category.categoryName}</h3>
            <p>{category.reason}</p>
            <dl>
              <div>
                <dt>次にやること</dt>
                <dd>{category.recommendedAction}</dd>
              </div>
              <div>
                <dt>確認すること</dt>
                <dd>{category.nextCheck}</dd>
              </div>
            </dl>
            <div className="first-action">
              <span>初回PoC候補</span>
              <p>{category.pocTheme}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="result-section-title">
        <h2>10領域別の次アクション</h2>
        <p>すべての領域について、次に確認すべき観点を短く整理しています。</p>
      </div>
      <div className="action-roadmap">
        {diagnosis.categoryDiagnostics.map((category) => (
          <article className={stageClassName(category.maturityStage.key)} key={category.categoryId}>
            <div>
              <span>{category.maturityStage.label}</span>
              <h3>{category.categoryName}</h3>
            </div>
            <p>{category.recommendedAction}</p>
          </article>
        ))}
      </div>

      <div className="result-section-title">
        <h2>{pocThemeLabel(diagnosis)}（PoC案）</h2>
        <p>{pocThemeHelp(diagnosis)}</p>
      </div>
      <div className="poc-grid">
        {pocCandidates.map((item, index) => {
          const category = categoryById[item.category];
          return (
            <article className="poc-card" key={item.id} style={{ "--accent": category.accent } as React.CSSProperties}>
              <span>検証テーマ {index + 1}</span>
              <h2>{item.title}</h2>
              <p>{item.decision}</p>
              <dl>
                <div>
                  <dt>必要データ</dt>
                  <dd>{item.data}</dd>
                </div>
                <div>
                  <dt>検証の型</dt>
                  <dd>{category.poc}</dd>
                </div>
              </dl>
            </article>
          );
        })}
      </div>

      <div className="next-check-panel">
        <h2>次に確認すること</h2>
        <ul>
          {diagnosis.nextChecks.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="catalog-thanks-cta">
        <div>
          <p className="eyebrow">Thank You Gift</p>
          <h2>診断完了のお礼に、FP&A主要分析カタログをご紹介します</h2>
          <p>FP&Aで検討できる分析テーマを、課題別・用途別に探せる公開カタログを用意しています。</p>
        </div>
        <button className="primary-action compact" type="button" onClick={onCatalogGift}>
          <Sparkles size={18} />
          カタログリンクを見る
        </button>
      </div>
      <div className="flow-actions">
        <button className="secondary-action compact" type="button" onClick={onList}>
          <ListChecks size={18} />
          一覧を見る
        </button>
        <button className="secondary-action compact" type="button" onClick={onReset}>
          <Mail size={18} />
          新しく診断する
        </button>
      </div>
    </motion.section>
  );
}

export default App;
