import type { AnalyticsItem, Category, QuestionnaireItem } from "./types";

type AnalyticsItemDraft = Omit<AnalyticsItem, "capability">;

export const categories: Category[] = [
  {
    id: "performance",
    name: "経営KPI・業績管理",
    description: "経営会議で見るべきKPIを集約し、異常・差異・打ち手を素早く判断するための分析群です。",
    question: "経営会議で、議論の起点にすべき数字を明確にできていますか。",
    promise: "KPIの異常、責任領域、打ち手候補を会議前に捉える。",
    poc: "経営KPI統合ダッシュボード",
    tags: ["月次経営会議", "KPI責任", "異常把握", "着地判断"],
    accent: "#2f766d",
    chart: "scorecard"
  },
  {
    id: "growth",
    name: "売上・成長分析",
    description: "売上成長の源泉を、顧客・商品・単価・数量・商談の観点で分解します。",
    question: "成長がどこから生まれ、どこで失速しているか把握できていますか。",
    promise: "売上増減の要因を分解し、営業と価格の重点アクションを特定する。",
    poc: "売上増減要因とパイプライン分析",
    tags: ["成長戦略", "価格判断", "顧客深掘り", "営業予測"],
    accent: "#4e6e94",
    chart: "bridge"
  },
  {
    id: "profitability",
    name: "利益・採算分析",
    description: "粗利率、商品・顧客・事業別採算、利益変動要因を見える化します。",
    question: "売上があるのに利益が残らない理由を説明できていますか。",
    promise: "利益を押し下げる要因を特定し、改善テーマの優先順位を決める。",
    poc: "利益ブリッジとセグメント別採算分析",
    tags: ["採算改善", "ポートフォリオ", "値上げ判断", "撤退判断"],
    accent: "#b85c38",
    chart: "waterfall"
  },
  {
    id: "cost",
    name: "コスト・費用分析",
    description: "費用構造とコストドライバーを分解し、削減余地と予算超過の原因を確認します。",
    question: "構造的に増えている費用と削減余地を把握できていますか。",
    promise: "費用の塊、変動要因、異常値を可視化し、削減テーマに落とす。",
    poc: "費用構造マップとコストドライバー分析",
    tags: ["費用統制", "固定費管理", "削減余地", "部門責任"],
    accent: "#c7922d",
    chart: "treemap"
  },
  {
    id: "cash",
    name: "キャッシュ・資金繰り",
    description: "キャッシュ創出力、運転資本、回収、在庫による資金拘束を見える化します。",
    question: "利益が出ているのに資金が厳しい理由を説明できていますか。",
    promise: "入出金、回収、在庫、運転資本をつないで資金余力を判断する。",
    poc: "13週キャッシュフロー予測と運転資本分析",
    tags: ["資金繰り", "運転資本", "回収改善", "在庫圧縮"],
    accent: "#547d4f",
    chart: "forecast"
  },
  {
    id: "forecast",
    name: "予算・フォーキャスト",
    description: "予算と着地見込の差を早期に把握し、月次で見通しを更新します。",
    question: "今期の着地見通しと、打ち手を打つべきタイミングを把握できていますか。",
    promise: "実績と最新見込を接続し、予算差異を先回りして説明する。",
    poc: "ローリング・着地見込フォーキャスト",
    tags: ["ローリング予測", "予算修正", "精度改善", "部門管理"],
    accent: "#5d6872",
    chart: "line"
  },
  {
    id: "scenario",
    name: "シナリオ・感応度",
    description: "外部環境や主要ドライバーの変化が、売上・利益・資金へ与える影響を試算します。",
    question: "前提が崩れた場合に、最も影響を受ける経営指標を把握できていますか。",
    promise: "為替、原材料、人件費、需要変動の影響をケースで比較する。",
    poc: "ベスト・ベース・ワーストケース分析",
    tags: ["感応度", "為替", "原材料", "ケース比較"],
    accent: "#8a6a2a",
    chart: "scenario"
  },
  {
    id: "allocation",
    name: "投資・リソース配分",
    description: "投資、人員、マーケティング、資本をどこに配分すべきかを比較します。",
    question: "限られた資金と人員を、どこに配分すべきか判断できていますか。",
    promise: "投資効果、成長性、収益性、リスクを並べて配分判断に変える。",
    poc: "投資対効果と資本配分ポートフォリオ",
    tags: ["投資判断", "人員配置", "ROI", "資本配分"],
    accent: "#316b87",
    chart: "scatter"
  },
  {
    id: "risk",
    name: "リスク・異常検知",
    description: "収益悪化や予算超過の兆候を早期に捉え、経営アラートとして扱います。",
    question: "悪化の兆候を、月末や四半期末より前に捉えられていますか。",
    promise: "異常値、集中リスク、予算超過リスクを早期アラート化する。",
    poc: "財務KPIリスクヒートマップ",
    tags: ["早期警告", "異常検知", "集中リスク", "財務リスク"],
    accent: "#a14d45",
    chart: "heatmap"
  },
  {
    id: "story",
    name: "経営ストーリー・AI活用",
    description: "数値差異を経営ストーリーに変換し、会議資料・要約・課題整理を高速化します。",
    question: "数字の変化を、役員が判断できる言葉に変換できていますか。",
    promise: "差異理由、論点、打ち手を自動で下書きし、会議準備を短縮する。",
    poc: "月次業績コメント自動生成",
    tags: ["AI要約", "月次コメント", "経営資料", "論点整理"],
    accent: "#6b5d88",
    chart: "network"
  }
];

