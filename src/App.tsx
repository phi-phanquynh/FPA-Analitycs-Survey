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
  TriangleAlert,
  X
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { chartName, chartSvg } from "./chart";
import { analytics, categories, questionnaire } from "./data";
import { buildDiagnosis } from "./diagnosis";
import type { AnalyticsItem, AppMode, Category, DiagnosisResult, LeadForm, SubmissionPayload } from "./types";

const STORAGE_KEY = "fpa-analytics-quest-state-v2";
const FORMSPREE_ENDPOINT = import.meta.env.VITE_FORMSPREE_ENDPOINT as string | undefined;
const SUBMISSION_RECIPIENT_EMAIL = "pphanquynh@tohmatsu.co.jp";
const ANALYTICS_CATALOG_URL = "https://dtcon-eto.com/analytics-catalog/";

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
  return diagnosis.status === "insufficient"
    ? "入力不足"
    : `Lv${diagnosis.overallMaturity.level} ${diagnosis.overallMaturity.label}`;
}

const DIAGNOSIS_SIGNAL_HELP = "診断シグナルは、課題ありカードと質問票から検知した論点量です。点数評価ではなく、着手判断の根拠として扱います。";
const MATURITY_SCORE_HELP = "総合成熟度は、課題ありカードと質問票から見たFP&A分析の整備度です。Lv5が最も成熟、Lv1が要着手です。";

type ActionDecision = {
  label: string;
  description: string;
};

function clampIssueScore(score: number) {
  return Math.min(100, Math.max(0, score));
}

function formatDiagnosisSignal(score: number) {
  return `${clampIssueScore(score)}pt`;
}

function actionDecisionFromIssueScore(score: number): ActionDecision {
  const clamped = clampIssueScore(score);
  if (clamped <= 14) {
    return {
      label: "継続観察",
      description: "現時点では大きな着手判断より、他テーマの後で状況を確認する領域です。"
    };
  }
  if (clamped <= 34) {
    return {
      label: "状況確認",
      description: "まず現状資料、利用会議、責任者を確認して、着手要否を見極める領域です。"
    };
  }
  if (clamped <= 54) {
    return {
      label: "重点確認",
      description: "課題の芽が見えており、データと会議体を確認して検証テーマ化する領域です。"
    };
  }
  if (clamped <= 74) {
    return {
      label: "優先着手",
      description: "経営判断への影響が大きく、初回検証テーマとして優先的に扱う領域です。"
    };
  }
  return {
    label: "早期着手",
    description: "判断に必要な分析が不足している可能性が高く、早めに検証を始める領域です。"
  };
}

function diagnosisActionLabel(diagnosis: DiagnosisResult) {
  return diagnosis.status === "insufficient" ? "判定保留" : actionDecisionFromIssueScore(diagnosis.overallIssueScore).label;
}

