# convex-env

CLI tool for managing Convex environment variables with support for multiline values (like PEM keys).

## Why?

The Convex CLI doesn't handle multiline environment variables well - values starting with `-----` (like PEM keys) get interpreted as CLI flags. This tool:

- Properly parses `.env` files with multiline quoted values
- Uses `--` flag to prevent CLI from misinterpreting PEM keys
- Syncs between local `.env.convex.*` files and Convex deployments

## Installation

```bash
npm install -g convex-env
# or
pnpm add -g convex-env
```

## Usage

### Pull environment variables from Convex

```bash
# Pull all environments
convex-env pull

# Pull specific environment
convex-env pull development
convex-env pull production
convex-env pull preview --preview-name my-branch

# Dry run (show what would be pulled)
convex-env pull --dry-run
```

### Push environment variables to Convex

```bash
# Push to specific environment
convex-env push development
convex-env push production
convex-env push preview --preview-name my-branch

# Dry run (show what would be pushed)
convex-env push development --dry-run

# Skip override check for preview
convex-env push preview --skip-override-check
```

### Verify local files match Convex

```bash
# Verify all environments
convex-env verify

# Verify specific environment
convex-env verify development
```

## File Structure

The tool expects these files:

```
.env.convex.development    # Development deployment vars
.env.convex.production     # Production deployment vars
.env.convex.preview        # Preview deployment vars

.env.convex-cli.production # Contains CONVEX_DEPLOY_KEY for production CLI access
.env.convex-cli.preview    # Contains CONVEX_DEPLOY_KEY for preview CLI access
```

## Multiline Values

The tool properly handles multiline values like JWT keys:

```env
JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASC...
-----END PRIVATE KEY-----"
```

When pushing, it uses `npx convex env set -- KEY "value"` to prevent the CLI from interpreting `-----` as flags.

## License

MIT
