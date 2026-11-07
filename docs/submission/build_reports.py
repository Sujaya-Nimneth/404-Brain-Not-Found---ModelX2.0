from __future__ import annotations

import html
import re
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    FrameBreak,
    HRFlowable,
    KeepTogether,
    ListFlowable,
    ListItem,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Preformatted,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[2]
SUBMISSION = ROOT / "docs" / "submission"
TECH_SOURCE = SUBMISSION / "technical-report.md"
SUMMARY_SOURCE = SUBMISSION / "two-page-summary.md"
TECH_PDF = SUBMISSION / "ATIE-Technical-Report.pdf"
SUMMARY_PDF = SUBMISSION / "ATIE-Two-Page-Summary.pdf"

PAGE_WIDTH, PAGE_HEIGHT = A4
CONTENT_LEFT = 54
CONTENT_RIGHT = 54
CONTENT_WIDTH = PAGE_WIDTH - CONTENT_LEFT - CONTENT_RIGHT

INK = colors.HexColor("#17271f")
MOSS = colors.HexColor("#315c45")
MOSS_DARK = colors.HexColor("#1f4533")
CLAY = colors.HexColor("#bd5e3b")
LIME = colors.HexColor("#dce97a")
CREAM = colors.HexColor("#f6f1e7")
PAPER = colors.HexColor("#fffdf8")
SAGE = colors.HexColor("#dce8c7")
AMBER = colors.HexColor("#e8c978")
MUTED = colors.HexColor("#66736b")
LINE = colors.HexColor("#d9ddd2")
CODE_BG = colors.HexColor("#edf0e8")

FONT_FAMILIES_CANDIDATES: list[tuple[Path, str, str, str, str]] = [
    (
        Path("/System/Library/Fonts/Supplemental"),
        "Georgia.ttf",
        "Georgia Bold.ttf",
        "Georgia Italic.ttf",
        "Georgia Bold Italic.ttf",
    ),
    (
        Path("/Library/Fonts"),
        "Georgia.ttf",
        "Georgia Bold.ttf",
        "Georgia Italic.ttf",
        "Georgia Bold Italic.ttf",
    ),
    (
        Path("/usr/share/fonts/truetype/liberation"),
        "LiberationSerif-Regular.ttf",
        "LiberationSerif-Bold.ttf",
        "LiberationSerif-Italic.ttf",
        "LiberationSerif-BoldItalic.ttf",
    ),
    (
        Path("/usr/share/fonts/truetype/dejavu"),
        "DejaVuSerif.ttf",
        "DejaVuSerif-Bold.ttf",
        "DejaVuSerif-Italic.ttf",
        "DejaVuSerif-BoldItalic.ttf",
    ),
]

SERIF_REGULAR = "Georgia"
SERIF_BOLD = "Georgia-Bold"
SERIF_ITALIC = "Georgia-Italic"
SERIF_BOLD_ITALIC = "Georgia-BoldItalic"


def register_fonts() -> None:
    global SERIF_REGULAR, SERIF_BOLD, SERIF_ITALIC, SERIF_BOLD_ITALIC
    for directory, reg, bold, ital, bold_ital in FONT_FAMILIES_CANDIDATES:
        paths = [directory / reg, directory / bold, directory / ital, directory / bold_ital]
        if all(path.exists() for path in paths):
            pdfmetrics.registerFont(TTFont("Georgia", paths[0]))
            pdfmetrics.registerFont(TTFont("Georgia-Bold", paths[1]))
            pdfmetrics.registerFont(TTFont("Georgia-Italic", paths[2]))
            pdfmetrics.registerFont(TTFont("Georgia-BoldItalic", paths[3]))
            pdfmetrics.registerFontFamily(
                "Georgia",
                normal="Georgia",
                bold="Georgia-Bold",
                italic="Georgia-Italic",
                boldItalic="Georgia-BoldItalic",
            )
            return

    # Fallback to ReportLab's built-in Times family on minimal headless hosts
    SERIF_REGULAR = "Times-Roman"
    SERIF_BOLD = "Times-Bold"
    SERIF_ITALIC = "Times-Italic"
    SERIF_BOLD_ITALIC = "Times-BoldItalic"
    for style in STYLES.values():
        if style.fontName == "Georgia":
            style.fontName = SERIF_REGULAR
        elif style.fontName == "Georgia-Bold":
            style.fontName = SERIF_BOLD
        elif style.fontName == "Georgia-Italic":
            style.fontName = SERIF_ITALIC


def styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "body": ParagraphStyle(
            "Body",
            parent=base["BodyText"],
            fontName="Georgia",
            fontSize=9.2,
            leading=13.8,
            textColor=INK,
            alignment=TA_JUSTIFY,
            spaceAfter=7,
            allowWidows=0,
            allowOrphans=0,
        ),
        "body_left": ParagraphStyle(
            "BodyLeft",
            parent=base["BodyText"],
            fontName="Georgia",
            fontSize=9.2,
            leading=13.8,
            textColor=INK,
            alignment=TA_LEFT,
            spaceAfter=7,
        ),
        "small": ParagraphStyle(
            "Small",
            parent=base["BodyText"],
            fontName="Georgia",
            fontSize=7.8,
            leading=11.3,
            textColor=MUTED,
            alignment=TA_LEFT,
            spaceAfter=4,
        ),
        "h1": ParagraphStyle(
            "H1",
            parent=base["Heading1"],
            fontName="Georgia-Bold",
            fontSize=27,
            leading=30,
            textColor=INK,
            spaceAfter=8,
        ),
        "h2": ParagraphStyle(
            "H2",
            parent=base["Heading2"],
            fontName="Georgia-Bold",
            fontSize=15,
            leading=18,
            textColor=MOSS_DARK,
            spaceBefore=11,
            spaceAfter=4,
            keepWithNext=True,
        ),
        "h3": ParagraphStyle(
            "H3",
            parent=base["Heading3"],
            fontName="Georgia-Bold",
            fontSize=11,
            leading=14,
            textColor=CLAY,
            spaceBefore=8,
            spaceAfter=3,
            keepWithNext=True,
        ),
        "bullet": ParagraphStyle(
            "Bullet",
            parent=base["BodyText"],
            fontName="Georgia",
            fontSize=8.8,
            leading=12.5,
            textColor=INK,
            leftIndent=5,
            spaceAfter=2,
        ),
        "code": ParagraphStyle(
            "Code",
            parent=base["Code"],
            fontName="Courier",
            fontSize=7.3,
            leading=9.8,
            textColor=INK,
        ),
        "table_header": ParagraphStyle(
            "TableHeader",
            parent=base["BodyText"],
            fontName="Georgia-Bold",
            fontSize=7.3,
            leading=9.2,
            textColor=CREAM,
            alignment=TA_LEFT,
        ),
        "table": ParagraphStyle(
            "Table",
            parent=base["BodyText"],
            fontName="Georgia",
            fontSize=7.3,
            leading=9.5,
            textColor=INK,
            alignment=TA_LEFT,
        ),
        "quote": ParagraphStyle(
            "Quote",
            parent=base["BodyText"],
            fontName="Georgia-Italic",
            fontSize=9,
            leading=13,
            textColor=MOSS_DARK,
            leftIndent=12,
            rightIndent=10,
            spaceBefore=2,
            spaceAfter=8,
        ),
        "summary_body": ParagraphStyle(
            "SummaryBody",
            parent=base["BodyText"],
            fontName="Georgia",
            fontSize=8.5,
            leading=12.2,
            textColor=INK,
            alignment=TA_LEFT,
            spaceAfter=6,
        ),
        "summary_small": ParagraphStyle(
            "SummarySmall",
            parent=base["BodyText"],
            fontName="Georgia",
            fontSize=7.2,
            leading=10.1,
            textColor=MUTED,
            alignment=TA_LEFT,
            spaceAfter=4,
        ),
        "summary_h2": ParagraphStyle(
            "SummaryH2",
            parent=base["Heading2"],
            fontName="Georgia-Bold",
            fontSize=12.7,
            leading=14.6,
            textColor=MOSS_DARK,
            spaceBefore=6,
            spaceAfter=3,
            keepWithNext=True,
        ),
        "summary_code": ParagraphStyle(
            "SummaryCode",
            parent=base["Code"],
            fontName="Courier",
            fontSize=6.7,
            leading=8.8,
            textColor=INK,
        ),
        "summary_table_header": ParagraphStyle(
            "SummaryTableHeader",
            parent=base["BodyText"],
            fontName="Georgia-Bold",
            fontSize=7,
            leading=8.8,
            textColor=CREAM,
            alignment=TA_LEFT,
        ),
        "summary_table": ParagraphStyle(
            "SummaryTable",
            parent=base["BodyText"],
            fontName="Georgia",
            fontSize=7,
            leading=9.1,
            textColor=INK,
            alignment=TA_LEFT,
        ),
    }


STYLES = styles()


def inline_markup(text: str, code_size: float = 7.2) -> str:
    escaped = html.escape(text.strip(), quote=False)
    escaped = re.sub(
        r"`([^`]+)`",
        rf'<font name="Courier" size="{code_size}">\1</font>',
        escaped,
    )
    escaped = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", escaped)
    escaped = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<i>\1</i>", escaped)
    return escaped


def split_table_row(line: str) -> list[str]:
    return [cell.strip() for cell in line.strip().strip("|").split("|")]


def is_separator_row(cells: list[str]) -> bool:
    return bool(cells) and all(re.fullmatch(r":?-{3,}:?", cell) for cell in cells)