function diagnosisSignalLabel(diagnosis: DiagnosisResult) {
  return diagnosis.status === "insufficient" ? "参考値" : formatDiagnosisSignal(diagnosis.overallIssueScore);
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
        `${index + 1}. ${category.categoryName} / 着手判断 ${actionDecisionFromIssueScore(category.issueScore).label} / 診断シグナル ${formatDiagnosisSignal(category.issueScore)}\n`
        + `   ${category.reason}\n`
        + `   最初の打ち手: ${category.firstAction}`
      ))
      .join("\n") || "・入力不足のため未判定";
  const evidenceLines = diagnosis.evidence.map((item) => `・${item}`).join("\n");
  const nextCheckLines = diagnosis.nextChecks.map((item) => `・${item}`).join("\n");

  return [
    "【回答者】",
    lead ? `${lead.company} / ${lead.title} / ${lead.name} / ${lead.email}` : "未入力",
    "",
    "【総合診断】",
    `${maturityLabel(diagnosis)}（Lvが高いほど成熟） / 着手判断 ${diagnosisActionLabel(diagnosis)} / 診断シグナル ${diagnosisSignalLabel(diagnosis)}`,
    diagnosis.summary,
    DIAGNOSIS_SIGNAL_HELP,
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

  function setMode(mode: AppMode) {
    setState((current) => ({ ...current, mode }));
    window.scrollTo({ top: 0, behavior: "smooth" });
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openNextDetail(item: AnalyticsItem) {
    const currentIndex = analytics.findIndex((entry) => entry.id === item.id);
    const nextItem = analytics[(currentIndex + 1) % analytics.length] ?? analytics[0];
    setState((current) => ({ ...current, detailId: nextItem.id, mode: "detail" }));
    window.scrollTo({ top: 0, behavior: "smooth" });
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
          経営管理に関する質問カードに答えると、あなたの会社に必要な経営分析と施策をAIが診断します
        </p>
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
      title: "自社で実現できているかを確認",
      text: "カードごとに、自社でその分析や判断ができているかを確認します。"
    },
    {
      label: "2",
      title: "「課題あり」を見つける",
      text: "できていない、または優先して改善したい分析を課題ありとして残します。"
    },
    {
      label: "3",
      title: "回答結果をAIが診断",
      text: "カードは全部で30。回答が多いほど、診断精度が上がります。"
    }
  ];

  return (
    <motion.section className="intro-screen" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <div className="intro-copy">
        <p className="eyebrow">How It Works</p>
        <h1>準備はいいですか？</h1>
        <p>各カードは、自社でその分析や判断ができているかを確認するための問いです。課題があるものを残すと、最後にAIが診断を行います。</p>
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
        <em>あと{remaining}枚で小休止</em>
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
          <div className="chart-frame" dangerouslySetInnerHTML={{ __html: chartSvg(item.chart, item.title, category.accent, "large") }} />
          <div className="reveal-panel">
            <div className="reveal-heading">
              <span>実現のために必要な分析</span>
              <em>{chartName(item.chart)}</em>
            </div>
            <strong>{item.title}</strong>
            <div className="action-note">
              <span>打てるアクション</span>
              <p>{item.decision}</p>
            </div>
          </div>
        </div>
      </motion.article>

      <div className="deck-actions">
        <button className="reject-action" type="button" onClick={onDismiss}>
          <X size={22} />
          課題なし/不要
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
  onContinue: () => void;
  onQuestionnaire: () => void;
};

function RoundBreakScreen({ roundIndex, selectedItems, roundItems, onContinue, onQuestionnaire }: RoundBreakScreenProps) {
  const roundSelected = roundItems.filter((item) => selectedItems.some((selected) => selected.id === item.id));
  const isFinalRound = roundIndex >= rounds.length - 1;
  const diagnosisActionClassName = `primary-action${isFinalRound ? " final-diagnosis-action" : ""}`;
  const completedCardCount = rounds
    .slice(0, roundIndex + 1)
    .reduce((sum, round) => sum + round.length, 0);
  const remainingCardCount = Math.max(0, analytics.length - completedCardCount);
  const progressMessage = remainingCardCount > 0
    ? `全${analytics.length}枚のうち、ここまでで${completedCardCount}枚を確認しました。あと${remainingCardCount}枚です。もう少しだけ、がんばりましょう。`
    : `全${analytics.length}枚の確認が完了しました。ここまでの選択内容で診断に進めます。`;
  const breakTitles = [
    "少しずつ貴社の状況が見えてきました",
    "貴社の優先課題がより明確になってきました",
    "診断に必要な全体像が整理できました"
  ];
  const breakDescriptions = [
    "ここまでの回答から、経営管理上の論点が少しずつ見え始めています。さらに精度を高める場合は、次のラウンドも確認してください。",
    "これまでの回答をもとに、優先して確認すべき領域が絞られてきました。必要に応じて、この時点から診断に進めます。",
    "全ラウンドの回答をもとに、貴社の経営管理の強みと課題を診断できます。"
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
      <div className="break-score">
        <div>
          <span>このラウンド</span>
          <strong>{roundSelected.length}</strong>
        </div>
        <div>
          <span>累計課題あり</span>
          <strong>{selectedItems.length}</strong>
        </div>
      </div>
      <div className="mini-cards">
        {roundSelected.length ? (
          roundSelected.map((item) => <SmallCandidate key={item.id} item={item} />)
        ) : (
          <p className="empty-note">このラウンドでは課題ありカードがありませんでした。</p>
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
        <div className="questionnaire-final-badge" aria-label="この画面が最後です">
          <Check size={16} />
          この画面が最後です
        </div>
        <p>カードで残した課題と合わせて、成熟度と優先確認カテゴリを判定します。</p>
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
        <h1>診断結果を作成中です</h1>
        <p className="preview-summary">{diagnosis.summary}</p>
        <div className="preview-stats">
          <div className="preview-maturity-stat">
            <span>総合成熟度</span>
            <strong>{maturityLabel(diagnosis)}</strong>
            <MaturityIndicator diagnosis={diagnosis} compact />
          </div>
          <div>
            <span>着手判断</span>
            <strong>{diagnosisActionLabel(diagnosis)}</strong>
            <em>診断シグナル {diagnosisSignalLabel(diagnosis)}</em>
          </div>
          <div>
            <span>{pocThemeLabel(diagnosis)}（PoC案）</span>
            <strong>{pocThemeValue(diagnosis, pocCandidates.length)}</strong>
            <em>{pocThemeHelp(diagnosis)}</em>
          </div>
        </div>
        <div className="diagnosis-preview-list">
          {diagnosis.topCategories.slice(0, 3).map((category) => (
            <div key={category.categoryId}>
              <span>{category.categoryName}</span>
              <div className="priority-stack">
                <strong>{actionDecisionFromIssueScore(category.issueScore).label}</strong>
                <em>{formatDiagnosisSignal(category.issueScore)}</em>
              </div>
            </div>
          ))}
        </div>
        <div className="candidate-preview">
          {pocCandidates.map((item) => (
            <SmallCandidate key={item.id} item={item} />
          ))}
        </div>
        <p className="diagnosis-note">{MATURITY_SCORE_HELP} {DIAGNOSIS_SIGNAL_HELP}</p>
        <p className="diagnosis-note">この診断は入力内容に基づく初期仮説です。正式な監査やベンチマークではありません。</p>
      </div>

      <div className="report-depth-cue" aria-label="送信後に確認できる詳細レポート">
        <div className="depth-cue-copy">
          <p className="eyebrow">Full Report</p>
          <h2>回答結果送信後に、詳細レポートで深堀できます</h2>
          <p>プレビューは要点だけです。次の画面では、カテゴリ別の診断シグナル、優先確認カテゴリ、初回検証テーマ、次に確認することまで整理して表示します。</p>
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
            <span>診断シグナルMAP</span>
            <strong>{diagnosis.topCategories[0]?.categoryName ?? "重点カテゴリ"}</strong>
            <div className="depth-bars">
              {diagnosis.topCategories.slice(0, 3).map((category) => (
                <i key={category.categoryId} style={{ width: `${clampIssueScore(category.issueScore)}%` }} />
              ))}
            </div>
          </div>
          <div className="depth-report-card">
            <span>優先確認カテゴリ</span>
            <strong>上位3領域</strong>
          </div>
          <div className="depth-report-card">
            <span>{pocThemeLabel(diagnosis)}</span>
            <strong>{pocThemeValue(diagnosis, pocCandidates.length)}</strong>
          </div>
          <div className="depth-report-card">
            <span>次に確認すること</span>
            <strong>確認項目を整理</strong>
          </div>
        </div>
      </div>

      <form className="lead-form" onSubmit={onSubmit}>
        <p className="eyebrow">Create Report</p>
        <h2>貴社の診断結果を作成します</h2>
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
        <p className="consent-copy">入力情報と回答結果を送信し、診断レポートを表示します。</p>
        {submitError && <p className="form-error">{submitError}</p>}
        <div className="flow-actions">
          <button className="secondary-action compact" type="button" onClick={onBack}>
            <ArrowLeft size={18} />
            戻る
          </button>
          <button className="primary-action compact" type="submit" disabled={submitState === "sending"}>
            <Send size={18} />
            {submitState === "sending" ? "送信中" : "回答結果を送信"}
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

function ScoreMeter({ score, label = "診断シグナル" }: { score: number; label?: string }) {
  const shouldReduceMotion = useReducedMotion();
  const clampedScore = clampIssueScore(score);

  return (
    <div className="score-meter" aria-label={`${label} ${formatDiagnosisSignal(clampedScore)}。シグナルが大きいほど先に確認する領域`}>
      <motion.span
        initial={shouldReduceMotion ? false : { width: 0 }}
        animate={{ width: `${clampedScore}%` }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.7, ease: "easeOut" }}
      />
    </div>
  );
}

function MaturityIndicator({ diagnosis, compact = false }: { diagnosis: DiagnosisResult; compact?: boolean }) {
  const shouldReduceMotion = useReducedMotion();
  const level = diagnosis.status === "insufficient" ? 1 : diagnosis.overallMaturity.level;
  const progress = Math.max(0, Math.min(100, ((level - 1) / 4) * 100));
  const pinLabel = diagnosis.status === "insufficient" ? "入力不足" : `Lv${level}`;
  const helpText = diagnosis.status === "insufficient"
    ? "課題ありカードと質問票の入力が少ないため、総合成熟度は参考値です。"
    : "課題ありカードと質問票から見た、FP&A分析の整備度です。課題シグナルが強いほどLvは低くなります。";

  return (
    <div
      className={`maturity-indicator ${compact ? "is-compact" : ""} ${diagnosis.status === "insufficient" ? "is-insufficient" : ""}`}
      aria-label={`総合成熟度 ${maturityLabel(diagnosis)}。${helpText}`}
    >
      <p>{helpText}</p>
      <div className="maturity-scale-labels" aria-hidden="true">
        <span>Lv1 要着手</span>
        <span>Lv5 高度化</span>
      </div>
      <div className="maturity-track" aria-hidden="true">
        <motion.span
          className="maturity-fill"
          initial={shouldReduceMotion ? false : { width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.72, ease: "easeOut" }}
        />
        <motion.i
          className="maturity-pin"
          initial={shouldReduceMotion ? false : { left: "0%" }}
          animate={{ left: `${progress}%` }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.72, ease: "easeOut" }}
        >
          <span>{pinLabel}</span>
        </motion.i>
      </div>
    </div>
  );
}

function DiagnosisVisualization({ diagnosis }: { diagnosis: DiagnosisResult }) {
  const shouldReduceMotion = useReducedMotion();
  const priorityIds = new Set(diagnosis.topCategories.slice(0, 3).map((category) => category.categoryId));
  const categoriesForViz = diagnosis.categoryDiagnostics.slice(0, 6);

  return (
    <section className="diagnosis-visualization" aria-labelledby="diagnosis-viz-title">
      <div className="viz-head">
        <p className="eyebrow">Diagnosis Map</p>
        <h2 id="diagnosis-viz-title">カテゴリ別 診断シグナル</h2>
        <p>{DIAGNOSIS_SIGNAL_HELP} 上位カテゴリほど、先に確認すべきFP&Aテーマです。</p>
      </div>
      <div className="viz-axis" aria-hidden="true">
        <span>シグナル小</span>
        <span>シグナル大</span>
      </div>
      <div className="viz-list">
        {categoriesForViz.map((category, index) => {
          const score = clampIssueScore(category.issueScore);
          const isPriority = priorityIds.has(category.categoryId);

          return (
            <motion.div
              className={`viz-row ${isPriority ? "is-priority" : ""}`}
              key={category.categoryId}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: shouldReduceMotion ? 0 : index * 0.05, duration: shouldReduceMotion ? 0 : 0.35 }}
            >
              <div className="viz-row-label">
                <span>{index + 1}</span>
                <div>
                  <strong>{category.categoryName}</strong>
                  <em>{category.maturity.label}</em>
                </div>
              </div>
              <div className="viz-bar-wrap">
                <div className="viz-bar" aria-label={`${category.categoryName} 診断シグナル ${formatDiagnosisSignal(score)}`}>
                  <motion.span
                    initial={shouldReduceMotion ? false : { width: 0 }}
                    animate={{ width: `${score}%` }}
                    transition={{ delay: shouldReduceMotion ? 0 : 0.15 + index * 0.06, duration: shouldReduceMotion ? 0 : 0.8, ease: "easeOut" }}
                  />
                </div>
                <div className="viz-priority-value">
                  <strong>{actionDecisionFromIssueScore(score).label}</strong>
                  <small>{formatDiagnosisSignal(score)}</small>
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
                <p>着手判断 {actionDecisionFromIssueScore(category.issueScore).label} / 診断シグナル {formatDiagnosisSignal(category.issueScore)}</p>
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
          <span>総合診断</span>
          <h2>{maturityLabel(diagnosis)}</h2>
          <p>{diagnosis.summary}</p>
          <MaturityIndicator diagnosis={diagnosis} />
          <p className="score-help">{MATURITY_SCORE_HELP} {DIAGNOSIS_SIGNAL_HELP}</p>
          <div className="score-row">
            <div>
              <span>着手判断</span>
              <strong>{diagnosisActionLabel(diagnosis)}</strong>
              <small>診断シグナル {diagnosisSignalLabel(diagnosis)}</small>
            </div>
            <ScoreMeter score={diagnosis.overallIssueScore} />
          </div>
        </article>
        <article className="diagnosis-evidence">
          <h2>入力根拠</h2>
          <ul>
            {diagnosis.evidence.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p>入力内容に基づく初期仮説です。正式な監査やベンチマークではありません。{DIAGNOSIS_SIGNAL_HELP}</p>
        </article>
      </div>

      <DiagnosisVisualization diagnosis={diagnosis} />

      <div className="result-section-title">
        <h2>優先確認カテゴリ</h2>
        <p>課題ありカードと質問票回答を合わせて、先に着手判断すべき領域を並べています。</p>
      </div>
      <div className="diagnosis-card-grid">
        {diagnosis.topCategories.map((category) => (
          <article className="diagnosis-category-card" key={category.categoryId}>
            <div className="category-card-head">
              <span>{category.maturity.label}</span>
              <strong>{actionDecisionFromIssueScore(category.issueScore).label}</strong>
            </div>
            <h3>{category.categoryName}</h3>
            <ScoreMeter score={category.issueScore} />
            <p className="score-help">診断シグナル {formatDiagnosisSignal(category.issueScore)}。{actionDecisionFromIssueScore(category.issueScore).description}</p>
            <p>{category.reason}</p>
            <dl>
              <div>
                <dt>カード由来</dt>
                <dd>{formatDiagnosisSignal(category.cardScore)}</dd>
              </div>
              <div>
                <dt>質問票由来</dt>
                <dd>{formatDiagnosisSignal(category.questionnaireScore)}</dd>
              </div>
            </dl>
            <div className="first-action">
              <span>最初の打ち手</span>
              <p>{category.firstAction}</p>
            </div>
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
