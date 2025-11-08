export const handler = async (event) => {
  const allowed = JSON.parse(process.env.ALLOWED_EMAILS_JSON || "[]").map(e => e.toLowerCase());
  const email = event?.request?.userAttributes?.email?.toLowerCase();

  if (!email || !allowed.includes(email)) {
    console.warn(`Disallowed SSO user: ${email}`);

    event.response = {
      claimsOverrideDetails: {
        claimsToSuppress: ["email", "sub", "name", "cognito:username"],
        claimsToAddOrOverride: {
          "custom:access_denied": "true"
        }
      }
    };
    return event;
  }

  return event;
};
