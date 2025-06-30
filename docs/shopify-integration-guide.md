# **Architectural & Implementation Guide: Secure Shopify API Integration**

*Version 5.0 - June 12, 2025*
*Status: Final, Hardened, Ready for Implementation*

## **1.0 Document Mandate & Strategic Overview**

### **1.1. Objective**
This document is the **final, master technical specification** for integrating the Tiptop Brush Vault application with the Shopify platform. It incorporates all security mandates from multiple rounds of system integrity audits. Its purpose is to detail the end-to-end process for establishing a cryptographically secure communication channel, authenticating users, and verifying product ownership.

### **1.2. Strategic Importance**
This integration is the cornerstone of our business model. Adherence to this specification is non-negotiable. Any deviation introduces unacceptable risk to our intellectual property and customer trust. This guide is the **single source of truth** for all related development.

---

## **2.0 Architectural Blueprint: The Serverless Security Model**

The architecture is built on a **trusted intermediary** model using Vercel Serverless Functions. The frontend client application is **never** permitted to handle, store, or transmit sensitive API credentials.

---

## **3.0 Part I: Infrastructure Setup - Shopify Custom App Configuration**

This foundational setup must be completed and verified before any code is written.

### **3.1. Procedure: Custom App Creation**
1.  Navigate to **Shopify Admin > Settings > Apps and sales channels**.
2.  Click **Develop apps for your store** > **Create a custom app**.
3.  **App name:** `Brush Vault Authentication Service`.
4.  **App developer:** Assign your primary developer email account.

### **3.2. Procedure: Configuring API Scopes**
We will adhere to the principle of least privilege.
1.  In the new app's configuration, select **Configure Admin API scopes**.
2.  Check the following scopes **only**: `read_products`, `read_customers`, `read_orders`.
3.  **Save** the configuration.

---

## **4.0 Part II: Credential Management & Secure Storage**

### **4.1. Procedure: API Credential Generation**
1.  Navigate to the **API credentials** tab. Click **Install app**.
2.  **CRITICAL:** The **Admin API access token** will be revealed **ONCE**. Copy it immediately and store it securely.

### **4.2. Procedure: Secure Credential Storage in Vercel**
These credentials must be stored as encrypted Environment Variables in the Vercel project settings. They must **NEVER** be committed to git.

1.  Navigate to your `brushvault` project on Vercel: **Settings > Environment Variables**.
2.  Create the following variables for all environments:

| Variable Name                 | Value                                                   | Notes                                           |
| ----------------------------- | ------------------------------------------------------- | ----------------------------------------------- |
| `SHOPIFY_API_KEY`             | The **API key** from Shopify.                           | -                                               |
| `SHOPIFY_API_SECRET`          | The **API secret key** from Shopify.                    | -                                               |
| `SHOPIFY_API_ADMIN_TOKEN`     | The **Admin API access token** (`shpat_...`).             | -                                               |
| `SHOPIFY_STORE_URL`           | `https://[your-store-name].myshopify.com`               | -                                               |
| `SHOPIFY_APP_URL`             | `https://vault.tiptopbrushes.com`                       | -                                               |
| `SHOPIFY_REDIRECT_URI`        | `https://vault.tiptopbrushes.com/api/auth/callback`     | **Configuration typo corrected.**               |
| `ENCRYPTION_SECRET`           | A **newly generated 32-character random string.**       | For session encryption.                         |
| `NODE_ENV`                    | `production`                                            | To control logging and library behavior.        |

---

## **5.0 Part III: Hardened Authentication Flow - Technical Sequence (OAuth 2.0)**

This section details the definitive, security-hardened authentication flow.

1.  **Initiation & CSRF Protection (Backend API - `/api/auth/login`):**
    *   User is directed to `/api/auth/login`.
    *   The backend function generates a cryptographically random `state` string.
    *   It **saves this `state` value into the user's session cookie.**
    *   It constructs the Shopify authorization URL, including the `&state=${stateValue}` parameter.
    *   It responds with a 302 Redirect, sending the user to Shopify.

2.  **User Authentication (Shopify-Side):**
    *   User logs into Shopify and consents.
    *   Shopify redirects the user back to our `SHOPIFY_REDIRECT_URI`, appending a temporary `code`, the `shop`, and the `state` parameter.

3.  **Token Exchange & Multi-Factor Validation (Backend API - `/api/auth/callback`):**
    This function must execute the following validation steps **in this exact order**. If any step fails, it must immediately abort and return a generic error.
    *   **Step 3a: `state` Parameter Validation (CSRF Prevention):** Extract the `state` from the incoming URL. Compare it to the `state` stored in the session cookie. **If they do not match, abort.**
    *   **Step 3b: `shop` Parameter Validation (SSRF/Redirect Prevention):** Extract the `shop` parameter from the incoming URL. Sanitize it to ensure it is a valid hostname format. Compare the sanitized hostname against the `SHOPIFY_STORE_URL` environment variable's hostname. **If they do not match, abort.**
    *   **Step 3c: Authorization Code Exchange:** Only after both `state` and `shop` are validated, proceed with the secure, server-to-server `POST` request to `https://${shop}/admin/oauth/access_token` to exchange the `{ client_id, client_secret, code }` for a permanent user `access_token`. Handle any errors from Shopify (e.g., from a replayed code) gracefully.

4.  **Session Finalization & Regeneration (Backend API):**
    *   **Step 4a: Session ID Regeneration (Session Fixation Prevention):** Upon successfully receiving the `access_token`, **explicitly command the session library to regenerate the session ID.** This issues a new, unknown session identifier to the user, invalidating the pre-authentication session.
    *   **Step 4b: Session Creation:** Update the new session, storing the permanent, encrypted `access_token`.
    *   **Step 4c:** Set the new session cookie and redirect the user back to the application's root (`/`).

## **6.0 Part IV: Purchase Verification & Secure Logging**

### **6.1. Purchase Verification Flow**
This flow remains as previously specified, relying on the secure session established in Part III. The backend `/api/verify-purchase` endpoint will use the session's access token to query the Shopify GraphQL Admin API.

### **6.2. Secure Logging Protocol**
*   **Requirement:** No sensitive data (tokens, session data, personally identifiable information) may be written to production logs.
*   **Implementation:** All serverless functions must be wrapped in a master `try...catch` block. The `catch` block must log a generic error message with a unique request ID, but it **must not** log the full `error` object or the `request` object itself in a production environment (i.e., when `process.env.NODE_ENV === 'production'`). Sensitive variables must be explicitly filtered or redacted from any logging service.

---

This specification is now **final and approved for implementation.**