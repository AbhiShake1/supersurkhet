# BYO AI Implementation Changelog (Post-`migration/v2`)

This document outlines the architectural additions, file modifications, and bug fixes applied to the codebase after the last commit on the `migration/v2` branch to support the **Bring Your Own AI (BYO AI)** feature securely.

## 1. New Core Infrastructure (Untracked Files)

### Server-Side Proxies (`apps/site/src/server-functions/ai-proxy.ts`)

* **`executeBoyaiPrompt`**: A TanStack Start server function that accepts a user prompt and a decrypted API key via a secure POST payload. It initializes `@ai-sdk/google` on the backend, runs the inference, and returns the AI's response to the client.
* **`testBoyaiConnection`**: A lightweight, native `fetch()`-based server function designed strictly to validate an API key before storage. It bypasses heavy SDK initialization to prevent opaque server crashes, pinging Google's REST API (`generativelanguage.googleapis.com`) with a tiny payload to confirm a `200 OK` response.

### Decentralized Key Vault (`apps/site/src/components/boyai-settings.tsx` & `routes/boyai-settings.tsx`)

* A dedicated settings page for managing BYO AI credentials.
* Implements a strict pre-save gateway: It `await`s the `testBoyaiConnection` proxy. If the test fails, it halts execution and alerts the user.
* If the test succeeds, it encrypts the raw API key using `SEA.encrypt` (AES-256) with the user's private GunDB key and stores the ciphertext in the decentralized graph (`gun.user().get('boyai_config')`).

### Playground Interface (`apps/site/src/components/boyai-chat.tsx` & `routes/boyai-chat.tsx`)

* A dedicated chat UI to test the stored BYO AI key.
* Retrieves the encrypted key from GunDB, decrypts it in local memory, and passes the plain text key into the `executeBoyaiPrompt` payload.
* *Bugfix:* Refactored the `<form>` submission logic (adding an explicit `onKeyDown` interceptor) to prevent the browser from triggering a default page reload when pressing Enter.

### State Abstraction (`apps/site/src/hooks/use-business-onboarding-session.tsx`)

* Abstracted complex AI configuration state, OAuth flow polling, and provider selection out of the monolithic form component into a modular React Context Provider.
* Integrated the `testModel()` function directly into the hook, allowing any UI component to instantly trigger backend validation and listen to `validationStatus` (`idle`, `validating`, `valid`, `invalid`).

## 2. UI Modifications (`apps/site/src/components/business-creation-form.tsx`)

* **Restoration:** Reverted the component's layout to match the pristine state of the last `migration/v2` commit, restoring the proper inline placement of the `VercelV0Chat` and Step 3 plugin browser.
* **Integration:** Injected the new API validation logic into Step 2.
* **"Test Model" Button:** Added a new secondary button next to the "Save credential" button. It calls `testProviderCredential()` to validate the user's input before they proceed to business generation.
* **Visual Feedback:** Added dynamic rendering to display the AI's success response (`Model response: Connection successful`) in a green badge upon a verified test.

## 3. Critical Bug Fixes & Security Decisions

### The TanStack Start Proxy Bug (`reading 'config'`)

* **Initial Approach:** We attempted to pass the decrypted API key via custom HTTP headers (`{ headers: { 'X-Boyai-Key': apiKey } }`) to keep it out of the JSON payload.
* **The Crash:** This triggered a severe internal crash in the TanStack Start framework (`Cannot read properties of undefined (reading 'config')`) when routing the fetch options through the client proxy.
* **The Resolution:** We abandoned the custom HTTP header approach. We explicitly updated the Zod validators for `testBoyaiConnection` and `executeBoyaiPrompt` to accept `apiKey` directly inside the strongly-typed JSON payload (`data: { apiKey }`). This bypassed the framework bug and successfully transmitted the key over the secure HTTPS tunnel.

### Security Audit Confirmation

* **At Rest:** Secure. Keys are never saved to disk or `localStorage` unencrypted.
* **In Transit:** Secure. The JSON payload is encrypted over the network via standard TLS/HTTPS.
* **In Memory:** Secure. The raw key exists only in active RAM during the brief execution window.
* **Known Loophole Documented:** Developers were warned to configure production server logging (e.g., Morgan, Winston, Sentry) to sanitize `req.body.apiKey` to ensure the JSON payload is not accidentally written to plain-text server logs.