const analyticsItems: AnalyticsItemDraft[] = [
  {
    id: "kpi-command-center",
    category: "performance",
    title: "経営KPI統合ダッシュボード",
    question: "売上・利益・キャッシュ・主要KPIの異常を、会議前に一目で把握し、責任部門と初動の打ち手まで確認できていますか。",
    data: "会計、売上、予算、キャッシュ、主要KPI、閾値、担当部門",
    decision: "経営会議の論点設定、担当確認、初動アクションの指示",
    horizon: "月次",
    chart: "scorecard"
  },
  {
    id: "pl-budget-variance",
    category: "performance",
    title: "P&L・予算実績差異分析",
    question: "売上・粗利・営業利益・費用の差異を、期間・部門・科目別に分解し、発生要因まで説明できていますか。",
    data: "月次P&L、予算、前年、部門、事業、勘定科目",
    decision: "予算修正、責任部門へのアクション、利益改善テーマの特定",
    horizon: "月次",
    chart: "line"
  },
  {
    id: "management-scorecard",
    category: "performance",
    title: "経営スコアカード",
    question: "財務・顧客・業務・人材の観点から経営状態を俯瞰し、優先課題をバランスよく評価できていますか。",
    data: "財務KPI、顧客KPI、業務KPI、人材KPI、目標値、前月値",
    decision: "経営状態の総合評価、重点KPIの見直し、会議アジェンダ設定",
    horizon: "月次",
    chart: "scorecard"
  },
  {
    id: "sales-driver-bridge",
    category: "growth",
    title: "売上増減要因分析",
    question: "売上の増減要因を、顧客・商品・単価・数量・解約に分解し、主因を特定できていますか。",
    data: "売上、顧客、商品、単価、数量、新規、既存、解約、粗利",
    decision: "営業重点領域、価格施策、解約抑止、商品別成長施策の決定",
    horizon: "月次",
    chart: "bridge"
  },
  {
    id: "product-customer-growth",
    category: "growth",
    title: "商品・顧客別成長性分析",
    question: "伸びている商品・顧客と停滞している商品・顧客を把握し、成長余地と依存リスクを見極められていますか。",
    data: "商品別売上、顧客別売上、成長率、粗利率、取引継続率、顧客属性",
    decision: "伸ばす商品・顧客の選定、依存リスク対応、営業リソース配分",
    horizon: "月次・四半期",
    chart: "matrix"
  },
  {
    id: "pipeline-conversion-forecast",
    category: "growth",
    title: "パイプライン・受注予測分析",
    question: "現在の商談パイプラインと受注率から、四半期末の売上着地を精度よく見込めていますか。",
    data: "商談、ステージ、確度、受注予定日、受注率、営業担当、売上計画",
    decision: "営業支援、案件優先順位、売上着地見込、追加施策の判断",
    horizon: "週次・月次",
    chart: "forecast"
  },
  {
    id: "margin-driver-analysis",
    category: "profitability",
    title: "粗利・利益率ドライバー分析",
    question: "粗利率や利益率の変動要因を、価格・原価・構成比・為替に分解して説明できていますか。",
    data: "売上、単価、数量、原価、粗利率、商品構成、為替レート",
    decision: "価格改定、原価対策、商品構成見直し、調達交渉",
    horizon: "月次",
    chart: "waterfall"
  },
  {
    id: "segment-profitability",
    category: "profitability",
    title: "商品・顧客・事業別採算分析",
    question: "売上規模と利益貢献を商品・顧客・事業別に比較し、伸ばす対象と見直す対象を判断できていますか。",
    data: "商品別売上、顧客別売上、事業別P&L、対応コスト、配賦ルール、粗利",
    decision: "注力・改善・撤退対象の選定、顧客対応方針、事業ポートフォリオ見直し",
    horizon: "月次・四半期",
    chart: "matrix"
  },
  {
    id: "profit-bridge",
    category: "profitability",
    title: "利益ブリッジ分析",
    question: "前年差・予算差の利益変動を、売上・粗利率・費用・為替の要因に分解できていますか。",
    data: "P&L、予算、前年、売上、粗利率、費用、為替、事業別実績",
    decision: "利益改善テーマの優先順位、経営報告、追加対策の判断",
    horizon: "月次",
    chart: "waterfall"
  },
  {
    id: "cost-structure-map",
    category: "cost",
    title: "費用構造マップ",
    question: "費用の大きな塊と増加している科目・部門を把握し、経営として優先順位を付けられていますか。",
    data: "費用、部門、勘定科目、予算、前年、発注、支払、施策コード",
    decision: "費用統制、削減テーマの選定、部門別レビュー対象の決定",
    horizon: "月次",
    chart: "treemap"
  },
  {
    id: "cost-driver-breakeven",
    category: "cost",
    title: "固定費・変動費・コストドライバー分析",
    question: "売上変動に対する費用の連動度と、損益分岐点を動かすドライバーを把握できていますか。",
    data: "売上、費用、固定費、変動費、人員数、販売数量、拠点数、稼働率",
    decision: "損益分岐点管理、生産性改善、費用計画、固定費の見直し",
    horizon: "月次・四半期",
    chart: "stacked"
  },
  {
    id: "savings-opportunity",
    category: "cost",
    title: "コスト削減余地分析",
    question: "ベンチマークや同規模部門と比較し、削減余地が大きく実行可能な領域を特定できていますか。",
    data: "費用、部門、人員、購買単価、拠点、ベンチマーク、削減施策",
    decision: "削減優先順位、施策化可否、削減目標、実行責任者の設定",
    horizon: "四半期",
    chart: "bar"
  },
  {
    id: "cashflow-forecast",
    category: "cash",
    title: "キャッシュフロー予測",
    question: "今後13週から12か月の資金残高を見通し、不足または余剰が発生する時点を把握できていますか。",
    data: "入出金予定、売掛金、買掛金、借入、返済、投資、資金残高",
    decision: "借入枠確保、支払調整、投資実行可否、資金繰り対策",
    horizon: "週次・月次",
    chart: "forecast"
  },
  {
    id: "working-capital-cycle",
    category: "cash",
    title: "運転資本・回収在庫分析",
    question: "売掛金・在庫・買掛金のどこで資金が滞留し、資金繰りを悪化させているか把握できていますか。",
    data: "売掛金、在庫、買掛金、請求、入金、顧客、品目、滞留日数",
    decision: "回収条件見直し、在庫削減、購買条件交渉、運転資本改善",
    horizon: "週次・月次",
    chart: "stacked"
  },
  {
    id: "liquidity-stress",
    category: "cash",
    title: "資金ショートリスク分析",
    question: "売上未達・回収遅延・支払増加が同時に起きた場合の資金耐性を確認できていますか。",
    data: "資金繰り、シナリオ、入出金、回収条件、支払条件、借入枠",
    decision: "資金安全余力、借入枠、投資延期、支払条件変更の判断",
    horizon: "週次・月次",
    chart: "scenario"
  },
  {
    id: "rolling-landing-forecast",
    category: "forecast",
    title: "ローリング・着地見込分析",
    question: "毎月の実績を反映し、今期着地と今後12か月の売上・利益見通しを更新できていますか。",
    data: "実績、予算、見込、残月予測、主要ドライバー、費用見込",
    decision: "年度着地管理、経営資源の再配分、追加施策、業績説明",
    horizon: "月次",
    chart: "forecast"
  },
  {
    id: "budget-scenario",
    category: "forecast",
    title: "予算シナリオ比較",
    question: "保守・標準・成長ケースごとに、売上・利益・必要投資の変化を比較できていますか。",
    data: "予算案、ドライバー、シナリオ前提、P&L、キャッシュ、投資計画",
    decision: "予算承認、目標設定、投資判断、リスク許容度の確認",
    horizon: "年次・四半期",
    chart: "scenario"
  },
  {
    id: "forecast-quality-control",
    category: "forecast",
    title: "予測精度・予算消化分析",
    question: "予測精度や予算消化に問題がある部門・商品・月を特定し、見通しの信頼性を改善できていますか。",
    data: "予測、実績、部門、商品、月、予算、発注、残高、差異理由",
    decision: "予測プロセス改善、予算移管、支出統制、部門レビュー",
    horizon: "月次",
    chart: "heatmap"
  },
  {
    id: "sales-sensitivity",
    category: "scenario",
    title: "売上・需要感応度分析",
    question: "単価・数量・受注率のわずかな変化が、売上と利益に与える影響を把握できていますか。",
    data: "単価、数量、受注率、需要、売上、粗利、営業利益",
    decision: "価格施策、営業施策、需要変動への対応、目標修正",
    horizon: "随時",
    chart: "matrix"
  },
  {
    id: "input-cost-sensitivity",
    category: "scenario",
    title: "為替・原材料・人件費影響分析",
    question: "為替・原材料価格・人件費の変動が、売上・原価・利益計画に与える影響を試算できていますか。",
    data: "為替レート、通貨別売上、原材料単価、使用量、人員、給与、P&L",
    decision: "価格転嫁、ヘッジ方針、調達交渉、人員計画、生産性施策",
    horizon: "月次・随時",
    chart: "waterfall"
  },
  {
    id: "best-base-worst",
    category: "scenario",
    title: "ベスト・ベース・ワーストケース分析",
    question: "外部環境が変化した場合の売上・利益・資金の下振れ余地を、ケース別に把握できていますか。",
    data: "シナリオ前提、P&L、キャッシュ、主要KPI、外部環境、需要見通し",
    decision: "リスク対応、投資実行可否、目標修正、追加打ち手の判断",
    horizon: "四半期・随時",
    chart: "scenario"
  },
  {
    id: "investment-capex-portfolio",
    category: "allocation",
    title: "投資・CapExポートフォリオ分析",
    question: "投資案件と設備投資の優先順位を、回収期間・成長性・効率化・リスク対応の観点で評価できていますか。",
    data: "投資案件、CapEx、投資額、回収期間、NPV、効果見込、リスク、目的",
    decision: "投資承認、案件優先順位、予算配分、延期・中止判断",
    horizon: "四半期・年次",
    chart: "scatter"
  },
  {
    id: "resource-roi-allocation",
    category: "allocation",
    title: "人員・マーケティングROI分析",
    question: "人員とマーケティング投資を、成長領域・高収益領域・商談創出に見合う形で配分できていますか。",
    data: "人員、部門、売上、利益、業務負荷、施策費、リード、商談、受注",
    decision: "人員再配置、採用計画、施策継続・停止、営業投資の見直し",
    horizon: "月次・四半期",
    chart: "bubble"
  },
  {
    id: "capital-allocation",
    category: "allocation",
    title: "事業別資本配分分析",
    question: "資本を、成長性・収益性・リスクに見合う事業へ配分できていますか。",
    data: "事業別投下資本、利益、成長率、リスク、キャッシュ、投資計画",
    decision: "資本配分、事業強化・縮小、投資枠、経営資源の再配分",
    horizon: "四半期・年次",
    chart: "matrix"
  },
  {
    id: "revenue-early-warning",
    category: "risk",
    title: "収益悪化予兆分析",
    question: "売上・粗利・受注・解約の変化から、収益悪化の兆候を早期に捉えられていますか。",
    data: "売上、粗利、受注、解約、顧客行動、商談、更新状況、前月差",
    decision: "早期対策、重点顧客フォロー、売上見込修正、営業支援",
    horizon: "週次・月次",
    chart: "heatmap"
  },
  {
    id: "spend-anomaly-overrun",
    category: "risk",
    title: "コスト異常・予算超過リスク分析",
    question: "通常とは異なる費用増加や支出ペースから、期末の予算超過リスクを早期に検知できていますか。",
    data: "費用、発注、支払、部門、予算、残高、過去実績、支出ペース",
    decision: "支出確認、不正・ミスの早期発見、予算統制、承認強化",
    horizon: "日次・週次",
    chart: "bar"
  },
  {
    id: "exposure-risk-heatmap",
    category: "risk",
    title: "顧客集中・財務KPIリスクヒートマップ",
    question: "顧客依存、売上成長率、利益率、回収、在庫、費用のどこにリスクが集中しているか把握できていますか。",
    data: "顧客別売上、顧客別利益、財務KPI、閾値、部門、事業、期間",
    decision: "リスク管理、経営会議アジェンダ、重点モニタリング、対策優先順位",
    horizon: "月次",
    chart: "heatmap"
  },
  {
    id: "performance-commentary-ai",
    category: "story",
    title: "月次業績・差異コメント自動生成",
    question: "月次実績や予算差異・前年差異の主要因を、数字と文章で一貫して説明できていますか。",
    data: "P&L、予算、前年、主要KPI、差異理由、部門コメント",
    decision: "月次報告、役員説明、資料作成短縮、説明責任の明確化",
    horizon: "月次",
    chart: "narrative"
  },
  {
    id: "executive-summary-ai",
    category: "story",
    title: "会議用エグゼクティブサマリー",
    question: "経営会議前に、重要論点・リスク・意思決定事項を1ページで提示できていますか。",
    data: "KPI、差異、コメント、リスク、施策、意思決定事項",
    decision: "会議アジェンダ、意思決定準備、役員向け要約、論点整理",
    horizon: "月次・週次",
    chart: "scorecard"
  },
  {
    id: "initiative-issue-map",
    category: "story",
    title: "施策インパクト・経営課題マップ",
    question: "実行中の施策、財務数値、現場コメント、外部環境から重要な経営課題を構造化できていますか。",
    data: "施策、効果見込、実績、KPI、現場コメント、顧客声、外部環境",
    decision: "施策継続・停止、追加投資、重要課題設定、打ち手候補の整理",
    horizon: "月次・四半期",
    chart: "network"
  }
];

