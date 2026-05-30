"""PDF generation service — donation receipts and postal drafts.

Uses ReportLab for PDF generation with Chinese (zh-TW) text support
via embedded CJK fonts.
"""

import io
import logging
import os
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm, cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

logger = logging.getLogger(__name__)

# ── Font setup ──────────────────────────────────────────────────

# Try to register a Chinese font; fallback to Helvetica if not found
_CHINESE_FONT = "Helvetica"
for font_path, font_name in [
    ("/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc", "NotoSansCJK"),
    ("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc", "NotoSansCJK"),
    ("/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc", "NotoSansCJK"),
    ("/usr/share/fonts/truetype/noto/NotoSansTC-Regular.otf", "NotoSansTC"),
    ("/usr/share/fonts/truetype/noto/NotoSansSC-Regular.otf", "NotoSansSC"),
    ("/usr/local/share/fonts/NotoSansCJK-Regular.ttc", "NotoSansCJK"),
]:
    if os.path.exists(font_path):
        try:
            pdfmetrics.registerFont(TTFont(font_name, font_path))
            _CHINESE_FONT = font_name
            logger.info("Registered CJK font: %s at %s", font_name, font_path)
            break
        except Exception as exc:
            logger.warning("Failed to register font %s: %s", font_path, exc)

# Also try to find a bold variant
_CHINESE_FONT_BOLD = _CHINESE_FONT
for bold_font_path, bold_font_name in [
    ("/usr/share/fonts/truetype/noto/NotoSansCJK-Bold.ttc", "NotoSansCJK-Bold"),
    ("/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc", "NotoSansCJK-Bold"),
    ("/usr/share/fonts/truetype/noto/NotoSansTC-Bold.otf", "NotoSansTC-Bold"),
]:
    if os.path.exists(bold_font_path):
        try:
            pdfmetrics.registerFont(TTFont(bold_font_name, bold_font_path))
            _CHINESE_FONT_BOLD = bold_font_name
            break
        except Exception:
            pass


def _paragraph(text: str, style_name: str = "Normal", **kwargs) -> Paragraph:
    """Create a Paragraph with the registered CJK font."""
    styles = getSampleStyleSheet()
    base = styles[style_name]
    overrides = dict(kwargs)
    if "fontName" not in overrides:
        overrides["fontName"] = _CHINESE_FONT
    return Paragraph(text, ParagraphStyle(style_name, parent=base, **overrides))


def _purpose_label(purpose: str | None) -> str:
    """Translate purpose code to Chinese label."""
    labels = {
        "general": "一般捐款",
        "emergency_relief": "急難救助",
        "education": "教育贊助",
        "medical": "醫療援助",
        "other": "其他",
    }
    return labels.get(purpose or "", purpose or "一般捐款")


def _method_label(method: str) -> str:
    """Translate payment method code to Chinese label."""
    labels = {
        "credit_card": "信用卡",
        "postal": "郵政劃撥",
        "cash": "現金",
    }
    return labels.get(method, method)


# ═══════════════════════════════════════════════════════════════
#  Donation Receipt PDF
# ═══════════════════════════════════════════════════════════════


def generate_donation_receipt_pdf(
    receipt_number: str,
    donor_name: str,
    donor_email: str | None,
    amount: Decimal,
    amount_in_words: str,
    purpose: str | None,
    payment_method: str,
    donation_date: datetime,
    org_name: str = "捐款系統",
) -> bytes:
    """Generate a donation receipt PDF as bytes.

    Args:
        receipt_number:  Unique receipt number (e.g. RCP-20260522-xxxx).
        donor_name:      Display name of the donor.
        donor_email:     Optional email address.
        amount:          Donation amount.
        amount_in_words: Amount written in Chinese (e.g. "新台幣壹仟元整").
        purpose:         Donation purpose code.
        payment_method:  Payment method code.
        donation_date:   Date of the donation.
        org_name:        Organisation name.

    Returns:
        PDF content as bytes.
    """
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        leftMargin=2.5 * cm,
        rightMargin=2.5 * cm,
    )

    elements = []
    date_str = donation_date.strftime("%Y 年 %m 月 %d 日")

    # ── Title ──
    elements.append(_paragraph("捐 款 收 據", "Title", fontSize=22, alignment=TA_CENTER, spaceAfter=4 * mm))
    elements.append(Spacer(1, 8 * mm))

    # ── Receipt number ──
    elements.append(_paragraph(f"收據編號：{receipt_number}", "Normal", fontSize=10, textColor=colors.HexColor("#6b7280"), spaceAfter=6 * mm))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e5e7eb"), spaceAfter=6 * mm))

    # ── Details table ──
    detail_data = [
        ["捐款人", donor_name],
        ["電子郵件", donor_email or "—"],
        ["捐款金額", f"NT$ {amount:,.0f}"],
        ["金額大寫", amount_in_words],
        ["捐款用途", _purpose_label(purpose)],
        ["付款方式", _method_label(payment_method)],
        ["捐款日期", date_str],
    ]

    detail_table = Table(detail_data, colWidths=[4 * cm, 10 * cm])
    detail_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), _CHINESE_FONT),
        ("FONTSIZE", (0, 0), (-1, -1), 11),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#6b7280")),
        ("TEXTCOLOR", (1, 0), (1, -1), colors.HexColor("#111827")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 2 * mm),
        ("ALIGN", (1, 0), (1, -1), TA_RIGHT),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    elements.append(detail_table)

    elements.append(Spacer(1, 10 * mm))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e5e7eb"), spaceAfter=8 * mm))

    # ── Footer note ──
    elements.append(_paragraph(
        "本收據可作為年度所得稅申報列舉扣除額之憑證。",
        "Normal", fontSize=9, textColor=colors.HexColor("#9ca3af"),
        spaceAfter=2 * mm,
    ))
    elements.append(_paragraph(
        f"製單日期：{datetime.utcnow().strftime('%Y 年 %m 月 %d 日')}",
        "Normal", fontSize=9, textColor=colors.HexColor("#9ca3af"),
        spaceAfter=2 * mm,
    ))
    elements.append(_paragraph(
        org_name,
        "Normal", fontSize=9, textColor=colors.HexColor("#9ca3af"),
    ))

    doc.build(elements)
    pdf_bytes = buf.getvalue()
    buf.close()
    return pdf_bytes


