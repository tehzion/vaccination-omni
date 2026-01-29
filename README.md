# VaccineManager 2.0

VaccineManager is a modern, offline-first Patient Management System designed for vaccination clinics and outreach programs.

## 🌟 Key Features

### 1. 🏥 Project & Outreach Management
Manage off-site vaccination campaigns efficiently.
*   **Create Projects:** Define campaigns (e.g., "Factory A Booster Check").
*   **Dedicated QR Codes:** Generate a unique QR for each project.
*   **Auto-Fill Defaults:** Set default Vaccine Name, Batch, and Expiry for a project. Any patient scanning that project's QR will have these details pre-filled.
*   **Dashboard:** Track total, waiting, processing, and completed patients per project.

### 2. 📲 Smart Check-in System
*   **Public Kiosk / Mobile Check-in:** Patients use their own phone to scan and check in.
*   **Dual Mode:** 
    *   *General Walk-in:* Standard check-in.
    *   *Project-Linked:* Links patient to a specific company/project automatically.
*   **Bilingual:** Fully supported English and Bahasa Malaysia interface.

### 3. 👨‍⚕️ Clinical Suite (Admin)
Uber-style, touch-friendly interface for doctors and nurses.
*   **Live Queue:** Real-time visibility of waiting patients.
*   **Clinical Notes:** Record vitals (BP, Pulse) and private doctor notes.
*   **AI Scribe:** Integrated OpenAI support to summarize rough notes into professional medical shorthand (Bring Your Own Key).
*   **Vaccine Templates:** Save commonly used batches/vaccines as templates for one-tap entry.

### 4. 📜 Certificates & Reporting
*   **Digital Certs:** Generate secure PDF vaccination certificates instantly.
*   **Email Integration:** Email certificates directly to patients.
*   **CSV Export:** Export full datasets for reporting or government submission.

## 🛠 Technical Stack
*   **Framework:** Next.js 15 (App Router)
*   **Database:** Dexie.js (IndexedDB) - **Offline Ready! Data stays on your device.**
*   **UI:** Tailwind CSS (Premium "Uber-Black" Aesthetic).
*   **AI:** OpenAI GPT-3.5 Turbo (Client-side key Integration).

4.  **Start Queue:** Patients scan QR -> Appear in `Queue` -> Doctor treats & Completes.

## 🚀 Deployment (Vercel / Render)

### 1. Environment Variables
To enable email functionality, you MUST configure the following in your deployment platform:
- `SMTP_HOST`: e.g. `smtp.gmail.com`
- `SMTP_USER`: Your email/username.
- `SMTP_PASS`: Your app password.
- `SMTP_FROM`: e.g. `"My Clinic" <noreply@myclinic.com>`

### 2. Vercel (Recommended)
1. Push this code to a GitHub/GitLab repo.
2. Connect the repo to Vercel.
3. Add the Environment Variables above.
4. Click **Deploy**.

### 3. Render
1. Create a new **Web Service**.
2. Set Build Command: `npm run build`
3. Set Start Command: `npm run start`
4. Add the Environment Variables under the **Environment** tab.

---
*Built for speed, privacy, and ease of use.*
