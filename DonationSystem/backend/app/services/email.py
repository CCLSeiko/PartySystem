"""Email notification service — SMTP-based with HTML templates.

Uses ``asyncio.to_thread`` to run SMTP sends without blocking the event loop.
All sending is gated by ``settings.email_enabled`` — when disabled, calls log
and return silently (ideal for local dev without a mail server).
"""

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from decimal import Decimal

from app.config import settings

logger = logging.getLogger(__name__)

# ── HTML templates ─────────────────────────────────────────────

_DONATION_RECEIPT_TPL = """\
<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Noto Sans TC','Microsoft JhengHei',sans-serif;">
<table width="100%%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

    <!-- Header -->
    <tr>
      <td style="background:linear-gradient(135deg,#059669,#10b981);padding:40px 32px;text-align:center;">
        <div style="font-size:48px;margin-bottom:12px;">🎉</div>
        <h1 style="color:#ffffff;font-size:22px;margin:0;font-weight:700;">感謝您的捐款</h1>
        <p style="color:#d1fae5;font-size:14px;margin:8px 0 0;">您的愛心將被妥善運用</p>
      </td>
    </tr>

    <!-- Body -->
    <tr><td style="padding:32px;">
      <p style="font-size:15px;color:#374151;margin:0 0 20px;">{donor_name} 您好，</p>
      <p style="font-size:15px;color:#374151;margin:0 0 24px;">非常感謝您的捐款支持！以下為本次捐款資訊：</p>

      <!-- Info table -->
      <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;">
        <tr><td style="padding:20px;">
          <table width="100%%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:8px 0;font-size:14px;color:#6b7280;">捐款金額</td>
              <td style="padding:8px 0;font-size:18px;font-weight:700;color:#059669;text-align:right;">${amount}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:14px;color:#6b7280;border-top:1px solid #e5e7eb;">捐款日期</td>
              <td style="padding:8px 0;font-size:14px;color:#374151;text-align:right;border-top:1px solid #e5e7eb;">{date}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:14px;color:#6b7280;border-top:1px solid #e5e7eb;">捐款用途</td>
              <td style="padding:8px 0;font-size:14px;color:#374151;text-align:right;border-top:1px solid #e5e7eb;">{purpose}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:14px;color:#6b7280;border-top:1px solid #e5e7eb;">付款方式</td>
              <td style="padding:8px 0;font-size:14px;color:#374151;text-align:right;border-top:1px solid #e5e7eb;">{payment_method}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:14px;color:#6b7280;border-top:1px solid #e5e7eb;">收據編號</td>
              <td style="padding:8px 0;font-size:14px;color:#374151;text-align:right;border-top:1px solid #e5e7eb;font-family:monospace;">{receipt_number}</td>
            </tr>
          </table>
        </td></tr>
      </table>

      <!-- Note -->
      <p style="font-size:13px;color:#9ca3af;margin:24px 0 0;line-height:1.6;">
        本信件由系統自動寄送，請勿回覆。如需查詢捐款紀錄，請聯絡我們。<br>
        此收據可作為年度所得稅申報列舉扣除額之憑證。
      </p>
    </td></tr>

    <!-- Footer -->
    <tr>
      <td style="background:#f9fafb;padding:24px 32px;text-align:center;border-top:1px solid #e5e7eb;">
        <p style="font-size:12px;color:#9ca3af;margin:0;">{org_name}</p>
      </td>
    </tr>
  </table>
</td></tr></table>
</body>
</html>
"""


# ── Public API ─────────────────────────────────────────────────


def _render_donation_receipt_html(
    donor_name: str,
    amount: str,
    date: str,
    purpose: str,
    payment_method: str,
    receipt_number: str,
) -> str:
    """Render the donation receipt HTML with the given data."""
    return _DONATION_RECEIPT_TPL.format(
        donor_name=donor_name,
        amount=amount,
        date=date,
        purpose=purpose,
        payment_method=payment_method,
        receipt_number=receipt_number,
        org_name=settings.app_name,
    )


