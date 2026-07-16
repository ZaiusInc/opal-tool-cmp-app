# Deploying TypeScript AI Tools to Optimizely Connect Platform (OCP)

This guide documents the steps required to set up, validate, and deploy AI tools developed using TypeScript into the Optimizely Connect Platform (OCP).

---

## 1. Request Access
You first need an API key from the OCP team. Contact:
- Pawel.Zieba@optimizely.com
- Alexander.Whitney@optimizely.com

---

## 2. Configure the OCP CLI (Mac/Linux)

1. Create a `.ocp` directory:
   ```sh
   mkdir ~/.ocp
   ```

2. Create `credentials.json` in the `.ocp` directory with your API key:
   ```sh
   echo '{"apiKey": "<value-from-invitation>"}' > ~/.ocp/credentials.json
   ```

3. Install the OCP CLI:
   ```sh
   yarn global add @optimizely/ocp-cli
   ```

4. Update your PATH:
   ```sh
   export PATH="$(yarn global bin):$PATH"
   ```

📖 Ref: [Configure your development environment](https://docs.developers.optimizely.com/optimizely-connect-platform/docs/configure-your-development-environment-ocp2)

---

## 3. Verify OCP CLI Configuration
Run:
```sh
ocp accounts whoami
```
Example output:
```sh
id: e1006b36-183e-4951-912c-416012f5a882
email: waqqas.iqbal@optimizely.com
role: developer
githubUsername: waqqasiq
accounts:
  - 7b5d1518a0be
personal_apps: []
vendor: optimizely
vendor_apps: []
```

---

## 4. Node.js & Yarn Requirements
- Install **Node.js v22+**
- Install **Yarn 1.x (classic)**

Check with:
```sh
node -v
yarn -v
```

## 4a. Install Project Dependencies
Once Node.js and Yarn are installed, run:

```sh
# Install all dependencies, including dev dependencies
yarn install
```

---

## 5. Initialize the Repository
```sh
git init
```

---

## 6. Register the App
```sh
ocp app register
```
- Provide a **unique app_id**
- Provide a **display name**
- Choose **Connect Platform**
- Create public: **Y**

---

## 7. App Lifecycle Commands
- Validate app:
  ```sh
  ocp app validate
  ```

- Prepare & publish:
  ```sh
  ocp app prepare --bump-dev-version --publish
  ```

- Install library dependency:
  ```sh
  ocp directory install <YOUR_APP_ID>@<YOUR_APP_VERSION> <PUBLIC_KEY_OCP_ACCOUNT>
  ```

- View logs:
  ```sh
  ocp app logs --appId=<YOUR_APP_ID> --trackerId=<PUBLIC_KEY_OCP_ACCOUNT>
  ```

👉 Note:  
`<PUBLIC_KEY_OCP_ACCOUNT>` - is the private API key of your sandbox OCP account. You can get the value from **Settings → APIs** section in the OCP UI (use the **public API key** before the first dot `.` of the private API key).

---

## 8. Project Structure Overview
Below is the recommended project structure for OCP TypeScript tools:

```
OPAL-TOOL-CMP-OCP/
├── assets/
│   ├── directory/
│   │   └── overview.md   # App presentation in OCP Directory
│   ├── icon.svg          # App icon
│   └── logo.svg          # App logo (150x50 pixels recommended)
│
├── forms/
│   └── settings.yml      # App settings UI (API keys, auth, etc.)
│
├── src/
│   ├── functions/
│   │   └── OpalCMPToolFunction.ts  # Core tool function
│   ├── lifecycle/
│   │   └── Lifecycle.ts            # App lifecycle management
│   ├── cmp.ts
│   └── config.ts
│
├── app.yml               # App metadata (ID, version)
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript configuration
├── eslint.config.mjs     # Linting rules (required for OCP validation)
├── jest.config.js        # Testing config
├── .npmrc                # Access GitHub packages
├── .gitignore            # Ignore node_modules, dist, etc.
└── README.md             # Documentation
```

### Key Notes:
- **Functions**: Implement tool logic in `src/functions/OpalCMPToolFunction.ts` using the SDK.
- **Lifecycle**: Handle authorization and setup in `src/lifecycle/Lifecycle.ts`.
- **Linting**: `eslint.config.mjs` is required — `ocp app validate` will fail if lint errors exist.

---

## 9. Logs & Notifications
Use the logger from `@zaiusinc/app-sdk`:
```ts
import { logger } from '@zaiusinc/app-sdk';

logger.info("Info log");
logger.warn("Warning log");
logger.debug("Debug log");
```

---

## 10. App Overview and Assets in OCP
- Customize your app’s OCP directory presentation in `assets/directory/overview.md`.
- Replace `assets/logo.svg` with your own **150x50px** logo.
- Replace `assets/icon.svg` with your app’s icon.

---

## 11. Tool Registration in Opal
1. Go to your **OCP account** → *Data Setup → App Directory* → find your app.
2. In **Settings tab**, copy the **Opal Tool URL**.
3. In your **Opal account** → *Tools → Registries* → click *Add tool registry*.
4. Enter a **Registry Name**, paste the **Opal Tool URL** as *Discovery URL*.
5. Leave Bearer Token empty and save.

✅ Your tools should now be registered and usable in Opal chat.

---

## 12. Available Custom Tools

This project contains custom AI tools built for customer-specific use cases using the Optimizely Connect Platform (OCP).

### get_task_brief

**Purpose**

Retrieves the details of a CMP task brief, including the associated brief template name.

**Typical Use Case**

Allows AI agents to determine whether a task brief was created using an approved brief template, enabling governance and compliance validation.

---

### get_library_asset_location

**Purpose**

Retrieves CMP library asset metadata using an asset ID, including:

- Asset title
- Folder ID
- Asset location (folder path)

**Typical Use Case**

Enables AI agents to identify where an asset is stored within the CMP Library. For example, verifying whether an asset resides within a supplier-specific folder such as:

`/Suppliers/{Supplier Name}/Images/Logo`

---

### get_library_asset_renditions_to_csv

**Purpose**

Processes a CSV containing CMP asset IDs and returns a CSV containing up to three available renditions for each asset.

Supports optional filtering by rendition type, including:

- WebP
- JPEG
- PNG
- TIFF

**Typical Use Case**

Useful for bulk reporting and migration scenarios where rendition URLs are required, such as exporting the available WebP rendition URLs for a collection of assets.

---

## 13. .npmrc Setup
Create a `.npmrc` file in the project root (add it to `.gitignore`):
```ini
@zaiusinc:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=<GIT_PAT_CLASSIC_TOKEN>
always-auth=true
unsafe-perm=true
```

👉 You’ll need access to the **ZaiusInc GitHub org** and must authorize it when creating your GitHub Personal Access Token.

📧 To request access to the ZaiusInc GitHub organization, send an email to **access@episerver.net** including your GitHub username.

---

## 14. How to Create a Personal Access Token (Classic) in GitHub

1. Go to **[GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)](https://github.com/settings/tokens)**.
2. Click **“Generate new token (classic)”**.
3. Provide a **note** (e.g., “OCP deployment”) and set an **expiration period** (e.g., 90 days).
4. Select these scopes:
   - `read:packages`
   - `write:packages`
   - `repo` *(optional, if you need private repo access)*
5. Click **Generate token** and copy the value.
6. Use this token as `<GIT_PAT_CLASSIC_TOKEN>` in your `.npmrc`.

 **Important:** Treat this token like a password — store it securely and never commit it to version control.


---

## 15. Summary
This README provides:
- Setup for OCP CLI
- Node.js & Yarn requirements
- Project structure guidance
- Logging best practices
- App branding in OCP
- Steps for validation, publishing, and tool registration

With this flow, you can develop, validate, and deploy TypeScript-based AI tools seamlessly into Optimizely Connect Platform (OCP).

