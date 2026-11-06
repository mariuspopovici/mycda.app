import { expect } from '@playwright/test'

const AUTH_EMULATOR = 'http://127.0.0.1:9099'

/** The code in the latest verification email the Auth emulator "sent" to this address. */
export async function verificationCode (email) {
  let code
  await expect.poll(async () => {
    const res = await fetch(`${AUTH_EMULATOR}/emulator/v1/projects/demo-mycda/oobCodes`)
    const { oobCodes } = await res.json()
    code = oobCodes.findLast((c) => c.email === email && c.requestType === 'VERIFY_EMAIL')?.oobCode
    return code
  }).toBeTruthy()
  return code
}

/** Fills in the sign-up form; the new account then waits on the verification page. */
export async function fillSignUp (page, email, password = 'secret123') {
  await page.goto('/signup')
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email)
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill(password)
  await page.getByRole('textbox', { name: 'Repeat password', exact: true }).fill(password)
  await page.getByRole('checkbox', { name: /I accept/ }).check()
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('heading', { name: 'Verify your email' })).toBeVisible()
}

/** Verifies the address as the emailed link would, then continues from the verification page to the profile. */
export async function verifyEmail (page, email) {
  const oobCode = await verificationCode(email)
  const res = await fetch(`${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:update?key=demo-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oobCode })
  })
  expect(res.ok).toBe(true)
  await page.getByRole('button', { name: "I've verified my email" }).click()
  await expect(page.getByRole('button', { name: 'Save preferences' })).toBeVisible()
}

/** Signs up and verifies the email address, leaving the page on the welcome profile. */
export async function signUp (page, email, password = 'secret123') {
  await fillSignUp(page, email, password)
  await verifyEmail(page, email)
}
