import type { AnalyticsItem, Category, CategoryDiagnosis, DiagnosisResult, DiagnosisSignal, MaturityLevel } from "./types";

const CARD_SCORE_MAX = 70;
const QUESTIONNAIRE_SCORE_MAX = 30;
const CARDS_PER_CATEGORY = 3;

type QuestionnaireSignalDefinition = {
  categories: string[];
  weight: number;
  reason: string;
};

type BuildDiagnosisArgs = {
  selectedItems: AnalyticsItem[];
  answers: Record<string, string[]>;
  categories: Category[];
};

const questionnaireSignals: Record<string, QuestionnaireSignalDefinition> = {
  "売上": { categories: ["growth", "performance"], weight: 6, reason: "売上説明に時間がかかる" },
  "粗利": { categories: ["profitability", "growth"], weight: 6, reason: "粗利説明に時間がかかる" },
  "営業利益": { categories: ["profitability", "performance"], weight: 6, reason: "営業利益説明に時間がかかる" },
  "費用": { categories: ["cost", "performance"], weight: 6, reason: "費用説明に時間がかかる" },
  "キャッシュ": { categories: ["cash", "forecast"], weight: 7, reason: "キャッシュ説明に時間がかかる" },
  "在庫": { categories: ["cash", "cost"], weight: 6, reason: "在庫説明に時間がかかる" },
  "予算差異": { categories: ["performance", "forecast"], weight: 7, reason: "予算差異で議論が止まりやすい" },
  "利益率低下": { categories: ["profitability"], weight: 8, reason: "利益率低下の原因特定が必要" },
  "売上未達": { categories: ["growth", "forecast"], weight: 7, reason: "売上未達の原因特定が必要" },
  "コスト増": { categories: ["cost"], weight: 8, reason: "コスト増の原因特定が必要" },
  "回収遅延": { categories: ["cash", "risk"], weight: 7, reason: "回収遅延が資金繰りに影響する" },
  "予測外れ": { categories: ["forecast", "scenario"], weight: 8, reason: "予測精度の改善が必要" },
  "売上着地": { categories: ["forecast", "growth"], weight: 7, reason: "売上着地を早く見たい" },
  "利益着地": { categories: ["forecast", "profitability"], weight: 7, reason: "利益着地を早く見たい" },
  "資金残高": { categories: ["cash", "forecast"], weight: 8, reason: "資金残高の先読みが必要" },
  "需要": { categories: ["scenario", "growth"], weight: 6, reason: "需要変動の見通しが必要" },
  "解約": { categories: ["growth", "risk"], weight: 6, reason: "解約リスクの把握が必要" },
  "費用超過": { categories: ["cost", "risk"], weight: 7, reason: "費用超過の予兆把握が必要" },
  "事業": { categories: ["profitability", "allocation"], weight: 4, reason: "事業軸で分析したい" },
  "部門": { categories: ["performance", "cost"], weight: 4, reason: "部門軸で分析したい" },
  "商品": { categories: ["growth", "profitability"], weight: 4, reason: "商品軸で分析したい" },
  "顧客": { categories: ["growth", "profitability", "risk"], weight: 4, reason: "顧客軸で分析したい" },
  "地域": { categories: ["growth", "scenario"], weight: 4, reason: "地域軸で分析したい" },
  "担当者": { categories: ["performance", "allocation"], weight: 4, reason: "担当者軸で分析したい" },
  "月次業績": { categories: ["performance", "story"], weight: 6, reason: "月次業績資料を改善したい" },
  "予算レビュー": { categories: ["forecast", "performance"], weight: 6, reason: "予算レビューを改善したい" },
  "投資審査": { categories: ["allocation"], weight: 7, reason: "投資審査を改善したい" },
  "資金繰り": { categories: ["cash"], weight: 8, reason: "資金繰り資料を改善したい" },
  "取締役会": { categories: ["story", "performance"], weight: 5, reason: "取締役会資料を改善したい" },
  "部門会議": { categories: ["performance", "cost"], weight: 5, reason: "部門会議資料を改善したい" },
  "顧客別利益": { categories: ["profitability", "growth"], weight: 7, reason: "顧客別利益データが不足している" },
  "商品別原価": { categories: ["profitability", "cost"], weight: 7, reason: "商品別原価データが不足している" },
  "商談情報": { categories: ["growth", "forecast"], weight: 7, reason: "商談情報が不足している" },
  "在庫明細": { categories: ["cash", "cost"], weight: 7, reason: "在庫明細が不足している" },
  "人員情報": { categories: ["allocation", "cost"], weight: 6, reason: "人員情報が不足している" },
  "施策効果": { categories: ["allocation", "story"], weight: 6, reason: "施策効果データが不足している" },
  "CEO": { categories: ["story", "performance"], weight: 4, reason: "CEO向けの判断材料が必要" },
  "CFO": { categories: ["performance", "forecast", "cash"], weight: 4, reason: "CFO向けの判断材料が必要" },
  "事業責任者": { categories: ["profitability", "growth"], weight: 4, reason: "事業責任者向けの判断材料が必要" },
  "営業責任者": { categories: ["growth", "forecast"], weight: 4, reason: "営業責任者向けの判断材料が必要" },
  "部門長": { categories: ["performance", "cost"], weight: 4, reason: "部門長向けの判断材料が必要" },
  "経営会議": { categories: ["performance", "story"], weight: 4, reason: "経営会議向けの判断材料が必要" },
  "価格改定": { categories: ["profitability", "growth"], weight: 7, reason: "価格改定に使う分析が必要" },
  "費用削減": { categories: ["cost"], weight: 8, reason: "費用削減に使う分析が必要" },
  "投資判断": { categories: ["allocation"], weight: 8, reason: "投資判断に使う分析が必要" },
  "人員再配置": { categories: ["allocation", "cost"], weight: 7, reason: "人員再配置に使う分析が必要" },
  "在庫削減": { categories: ["cash", "cost"], weight: 7, reason: "在庫削減に使う分析が必要" },
  "営業支援": { categories: ["growth", "forecast"], weight: 6, reason: "営業支援に使う分析が必要" }
};

