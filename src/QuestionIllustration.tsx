import type { ReactNode } from "react";
import type { IllustrationKey } from "./types";

type QuestionIllustrationProps = {
  kind: IllustrationKey;
  accent: string;
  alt: string;
};

function BaseSvg({ children, accent, alt }: { children: ReactNode; accent: string; alt: string }) {
  return (
    <svg className="question-illustration-svg" viewBox="0 0 360 220" role="img" aria-label={alt}>
      <title>{alt}</title>
      <rect width="360" height="220" rx="22" fill="#f8faf7" />
      <circle cx="300" cy="44" r="46" fill={accent} opacity="0.08" />
      <circle cx="54" cy="174" r="38" fill="#111719" opacity="0.04" />
      {children}
    </svg>
  );
}

function Device({ x, y, width = 118, height = 74, accent }: { x: number; y: number; width?: number; height?: number; accent: string }) {
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx="10" fill="#fff" stroke="#d7ded7" strokeWidth="3" />
      <rect x={x + 12} y={y + 16} width={width - 24} height="8" rx="4" fill={accent} opacity="0.28" />
      <rect x={x + 12} y={y + 34} width={width - 42} height="8" rx="4" fill="#dfe6de" />
      <rect x={x + 12} y={y + 52} width={width - 58} height="8" rx="4" fill="#dfe6de" />
    </g>
  );
}

function Bars({ x, y, accent, values }: { x: number; y: number; accent: string; values: number[] }) {
  return (
    <g>
      {values.map((value, index) => (
        <rect
          key={`${value}-${index}`}
          x={x + index * 22}
          y={y + (72 - value)}
          width="14"
          height={value}
          rx="4"
          fill={index % 2 === 0 ? accent : "#b85c38"}
          opacity={index % 2 === 0 ? 0.82 : 0.7}
        />
      ))}
    </g>
  );
}

function Spark({ x, y, accent }: { x: number; y: number; accent: string }) {
  return (
    <g fill={accent}>
      <path d={`M${x} ${y - 13} L${x + 5} ${y - 3} L${x + 15} ${y} L${x + 5} ${y + 4} L${x} ${y + 15} L${x - 5} ${y + 4} L${x - 16} ${y} L${x - 5} ${y - 3} Z`} opacity="0.88" />
      <circle cx={x + 24} cy={y - 18} r="4" opacity="0.55" />
      <circle cx={x - 24} cy={y + 18} r="3" opacity="0.45" />
    </g>
  );
}

