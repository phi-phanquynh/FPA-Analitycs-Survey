export function escapeHtml(value: unknown): string {
      return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    function seedFrom(value: string): number {
      return Array.from(value).reduce((sum, char) => sum + char.charCodeAt(0), 0);
    }

    function valuesFor(seed: number, count: number, min = 18, max = 92): number[] {
      const values: number[] = [];
      let current = seed % 97;
      for (let i = 0; i < count; i += 1) {
        current = (current * 37 + 23 + i * 11) % 101;
        values.push(min + (current % (max - min)));
      }
      return values;
    }

    export function chartSvg(type: string, title: string, accent = "#2f766d", size: "small" | "large" = "small"): string {
      const seed = seedFrom(title);
      const values = valuesFor(seed, 8);
      const width = size === "large" ? 760 : 360;
      const height = size === "large" ? 280 : 190;
      const pad = size === "large" ? 40 : 24;
      const chartWidth = width - pad * 2;
      const chartHeight = height - pad * 2;
      const grid = `
        <rect x="0" y="0" width="${width}" height="${height}" fill="#f8faf7"/>
        <g stroke="#dfe6de" stroke-width="1">
          <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${height - pad}"/>
          <line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}"/>
          <line x1="${pad}" y1="${height - pad - chartHeight / 3}" x2="${width - pad}" y2="${height - pad - chartHeight / 3}"/>
          <line x1="${pad}" y1="${height - pad - chartHeight * 2 / 3}" x2="${width - pad}" y2="${height - pad - chartHeight * 2 / 3}"/>
        </g>`;

      if (type === "scorecard") {
        const tileGap = size === "large" ? 14 : 10;
        const cols = 2;
        const rows = 2;
        const tileW = (chartWidth - tileGap) / cols;
        const tileH = (chartHeight - tileGap) / rows;
        const labels = ["売上", "営業利益", "Cash", "KPI"];
        const tiles = labels.map((label, index) => {
          const x = pad + (index % cols) * (tileW + tileGap);
          const y = pad + Math.floor(index / cols) * (tileH + tileGap);
          const score = values[index] + 8;
          const fill = index === 0 ? accent : index === 1 ? "#c7922d" : index === 2 ? "#4e6e94" : "#547d4f";
          const sparkX = x + Math.max(size === "large" ? 118 : 90, tileW * 0.42);
          const sparkW = Math.max(34, tileW - (sparkX - x) - 16);
          const sparkBase = y + tileH * 0.66;
          const sparkRange = tileH * 0.22;
          const spark = valuesFor(seed + index * 19, 5, 30, 84).map((value, sparkIndex) => {
            const sx = sparkX + (sparkW / 4) * sparkIndex;
            const sy = sparkBase - (value / 100) * sparkRange;
            return `${sx},${sy}`;
          }).join(" ");
          return `
            <rect x="${x}" y="${y}" width="${tileW}" height="${tileH}" rx="8" fill="#ffffff" stroke="#dfe6de"/>
            <rect x="${x}" y="${y}" width="7" height="${tileH}" rx="4" fill="${fill}"/>
            <text x="${x + 18}" y="${y + 25}" fill="#687078" font-size="${size === "large" ? 15 : 12}" font-weight="700">${label}</text>
            <text x="${x + 18}" y="${y + tileH - 24}" fill="#171a1c" font-size="${size === "large" ? 28 : 22}" font-weight="800">${score}</text>
            <polyline points="${spark}" fill="none" stroke="${fill}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
        }).join("");
        return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(title)}"><rect x="0" y="0" width="${width}" height="${height}" fill="#f8faf7"/>${tiles}</svg>`;
      }

      if (type === "line" || type === "forecast") {
        const points = values.map((value, index) => {
          const x = pad + (chartWidth / (values.length - 1)) * index;
          const y = height - pad - (value / 100) * chartHeight;
          return `${x},${y}`;
        }).join(" ");
        const forecastLine = type === "forecast"
          ? `<path d="M ${pad + chartWidth * 0.64} ${height - pad - chartHeight * 0.46} C ${pad + chartWidth * 0.76} ${height - pad - chartHeight * 0.62}, ${pad + chartWidth * 0.88} ${height - pad - chartHeight * 0.38}, ${width - pad} ${height - pad - chartHeight * 0.58}" fill="none" stroke="#b85c38" stroke-width="4" stroke-dasharray="8 8"/>`
          : "";
        return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(title)}">${grid}<polyline points="${points}" fill="none" stroke="${accent}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><polygon points="${points} ${width - pad},${height - pad} ${pad},${height - pad}" fill="${accent}" opacity="0.08"/>${forecastLine}</svg>`;
      }

      if (type === "bar") {
        const bars = values.slice(0, 7).map((value, index) => {
          const gap = chartWidth / 7;
          const barWidth = gap * 0.55;
          const x = pad + gap * index + gap * 0.22;
          const barHeight = (value / 100) * chartHeight;
          const y = height - pad - barHeight;
          const fill = index % 3 === 0 ? accent : index % 3 === 1 ? "#c7922d" : "#4e6e94";
          return `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="4" fill="${fill}"/>`;
        }).join("");
        return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(title)}">${grid}${bars}</svg>`;
      }

      if (type === "waterfall" || type === "bridge") {
        let cursor = 42;
        const parts = [48, 18, -14, 22, -10, 16, 80];
        const gap = chartWidth / parts.length;
        const bars = parts.map((part, index) => {
          const isTotal = index === 0 || index === parts.length - 1;
          const start = isTotal ? 0 : cursor;
          const end = isTotal ? part : cursor + part;
          const top = Math.max(start, end);
          const bottom = Math.min(start, end);
          if (!isTotal) cursor = end;
          const barHeight = Math.max(10, ((top - bottom) / 100) * chartHeight);
          const y = height - pad - (top / 100) * chartHeight;
          const x = pad + gap * index + gap * 0.18;
          const fill = isTotal ? accent : part >= 0 ? "#547d4f" : "#b85c38";
          return `<rect x="${x}" y="${y}" width="${gap * 0.58}" height="${barHeight}" rx="4" fill="${fill}"/>`;
        }).join("");
        return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(title)}">${grid}${bars}</svg>`;
      }

      if (type === "treemap") {
        const blocks = [
          [pad, pad, chartWidth * 0.46, chartHeight * 0.62, accent],
          [pad, pad + chartHeight * 0.64, chartWidth * 0.46, chartHeight * 0.36, "#c7922d"],
          [pad + chartWidth * 0.48, pad, chartWidth * 0.28, chartHeight * 0.48, "#4e6e94"],
          [pad + chartWidth * 0.78, pad, chartWidth * 0.22, chartHeight * 0.48, "#b85c38"],
          [pad + chartWidth * 0.48, pad + chartHeight * 0.5, chartWidth * 0.52, chartHeight * 0.5, "#547d4f"]
        ].map(([x, y, w, h, fill]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${fill}" opacity="0.9"/>`).join("");
        return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(title)}"><rect x="0" y="0" width="${width}" height="${height}" fill="#f8faf7"/>${blocks}</svg>`;
      }

      if (type === "heatmap" || type === "matrix") {
        const cols = size === "large" ? 9 : 6;
        const rows = size === "large" ? 5 : 4;
        const cellGap = 6;
        const cellW = (chartWidth - cellGap * (cols - 1)) / cols;
        const cellH = (chartHeight - cellGap * (rows - 1)) / rows;
        const cells = Array.from({ length: cols * rows }, (_, index) => {
          const col = index % cols;
          const row = Math.floor(index / cols);
          const score = (seed + index * 17) % 100;
          const fill = score > 68 ? "#b85c38" : score > 42 ? "#c7922d" : score > 20 ? accent : "#dfe8df";
          const x = pad + col * (cellW + cellGap);
          const y = pad + row * (cellH + cellGap);
          return `<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" rx="5" fill="${fill}" opacity="${score > 20 ? 0.92 : 1}"/>`;
        }).join("");
        return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(title)}"><rect x="0" y="0" width="${width}" height="${height}" fill="#f8faf7"/>${cells}</svg>`;
      }

      if (type === "scatter" || type === "bubble") {
        const bubbles = valuesFor(seed, 13, 12, 88).map((value, index) => {
          const x = pad + ((value + index * 9) % 92) / 100 * chartWidth;
          const y = height - pad - ((values[(index + 2) % values.length] + index * 5) % 88) / 100 * chartHeight;
          const r = type === "bubble" ? 7 + (index % 5) * 3 : 6;
          const fill = index % 4 === 0 ? "#b85c38" : index % 4 === 1 ? accent : index % 4 === 2 ? "#4e6e94" : "#c7922d";
          return `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" opacity="0.82"/>`;
        }).join("");
        return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(title)}">${grid}${bubbles}</svg>`;
      }

      if (type === "pareto") {
        const sorted = values.slice(0, 7).sort((a, b) => b - a);
        const gap = chartWidth / sorted.length;
        let cumulative = 0;
        const total = sorted.reduce((a, b) => a + b, 0);
        const bars = sorted.map((value, index) => {
          cumulative += value;
          const x = pad + gap * index + gap * 0.22;
          const barHeight = (value / sorted[0]) * chartHeight * 0.86;
          const y = height - pad - barHeight;
          const lineX = pad + gap * index + gap * 0.5;
          const lineY = height - pad - (cumulative / total) * chartHeight;
          return {
            bar: `<rect x="${x}" y="${y}" width="${gap * 0.52}" height="${barHeight}" rx="4" fill="${index < 2 ? accent : "#c7922d"}"/>`,
            point: `${lineX},${lineY}`
          };
        });
        return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(title)}">${grid}${bars.map((b) => b.bar).join("")}<polyline points="${bars.map((b) => b.point).join(" ")}" fill="none" stroke="#b85c38" stroke-width="4" stroke-linecap="round"/></svg>`;
      }

      if (type === "funnel") {
        const stages = [0.88, 0.7, 0.52, 0.36, 0.22];
        const colors = [accent, "#4e6e94", "#c7922d", "#547d4f", "#b85c38"];
        const stageH = chartHeight / stages.length - 4;
        const shapes = stages.map((ratio, index) => {
          const w = chartWidth * ratio;
          const x = pad + (chartWidth - w) / 2;
          const y = pad + index * (stageH + 5);
          return `<rect x="${x}" y="${y}" width="${w}" height="${stageH}" rx="7" fill="${colors[index]}"/>`;
        }).join("");
        return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(title)}"><rect x="0" y="0" width="${width}" height="${height}" fill="#f8faf7"/>${shapes}</svg>`;
      }

      if (type === "gauge") {
        const cx = width / 2;
        const cy = height - pad * 0.72;
        const r = Math.min(chartWidth, chartHeight * 1.55) / 2;
        const angle = -160 + (values[0] / 100) * 140;
        const needleX = cx + Math.cos(angle * Math.PI / 180) * r * 0.74;
        const needleY = cy + Math.sin(angle * Math.PI / 180) * r * 0.74;
        return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(title)}"><rect x="0" y="0" width="${width}" height="${height}" fill="#f8faf7"/><path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}" fill="none" stroke="#dfe6de" stroke-width="22" stroke-linecap="round"/><path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r * 0.34} ${cy - r * 0.94}" fill="none" stroke="${accent}" stroke-width="22" stroke-linecap="round"/><line x1="${cx}" y1="${cy}" x2="${needleX}" y2="${needleY}" stroke="#171a1c" stroke-width="5" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="8" fill="#171a1c"/></svg>`;
      }

      if (type === "scenario") {
        const lines = [
          { color: "#547d4f", offset: 18 },
          { color: accent, offset: 34 },
          { color: "#b85c38", offset: 52 }
        ].map((line, lineIndex) => {
          const points = values.map((value, index) => {
            const x = pad + (chartWidth / (values.length - 1)) * index;
            const adjusted = Math.max(12, Math.min(92, value + line.offset - lineIndex * 22));
            const y = height - pad - (adjusted / 100) * chartHeight;
            return `${x},${y}`;
          }).join(" ");
          return `<polyline points="${points}" fill="none" stroke="${line.color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
        }).join("");
        return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(title)}">${grid}${lines}</svg>`;
      }

      if (type === "stacked") {
        const bars = values.slice(0, 5).map((value, index) => {
          const gap = chartWidth / 5;
          const x = pad + gap * index + gap * 0.2;
          const widthBar = gap * 0.56;
          const a = value * 0.42;
          const b = value * 0.31;
          const c = value * 0.22;
          const scale = chartHeight / 100;
          const base = height - pad;
          return `
            <rect x="${x}" y="${base - a * scale}" width="${widthBar}" height="${a * scale}" rx="4" fill="${accent}"/>
            <rect x="${x}" y="${base - (a + b) * scale}" width="${widthBar}" height="${b * scale}" fill="#c7922d"/>
            <rect x="${x}" y="${base - (a + b + c) * scale}" width="${widthBar}" height="${c * scale}" rx="4" fill="#b85c38"/>`;
        }).join("");
        return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(title)}">${grid}${bars}</svg>`;
      }

      if (type === "network" || type === "narrative") {
        const nodes = [
          [width * 0.28, height * 0.33, accent],
          [width * 0.55, height * 0.25, "#c7922d"],
          [width * 0.73, height * 0.48, "#4e6e94"],
          [width * 0.44, height * 0.66, "#b85c38"],
          [width * 0.2, height * 0.67, "#547d4f"]
        ];
        const edges = [[0, 1], [1, 2], [0, 3], [3, 4], [2, 3], [0, 4]].map(([a, b]) => `<line x1="${nodes[a][0]}" y1="${nodes[a][1]}" x2="${nodes[b][0]}" y2="${nodes[b][1]}" stroke="#cfd9cf" stroke-width="3"/>`).join("");
        const circles = nodes.map(([x, y, fill], index) => `<circle cx="${x}" cy="${y}" r="${index === 0 ? 24 : 18}" fill="${fill}"/><circle cx="${x}" cy="${y}" r="${index === 0 ? 33 : 26}" fill="${fill}" opacity="0.12"/>`).join("");
        const textLines = type === "narrative"
          ? `<rect x="${pad}" y="${height - pad - 24}" width="${chartWidth * 0.76}" height="8" rx="4" fill="#cfd9cf"/><rect x="${pad}" y="${height - pad - 8}" width="${chartWidth * 0.56}" height="8" rx="4" fill="#dfe6de"/>`
          : "";
        return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(title)}"><rect x="0" y="0" width="${width}" height="${height}" fill="#f8faf7"/>${edges}${circles}${textLines}</svg>`;
      }

      return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(title)}">${grid}</svg>`;
    }

export function chartName(type: string): string {
  const names: Record<string, string> = {
    scorecard: "スコアカード",
    line: "推移",
    waterfall: "ブリッジ",
    bridge: "要因分解",
    gauge: "アラート",
    matrix: "マトリクス",
    scatter: "散布図",
    bubble: "バブル",
    pareto: "パレート",
    funnel: "ファネル",
    treemap: "ツリーマップ",
    bar: "棒グラフ",
    heatmap: "ヒートマップ",
    forecast: "予測線",
    scenario: "ケース比較",
    stacked: "積上げ",
    network: "課題マップ",
    narrative: "自動要約"
  };
  return names[type] || "可視化";
}
