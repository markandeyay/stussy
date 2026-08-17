/* ═══════════════════════════════════════════════════════════════════
   CONTACT — Sec. 06, the mail line.

   Front-end only: the form posts to a Google Apps Script web app that
   relays the message as an email. Paste the deployed web-app URL into
   SCRIPT_URL below (see APPS_SCRIPT_SETUP.md at the repo root for the
   script and the deployment steps).

   The POST body is FormData, which keeps the request a "simple"
   request — no CORS preflight, which Apps Script web apps can't answer.
   ═══════════════════════════════════════════════════════════════════ */

const SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbxpGrmOhZHErxbWUq3MJv3kEhzirgmrvZ_GPM9uEFb43xDXUUD8QvX3JsG74jxZU5YQ/exec'

/* good-enough address shape; the real validation is the reply bouncing */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const initContact = () => {
  const form = document.getElementById('mail-form') as HTMLFormElement | null
  if (!form) return

  const status = document.getElementById('mail-status')
  const send = form.querySelector<HTMLButtonElement>('button[type="submit"]')
  const inputs = Array.from(
    form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('.field__input')
  )

  const say = (msg: string, tone: '' | 'ok' | 'bad' = '') => {
    if (!status) return
    status.textContent = msg
    status.classList.toggle('-ok', tone === 'ok')
    status.classList.toggle('-bad', tone === 'bad')
  }

  const mark = (input: HTMLElement, bad: boolean) =>
    input.closest('.field')?.classList.toggle('-bad', bad)

  const validate = () => {
    let firstBad: HTMLElement | null = null
    for (const input of inputs) {
      const value = input.value.trim()
      let bad = input.required && !value
      if (!bad && value && input instanceof HTMLInputElement && input.type === 'email') {
        bad = !EMAIL_RE.test(value)
      }
      mark(input, bad)
      if (bad && !firstBad) firstBad = input
    }
    return firstBad
  }

  /* a corrected field clears its own flag as soon as it's typed in */
  inputs.forEach((input) => {
    input.addEventListener('input', () => mark(input, false))
  })

  form.addEventListener('submit', async (e) => {
    e.preventDefault()

    const firstBad = validate()
    if (firstBad) {
      say('Fill the marked fields', 'bad')
      firstBad.focus()
      return
    }

    if (!SCRIPT_URL) {
      say('Mail line not wired yet — try chapelhill@stussy.ink', 'bad')
      return
    }

    if (send) send.disabled = true
    say('Sending…')

    try {
      const res = await fetch(SCRIPT_URL, { method: 'POST', body: new FormData(form) })
      const out = await res.json().catch(() => null)
      if (!res.ok || (out && out.ok === false)) throw new Error(out?.error || res.statusText)
      form.reset()
      say('Sent — the dove is out', 'ok')
    } catch {
      say('The dove got lost. Try again, or mail chapelhill@stussy.ink', 'bad')
    } finally {
      if (send) send.disabled = false
    }
  })
}
