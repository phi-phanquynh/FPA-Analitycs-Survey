import type {
  AnswerOption,
  DiagnosticQuestion,
  DiagnosticRound,
  ManagementDomain,
  ManagementDomainId,
  RoundLevelKey
} from "./types";

export const domains: ManagementDomain[] = [
  {
    id: "data",
    name: "データ整備・接続",
    shortName: "データ",
    description: "経営会議で使う数字を、同じ定義と流れで扱える状態にする領域です。",
    accent: "#2f766d"
  },
  {
    id: "planning",
    name: "計画・予測プロセス",
    shortName: "計画",
    description: "予算、見込、着地予測を更新し、次の判断につなげる領域です。",
    accent: "#4e6e94"
  },
  {
    id: "analysis",
    name: "分析・可視化",
    shortName: "分析",
    description: "変化や差の理由を、数字で分けて見えるようにする領域です。",
    accent: "#b85c38"
  },
  {
    id: "decision",
    name: "会議・意思決定",
    shortName: "会議",
    description: "数字探しではなく、選択と判断に時間を使える状態にする領域です。",
    accent: "#c7922d"
  },
  {
    id: "action",
    name: "アクション管理・改善",
    shortName: "実行",
    description: "会議で決めたことを追い、次の打ち手へ反映する領域です。",
    accent: "#547d4f"
  }
];

export const domainById = Object.fromEntries(domains.map((domain) => [domain.id, domain])) as Record<ManagementDomainId, ManagementDomain>;

export const diagnosticRounds: DiagnosticRound[] = [
  {
    key: "basic",
    label: "基本",
    headline: "まず、経営管理の土台を確認します",
    summary: "同じ数字を集め、差を説明し、会議で使える状態になっているかを見ます。"
  },
  {
    key: "applied",
    label: "応用",
    headline: "次に、数字を判断へ使えているかを確認します",
    summary: "現場の動き、見通し、要因分解、打ち手の比較まで進んでいるかを見ます。"
  },
  {
    key: "ai",
    label: "AI",
    headline: "最後に、AIや自動化に任せられる範囲を確認します",
    summary: "AIがデータを読み、予測し、異常や論点、次の動きを示せるかを見ます。"
  }
];

export const roundByKey = Object.fromEntries(diagnosticRounds.map((round) => [round.key, round])) as Record<RoundLevelKey, DiagnosticRound>;

export const answerOptions: AnswerOption[] = [
  {
    value: "done",
    label: "十分できている",
    score: 2,
    description: "会議や判断にそのまま使えている"
  },
  {
    value: "partial",
    label: "一部できている",
    score: 1,
    description: "使えているが、手直しや確認が必要"
  },
  {
    value: "none",
    label: "まだできていない",
    score: 0,
    description: "仕組みや運用がまだない"
  }
];

export const answerOptionByValue = Object.fromEntries(answerOptions.map((option) => [option.value, option])) as Record<
  AnswerOption["value"],
  AnswerOption
>;

