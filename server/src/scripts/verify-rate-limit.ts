import { withRateLimitRetry, parseRetryAfterMs } from '../integrations/lyzr.js';

/**
 * Deterministic verification of the Lyzr rate-limit handling.
 * No network calls — the request function is stubbed, so this cannot itself
 * trigger or amplify any real rate limit. Run: npm run verify:ratelimit
 */

let failures = 0;
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!cond) failures++;
}

async function main() {
  // --- Case 1: 429 once, then 200 → exactly one retry, then success ---
  {
    let calls = 0;
    const waits: number[] = [];
    const res = await withRateLimitRetry(
      async () => {
        calls++;
        if (calls === 1) {
          return new Response('slow down', { status: 429, headers: { 'retry-after': '2' } });
        }
        return new Response(JSON.stringify({ response: 'ok' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      },
      { sleep: async (ms) => void waits.push(ms) },
    );
    check('429 then 200 → success', res.status === 200);
    check('exactly one retry attempted', calls === 2, `calls=${calls}`);
    check('honored Retry-After: 2s', waits[0] === 2000, `waited=${waits[0]}ms`);
  }

  // --- Case 2: 429 forever → bounded, stops after maxRetries+1 attempts ---
  {
    let calls = 0;
    const res = await withRateLimitRetry(
      async () => {
        calls++;
        return new Response('nope', { status: 429 });
      },
      { maxRetries: 1, sleep: async () => {} },
    );
    check('persistent 429 returns 429 to caller', res.status === 429);
    check('does not retry unboundedly (2 attempts total)', calls === 2, `calls=${calls}`);
  }

  // --- Case 3: Retry-After is capped at maxWaitMs ---
  {
    let calls = 0;
    let waited = -1;
    await withRateLimitRetry(
      async () => {
        calls++;
        if (calls === 1) {
          return new Response('', { status: 429, headers: { 'retry-after': '9999' } });
        }
        return new Response('{}', { status: 200 });
      },
      { maxWaitMs: 5000, sleep: async (ms) => void (waited = ms) },
    );
    check('huge Retry-After is capped at maxWaitMs', waited === 5000, `waited=${waited}ms`);
  }

  // --- Case 4: non-429 errors are not retried ---
  {
    let calls = 0;
    const res = await withRateLimitRetry(
      async () => {
        calls++;
        return new Response('boom', { status: 500 });
      },
      { sleep: async () => {} },
    );
    check('500 is not retried', calls === 1 && res.status === 500, `calls=${calls}`);
  }

  // --- Case 5: Retry-After parsing ---
  {
    check('parses seconds', parseRetryAfterMs('3') === 3000);
    check('parses HTTP date', parseRetryAfterMs(new Date(Date.now() + 4000).toUTCString())! >= 3000);
    check('null on garbage', parseRetryAfterMs('not-a-date') === null);
  }

  console.log(`\n${failures === 0 ? '✅ all rate-limit checks passed' : `❌ ${failures} check(s) failed`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('verification crashed:', err);
  process.exit(1);
});