export const analytics: AnalyticsItem[] = analyticsItems.map((item) => ({
  ...item,
  capability: item.question
}));

export const questionnaire: QuestionnaireItem[] = [
  {
    q: "経営会議で毎月説明に時間がかかる数字は何ですか。",
    options: ["売上", "粗利", "営業利益", "費用", "キャッシュ", "在庫", "分からない"]
  },
  {
    q: "原因が分からず、議論が止まりやすいテーマは何ですか。",
    options: ["予算差異", "利益率低下", "売上未達", "コスト増", "回収遅延", "予測外れ", "分からない"]
  },
  {
    q: "予測できると意思決定が早くなるものは何ですか。",
    options: ["売上着地", "利益着地", "資金残高", "需要", "解約", "費用超過", "分からない"]
  },
  {
    q: "経営として分析したい軸は何ですか。",
    options: ["事業", "部門", "商品", "顧客", "地域", "担当者", "分からない"]
  },
  {
    q: "最も早く改善したい会議資料は何ですか。",
    options: ["月次業績", "予算レビュー", "投資審査", "資金繰り", "取締役会", "部門会議", "分からない"]
  },
  {
    q: "現在のデータで不足していると感じるものは何ですか。",
    options: ["顧客別利益", "商品別原価", "商談情報", "在庫明細", "人員情報", "施策効果", "分からない"]
  },
  {
    q: "分析結果を見て最終判断する人は誰ですか。",
    options: ["CEO", "CFO", "事業責任者", "営業責任者", "部門長", "経営会議", "分からない"]
  },
  {
    q: "分析があると実行しやすい打ち手は何ですか。",
    options: ["価格改定", "費用削減", "投資判断", "人員再配置", "在庫削減", "営業支援", "分からない"]
  }
];