export const diagnosticQuestions: DiagnosticQuestion[] = [
  {
    id: "q1-basic-data",
    order: 1,
    round: "basic",
    domainId: "data",
    question: "経営会議で使う数字の定義が定まっており、集計担当者が違っても同じ結果になるようにできていますか？",
    examples: "売上、利益、費用、人員数、主要KPIなど",
    illustrationKey: "q1-consolidation",
    illustrationAlt: "複数の表が一つの集計表に揃っていくイラスト"
  },
  {
    id: "q2-basic-planning",
    order: 2,
    round: "basic",
    domainId: "planning",
    question: "月末に実績を見て、計画との差が大きいところを見つけ、なぜずれたのかを説明できていますか？",
    examples: "売上差、利益差、費用超過、人数計画との差など",
    illustrationKey: "q2-variance",
    illustrationAlt: "ずれた箇所に丸印をつけて原因を見るイラスト"
  },
  {
    id: "q3-basic-analysis",
    order: 3,
    round: "basic",
    domainId: "analysis",
    question: "業績が良い部門と悪い部門をすぐに見分け、どこを深掘りすべきか判断できていますか？",
    examples: "部門別売上、商品別利益、顧客別成長率など",
    illustrationKey: "q3-domain-compare",
    illustrationAlt: "部門別グラフで良し悪しを見分けるイラスト"
  },
  {
    id: "q4-basic-decision",
    order: 4,
    round: "basic",
    domainId: "decision",
    question: "会議が始まる前に必要な数字が揃い、会議は単なる数字の確認ではなく判断に時間を使えていますか？",
    examples: "実績、最新見込、予算差、重要KPIなど",
    illustrationKey: "q4-meeting-ready",
    illustrationAlt: "会議前に資料と数字が揃っているイラスト"
  },
  {
    id: "q5-basic-action",
    order: 5,
    round: "basic",
    domainId: "action",
    question: "会議で決めたことをその場で記録し、次回までに誰が何を進めるか追えるようになっていますか？",
    examples: "売上目標、削減額、改善率、進捗率など",
    illustrationKey: "q5-task-tracking",
    illustrationAlt: "タスクボードで担当と期限と進捗を追うイラスト"
  },
  {
    id: "q6-applied-data",
    order: 6,
    round: "applied",
    domainId: "data",
    question: "数字が動いたときに、どの現場の動きが影響したのかまでたどれるようになっていますか？",
    examples: "売上減少、粗利率悪化、在庫増加、人件費増加など",
    illustrationKey: "q6-field-link",
    illustrationAlt: "売上グラフから現場データへ線がつながるイラスト"
  },
  {
    id: "q7-applied-planning",
    order: 7,
    round: "applied",
    domainId: "planning",
    question: "状況が変わったときに、見通しをすぐに作り直し、今のままだと着地がどうなるか予測できていますか？",
    examples: "受注額、販売数量、採用人数、原価変動など",
    illustrationKey: "q7-forecast-update",
    illustrationAlt: "条件変更で着地点の線が更新されるイラスト"
  },
  {
    id: "q8-applied-analysis",
    order: 8,
    round: "applied",
    domainId: "analysis",
    question: "利益が増えた、または減った理由を、感覚ではなく数字を使って説明できていますか？",
    examples: "価格、数量、原価、固定費、顧客構成など",
    illustrationKey: "q8-profit-bridge",
    illustrationAlt: "利益増減が要因別に分かれるイラスト"
  },
  {
    id: "q9-applied-decision",
    order: 9,
    round: "applied",
    domainId: "decision",
    question: "会議では一つの案だけでなく、複数の打ち手を比べて、どれを選ぶべきか判断できていますか？",
    examples: "利益、キャッシュ、売上成長率、投資額など",
    illustrationKey: "q9-option-compare",
    illustrationAlt: "複数案を並べて比較するイラスト"
  },
  {
    id: "q10-applied-action",
    order: 10,
    round: "applied",
    domainId: "action",
    question: "実行した施策について、やりっぱなしにせず、結果を反映して次の打ち手を変えられていますか？",
    examples: "売上増加額、費用削減額、利益改善額、KPI変化など",
    illustrationKey: "q10-action-loop",
    illustrationAlt: "結果を見て次の打ち手を変えるイラスト"
  },
  {
    id: "q11-ai-data",
    order: 11,
    round: "ai",
    domainId: "data",
    question: "AIに数字を読ませたとき、意味の違う項目を取り違えないように、データの定義と整備ができていますか？",
    examples: "売上、粗利、費用、人員数、KPIなど",
    illustrationKey: "q11-ai-data",
    illustrationAlt: "乱れた表がAI向けに整理されるイラスト"
  },
  {
    id: "q12-ai-planning",
    order: 12,
    round: "ai",
    domainId: "planning",
    question: "見通しを作るときに、AIが過去の動きや最近の変化を踏まえて、予測のたたき台を出せていますか？",
    examples: "過去売上、受注残、販売数量、季節変動、単価変化など",
    illustrationKey: "q12-ai-forecast",
    illustrationAlt: "AIが予測線のたたき台を出すイラスト"
  },
  {
    id: "q13-ai-analysis",
    order: 13,
    round: "ai",
    domainId: "analysis",
    question: "人がレポートを見る前に、AIが大きな変化や気になる数字を見つけ、確認すべき点を事前に示せていますか？",
    examples: "売上急減、粗利率低下、費用急増、KPI悪化など",
    illustrationKey: "q13-ai-alert",
    illustrationAlt: "AIが異常な数字をハイライトするイラスト"
  },
  {
    id: "q14-ai-decision",
    order: 14,
    round: "ai",
    domainId: "decision",
    question: "会議の準備で、AIが数字の変化を網羅的に読み取り、議論すべき論点を下書きできていますか？",
    examples: "実績と見込の差、利益悪化要因、悪化KPI、判断が必要な項目など",
    illustrationKey: "q14-ai-agenda",
    illustrationAlt: "AIが会議論点の下書きを作るイラスト"
  },
  {
    id: "q15-ai-action",
    order: 15,
    round: "ai",
    domainId: "action",
    question: "施策を進めた後に、AIがうまくいっているものと遅れているものを見分け、次に取るべき動きを提案できていますか？",
    examples: "目標との差、進捗率、効果額、遅れている施策など",
    illustrationKey: "q15-ai-next-action",
    illustrationAlt: "AIが次の優先アクションを示すイラスト"
  }
];

