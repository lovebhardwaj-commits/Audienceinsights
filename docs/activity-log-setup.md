# Activity log setup (Google Sheet, no database)

Every non-demo report fetch (account, report type, range, success/error, duration) gets
POSTed to a Google Apps Script Web App, which appends one row to a Sheet. Free, no paid
Vercel add-on, no database.

## 1. Create the Sheet

Make a new Google Sheet. Add a header row:

```
Timestamp | Account ID | Report Type | Since | Until | Status | Error Code | Error Message | Duration (ms)
```

## 2. Add the Apps Script

In the Sheet: **Extensions → Apps Script**. Delete any starter code and paste:

```javascript
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);
  sheet.appendRow([
    new Date(data.timestamp),
    data.accountId || "",
    data.reportType || "",
    data.since || "",
    data.until || "",
    data.status || "",
    data.errorCode || "",
    data.errorMessage || "",
    data.durationMs || ""
  ]);
  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}
```

Save the project (any name).

## 3. Deploy as a Web App

1. Click **Deploy → New deployment**.
2. Click the gear icon next to "Select type" → choose **Web app**.
3. Set **Execute as**: Me. Set **Who has access**: Anyone.
4. Click **Deploy**, authorize when prompted.
5. Copy the **Web app URL** it gives you (looks like `https://script.google.com/macros/s/AKfycb.../exec`).

## 4. Wire it into Vercel

In the `ads-reach` Vercel project → **Settings → Environment Variables**, add:

- `ACTIVITY_LOG_WEBHOOK_URL` = the Web app URL from step 3.
- `ACTIVITY_LOG_SHEET_VIEW_URL` = the Sheet's own share link (Share → General access → "Anyone
  with the link" → Viewer → Copy link). This is just what `/logs` links out to — it's not
  read by any code, purely a convenience pointer for your team.

Redeploy (or wait for the next push) to pick up the new env vars.

## 5. Share it

Once set up, `https://ads-reach.vercel.app/logs` shows a link to the actual Sheet — share
that page URL, or just share the Sheet directly. Sharing is controlled entirely by the
Sheet's own Google sharing settings (specific people, or anyone with the link) — nothing
in the app enforces or restricts who can view it.

## Notes

- If `ACTIVITY_LOG_WEBHOOK_URL` isn't set, logging silently no-ops — reports work exactly
  the same either way. Nothing about the merchant-facing app changes.
- Demo-mode sessions are never logged.
- Each log write is fire-and-forget from the server; a failed or slow webhook call never
  delays or breaks a report response.
