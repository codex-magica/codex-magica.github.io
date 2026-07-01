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
  "/login.html",
  "/callback.html",
  "/favicon*",
  "/logo*",
  "/manifest*",
  "/robots.txt"
];

// Single source of truth for the Cognito hosted-UI domain + app client id.
// Passed to the custom login page (/login.html), which builds the Google
// authorize URL from them.
const COGNITO_DOMAIN = "your-domain.auth.eu-central-1.amazoncognito.com";
const CLIENT_ID = "YOUR_COGNITO_CLIENT_ID";

export const handler = async (event) => {
  const request = event.Records[0].cf.request;
  const headers = request.headers;
  const uri = request.uri;

  const cookies = headers.cookie?.[0]?.value || "";
  const tokenMatch = cookies.match(/id_token=([^;]+)/);
  const token = tokenMatch?.[1];

  const isPublic = isPublicPath(uri, publicPaths)

  if (!token && !isPublic) {
    // Redirect to our custom branded login page, passing the Cognito domain +
    // client id so it can build the Google sign-in URL. The login page redirects
    // back to /callback.html, which sets the id_token cookie.
    return {
      status: "302",
      headers: {
        location: [
          {
            key: "Location",
            value: `https://${headers.host[0].value}/login.html?cd=${COGNITO_DOMAIN}&ci=${CLIENT_ID}`
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