export const questionsByRound = diagnosticRounds.map((round) => diagnosticQuestions.filter((question) => question.round === round.key));

type ActionCopy = {
  title: string;
  action: string;
  reason: string;
};

export const actionCopy: Record<ManagementDomainId, Record<RoundLevelKey | "maintain", ActionCopy>> = {
  data: {
    basic: {
      title: "経営会議で使う数字の定義を揃える",
      action: "売上、利益、費用、人員数、主要KPIについて、定義、集計元、更新日、確認担当を1枚にまとめてください。",
      reason: "基本の数字が揃わないと、応用分析やAI化より先に、会議中の確認作業が増えます。"
    },
    applied: {
      title: "数字と現場の動きをつなげる",
      action: "会計、販売、在庫、人員などを共通の部門や商品単位でつなぎ、数字が動いた理由を追える形にしてください。",
      reason: "数字の変化を現場の動きまでたどれると、説明で終わらず改善テーマを選べます。"
    },
    ai: {
      title: "AIが読めるデータの約束を整える",
      action: "AIに参照させる項目名、意味、更新頻度、欠損時の扱いを決め、誤読しやすい項目から整えてください。",
      reason: "AI活用は、まずAIが数字を取り違えない状態を作ることが前提です。"
    },
    maintain: {
      title: "整った数字を他領域へ広げる",
      action: "すでに揃っている数字の定義を、予測、会議資料、施策管理にも同じまま使えるように広げてください。",
      reason: "データの土台があるため、次は横展開で経営管理全体の速度を上げられます。"
    }
  },
  planning: {
    basic: {
      title: "実績と計画差の説明サイクルを固定する",
      action: "月次で差が大きい数字を3つに絞り、理由、影響、次の確認先を同じ型で残してください。",
      reason: "差の理由を毎月説明できる状態が、見通しを作る前の土台になります。"
    },
    applied: {
      title: "見通しを作り直す入力を決める",
      action: "受注額、販売数量、採用人数、原価変動など、着地を動かす数字を決め、変化があったら見込を更新する流れを作ってください。",
      reason: "最新状況を短時間で織り込めると、会議前に判断の選択肢を準備できます。"
    },
    ai: {
      title: "AI予測のたたき台を作る範囲を選ぶ",
      action: "売上や費用など1つの見通しテーマを選び、過去実績と最近の変化からAIが予測案を出す試行を始めてください。",
      reason: "AI予測は全社一括ではなく、説明しやすい一領域から精度と使い方を確認するのが現実的です。"
    },
    maintain: {
      title: "見通し更新を会議前の標準作業にする",
      action: "予算、最新見込、着地予測の更新タイミングを会議日程と連動させ、差が大きい項目を自動で拾う運用にしてください。",
      reason: "計画運用が整っているため、判断前の準備時間をさらに短くできます。"
    }
  },
  analysis: {
    basic: {
      title: "良いところと悪いところを同じ画面で見る",
      action: "部門別、商品別、顧客別など、まず1つの切り口で業績の良し悪しを一覧できる表を作ってください。",
      reason: "深掘り先を選べないと、分析が広がりすぎて会議の論点がぼやけます。"
    },
    applied: {
      title: "利益の増減を要因に分ける",
      action: "利益が動いた理由を、価格、数量、原価、固定費、顧客構成のような要因に分けて説明してください。",
      reason: "感覚ではなく数字を分けて説明できると、打ち手の優先順位が決めやすくなります。"
    },
    ai: {
      title: "AIに気になる数字を先に拾わせる",
      action: "売上急減、粗利率低下、費用急増、KPI悪化など、確認したい変化の条件を決め、AIや自動ルールで検知してください。",
      reason: "AIは最初から原因を断定するより、見るべき箇所を早く示す使い方が効果を出しやすいです。"
    },
    maintain: {
      title: "分析結果を会議の論点に変える",
      action: "すでに見えている分析結果を、原因、影響、選択肢の3点で会議資料に変換する型を作ってください。",
      reason: "分析の土台があるため、次は意思決定に使う表現へ寄せられます。"
    }
  },
  decision: {
    basic: {
      title: "会議前に数字探しを終わらせる",
      action: "実績、最新見込、予算差、重要KPIを会議前に揃え、確認が必要な数字だけを事前に洗い出してください。",
      reason: "会議中に数字を探す時間が残ると、判断より確認に時間を使ってしまいます。"
    },
    applied: {
      title: "打ち手を比較して選ぶ形にする",
      action: "複数の案を並べ、利益、キャッシュ、成長率、投資額への影響を比べてから選ぶ会議資料に変えてください。",
      reason: "一案の報告だけでは、経営会議が承認の場になりやすく、判断の質が上がりません。"
    },
    ai: {
      title: "AIに会議論点の下書きを任せる",
      action: "実績と見込の差、悪化しているKPI、判断が必要な項目をAIが下書きする対象にしてください。",
      reason: "会議準備の下書きをAIに任せると、人は論点の確認と判断に時間を使えます。"
    },
    maintain: {
      title: "判断後の記録まで会議設計に入れる",
      action: "会議で選んだ案、判断理由、次回確認する数字を同じ場所に残す運用へ広げてください。",
      reason: "意思決定の型があるため、次は判断の再現性を高められます。"
    }
  },
  action: {
    basic: {
      title: "会議で決めたことを追える形にする",
      action: "施策ごとに担当者、期限、次回確認する数字を決め、次の会議で未完了理由まで確認してください。",
      reason: "決定事項を追えないと、会議で決めても実行状況が見えなくなります。"
    },
    applied: {
      title: "施策の結果を次の打ち手へ戻す",
      action: "売上増加額、費用削減額、利益改善額、KPI変化を見て、続ける施策と変える施策を分けてください。",
      reason: "結果を見て次を変えられると、施策管理が報告ではなく改善の仕組みになります。"
    },
    ai: {
      title: "AIに次の優先アクションを提案させる",
      action: "目標との差、進捗率、効果額、遅れている施策を使い、AIが次に優先すべき候補を出す流れを作ってください。",
      reason: "AIは施策の実行状況を見比べる領域で、優先順位付けの補助に使いやすいです。"
    },
    maintain: {
      title: "実行管理を横展開する",
      action: "うまく回っている施策管理の型を、他部門や他テーマにも同じ形式で広げてください。",
      reason: "実行管理が整っているため、全社で同じ粒度の振り返りができます。"
    }
  }
};
