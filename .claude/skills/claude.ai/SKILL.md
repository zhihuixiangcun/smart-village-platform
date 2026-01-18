---
name: vercel-deploy-claimable
description: Deploy applications and websites to Vercel instantly. Designed for use with claude.ai and Claude Desktop to enable deployments directly from conversations. Deployments are "claimable" - users can transfer ownership to their own Vercel account.

Use when:
  "Deploy my app"
  "Deploy this to production"
  "Deploy and give me a link"

---

## How It Works

### Auto-detects Frameworks

The skill automatically detects which framework your project uses:
- **Next.js** - 13.5+ via `next.config.js`
- **Vite** - via `vite.config.js`
- **Astro** - via `astro.config.mjs`
- **Remix** - via `remix.config.js`
- **Nuxt.js** - via `nuxt.config.js`
- **Gatsby** - via `gatsby-config.js`

### Package Your Project

1. Zips your project:
   ```bash
   zip -r project-folder project.zip
   ```

2. Detects framework automatically

3. Uploads to Vercel:
   ```bash
   npx vercel deploy project.zip
   ```

4. Claim ownership:
   - After successful deployment, the skill helps you claim ownership
   - Updates your `.vercel/project.json` with the deployment URL

## Output

Deployment successful!

Preview URL: https://skill-deploy-abc123.vercel.app
Claim URL: https://vercel.com/claim-deployment?code=...

### Features

**Instant Deployment** - No manual build steps
**Framework Detection** - Supports all major frameworks
**Claim Ownership Transfer** - Easy claim management
**Auto-upload** - Includes node_modules, .git, .next directory
**Project Validation** - Ensures valid Vercel project structure
**Error Handling** - Clear error messages with actionable steps

## Configuration

The skill has no configuration. Just use it with your project directory.

---

## Example Usage

```bash
# Deploy your Next.js app to Vercel
npx vercel deploy my-nextjs-app

# Claim ownership
npx vercel claim my-project --yes
```

---

## Installation

```bash
npx add-skill vercel-labs/agent-skills
```

---

## License

MIT
