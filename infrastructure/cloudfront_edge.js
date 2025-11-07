import jwt from "jsonwebtoken";
import fetch from "node-fetch";

export const handler = async (event) => {
  const request = event.Records[0].cf.request;
  const headers = request.headers;

  const cookies = headers.cookie?.[0]?.value || "";
  const tokenMatch = cookies.match(/id_token=([^;]+)/);
  const token = tokenMatch?.[1];

  if (!token) {
    // Redirect to Cognito login
    // const redirect = encodeURIComponent(`https://${headers.host[0].value}${request.uri}`);
    const redirect = 'https://dexample000001.cloudfront.net/'
    return {
      status: "302",
      headers: {
        location: [
          {
            key: "Location",
            value: `https://your-domain.auth.eu-central-1.amazoncognito.com/login?client_id=YOUR_COGNITO_CLIENT_ID&response_type=token&scope=email+openid&redirect_uri=${redirect}`
          }
        ]
      }
    };
  }

  return request;

  // eerberber
  // try {
  //   // Verify JWT using Cognito's public keys
  //   const jwks = await fetch(process.env.COGNITO_JWKS_URL).then(r => r.json());
  //   const key = jwks.keys.find(k => k.kid === jwt.decode(token, { complete: true }).header.kid);
  //   const pem = jwkToPem(key);
  //   jwt.verify(token, pem, { algorithms: ["RS256"] });
  //   return request; // allow access
  // } catch {
  //   // Invalid token → redirect to login
  //   return {
  //     status: "302",
  //     headers: {
  //       location: [
  //         {
  //           key: "Location",
  //           value: `https://${process.env.COGNITO_DOMAIN}/login?client_id=${process.env.COGNITO_CLIENT_ID}&response_type=token&scope=email+openid&redirect_uri=https://${headers.host[0].value}`
  //         }
  //       ]
  //     }
  //   };
  // }
};
