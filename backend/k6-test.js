import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 10 },
    { duration: '30s', target: 50 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

function getToken() {
  const res = http.post('http://localhost:8081/api/auth/login',
    JSON.stringify({ email: 'warehouse@test.com', password: 'test1234!' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  return res.json('accessToken');
}

export function setup() {
  return { token: getToken() };
}

export default function (data) {
  const res = http.put(
    'http://localhost:8081/api/stores/4/stocks/5',
    JSON.stringify({ quantity: Math.floor(Math.random() * 100) }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${data.token}`,
      },
    }
  );

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
