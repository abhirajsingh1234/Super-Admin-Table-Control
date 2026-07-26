const BASE = 'http://localhost:5000/api';

const req = async (method, path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
};

export const api = {
  get: (path) => req('GET', path),
  post: (path, body) => req('POST', path, body),
  del: (path) => req('DELETE', path),
};