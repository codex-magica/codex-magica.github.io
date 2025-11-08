// import jwt from "jsonwebtoken";
// import fetch from "node-fetch";

function isPublicPath(uri, patterns) {
  return patterns.some(pattern => {
    // Escape regex special chars except '*'
    const regexPattern = '^' + pattern
      .replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&') // escape regex meta chars
      .replace(/\*/g, '.*') + '$';             // convert * → .*
    return new RegExp(regexPattern).test(uri);
  });
}

const publicPaths = [
  "/callback.html",
  "/favicon*",
  "/logo*",
  "/manifest*",
  "/robots.txt"
];

export const handler = async (event) => {
  const request = event.Records[0].cf.request;
  const headers = request.headers;
  const uri = request.uri;

  const cookies = headers.cookie?.[0]?.value || "";
  const tokenMatch = cookies.match(/id_token=([^;]+)/);
  const token = tokenMatch?.[1];

  const isPublic = isPublicPath(uri, publicPaths)

  if (!token && !isPublic) {
    // Redirect to Cognito login
    // const redirect = encodeURIComponent(`https://${headers.host[0].value}${request.uri}`);
    const redirect = encodeURIComponent('https://dexample000001.cloudfront.net/callback.html');
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
