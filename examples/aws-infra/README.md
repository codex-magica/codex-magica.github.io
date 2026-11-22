# Example: private hosting behind Google sign-in (AWS + Firebase)

> **This is an example, not part of the app.** Codex Magica itself is a static, local-only web app:
> `npm run dev` / `npm run build` need none of this. This folder is the setup that once hosted a private
> instance for our gaming group, kept as a reference for anyone who wants to put a static single-page app
> behind a **Google sign-in with an email allowlist, without running a backend**.

## What it does

- Serves the production build from a **private S3 bucket through CloudFront**.
- Runs a small **Lambda@Edge** function (Node.js 24) on every request that checks for a valid **Firebase ID
  token** in a cookie, and lets the request through only for a **Google-verified email on an allowlist**.
- Redirects everyone else to a standalone, branded **login page** (`login.html`) that signs in with Google
  via Firebase Auth, sets the cookie and sends the user back.
- Rebuilds and redeploys on every push to `main` with **CodePipeline (V2) + CodeBuild**, over an AWS
  **CodeConnections** link to GitHub.
- Everything is **Terraform**; the allowlist and account-specific settings live in gitignored files.

## Architecture

```mermaid
flowchart LR
    U([Browser]) -->|HTTPS| CF[CloudFront]
    CF -->|viewer request| EDGE["Lambda@Edge<br/>verify Firebase JWT<br/>+ email allowlist"]
    EDGE -->|allowed| S3[("S3<br/>static build")]
    EDGE -.->|"no / expired token"| LOGIN["/login.html"]
    EDGE -.->|"not on the allowlist"| DENIED["/login.html?denied=1"]
    LOGIN -->|Google sign-in| FB[Firebase Auth]
    GH[GitHub main] -->|CodeConnections| CP[CodePipeline] --> CB["CodeBuild<br/>npm ci + build"] -->|"s3 sync + invalidation"| S3
```

## How the sign-in works

```mermaid
sequenceDiagram
    participant B as Browser
    participant E as CloudFront + Lambda@Edge
    participant L as login.html
    participant F as Firebase Auth
    B->>E: GET / (no id_token cookie)
    E-->>B: 302 /login.html
    B->>L: load (public path, not gated)
    L->>F: existing session?
    alt session found (the usual case after the first visit)
        F-->>L: user
        L->>L: mint fresh ID token, set id_token cookie
    else no session
        L->>F: Google popup (once per device)
        F-->>L: user, then set id_token cookie
    end
    L-->>B: redirect to /?signedin=…
    B->>E: GET / (with cookie)
    E->>E: verify RS256 signature, iss, aud, exp,<br/>Google-verified email + allowlist
    E-->>B: 200 from S3
```

Details that make it pleasant to use:

- **Silent renewal.** Firebase ID tokens last about an hour. When one expires, the edge sends the user to
  `login.html`, which finds the persisted Firebase session, mints a fresh token and bounces straight back.
  There's no popup and the user barely sees it.
- **Verified Google accounts only.** The token must come from the Google provider with `email_verified`
  set. Otherwise turning on another sign-in method in Firebase (say, email/password) would let someone
  register an allowlisted address they don't own.
- **No redirect loops.** A valid token that isn't acceptable (not allowlisted, or not a verified Google
  account) goes to `?denied=1`; the login page then signs out, explains, and never auto-redirects. The silent path also stops after three
  automatic redirects in 30 seconds and shows the sign-in button instead.
- **Cache-busting redirects** (`/?signedin=<timestamp>`), so the browser can't serve `/` from its cache and
  skip the edge check.
- **Certificate caching.** The edge function caches Google's public signing certificates for as long as
  their `Cache-Control` header allows.
- **Public paths.** `login.html`, the favicons/logos, the web manifest and `robots.txt` bypass the gate so
  the login page can render.
- **Caching that suits a Vite build.** Content-hashed files under `assets/` are uploaded with a one-year
  `immutable` cache header; `index.html` and the rest with `no-cache`. CloudFront uses the managed
  `CachingOptimized` policy (path-only cache key, compression) and adds the managed security headers
  (HSTS, `nosniff`, frame and referrer policies). HTTP/3 and IPv6 are on.