def table_widths(header: list[str], rows: list[list[str]], total: float) -> list[float]:
    weights: list[float] = []
    for index, title in enumerate(header):
        values = [title, *[row[index] if index < len(row) else "" for row in rows]]
        longest = max(len(value) for value in values)
        weights.append(max(8, min(34, longest)))
    weight_total = sum(weights)
    widths = [total * weight / weight_total for weight in weights]
    minimum = 46
    deficit = sum(max(0, minimum - width) for width in widths)
    if deficit:
        donor_indices = [
            index for index, width in enumerate(widths) if width > minimum + 12
        ]
        for index in donor_indices:
            if deficit <= 0:
                break
            available = widths[index] - minimum
            take = min(available, deficit)
            widths[index] -= take
            deficit -= take
    return widths


def make_table(
    header: list[str],
    rows: list[list[str]],
    total_width: float = CONTENT_WIDTH,
    compact: bool = False,
) -> Table:
    header_style = STYLES["summary_table_header"] if compact else STYLES["table_header"]
    body_style = STYLES["summary_table"] if compact else STYLES["table"]
    data = [
        [Paragraph(inline_markup(cell), header_style) for cell in header],
        *[
            [Paragraph(inline_markup(cell), body_style) for cell in row]
            for row in rows
        ],
    ]
    table = Table(
        data,
        colWidths=table_widths(header, rows, total_width),
        repeatRows=1,
        hAlign="LEFT",
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), INK),
                ("TEXTCOLOR", (0, 0), (-1, 0), CREAM),
                ("GRID", (0, 0), (-1, -1), 0.35, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 4.5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4.5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [PAPER, colors.HexColor("#f2f4ed")]),
            ]
        )
    )
    return table


def code_block(code: str, compact: bool = False) -> Table:
    style = STYLES["summary_code"] if compact else STYLES["code"]
    width = 236 if compact else CONTENT_WIDTH
    block = Table(
        [[Preformatted(code.rstrip(), style)]],
        colWidths=[width],
        hAlign="LEFT",
    )
    block.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), CODE_BG),
                ("BOX", (0, 0), (-1, -1), 0.5, LINE),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return block


def quote_block(text: str) -> Table:
    block = Table(
        [[Paragraph(inline_markup(text), STYLES["quote"])]],
        colWidths=[CONTENT_WIDTH],
        hAlign="LEFT",
    )
    block.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), CREAM),
                ("LINEBEFORE", (0, 0), (0, -1), 3, CLAY),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return block


def is_list_continuation(line: str) -> bool:
    stripped = line.strip()
    if not stripped:
        return False
    if (
        stripped.startswith("#")
        or stripped.startswith("|")
        or stripped.startswith("```")
        or stripped.startswith(">")
        or stripped == "<!-- pagebreak -->"
        or re.match(r"^[-*]\s+", stripped)
        or re.match(r"^\d+\.\s+", stripped)
    ):
        return False
    return line.startswith(" ") or line.startswith("\t")


