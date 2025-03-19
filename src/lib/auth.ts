import { CONFIG } from './config';

const KRATOS_URL = CONFIG.auth.kratosUrl;

export async function getSession() {
  try {
    const response = await fetch(`${KRATOS_URL}/sessions/whoami`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (err) {
    console.error('Session check failed:', err);
    return null;
  }
} 