## Files

| File | What it does |
|---|---|
| `s3.tf` | Private bucket for the build, readable only through CloudFront (Origin Access Control). |
| `cloudfront.tf` | The distribution (managed cache and security-header policies) and the edge function. The allowlist and Firebase project ID are rendered into the function source with `templatefile()`, because Lambda@Edge has no environment variables. |
| `cloudfront_edge.js` | The viewer-request handler: token verification, allowlist check, redirects. |
| `login.html` | The standalone login page (no framework, Firebase loaded from Google's CDN, light and dark theme). The build copies it to the site root. |
| `pipeline.tf`, `buildspec.yaml` | GitHub (CodeConnections) → CodePipeline V2 → CodeBuild (Amazon Linux 2023, Node 22) → `s3 sync` with cache headers + CloudFront invalidation. |
| `backend.tf` | Remote Terraform state in S3 with DynamoDB locking (bucket supplied at init time). |
| `variables.tf`, `locals.tf`, `providers.tf`, `outputs.tf` | Inputs, naming, providers (incl. the `us-east-1` alias Lambda@Edge requires), outputs. |

## Setting it up

Requires Terraform 1.10+ and the AWS provider 6.x.

1. **Firebase.** Create a project, enable **Authentication → Sign-in method → Google**, and register a web
   app. Put its config into the `firebaseConfig` block in `login.html`. After the first deploy, add your
   CloudFront domain under **Authentication → Settings → Authorized domains**.
2. **Terraform.** From this folder:

   ```sh
   cp backend.hcl.example backend.hcl            # your state bucket + lock table
   cp terraform.tfvars.example terraform.tfvars  # allowlist, Firebase project ID, GitHub owner…
   terraform init -backend-config=backend.hcl
   terraform apply
   ```

3. **Approve the GitHub connection.** Terraform creates it in `PENDING` state (see the
   `github_connection_status` output). In the AWS console open **Developer Tools → Settings →
   Connections**, pick the connection and choose **Update pending connection** to install AWS's GitHub app.
   This one step can't be automated.
4. **Deploy.** Push to `main`; the pipeline builds the app, copies `login.html` into `dist/` and syncs it
   to S3. The site URL is the `cloudfront_domain` output.

Changing the allowlist means editing `terraform.tfvars` and running `terraform apply` again; a new edge
function version takes a few minutes to reach every CloudFront location.

## Optional: keep the cookie fresh from inside the app

The app in this repository has no login code, so after the hourly token expiry the next full page load
takes the silent trip through `login.html` described above. If you'd rather keep the cookie fresh while
the app is open (and offer a sign-out button), add Firebase to the app and something like:

```ts
import { initializeApp } from "firebase/app";
import { getAuth, onIdTokenChanged, signOut } from "firebase/auth";

const auth = getAuth(initializeApp(firebaseConfig)); // same config as login.html

// Write every token rotation back to the cookie the edge checks.
onIdTokenChanged(auth, async (user) => {
  if (user) document.cookie = `id_token=${await user.getIdToken()}; Path=/; Secure; SameSite=Lax`;
});

// Sign out: end the Firebase session first (or login.html would silently sign you back in),
// then drop the cookie and reload through the gate.
export const logout = async () => {
  await signOut(auth).catch(() => {});
  document.cookie = "id_token=; Path=/; Secure; SameSite=Lax; Max-Age=0";
  window.location.replace(`${window.location.origin}/?loggedout=${Date.now()}`);
};
```

## Caveats

- The gate protects **files**, not data: it's right for a private static app, but anything the app fetches
  from other services needs its own authorization.
- Lambda@Edge functions must live in `us-east-1` and are slow to delete (replicas linger for a while after
  the distribution lets go of them).
- The Firebase web config in `login.html` is public by design; access control is the allowlist in the edge
  function (and, if you use Firestore, its security rules).