def markdown_flowables(markdown: str) -> list:
    lines = markdown.splitlines()
    flowables: list = []
    index = 0
    while index < len(lines):
        line = lines[index]
        stripped = line.strip()
        if not stripped:
            index += 1
            continue
        if stripped == "<!-- pagebreak -->":
            flowables.append(PageBreak())
            index += 1
            continue
        if stripped.startswith("```"):
            index += 1
            code_lines: list[str] = []
            while index < len(lines) and not lines[index].strip().startswith("```"):
                code_lines.append(lines[index])
                index += 1
            index += 1
            flowables.extend([code_block("\n".join(code_lines)), Spacer(1, 6)])
            continue
        if stripped.startswith("#"):
            match = re.match(r"^(#{1,3})\s+(.*)$", stripped)
            if match:
                level = len(match.group(1))
                text = inline_markup(match.group(2))
                if level == 1:
                    flowables.append(Paragraph(text, STYLES["h1"]))
                elif level == 2:
                    heading = Paragraph(text, STYLES["h2"])
                    rule = HRFlowable(
                        width="100%",
                        thickness=0.6,
                        color=LINE,
                        spaceBefore=0,
                        spaceAfter=6,
                    )
                    flowables.append(KeepTogether([heading, rule]))
                else:
                    flowables.append(Paragraph(text, STYLES["h3"]))
                index += 1
                continue
        if stripped.startswith("|"):
            table_lines: list[str] = []
            while index < len(lines) and lines[index].strip().startswith("|"):
                table_lines.append(lines[index])
                index += 1
            parsed = [split_table_row(item) for item in table_lines]
            if len(parsed) >= 2 and is_separator_row(parsed[1]):
                header = parsed[0]
                rows = parsed[2:]
                flowables.extend([make_table(header, rows), Spacer(1, 7)])
            continue
        if stripped.startswith("> "):
            quote_lines = []
            while index < len(lines) and lines[index].strip().startswith(">"):
                quote_lines.append(lines[index].strip().lstrip(">").strip())
                index += 1
            flowables.extend(
                [quote_block(" ".join(quote_lines)), Spacer(1, 3)]
            )
            continue
        if re.match(r"^[-*]\s+", stripped):
            items = []
            while index < len(lines) and re.match(r"^[-*]\s+", lines[index].strip()):
                item_parts = [re.sub(r"^[-*]\s+", "", lines[index].strip())]
                index += 1
                while index < len(lines) and is_list_continuation(lines[index]):
                    item_parts.append(lines[index].strip())
                    index += 1
                items.append(
                    ListItem(
                        Paragraph(inline_markup(" ".join(item_parts)), STYLES["bullet"]),
                        leftIndent=8,
                    )
                )
            flowables.extend(
                [
                    ListFlowable(
                        items,
                        bulletType="bullet",
                        start="circle",
                        leftIndent=12,
                        bulletFontName=SERIF_REGULAR,
                        bulletFontSize=6,
                        bulletColor=CLAY,
                    ),
                    Spacer(1, 5),
                ]
            )
            continue
        if re.match(r"^\d+\.\s+", stripped):
            items = []
            while index < len(lines) and re.match(r"^\d+\.\s+", lines[index].strip()):
                item_parts = [re.sub(r"^\d+\.\s+", "", lines[index].strip())]
                index += 1
                while index < len(lines) and is_list_continuation(lines[index]):
                    item_parts.append(lines[index].strip())
                    index += 1
                items.append(
                    ListItem(
                        Paragraph(inline_markup(" ".join(item_parts)), STYLES["bullet"]),
                        leftIndent=8,
                    )
                )
            flowables.extend(
                [
                    ListFlowable(
                        items,
                        bulletType="1",
                        leftIndent=16,
                        bulletFontName=SERIF_BOLD,
                        bulletFontSize=7,
                        bulletColor=MOSS,
                    ),
                    Spacer(1, 5),
                ]
            )
            continue
        paragraph_lines = [stripped]
        index += 1
        while index < len(lines):
            next_line = lines[index].strip()
            if (
                not next_line
                or next_line.startswith("#")
                or next_line.startswith("|")
                or next_line.startswith("```")
                or next_line.startswith(">")
                or next_line == "<!-- pagebreak -->"
                or re.match(r"^[-*]\s+", next_line)
                or re.match(r"^\d+\.\s+", next_line)
            ):
                break
            paragraph_lines.append(next_line)
            index += 1
        flowables.append(
            Paragraph(inline_markup(" ".join(paragraph_lines)), STYLES["body"])
        )
    return flowables


