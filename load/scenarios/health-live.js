import { check, sleep } from 'k6';
import http from 'k6/http';
import { BASE_URL, DURATION, VUS } from '../config.js';

export const options = {
  vus: VUS,
  duration: DURATION,
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<200'],
  },
};

export default function healthLive() {
  const response = http.get(`${BASE_URL}/health/live`);

  check(response, {
    'status is 200': (res) => res.status === 200,
    'body has ok status': (res) => res.json('status') === 'ok',
  });

  sleep(1);
}
