from html import escape


def build_password_reset_email(*, client_name: str, reset_url: str, ttl_hours: int) -> tuple[str, str]:
    """Returns (subject, html) for the "reset your password" email. The
    link itself carries the one-time token as a query param; nothing
    sensitive is in this template beyond that URL.
    """
    subject = "Reset your password"
    html = f"""\
<html>
  <body style="font-family: sans-serif; color: #1a1a1a; max-width: 480px; margin: 0 auto;">
    <p>Hi {escape(client_name)},</p>
    <p>We received a request to reset your password. Click the button below to choose a new one:</p>
    <p style="margin: 24px 0;">
      <a href="{escape(reset_url)}"
         style="background:#4338ca;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;">
        Reset password
      </a>
    </p>
    <p style="font-size:13px;color:#666;">
      This link expires in {ttl_hours} hour{"s" if ttl_hours != 1 else ""} and can only be used once.
      If you didn't request this, you can safely ignore this email — your password won't change.
    </p>
    <p style="font-size:12px;color:#888;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      {escape(reset_url)}
    </p>
  </body>
</html>
"""
    return subject, html