const firstActions: Record<string, string> = {
  performance: "経営会議で見るKPI、閾値、責任部門を1枚に整理する",
  growth: "売上の増減を顧客・商品・単価・数量に分解して、重点営業テーマを決める",
  profitability: "商品・顧客・事業別の採算を並べ、利益を下げる要因を特定する",
  cost: "費用の大きな塊と増加要因を部門・科目別に切り分ける",
  cash: "13週から12か月の資金見通しと、回収・在庫の資金拘束を確認する",
  forecast: "実績、予算、最新見込を接続し、着地見込と差異理由を更新する",
  scenario: "主要ドライバーの変動幅を決め、利益と資金への影響をケース比較する",
  allocation: "投資・人員・予算配分を効果、収益性、リスクで比較する",
  risk: "予算超過、収益悪化、集中リスクの早期アラート条件を決める",
  story: "差異理由、論点、打ち手を経営会議向けの説明文に変換する"
};

const categoryCheckTemplates: Record<string, string> = {
  performance: "KPI定義、閾値、責任部門、会議での利用タイミング",
  growth: "顧客・商品・商談データ、単価/数量、解約や受注確度の定義",
  profitability: "原価、粗利、配賦ルール、顧客別対応コスト",
  cost: "部門費、勘定科目、発注残、固定費/変動費区分",
  cash: "入出金予定、回収条件、在庫明細、借入枠",
  forecast: "予算、実績、見込、ドライバー、更新頻度",
  scenario: "為替、原材料、人件費、需要などの前提レンジ",
  allocation: "投資案件、人員計画、効果見込、回収期間",
  risk: "閾値、異常値、集中先、アラート時の対応責任",
  story: "会議体、読み手、説明粒度、差異コメントの作成プロセス"
};

