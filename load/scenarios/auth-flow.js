import { check, sleep } from 'k6';
import http from 'k6/http';
import { BASE_URL, DURATION, VUS } from '../config.js';

export const options = {
  vus: Math.min(VUS, 5),
  duration: DURATION,
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<500'],
  },
};

export default function authFlow() {
  const email = `load-${__VU}-${__ITER}@example.com`;
  const payload = JSON.stringify({
    name: 'Load Test User',
    email,
    password: 'password123',
  });

  const registerResponse = http.post(`${BASE_URL}/api/v1/auth/register`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(registerResponse, {
    'register succeeds': (res) => res.status === 201,
  });

  const loginResponse = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ email, password: 'password123' }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  check(loginResponse, {
    'login succeeds': (res) => res.status === 200,
  });

  sleep(1);
}
