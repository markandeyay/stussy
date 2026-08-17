# Mail form — Google Apps Script setup

> **Status: LIVE.** The `stussy-mail-line` project is deployed under
> markandeyayalamanchi9@gmail.com and its URL is wired into
> `site/src/contact.ts`. Messages go to both
> markandeyayalamanchi9@gmail.com and williamkeffer2005@gmail.com.
> The steps below are kept for reference (e.g. redeploying after a
> script edit, or changing recipients).

The "Send Word" form (Sec. 06 at the bottom of the site) is pure front-end.
It POSTs the four fields — `name`, `email`, `phone`, `message` — to a Google
Apps Script **web app**, which relays them to your inbox as an email. Until
the web app URL is pasted into the site, the form shows
"Mail line not wired yet" instead of sending.

Follow these steps once; it takes about five minutes.

## 1. Create the script

1. Go to <https://script.google.com> (signed in as the Google account that
   should **send** the mail, e.g. `markandeyayalamanchi9@gmail.com`).
2. Click **New project**, name it something like `stussy-mail-line`.
3. Replace the contents of `Code.gs` with:

```javascript
// Where the messages land. Comma-separated for multiple inboxes.
const RECIPIENT = 'markandeyayalamanchi9@gmail.com,williamkeffer2005@gmail.com'

function doPost(e) {
  const p = (e && e.parameter) || {}
  const name = String(p.name || '').trim()
  const email = String(p.email || '').trim()
  const phone = String(p.phone || '').trim()
  const message = String(p.message || '').trim()

  // mirror the front-end rules: name, email and message are required
  if (!name || !email || !message) {
    return json({ ok: false, error: 'Missing required fields.' })
  }

  MailApp.sendEmail({
    to: RECIPIENT,
    replyTo: email, // hitting "Reply" answers the visitor directly
    subject: 'Stüssy Chapel Hill — message from ' + name,
    body: [
      'New message from the Send Word form:',
      '',
      'Name:    ' + name,
      'Email:   ' + email,
      'Phone:   ' + (phone || '—'),
      '',
      'Message:',
      message,
    ].join('\n'),
  })

  return json({ ok: true })
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON)
}
```

4. **Save** (Ctrl+S).

## 2. Deploy it as a web app

1. Click **Deploy → New deployment**.
2. Click the gear next to "Select type" and pick **Web app**.
3. Set:
   - **Description**: anything (`mail line v1`)
   - **Execute as**: **Me** (your account — this is what lets MailApp send)
   - **Who has access**: **Anyone** (required so the site can POST without a
     Google login; the script only ever sends mail to `RECIPIENT`, so this
     exposes nothing)
4. Click **Deploy**, then **Authorize access** and approve the permissions
   prompt for your account (it will warn that the app is unverified — choose
   *Advanced → Go to stussy-mail-line*; it is your own script).
5. Copy the **Web app URL**. It looks like:
   `https://script.google.com/macros/s/AKfycb.../exec`

## 3. Wire the site to it

1. Open `site/src/contact.ts`.
2. Paste the URL into the constant at the top:

```ts
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycb.../exec'
```

3. Commit and push — Vercel redeploys, done.

## 4. Test it

Fill the form on the live site with your own details and hit **Send it**.
You should see "Sent — the dove is out" and the email should arrive at
`RECIPIENT` within seconds. Reply to it to confirm `replyTo` points back at
the address typed into the form.

## Notes

- **Updating the script later**: after editing `Code.gs` you must
  **Deploy → Manage deployments → edit (pencil) → Version: New version →
  Deploy**. Just saving the file does *not* change the live URL's behavior.
  The URL stays the same, so the site needs no change.
- **Quota**: consumer Gmail accounts can send ~100 emails/day via MailApp —
  plenty for a contact form.
- **Spam**: the form has no captcha. If bots ever find it, cheap fixes are a
  hidden honeypot field (drop the mail if it's filled) or a per-minute
  `CacheService` rate limit inside `doPost`.
