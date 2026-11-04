import { expect, test } from '@playwright/test'

test('redirects an anonymous visitor to login', async ({ page }) => {
  await page.goto('/objects')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Вход в CRM' })).toBeVisible()
})