export function maturityFromIssueScore(issueScore: number): MaturityLevel {
  if (issueScore <= 14) {
    return {
      level: 5,
      label: "運用高度化",
      range: "0-14",
      summary: "主要な分析は運用されており、次は自動化や意思決定への接続を高める段階です。"
    };
  }
  if (issueScore <= 34) {
    return {
      level: 4,
      label: "意思決定接続",
      range: "15-34",
      summary: "分析の土台はあり、会議体や打ち手との接続を強める段階です。"
    };
  }
  if (issueScore <= 54) {
    return {
      level: 3,
      label: "分析整備中",
      range: "35-54",
      summary: "分析テーマは見えていますが、粒度、責任、更新頻度の整備余地があります。"
    };
  }
  if (issueScore <= 74) {
    return {
      level: 2,
      label: "可視化不足",
      range: "55-74",
      summary: "経営判断に必要な可視化が不足しており、優先テーマを絞った整備が必要です。"
    };
  }
  return {
    level: 1,
    label: "未整備・要着手",
    range: "75-100",
    summary: "重要な分析が未整備の可能性が高く、まずは会議で使う最小構成から着手すべき段階です。"
  };
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function flattenAnswers(answers: Record<string, string[]>) {
  return Object.values(answers).flat().map((answer) => answer.trim()).filter(Boolean);
}

function questionnaireScoreByCategory(answerValues: string[], categories: Category[]) {
  const categoryScores = Object.fromEntries(categories.map((category) => [category.id, 0])) as Record<string, number>;
  const categorySignals = Object.fromEntries(categories.map((category) => [category.id, [] as DiagnosisSignal[]])) as Record<string, DiagnosisSignal[]>;
  const uncertaintySignals: DiagnosisSignal[] = [];

  answerValues.forEach((answer) => {
    if (answer === "分からない") {
      uncertaintySignals.push({
        source: "uncertainty",
        label: answer,
        categories: [],
        weight: 0,
        reason: "現状把握や判断責任が曖昧な可能性があります。"
      });
      return;
    }

    const definition = questionnaireSignals[answer];
    if (!definition) return;

    definition.categories.forEach((categoryId) => {
      if (!(categoryId in categoryScores)) return;
      categoryScores[categoryId] += definition.weight;
      categorySignals[categoryId].push({
        source: "questionnaire",
        label: answer,
        categories: definition.categories,
        weight: definition.weight,
        reason: definition.reason
      });
    });
  });

  Object.keys(categoryScores).forEach((categoryId) => {
    categoryScores[categoryId] = Math.min(QUESTIONNAIRE_SCORE_MAX, categoryScores[categoryId]);
  });

  return { categoryScores, categorySignals, uncertaintySignals };
}

function categoryReason(selectedCount: number, questionnaireScore: number, categoryName: string) {
  if (selectedCount > 0 && questionnaireScore > 0) {
    return `課題ありカードが${selectedCount}件あり、質問票でも${categoryName}に関連する論点が出ています。`;
  }
  if (selectedCount > 0) {
    return `課題ありカードが${selectedCount}件あり、まず${categoryName}から確認する価値があります。`;
  }
  if (questionnaireScore > 0) {
    return `カード選択は少ないものの、質問票の回答から${categoryName}に関連する論点が見えます。`;
  }
  return `現時点の入力では、${categoryName}の診断シグナルは比較的弱めです。`;
}

function buildEvidence(selectedItems: AnalyticsItem[], answerValues: string[], uncertaintyCount: number) {
  const evidence = [
    `課題ありカード: ${selectedItems.length}件`,
    `質問票の選択: ${answerValues.length}件`
  ];

  if (uncertaintyCount > 0) {
    evidence.push(`「分からない」回答: ${uncertaintyCount}件`);
  }

  const selectedCategoryNames = unique(selectedItems.map((item) => item.category));
  if (selectedCategoryNames.length > 0) {
    evidence.push(`課題カテゴリ数: ${selectedCategoryNames.length}カテゴリ`);
  }

  return evidence;
}

function buildNextChecks(topCategories: CategoryDiagnosis[], uncertaintyCount: number, isInsufficient: boolean) {
  if (isInsufficient) {
    return [
      "課題ありカードを最低3枚程度選び、診断の根拠を増やす",
      "どの会議体で使う診断なのかを確認する",
      "最終判断者と、現状で困っている資料を確認する",
      "利用可能なデータの所在と更新頻度を確認する"
    ];
  }

  const categoryChecks = topCategories
    .slice(0, 3)
    .map((category) => `${category.categoryName}: ${categoryCheckTemplates[category.categoryId] ?? "必要データ、責任者、更新頻度"}`);

  return [
    ...categoryChecks,
    "PoCで使う会議体と意思決定者を決める",
    "初回に見る指標、粒度、更新頻度を決める",
    uncertaintyCount >= 3 ? "「分からない」回答が多いため、現状把握と責任範囲を先に確認する" : "診断結果を関係部門と確認し、優先テーマを1-3件に絞る"
  ];
}

export function buildDiagnosis({ selectedItems, answers, categories }: BuildDiagnosisArgs): DiagnosisResult {
  const answerValues = flattenAnswers(answers);
  const meaningfulAnswerCount = answerValues.filter((answer) => answer !== "分からない").length;
  const { categoryScores, categorySignals, uncertaintySignals } = questionnaireScoreByCategory(answerValues, categories);
  const uncertaintyCount = uncertaintySignals.length;

  const categoryDiagnostics = categories
    .map((category) => {
      const selectedForCategory = selectedItems.filter((item) => item.category === category.id);
      const selectedCount = selectedForCategory.length;
      const cardScore = Math.min(CARD_SCORE_MAX, Math.round((selectedCount / CARDS_PER_CATEGORY) * CARD_SCORE_MAX));
      const questionnaireScore = categoryScores[category.id] ?? 0;
      const issueScore = Math.min(100, cardScore + questionnaireScore);
      const cardSignals = selectedForCategory.map<DiagnosisSignal>((item) => ({
        source: "card",
        label: item.title,
        categories: [category.id],
        weight: 14,
        reason: item.capability
      }));

      return {
        categoryId: category.id,
        categoryName: category.name,
        categoryDescription: category.description,
        issueScore,
        cardScore,
        questionnaireScore,
        selectedCount,
        selectedTitles: selectedForCategory.map((item) => item.title),
        maturity: maturityFromIssueScore(issueScore),
        signals: [...cardSignals, ...(categorySignals[category.id] ?? [])],
        reason: categoryReason(selectedCount, questionnaireScore, category.name),
        firstAction: firstActions[category.id] ?? "診断根拠、必要データ、責任者を確認する"
      } satisfies CategoryDiagnosis;
    })
    .sort((a, b) => b.issueScore - a.issueScore || b.selectedCount - a.selectedCount || categories.findIndex((category) => category.id === a.categoryId) - categories.findIndex((category) => category.id === b.categoryId));

  const topCategories = categoryDiagnostics.slice(0, 3);
  const topScoreAverage = topCategories.length
    ? Math.round(topCategories.reduce((sum, category) => sum + category.issueScore, 0) / topCategories.length)
    : 0;
  const isInsufficient = selectedItems.length === 0 && (meaningfulAnswerCount < 2 || uncertaintyCount >= 4);
  const overallMaturity = isInsufficient
    ? {
        level: 1,
        label: "入力不足",
        range: "-",
        summary: "課題ありカードまたは具体的な質問票回答が不足しているため、診断は初期仮説に留めます。"
      } satisfies MaturityLevel
    : maturityFromIssueScore(topScoreAverage);

  const summary = isInsufficient
    ? "入力が少ないため、現時点では参考診断です。まず課題ありカードと利用データを確認してください。"
    : `上位課題は${topCategories.map((category) => category.categoryName).join("、")}です。${overallMaturity.summary}`;

  return {
    status: isInsufficient ? "insufficient" : "diagnosed",
    overallIssueScore: isInsufficient ? 0 : topScoreAverage,
    overallMaturity,
    summary,
    evidence: buildEvidence(selectedItems, answerValues, uncertaintyCount),
    topCategories,
    categoryDiagnostics,
    uncertaintySignals,
    nextChecks: buildNextChecks(topCategories, uncertaintyCount, isInsufficient),
    isPocReferenceOnly: isInsufficient || selectedItems.length === 0
  };
}