export function QuestionIllustration({ kind, accent, alt }: QuestionIllustrationProps) {
  switch (kind) {
    case "q1-consolidation":
      return (
        <BaseSvg accent={accent} alt={alt}>
          <Device x={28} y={42} width={86} height={58} accent={accent} />
          <Device x={28} y={120} width={86} height={58} accent={accent} />
          <Device x={246} y={84} width={86} height={58} accent={accent} />
          <path d="M122 70 C152 70 162 96 188 96 M122 150 C154 150 163 124 188 124" fill="none" stroke={accent} strokeWidth="6" strokeLinecap="round" />
          <rect x="174" y="72" width="70" height="76" rx="12" fill="#fff" stroke={accent} strokeWidth="4" />
          <path d="M190 94 H228 M190 112 H228 M190 130 H216" stroke="#d7ded7" strokeWidth="7" strokeLinecap="round" />
        </BaseSvg>
      );
    case "q2-variance":
      return (
        <BaseSvg accent={accent} alt={alt}>
          <rect x="52" y="45" width="256" height="130" rx="14" fill="#fff" stroke="#d7ded7" strokeWidth="3" />
          <path d="M76 146 C116 120 134 132 160 94 C188 54 216 72 252 102 C270 118 286 108 296 92" fill="none" stroke={accent} strokeWidth="7" strokeLinecap="round" />
          <path d="M76 118 H296" stroke="#dfe6de" strokeWidth="3" strokeDasharray="8 8" />
          <circle cx="160" cy="94" r="18" fill="none" stroke="#b85c38" strokeWidth="6" />
          <path d="M191 74 L222 48" stroke="#b85c38" strokeWidth="5" strokeLinecap="round" />
        </BaseSvg>
      );
    case "q3-domain-compare":
      return (
        <BaseSvg accent={accent} alt={alt}>
          <rect x="52" y="54" width="256" height="118" rx="14" fill="#fff" stroke="#d7ded7" strokeWidth="3" />
          <Bars x={76} y={78} accent={accent} values={[38, 58, 28, 66, 42, 20, 60, 34]} />
          <circle cx="122" cy="98" r="17" fill={accent} opacity="0.18" />
          <path d="M113 98 L121 106 L134 88" fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="210" cy="150" r="17" fill="#b85c38" opacity="0.16" />
          <path d="M201 141 L219 159 M219 141 L201 159" stroke="#b85c38" strokeWidth="5" strokeLinecap="round" />
        </BaseSvg>
      );
    case "q4-meeting-ready":
      return (
        <BaseSvg accent={accent} alt={alt}>
          <ellipse cx="180" cy="130" rx="104" ry="42" fill="#fff" stroke="#d7ded7" strokeWidth="3" />
          <rect x="132" y="96" width="96" height="62" rx="10" fill="#f8faf7" stroke={accent} strokeWidth="4" />
          <path d="M148 116 H212 M148 132 H204 M148 148 H188" stroke="#d7ded7" strokeWidth="7" strokeLinecap="round" />
          <circle cx="84" cy="96" r="18" fill={accent} opacity="0.25" />
          <circle cx="276" cy="96" r="18" fill="#b85c38" opacity="0.22" />
          <circle cx="180" cy="58" r="18" fill="#111719" opacity="0.12" />
        </BaseSvg>
      );
    case "q5-task-tracking":
      return (
        <BaseSvg accent={accent} alt={alt}>
          <rect x="50" y="42" width="260" height="134" rx="15" fill="#fff" stroke="#d7ded7" strokeWidth="3" />
          {[0, 1, 2].map((column) => (
            <g key={column}>
              <rect x={70 + column * 78} y="66" width="56" height="18" rx="7" fill={column === 0 ? accent : "#dfe6de"} opacity={column === 0 ? 0.8 : 1} />
              <rect x={70 + column * 78} y="98" width="56" height="26" rx="7" fill="#f4f6f1" stroke="#d7ded7" strokeWidth="2" />
              <rect x={70 + column * 78} y="136" width="56" height="20" rx="7" fill="#f4f6f1" stroke="#d7ded7" strokeWidth="2" />
            </g>
          ))}
          <path d="M91 111 L99 119 L113 103" fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </BaseSvg>
      );
    case "q6-field-link":
      return (
        <BaseSvg accent={accent} alt={alt}>
          <rect x="46" y="48" width="138" height="124" rx="14" fill="#fff" stroke="#d7ded7" strokeWidth="3" />
          <path d="M66 138 C96 88 118 132 160 78" fill="none" stroke={accent} strokeWidth="7" strokeLinecap="round" />
          {[230, 280, 252].map((cx, index) => (
            <g key={cx}>
              <circle cx={cx} cy={74 + index * 42} r="20" fill="#fff" stroke={index === 1 ? "#b85c38" : accent} strokeWidth="4" />
              <circle cx={cx} cy={74 + index * 42} r="7" fill={index === 1 ? "#b85c38" : accent} opacity="0.75" />
            </g>
          ))}
          <path d="M184 108 C206 84 214 78 230 74 M184 108 C224 114 240 116 252 116 M184 108 C214 148 246 158 280 158" fill="none" stroke="#b7c2bb" strokeWidth="4" strokeLinecap="round" />
        </BaseSvg>
      );
    case "q7-forecast-update":
      return (
        <BaseSvg accent={accent} alt={alt}>
          <rect x="50" y="48" width="260" height="124" rx="14" fill="#fff" stroke="#d7ded7" strokeWidth="3" />
          <path d="M78 138 C116 126 138 110 168 104 C200 98 222 76 282 64" fill="none" stroke="#d7ded7" strokeWidth="6" strokeLinecap="round" />
          <path d="M78 148 C116 132 144 130 176 118 C214 104 232 126 282 104" fill="none" stroke={accent} strokeWidth="7" strokeLinecap="round" />
          <rect x="82" y="64" width="70" height="28" rx="8" fill={accent} opacity="0.14" />
          <path d="M118 78 H150 M140 68 L152 78 L140 88" fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </BaseSvg>
      );
    case "q8-profit-bridge":
      return (
        <BaseSvg accent={accent} alt={alt}>
          <rect x="50" y="48" width="260" height="124" rx="14" fill="#fff" stroke="#d7ded7" strokeWidth="3" />
          {[70, 112, 154, 196, 238].map((x, index) => (
            <rect key={x} x={x} y={index % 2 === 0 ? 104 : 82} width="28" height={index % 2 === 0 ? 48 : 70} rx="6" fill={index === 2 ? "#b85c38" : accent} opacity={index === 2 ? 0.7 : 0.76} />
          ))}
          <path d="M98 104 H112 M140 82 H154 M182 104 H196 M224 82 H238" stroke="#b7c2bb" strokeWidth="4" strokeLinecap="round" />
          <path d="M282 66 V154" stroke={accent} strokeWidth="5" strokeLinecap="round" />
        </BaseSvg>
      );
    case "q9-option-compare":
      return (
        <BaseSvg accent={accent} alt={alt}>
          {[58, 142, 226].map((x, index) => (
            <g key={x}>
              <rect x={x} y="58" width="70" height="104" rx="14" fill="#fff" stroke={index === 1 ? accent : "#d7ded7"} strokeWidth={index === 1 ? 5 : 3} />
              <circle cx={x + 35} cy="86" r="13" fill={index === 1 ? accent : "#dfe6de"} opacity="0.8" />
              <path d={`M${x + 18} 118 H${x + 52} M${x + 18} 138 H${x + 44}`} stroke="#d7ded7" strokeWidth="6" strokeLinecap="round" />
            </g>
          ))}
          <path d="M167 86 L176 96 L194 76" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </BaseSvg>
      );
    case "q10-action-loop":
      return (
        <BaseSvg accent={accent} alt={alt}>
          <rect x="70" y="52" width="92" height="74" rx="13" fill="#fff" stroke="#d7ded7" strokeWidth="3" />
          <rect x="198" y="94" width="92" height="74" rx="13" fill="#fff" stroke="#d7ded7" strokeWidth="3" />
          <path d="M92 96 C126 58 188 48 228 78" fill="none" stroke={accent} strokeWidth="7" strokeLinecap="round" />
          <path d="M228 78 L210 76 L220 62" fill="none" stroke={accent} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M268 128 C232 170 164 176 120 144" fill="none" stroke="#b85c38" strokeWidth="7" strokeLinecap="round" />
          <path d="M120 144 L138 146 L128 160" fill="none" stroke="#b85c38" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <Bars x={88} y={74} accent={accent} values={[24, 40, 30]} />
          <Bars x={216} y={116} accent={accent} values={[30, 26, 48]} />
        </BaseSvg>
      );
    case "q11-ai-data":
      return (
        <BaseSvg accent={accent} alt={alt}>
          <rect x="48" y="54" width="104" height="112" rx="14" fill="#fff" stroke="#d7ded7" strokeWidth="3" />
          <path d="M70 82 H126 M78 108 H118 M66 136 H132" stroke="#b85c38" strokeWidth="7" strokeLinecap="round" opacity="0.7" />
          <path d="M160 110 H204" stroke={accent} strokeWidth="6" strokeLinecap="round" strokeDasharray="6 10" />
          <rect x="212" y="54" width="104" height="112" rx="14" fill="#fff" stroke={accent} strokeWidth="4" />
          <path d="M236 82 H292 M236 108 H292 M236 136 H292" stroke="#d7ded7" strokeWidth="7" strokeLinecap="round" />
          <Spark x={190} y={82} accent={accent} />
        </BaseSvg>
      );
    case "q12-ai-forecast":
      return (
        <BaseSvg accent={accent} alt={alt}>
          <rect x="50" y="48" width="260" height="124" rx="14" fill="#fff" stroke="#d7ded7" strokeWidth="3" />
          <path d="M74 140 C102 118 128 126 154 94 C174 70 200 84 218 104" fill="none" stroke="#b7c2bb" strokeWidth="6" strokeLinecap="round" />
          <path d="M218 104 C238 116 254 118 286 86" fill="none" stroke={accent} strokeWidth="7" strokeLinecap="round" strokeDasharray="8 9" />
          <Spark x={238} y={72} accent={accent} />
          <circle cx="218" cy="104" r="7" fill={accent} />
        </BaseSvg>
      );
    case "q13-ai-alert":
      return (
        <BaseSvg accent={accent} alt={alt}>
          <rect x="50" y="48" width="260" height="124" rx="14" fill="#fff" stroke="#d7ded7" strokeWidth="3" />
          <Bars x={74} y={76} accent={accent} values={[30, 42, 36, 76, 34, 40, 32]} />
          <circle cx="162" cy="72" r="23" fill="#b85c38" opacity="0.16" />
          <path d="M162 57 V74 M162 88 V89" stroke="#b85c38" strokeWidth="7" strokeLinecap="round" />
          <Spark x={246} y={86} accent={accent} />
        </BaseSvg>
      );
    case "q14-ai-agenda":
      return (
        <BaseSvg accent={accent} alt={alt}>
          <rect x="74" y="50" width="128" height="122" rx="14" fill="#fff" stroke="#d7ded7" strokeWidth="3" />
          <path d="M98 82 H176 M98 108 H162 M98 134 H180" stroke="#d7ded7" strokeWidth="7" strokeLinecap="round" />
          <rect x="220" y="72" width="76" height="78" rx="16" fill={accent} opacity="0.16" stroke={accent} strokeWidth="4" />
          <path d="M238 100 H278 M238 122 H266" stroke={accent} strokeWidth="6" strokeLinecap="round" />
          <Spark x={218} y={62} accent={accent} />
        </BaseSvg>
      );
    case "q15-ai-next-action":
      return (
        <BaseSvg accent={accent} alt={alt}>
          <rect x="54" y="54" width="252" height="116" rx="15" fill="#fff" stroke="#d7ded7" strokeWidth="3" />
          {[0, 1, 2].map((row) => (
            <g key={row}>
              <circle cx="86" cy={82 + row * 34} r="12" fill={row === 1 ? accent : "#dfe6de"} />
              <rect x="112" y={74 + row * 34} width={row === 1 ? 134 : 96} height="16" rx="8" fill={row === 1 ? accent : "#dfe6de"} opacity={row === 1 ? 0.72 : 1} />
            </g>
          ))}
          <path d="M260 112 L282 112 M272 100 L284 112 L272 124" fill="none" stroke={accent} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="162" cy="116" r="36" fill={accent} opacity="0.08" />
          <Spark x={280} y={74} accent={accent} />
        </BaseSvg>
      );
    default:
      return (
        <BaseSvg accent={accent} alt={alt}>
          <Device x={96} y={68} width={168} height={94} accent={accent} />
        </BaseSvg>
      );
  }
}
