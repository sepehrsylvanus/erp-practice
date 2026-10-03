import { test, expect } from '@playwright/test';

test('GET /api', async ({ request }) => {
  const response = await request.get('/api');

  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ message: 'Hello API' });
});