def draw_cover(canv: canvas.Canvas, doc: BaseDocTemplate) -> None:
    canv.saveState()
    canv.setFillColor(CREAM)
    canv.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)
    canv.setFillColor(SAGE)
    canv.circle(PAGE_WIDTH - 24, PAGE_HEIGHT - 54, 175, fill=1, stroke=0)
    canv.setFillColor(colors.HexColor("#e9dfbf"))
    canv.circle(40, 120, 110, fill=1, stroke=0)
    canv.setStrokeColor(MOSS)
    canv.setLineWidth(1)
    canv.line(54, PAGE_HEIGHT - 60, PAGE_WIDTH - 54, PAGE_HEIGHT - 60)

    canv.setFillColor(MOSS_DARK)
    canv.setFont(SERIF_BOLD, 8)
    canv.drawString(54, PAGE_HEIGHT - 46, "TECHNICAL REPORT  /  MODELX 2.0")
    canv.setFont(SERIF_REGULAR, 8)
    canv.drawRightString(PAGE_WIDTH - 54, PAGE_HEIGHT - 46, "VERSION 2.0")

    canv.setFillColor(INK)
    canv.setFont(SERIF_BOLD, 58)
    canv.drawString(54, PAGE_HEIGHT - 165, "ATIE")
    canv.setFillColor(MOSS_DARK)
    canv.setFont(SERIF_BOLD, 20)
    canv.drawString(54, PAGE_HEIGHT - 202, "Agricultural Trade & Intelligence Engine")
    canv.setFillColor(CLAY)
    canv.setFont(SERIF_BOLD, 13)
    canv.drawString(54, PAGE_HEIGHT - 232, "Predict the price. Price the route. Protect the margin.")

    canv.setFillColor(INK)
    canv.setFont(SERIF_REGULAR, 9.5)
    intro = canv.beginText(54, PAGE_HEIGHT - 268)
    intro.setLeading(14)
    for line in [
        "A 48-72 hour wholesale price and safe routing decision system",
        "for Sri Lankan smallholder farmers and informal traders.",
    ]:
        intro.textLine(line)
    canv.drawText(intro)

    cards = [
        ("48-72h", "forecast horizon"),
        ("5% + LKR 1k", "safe-margin rule"),
        ("93.81% / 92.86%", "48h / 72h DS"),
        ("0.14% / 0.19%", "48h / 72h SM-FPR"),
    ]
    card_width = (CONTENT_WIDTH - 18) / 2
    card_height = 70
    for index, (value, label) in enumerate(cards):
        row = index // 2
        column = index % 2
        x = 54 + column * (card_width + 18)
        y = PAGE_HEIGHT - 410 - row * (card_height + 14)
        canv.setFillColor(colors.HexColor("#fffdf8"))
        canv.setStrokeColor(colors.HexColor("#d5d9cf"))
        canv.roundRect(x, y, card_width, card_height, 12, fill=1, stroke=1)
        canv.setFillColor(MOSS_DARK)
        canv.setFont(SERIF_BOLD, 17)
        canv.drawString(x + 16, y + 39, value)
        canv.setFillColor(MUTED)
        canv.setFont(SERIF_REGULAR, 8)
        canv.drawString(x + 16, y + 20, label)

    canv.setFillColor(INK)
    canv.setFont(SERIF_BOLD, 10)
    canv.drawString(54, 146, "Team 404 Brain not found")
    canv.setFont(SERIF_REGULAR, 9)
    canv.setFillColor(MUTED)
    canv.drawString(54, 128, "Informatics Institute of Technology")
    canv.drawString(54, 112, "IEEE Computational Intelligence Society Student Chapter")
    canv.setFont(SERIF_ITALIC, 8)
    canv.drawString(54, 82, "Canonical fixture & live XGBoost stack verified against Docker Compose.")
    canv.setFillColor(MOSS_DARK)
    canv.setFont(SERIF_BOLD, 8)
    canv.drawRightString(PAGE_WIDTH - 54, 82, "OCTOBER 27, 2026")
    canv.restoreState()


def draw_content_page(canv: canvas.Canvas, doc: BaseDocTemplate) -> None:
    canv.saveState()
    canv.setFillColor(PAPER)
    canv.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)
    canv.setStrokeColor(LINE)
    canv.setLineWidth(0.5)
    canv.line(CONTENT_LEFT, PAGE_HEIGHT - 38, PAGE_WIDTH - CONTENT_RIGHT, PAGE_HEIGHT - 38)
    canv.line(CONTENT_LEFT, 34, PAGE_WIDTH - CONTENT_RIGHT, 34)
    canv.setFillColor(MOSS_DARK)
    canv.setFont(SERIF_BOLD, 7)
    canv.drawString(CONTENT_LEFT, PAGE_HEIGHT - 30, "ATIE  /  TECHNICAL REPORT")
    canv.setFillColor(MUTED)
    canv.setFont(SERIF_REGULAR, 7)
    canv.drawRightString(PAGE_WIDTH - CONTENT_RIGHT, PAGE_HEIGHT - 30, "MODELX 2.0")
    canv.drawString(CONTENT_LEFT, 23, "404 Brain not found")
    canv.drawRightString(PAGE_WIDTH - CONTENT_RIGHT, 23, f"PAGE {doc.page}")
    canv.restoreState()


def draw_summary_page(canv: canvas.Canvas, doc: BaseDocTemplate) -> None:
    canv.saveState()
    canv.setFillColor(PAPER)
    canv.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)
    canv.setFillColor(SAGE)
    canv.rect(0, PAGE_HEIGHT - 13, PAGE_WIDTH, 13, fill=1, stroke=0)
    canv.setStrokeColor(LINE)
    canv.setLineWidth(0.5)
    canv.line(CONTENT_LEFT, 34, PAGE_WIDTH - CONTENT_RIGHT, 34)
    canv.setFillColor(MOSS_DARK)
    canv.setFont(SERIF_BOLD, 7)
    canv.drawString(CONTENT_LEFT, 23, "ATIE  /  TWO-PAGE SUMMARY")
    canv.setFillColor(MUTED)
    canv.setFont(SERIF_REGULAR, 7)
    canv.drawRightString(PAGE_WIDTH - CONTENT_RIGHT, 23, f"MODELX 2.0  |  PAGE {doc.page}")
    canv.restoreState()


