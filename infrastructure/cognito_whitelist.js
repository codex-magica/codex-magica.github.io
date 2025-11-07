import { CognitoIdentityServiceProvider } from 'aws-sdk';

const allowed = JSON.parse(process.env.ALLOWED_EMAILS_JSON || '[]').map(e => e.toLowerCase());

export const handler = async (event) => {
  const email = event?.request?.userAttributes?.email?.toLowerCase();
  if (!email || !allowed.includes(email)) {
    throw new Error('Unauthorized: email not allowed');
  }
  return event;
};