# ═══════════════════════════════════════════════════════════════
#  Postal Draft PDF
# ═══════════════════════════════════════════════════════════════


def generate_postal_draft_pdf(
    draft_number: str,
    donor_name: str,
    donor_address: str | None,
    amount: Decimal,
    amount_in_words: str,
    postal_account: str,
    org_name: str = "捐款系統",
) -> bytes:
    """Generate a postal transfer draft (劃撥單) PDF as bytes.

    Args:
        draft_number:   Draft number (e.g. POST-20260522-0001).
        donor_name:     Display name of the donor/payer.
        donor_address:  Optional address of the donor.
        amount:         Transfer amount.
        amount_in_words: Amount written in Chinese characters.
        postal_account: The organisation's postal transfer account number.
        org_name:       Organisation name.

    Returns:
        PDF content as bytes.
    """
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        leftMargin=2.5 * cm,
        rightMargin=2.5 * cm,
    )

    elements = []
    today = date.today().strftime("%Y 年 %m 月 %d 日")

    # ── Title ──
    elements.append(_paragraph("郵 政 劃 撥 單", "Title", fontSize=20, alignment=TA_CENTER, spaceAfter=4 * mm))
    elements.append(Spacer(1, 6 * mm))

    # ── Organisation info ──
    info_data = [
        ["收款戶名", org_name],
        ["郵政劃撥帳號", postal_account],
        ["劃撥單號", draft_number],
        ["製單日期", today],
    ]
    info_table = Table(info_data, colWidths=[4 * cm, 10 * cm])
    info_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), _CHINESE_FONT),
        ("FONTSIZE", (0, 0), (-1, -1), 11),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#6b7280")),
        ("TEXTCOLOR", (1, 0), (1, -1), colors.HexColor("#111827")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 2 * mm),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 8 * mm))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e5e7eb"), spaceAfter=8 * mm))

    # ── Payer info ──
    elements.append(_paragraph("劃撥人資料", "Normal", fontName=_CHINESE_FONT_BOLD, fontSize=13, spaceAfter=4 * mm))

    payer_data = [
        ["姓　　名", donor_name],
        ["地　　址", donor_address or "—"],
        ["金　　額", f"NT$ {amount:,.0f}"],
        ["金額大寫", amount_in_words],
    ]
    payer_table = Table(payer_data, colWidths=[4 * cm, 10 * cm])
    payer_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), _CHINESE_FONT),
        ("FONTSIZE", (0, 0), (-1, -1), 11),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#6b7280")),
        ("TEXTCOLOR", (1, 0), (1, -1), colors.HexColor("#111827")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 2 * mm),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    elements.append(payer_table)

    elements.append(Spacer(1, 12 * mm))

    # ── Usage note ──
    elements.append(_paragraph(
        "請持本單至郵局窗口辦理劃撥，或使用郵局 WebATM / 行動郵局 APP 轉帳。",
        "Normal", fontSize=9, textColor=colors.HexColor("#9ca3af"),
        spaceAfter=2 * mm,
    ))
    elements.append(_paragraph(
        "劃撥後請妥善保留收據以備查核。",
        "Normal", fontSize=9, textColor=colors.HexColor("#9ca3af"),
    ))

    doc.build(elements)
    pdf_bytes = buf.getvalue()
    buf.close()
    return pdf_bytes


# ═══════════════════════════════════════════════════════════════
#  Chinese amount in words (金額大寫)
def _amount_in_words(amount: Decimal) -> str:
    """Convert a numeric amount to Chinese uppercase (大寫).

    Example: 1234 -> '新台幣壹仟貳佰參拾肆元整'
    Example: 567890 -> '新台幣伍拾陸萬柒仟捌佰玖拾元整'
    Example: 1001 -> '新台幣壹仟零壹元整'
    Example: 1001001 -> '新台幣壹佰萬壹仟零壹元整'
    """
    digits = ["零", "壹", "貳", "參", "肆", "伍", "陸", "柒", "捌", "玖"]
    units = ["", "拾", "佰", "仟"]
    big_units = ["", "萬", "億", "兆"]

    # Handle integer and decimal parts
    amount_float = float(amount)
    integer_part = int(amount_float)

    if integer_part == 0:
        return "新台幣零元整"

    result = ""

    # Split into groups of 4 from the right: e.g., 567890 -> ["56", "7890"]
    num_str = str(integer_part)
    groups = []
    while len(num_str) > 4:
        groups.insert(0, num_str[-4:])
        num_str = num_str[:-4]
    groups.insert(0, num_str)

    last_was_zero = False
    for gi, group in enumerate(groups):
        group_int = int(group)
        if group_int == 0:
            last_was_zero = True
            continue

        if last_was_zero:
            result += "零"
        last_was_zero = False

        for di, ch in enumerate(group):
            d = int(ch)
            if d == 0:
                # Only add '零' between non-zero digits within the same group
                remaining_in_group = group[di+1:]
                if any(c != '0' for c in remaining_in_group):
                    if not result.endswith("零"):
                        result += "零"
            else:
                result += digits[d] + units[len(group) - 1 - di]

        result += big_units[len(groups) - 1 - gi]

    return "新台幣" + result + "元整"