def _format_twd(amount: Decimal | float | str) -> str:
    """Format an amount as TWD display string, e.g. 1234 → '1,234'."""
    return f"{Decimal(str(amount)):,.0f}"


_PURPOSE_LABELS: dict[str, str] = {
    "general": "一般捐款",
    "emergency_relief": "急難救助",
    "education": "教育贊助",
    "medical": "醫療援助",
    "other": "其他",
}


def _purpose_label(purpose: str | None) -> str:
    return _PURPOSE_LABELS.get(purpose or "", purpose or "一般捐款")


_METHOD_LABELS: dict[str, str] = {
    "credit_card": "信用卡",
    "postal": "郵政劃撥",
    "cash": "現金",
}


def _method_label(method: str) -> str:
    return _METHOD_LABELS.get(method, method)


def _send_sync(
    to_email: str,
    subject: str,
    html_body: str,
) -> bool:
    """Synchronous email send via SMTP.

    Returns True if sent (or disabled), False on error.
    """
    if not settings.email_enabled:
        logger.info("[email] DISABLED — would send to %s: %s", to_email, subject)
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = f"{settings.email_from_name} <{settings.email_from}>"
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
            if settings.smtp_use_tls:
                server.starttls()
            if settings.smtp_username and settings.smtp_password:
                server.login(settings.smtp_username, settings.smtp_password)
            server.send_message(msg)

        logger.info("[email] Sent to %s: %s", to_email, subject)
        return True
    except Exception:
        logger.exception("[email] Failed to send to %s: %s", to_email, subject)
        return False


async def send_donation_receipt(
    to_email: str,
    donor_name: str,
    amount: Decimal | float | str,
    date: str,
    purpose: str | None,
    payment_method: str,
    receipt_number: str | None,
) -> bool:
    """Send a donation receipt email asynchronously.

    Args:
        to_email:       Recipient email address.
        donor_name:     Display name of the donor.
        amount:         Donation amount.
        date:           Date string (ISO or human-readable).
        purpose:        Donation purpose code (optional).
        payment_method: Payment method code.
        receipt_number: Receipt number (may be None for pending donations).

    Returns:
        True if the email was sent (or email is disabled).
    """
    if not to_email:
        logger.warning("[email] No recipient email — skipping")
        return False

    formatted_amount = _format_twd(amount)
    purpose_label = _purpose_label(purpose)
    method_label = _method_label(payment_method)
    receipt = receipt_number or "待核發"

    subject = f"捐款收據 — {settings.app_name}"

    html = _render_donation_receipt_html(
        donor_name=donor_name,
        amount=formatted_amount,
        date=date,
        purpose=purpose_label,
        payment_method=method_label,
        receipt_number=receipt,
    )

    import asyncio
    return await asyncio.to_thread(_send_sync, to_email, subject, html)


async def notify_donation_success(
    donation: "Donation",
    donor_name: str | None = None,
    to_email: str | None = None,
) -> bool:
    """Convenience wrapper — send receipt email from a ``Donation`` model instance.

    Automatically resolves the recipient email address:
    1. Explicit ``to_email`` argument (priority)
    2. ``donation.guest_email`` (anonymous donation)
    3. ``donation.user.email`` (registered member)

    Args:
        donation:   The Donation ORM instance (must have ``user`` relationship loaded).
        donor_name: Override display name. Falls back to guest_name → user.name → "捐款人".
        to_email:   Override email address. Auto-resolved if omitted.

    Returns:
        True if sent (or email disabled), False on failure or missing email.
    """
    email = to_email or donation.guest_email or (donation.user.email if donation.user else None)
    if not email:
        logger.info("[email] No email for donation %s — skipping", donation.id)
        return False

    name = donor_name or donation.guest_name or (donation.user.name if donation.user else None) or "捐款人"
    date_str = donation.created_at.strftime("%Y 年 %m 月 %d 日") if donation.created_at else "—"

    return await send_donation_receipt(
        to_email=email,
        donor_name=name,
        amount=donation.amount,
        date=date_str,
        purpose=donation.purpose,
        payment_method=donation.payment_method,
        receipt_number=donation.receipt_number,
    )
