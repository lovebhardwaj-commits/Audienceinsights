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

Redeploy (or wait for the next push) to pick up the new env var.

## 5. Share it

There's nothing to configure in the app for this — share the Sheet itself directly
(Share → add people, or "Anyone with the link"). `/logs` on the live site just confirms
whether logging is wired up; the Sheet is where the actual data and sharing controls live.

## Notes

- If `ACTIVITY_LOG_WEBHOOK_URL` isn't set, logging silently no-ops — reports work exactly
  the same either way. Nothing about the merchant-facing app changes.
- Demo-mode sessions are never logged.
- Each log write is fire-and-forget from the server; a failed or slow webhook call never
  delays or breaks a report response.
