from __future__ import annotations

from pathlib import Path

from reportlab.graphics import renderPDF
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
ASSETS_DIR = ROOT / "assets"
OUTPUT_PDF = ASSETS_DIR / "fpa-ai-mail-card-square-bleed.pdf"

PAGE_MM = 61.0
MM = 72.0 / 25.4

FONT_REGULAR_PATH = Path(r"C:\Windows\Fonts\meiryo.ttc")
FONT_BOLD_PATH = Path(r"C:\Windows\Fonts\meiryob.ttc")
FONT_NAME = "Meiryo"
FONT_BOLD = "MeiryoBold"

SITE_URL = "https://dtcon-eto.com/survey/"
EMAIL = "pphanquynh@tohmatsu.co.jp"
NAME = "ファン ウィン フィ"
COMPANY = "合同会社デロイト トーマツ"
TEAM = "ET&O"
MAILTO_URL = f"mailto:{EMAIL}"

BLACK = "#071014"
INK = "#121820"
GREEN = "#86BC25"
DEEP_GREEN = "#0D3A34"
PAPER = "#F7F5EF"
WHITE = "#FFFFFF"
MUTED = "#64717B"
HAIRLINE = "#D8D2C5"


def pt(mm_value: float) -> float:
    return mm_value * MM


def y_top(mm_value: float) -> float:
    return pt(PAGE_MM - mm_value)


def color(hex_value: str) -> colors.Color:
    return colors.HexColor(hex_value)


def draw_text(
    c: canvas.Canvas,
    x_mm: float,
    y_mm: float,
    value: str,
    size: float,
    fill: str,
    *,
    align: str = "left",
    font: str = FONT_NAME,
    leading: float | None = None,
    max_width_mm: float | None = None,
) -> None:
    c.setFont(font, size)
    c.setFillColor(color(fill))
    if leading is None:
        leading = size * 1.32
    for index, line in enumerate(value.splitlines()):
        width = pdfmetrics.stringWidth(line, font, size)
        max_width = pt(max_width_mm) if max_width_mm is not None else None
        scale = 1.0
        if max_width is not None and width > max_width:
            scale = max_width / width
        draw_width = width * scale
        x = pt(x_mm)
        if align == "center":
            x -= draw_width / 2
        elif align == "right":
            x -= draw_width
        y = y_top(y_mm) - size - index * leading
        if scale < 1.0:
            c.saveState()
            c.translate(x, y)
            c.scale(scale, 1.0)
            c.drawString(0, 0, line)
            c.restoreState()
        else:
            c.drawString(x, y, line)


def rect(c: canvas.Canvas, x_mm: float, y_mm: float, w_mm: float, h_mm: float, fill: str) -> None:
    c.setFillColor(color(fill))
    c.rect(pt(x_mm), y_top(y_mm + h_mm), pt(w_mm), pt(h_mm), stroke=0, fill=1)


def stroke_rect(
    c: canvas.Canvas,
    x_mm: float,
    y_mm: float,
    w_mm: float,
    h_mm: float,
    stroke: str,
    *,
    line_width: float = 0.45,
) -> None:
    c.setStrokeColor(color(stroke))
    c.setLineWidth(line_width)
    c.rect(pt(x_mm), y_top(y_mm + h_mm), pt(w_mm), pt(h_mm), stroke=1, fill=0)


def line(c: canvas.Canvas, x1: float, y1: float, x2: float, y2: float, stroke: str, width: float = 0.45) -> None:
    c.setStrokeColor(color(stroke))
    c.setLineWidth(width)
    c.line(pt(x1), y_top(y1), pt(x2), y_top(y2))


def draw_qr(c: canvas.Canvas, payload: str, x_mm: float, y_mm: float, size_mm: float, qr_color: str) -> None:
    qr = QrCodeWidget(payload)
    qr.barFillColor = color(qr_color)
    qr.barStrokeColor = color(qr_color)
    bounds = qr.getBounds()
    qr_w = bounds[2] - bounds[0]
    qr_h = bounds[3] - bounds[1]
    scale = pt(size_mm) / max(qr_w, qr_h)
    drawing = Drawing(pt(size_mm), pt(size_mm), transform=[scale, 0, 0, scale, 0, 0])
    drawing.add(qr)
    renderPDF.draw(drawing, c, pt(x_mm), y_top(y_mm + size_mm))


def draw_front(c: canvas.Canvas) -> None:
    rect(c, 0, 0, PAGE_MM, PAGE_MM, BLACK)
    rect(c, 3.0, 3.0, 0.9, 55.0, GREEN)
    line(c, 8.0, 12.1, 53.0, 12.1, "#263237", width=0.35)

    draw_text(c, 30.5, 7.1, "FP&A Analytics Quest", 10.0, GREEN, align="center", font=FONT_BOLD)

    rect(c, 12.4, 15.1, 36.2, 32.8, WHITE)
    stroke_rect(c, 12.4, 15.1, 36.2, 32.8, "#D9DEE0", line_width=0.45)
    draw_qr(c, SITE_URL, 16.1, 17.4, 28.8, DEEP_GREEN)

    draw_text(c, 30.5, 49.8, "貴社の経営管理課題を", 8.0, WHITE, align="center", font=FONT_BOLD)
    draw_text(c, 30.5, 54.2, "AI診断で見つけましょう", 8.0, WHITE, align="center", font=FONT_BOLD)
    c.showPage()


def draw_back(c: canvas.Canvas) -> None:
    rect(c, 0, 0, PAGE_MM, PAGE_MM, PAPER)
    rect(c, 0, 54.1, PAGE_MM, 6.9, BLACK)
    rect(c, 3.0, 3.0, 0.9, 55.0, GREEN)

    draw_text(
        c,
        30.5,
        7.4,
        "メールはこちらのQRコードからすぐにできます。",
        7.0,
        INK,
        align="center",
        font=FONT_BOLD,
        max_width_mm=53.0,
    )

    rect(c, 12.4, 12.7, 36.2, 36.2, WHITE)
    stroke_rect(c, 12.4, 12.7, 36.2, 36.2, HAIRLINE, line_width=0.45)
    draw_qr(c, MAILTO_URL, 16.1, 16.4, 28.8, INK)

    draw_text(
        c,
        30.5,
        49.7,
        "経営管理、ERP/EPM導入、AI導入について聞きたいことがあれば、\nそのまま送ってください。",
        4.0,
        MUTED,
        align="center",
        leading=5.8,
        max_width_mm=52.0,
    )
    draw_text(c, 54.0, 55.0, NAME, 3.0, WHITE, align="right", font=FONT_BOLD)
    draw_text(c, 54.0, 57.3, f"{COMPANY} / {TEAM}", 3.0, "#AAB2B8", align="right")
    draw_text(c, 54.0, 59.1, EMAIL, 3.0, "#AAB2B8", align="right")
    c.showPage()


def main() -> None:
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    pdfmetrics.registerFont(TTFont(FONT_NAME, str(FONT_REGULAR_PATH)))
    pdfmetrics.registerFont(TTFont(FONT_BOLD, str(FONT_BOLD_PATH)))
    card = canvas.Canvas(str(OUTPUT_PDF), pagesize=(pt(PAGE_MM), pt(PAGE_MM)))
    card.setTitle("fpa-ai-mail-card-square-bleed")
    draw_front(card)
    draw_back(card)
    card.save()
    print(OUTPUT_PDF)


if __name__ == "__main__":
    main()
