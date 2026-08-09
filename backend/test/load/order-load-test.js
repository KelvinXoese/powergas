import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * k6 load test — simulates concurrent order browsing.
 * Run: k6 run order-load-test.js
 * Validates API response target of < 200ms under load.
 */
export const options = {
  stages: [
    { duration: '30s', target: 100 },   // ramp to 100 VUs
    { duration: '1m', target: 1000 },    // ramp to 1000 VUs
    { duration: '2m', target: 1000 },    // sustain
    { duration: '30s', target: 0 },      // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'],    // 95% under 200ms
    http_req_failed: ['rate<0.01'],      // <1% errors
  },
};

const BASE = __ENV.BASE_URL || 'http://localhost:3000/api/v1';

export default function () {
  const res = http.get(`${BASE}/stations`);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response < 200ms': (r) => r.timings.duration < 200,
  });
  sleep(1);
}