def build_technical() -> None:
    markdown = TECH_SOURCE.read_text(encoding="utf-8")
    start = markdown.index("## 1. Executive Summary")
    story: list = [NextPageTemplate("content"), PageBreak()]
    story.extend(markdown_flowables(markdown[start:]))

    doc = BaseDocTemplate(
        str(TECH_PDF),
        pagesize=A4,
        leftMargin=CONTENT_LEFT,
        rightMargin=CONTENT_RIGHT,
        topMargin=54,
        bottomMargin=45,
        title="ATIE Technical Report - ModelX 2.0",
        author="Team 404 Brain not found",
        subject="Agricultural Trade & Intelligence Engine",
    )
    cover_frame = Frame(
        CONTENT_LEFT,
        50,
        CONTENT_WIDTH,
        PAGE_HEIGHT - 100,
        id="cover",
        leftPadding=0,
        rightPadding=0,
        topPadding=0,
        bottomPadding=0,
    )
    content_frame = Frame(
        CONTENT_LEFT,
        44,
        CONTENT_WIDTH,
        PAGE_HEIGHT - 96,
        id="content",
        leftPadding=0,
        rightPadding=0,
        topPadding=0,
        bottomPadding=0,
    )
    doc.addPageTemplates(
        [
            PageTemplate(id="cover", frames=[cover_frame], onPage=draw_cover),
            PageTemplate(id="content", frames=[content_frame], onPage=draw_content_page),
        ]
    )
    doc.build(story)


def summary_heading(text: str) -> Paragraph:
    return Paragraph(inline_markup(text), STYLES["summary_h2"])


def summary_paragraph(text: str) -> Paragraph:
    return Paragraph(inline_markup(text, code_size=6.1), STYLES["summary_body"])


def summary_bullets(items: list[str]) -> ListFlowable:
    return ListFlowable(
        [
            ListItem(
                Paragraph(inline_markup(item, code_size=6.1), STYLES["summary_small"]),
                leftIndent=5,
            )
            for item in items
        ],
        bulletType="bullet",
        start="circle",
        leftIndent=10,
        bulletFontName=SERIF_REGULAR,
        bulletFontSize=5,
        bulletColor=CLAY,
        spaceAfter=3,
    )


def summary_table(header: list[str], rows: list[list[str]], width: float) -> Table:
    return make_table(header, rows, total_width=width, compact=True)


def result_card() -> Table:
    rows = [
        ["Dambulla forecast", "LKR 220.00 -> 154.00"],
        ["Recommended", "Colombo Pettah"],
        ["Profit delta", "LKR 23,238.58"],
        ["Safe uplift", "15.84%"],
    ]
    data = [
        [
            Paragraph(inline_markup(label), STYLES["summary_small"]),
            Paragraph(
                f"<b>{inline_markup(value)}</b>",
                ParagraphStyle(
                    "ResultValue",
                    parent=STYLES["summary_small"],
                    textColor=MOSS_DARK,
                    alignment=TA_RIGHT,
                ),
            ),
        ]
        for label, value in rows
    ]
    table = Table(data, colWidths=[104, 126], hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), CREAM),
                ("BOX", (0, 0), (-1, -1), 0.6, AMBER),
                ("INNERGRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#e3dccb")),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return table


