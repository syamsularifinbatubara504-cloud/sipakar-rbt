/**
 * Google OAuth 2.0 Configuration
 * Verifikasi ID token dari frontend Google Sign-In
 */
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config();

const DEFAULT_CLIENT_ID = '673992786221-eom0c8k7samudu3rtmuenlcdnh2gcank.apps.googleusercontent.com';
const GOOGLE_CLIENT_ID = (process.env.GOOGLE_CLIENT_ID || DEFAULT_CLIENT_ID).trim();
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

/**
 * Verifikasi Google ID Token
 * @param {string} idToken - Token dari Google Sign-In di frontend
 * @returns {object} Payload user (sub, email, name, picture)
 */
async function verifyGoogleToken(idToken) {
  try {
    const ticket = await client.verifyIdToken({
      idToken: idToken,
      audience: [GOOGLE_CLIENT_ID, DEFAULT_CLIENT_ID],
    });
    const payload = ticket.getPayload();
    return {
      googleId: payload['sub'],
      email: payload['email'],
      name: payload['name'],
      picture: payload['picture'],
      emailVerified: payload['email_verified'] !== false,
    };
  } catch (error) {
    console.error('Google token verification failed:', error.message);
    throw new Error(`Verifikasi token Google gagal: ${error.message}`);
  }
}

module.exports = { verifyGoogleToken, GOOGLE_CLIENT_ID };