def build_summary() -> None:
    story: list = []
    story.extend(
        [
            Paragraph("ATIE", STYLES["h1"]),
            Paragraph(
                "Safe market routing for Sri Lankan produce",
                ParagraphStyle(
                    "SummaryTitle",
                    parent=STYLES["h2"],
                    fontName=SERIF_BOLD,
                    fontSize=18,
                    leading=20,
                    textColor=CLAY,
                    spaceBefore=0,
                    spaceAfter=5,
                ),
            ),
            Paragraph(
                "ModelX 2.0 - Two-Page Summary  |  Team 404 Brain not found  |  "
                "Informatics Institute of Technology",
                STYLES["summary_small"],
            ),
            Spacer(1, 4),
            summary_paragraph(
                "ATIE predicts wholesale crop prices 48-72 hours ahead and turns "
                "them into a safe market-routing decision. It compares net profit "
                "after fuel, terrain, spoilage, handling, and vehicle costs, so a "
                "higher headline price never becomes an unsafe recommendation."
            ),
            summary_table(
                ["Horizon", "Model DS", "MAE", "SM-FPR", "Reroutes"],
                [
                    ["48h", "93.81%", "1.81", "0.14%", "2,106"],
                    ["72h", "92.86%", "2.87", "0.19%", "2,071"],
                ],
                CONTENT_WIDTH,
            ),
            FrameBreak(),
        ]
    )

    story.extend(
        [
            summary_heading("The problem"),
            summary_paragraph(
                "Smallholder farmers and informal traders often decide where to "
                "send produce without knowing whether a local market will be "
                "glutted when the consignment arrives. A higher quoted price can "
                "still be the wrong choice after transport, spoilage, terrain, "
                "handling, and vehicle costs."
            ),
            summary_heading("The product"),
            summary_paragraph(
                "The dashboard takes origin, default market, crop, quantity, "
                "vehicle, and horizon. It returns one directive, the recommended "
                "destination, every market's profit ledger, weather context, and "
                "the source and freshness of the data."
            ),
            summary_heading("User workflow"),
            summary_bullets(
                [
                    "Configure the consignment and default market.",
                    "Compare every reachable market by safe net profit.",
                    "Act on a reroute, proceed, or hold directive.",
                ]
            ),
            summary_heading("Canonical scenario"),
            summary_paragraph(
                "1,000 kg of tomatoes from Anuradhapura, defaulting to Dambulla. "
                "The fixture is visibly labeled `DEMO_FIXTURE` and reports:"
            ),
            result_card(),
            Spacer(1, 5),
            summary_paragraph(
                "The same request with `demo_mode: false` runs live `xgb-v2.0` "
                "inference and independently recommends `PETTAH_COLOMBO` (`+22.51%`)."
            ),
            FrameBreak(),
        ]
    )

    story.extend(
        [
            summary_heading("How it works"),
            code_block(
                "Web dashboard / Android app\n"
                "      |\n"
                "Spring Boot API ----> PostgreSQL\n"
                "      |\n"
                "Python ML service ----> XGBoost\n"
                "      ^\n"
                "Ingestion worker ----> HDX / weather / CROPIX",
                compact=True,
            ),
            Spacer(1, 5),
            summary_paragraph(
                "The ML service forecasts prices. The backend owns the money and "
                "the safety decision:"
            ),
            code_block(
                "uplift = (NP_alt - NP_default) / NP_default * 100\n"
                "reroute only when uplift >= 5%\n"
                "and delta >= LKR 1,000",
                compact=True,
            ),
            Spacer(1, 5),
            summary_heading("Why it is safe"),
            summary_bullets(
                [
                    "Net profit includes effective volume after spoilage, round-trip terrain-adjusted fuel, and handling.",
                    "Decimal arithmetic is used for every routing decision.",
                    "A non-positive default profit never manufactures a positive uplift.",
                    "The frontend never recomputes the decision or uplift.",
                ]
            ),
            summary_heading("What ships"),
            summary_bullets(
                [
                    "A deployable Compose stack with five health-checked services.",
                    "A documented API, Swagger UI, fallback path, and provenance endpoint.",
                    "Web dashboard + Android field app sharing TypeScript contracts.",
                ]
            ),
            NextPageTemplate("summary2"),
            PageBreak(),
        ]
    )

    story.extend(
        [
            summary_heading("Reliability and evidence"),
            summary_bullets(
                [
                    "Model, fallback snapshot, and canonical fixture are checked into the repository.",
                    "Failed live calls are visibly labeled and never presented as live answers.",
                    "API responses carry `X-Request-ID`; health and metrics are exposed.",
                    "Optional API-key protection is disabled by default for judging.",
                    "CI covers ML, backend, web, Android mobile, and Compose Playwright gates.",
                ]
            ),
            summary_heading("Failure behavior"),
            summary_paragraph(
                "If the ML service is unavailable, the backend uses a "
                "deterministic fallback with a visible `FALLBACK` label. If a "
                "live analysis call fails, the UI retains a previous result only "
                "for the identical consignment and never substitutes `DEMO_FIXTURE`."
            ),
            summary_heading("Decision contract"),
            summary_table(
                ["Condition", "Directive"],
                [
                    ["Safe candidate passes", "REROUTE"],
                    ["Default profit > 0", "PROCEED"],
                    ["Default profit <= 0", "HOLD"],
                ],
                236,
            ),
            Spacer(1, 5),
            summary_heading("Evaluation"),
            summary_paragraph(
                "SM-FPR is the rate at which a reroute recommendation loses to the "
                "default market after realized holdout prices are substituted. It "
                "is a routing backtest, not a price-error proxy."
            ),
            summary_table(
                ["Baseline 48h", "DS", "MAE", "SM-FPR"],
                [
                    ["Model", "93.81%", "1.81", "0.14%"],
                    ["Naive", "0.00%", "12.25", "24.65%"],
                    ["MA7", "40.99%", "16.35", "23.59%"],
                ],
                236,
            ),
            Spacer(1, 6),
            summary_heading("What is still limited"),
            summary_paragraph(
                "CROPIX needs a working configured endpoint. HDX is monthly and "
                "historical. The model is seed-backed until a supervised retraining "
                "pipeline is added. SM-FPR covers a finite, versioned route matrix "
                "and does not claim every possible road or consignment."
            ),
            summary_heading("Safety outcome"),
            summary_paragraph(
                "A false positive is treated as a catastrophic failure. The system "
                "would rather proceed locally or hold a harvest than send a farmer "
                "to a distant market that loses after real costs."
            ),
            summary_heading("Validation"),
            summary_bullets(
                [
                    "The canonical fixture and live model path are both exercised end to end.",
                    "The Postgres schema validates against the running Compose database.",
                    "The ML suite covers contracts, fallbacks, features, routing, and evaluation.",
                ]
            ),
            FrameBreak(),
        ]
    )

    story.extend(
        [
            summary_heading("Run it"),
            code_block(
                "cp .env.example .env\n"
                "docker compose up --build -d --wait\n"
                "open http://localhost:15173",
                compact=True,
            ),
            Spacer(1, 5),
            summary_paragraph(
                "Swagger: `http://localhost:8080/swagger-ui.html`  \n"
                "Provenance: `http://localhost:8080/api/v1/metadata/data-status`"
            ),
            summary_heading("Evidence"),
            summary_bullets(
                [
                    "Canonical fixture returns `CRITICAL_REROUTE`, Pettah, LKR 23,238.58, and 15.84%.",
                    "Live model mode returns seven market forecasts and a visible `MODEL` badge.",
                    "The browser test verifies the fixture-to-model transition, route ledger, forecast trace, and weather panel.",
                    "All five Compose services reach healthy state.",
                ]
            ),
            summary_heading("Data honesty"),
            summary_paragraph(
                "Every source is labeled `LIVE`, `CACHED`, `SEED`, or `UNAVAILABLE`. "
                "The current verified snapshot is `PARTIAL`: Open-Meteo is live and "
                "current; WFP/HDX is live but stale, with supported wholesale "
                "observations ending April 2021; CROPIX is unavailable."
            ),
            summary_paragraph(
                "The model remains trained on checked-in seed history. Live "
                "ingestion refreshes weather, supported historical rows, and "
                "provenance; it does not silently retrain the model or relabel "
                "retail data as wholesale."
            ),
            summary_heading("Operational checks"),
            summary_table(
                ["Control", "Status"],
                [
                    ["Postgres schema", "Validated"],
                    ["Frontend proxy", "Verified"],
                    ["Request tracing", "Enabled"],
                    ["Data provenance", "Visible"],
                    ["Security headers", "Verified"],
                ],
                236,
            ),
            Spacer(1, 6),
            summary_heading("Repository"),
            summary_paragraph(
                "The normative rules are in `CONTRACTS.md`; implementation and "
                "verification details are in `README.md` and "
                "`IMPLEMENTATION_PLAN.md`. The final dashboard capture is in "
                "`docs/evidence/live-dashboard.png`."
            ),
            summary_heading("Demo path"),
            summary_bullets(
                [
                    "Load the Northern glut fixture and inspect the safe reroute.",
                    "Run the same consignment without demo mode to show live model output.",
                    "Read the provenance panel and forecast trace before the final decision.",
                ]
            ),
            Spacer(1, 8),
            Table(
                [
                    [
                        Paragraph(
                            "<b>ATIE</b><br/>Safe routing first.",
                            ParagraphStyle(
                                "SummaryEnd",
                                parent=STYLES["summary_small"],
                                fontName=SERIF_BOLD,
                                fontSize=11,
                                leading=15,
                                textColor=MOSS_DARK,
                            ),
                        )
                    ]
                ],
                colWidths=[236],
                style=TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, -1), SAGE),
                        ("BOX", (0, 0), (-1, -1), 0.7, MOSS),
                        ("LEFTPADDING", (0, 0), (-1, -1), 10),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                        ("TOPPADDING", (0, 0), (-1, -1), 10),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                    ]
                ),
            ),
        ]
    )

    doc = BaseDocTemplate(
        str(SUMMARY_PDF),
        pagesize=A4,
        leftMargin=CONTENT_LEFT,
        rightMargin=CONTENT_RIGHT,
        topMargin=45,
        bottomMargin=40,
        title="ATIE Two-Page Summary - ModelX 2.0",
        author="Team 404 Brain not found",
        subject="Safe market routing for Sri Lankan produce",
    )
    page_one = PageTemplate(
        id="summary1",
        frames=[
            Frame(54, 538, CONTENT_WIDTH, 237, id="summary1-top", showBoundary=0),
            Frame(54, 48, 236, 478, id="summary1-left", showBoundary=0),
            Frame(305, 48, 236, 478, id="summary1-right", showBoundary=0),
        ],
        onPage=draw_summary_page,
    )
    page_two = PageTemplate(
        id="summary2",
        frames=[
            Frame(54, 48, 236, 740, id="summary2-left", showBoundary=0),
            Frame(305, 48, 236, 740, id="summary2-right", showBoundary=0),
        ],
        onPage=draw_summary_page,
    )
    doc.addPageTemplates([page_one, page_two])
    doc.build(story)


def main() -> None:
    register_fonts()
    SUBMISSION.mkdir(parents=True, exist_ok=True)
    build_technical()
    build_summary()
    print(TECH_PDF)
    print(SUMMARY_PDF)


if __name__ == "__main__":
    main()
