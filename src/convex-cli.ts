import { execSync, spawn } from "child_process"

export interface ConvexEnvOptions {
  envFile?: string
  previewName?: string
}

function buildCliArgs(options: ConvexEnvOptions): string[] {
  const args: string[] = []
  if (options.envFile) {
    args.push("--env-file", options.envFile)
  }
  if (options.previewName) {
    args.push("--preview-name", options.previewName)
  }
  return args
}

/**
 * List all env vars from a Convex deployment
 */
export function listEnvVars(options: ConvexEnvOptions = {}): string {
  const args = ["convex", "env", "list", ...buildCliArgs(options)]
  try {
    return execSync(`npx ${args.join(" ")}`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    })
  } catch (error) {
    if (error instanceof Error && "stderr" in error) {
      console.error("Failed to list env vars:", (error as any).stderr)
    }
    throw error
  }
}

/**
 * Set a single env var on a Convex deployment
 * Uses -- for values starting with - (like PEM keys) to prevent CLI from interpreting them as flags
 */
export async function setEnvVar(
  key: string,
  value: string,
  options: ConvexEnvOptions = {}
): Promise<boolean> {
  const baseArgs = ["convex", "env", ...buildCliArgs(options), "set"]

  // For values starting with - or multiline, use -- to stop option parsing
  const needsDoubleDash = value.startsWith("-") || value.includes("\n")

  const args = needsDoubleDash
    ? [...baseArgs, "--", key, value]
    : [...baseArgs, key, value]

  return new Promise((resolve) => {
    const proc = spawn("npx", args, {
      stdio: ["pipe", "pipe", "pipe"],
    })

    let stderr = ""
    proc.stderr?.on("data", (data) => {
      stderr += data.toString()
    })

    proc.on("close", (code) => {
      if (code !== 0) {
        console.error(`  Warning: Failed to set ${key}`)
        if (stderr) console.error(`  ${stderr}`)
        resolve(false)
      } else {
        resolve(true)
      }
    })
  })
}

/**
 * Get a single env var from a Convex deployment
 */
export function getEnvVar(key: string, options: ConvexEnvOptions = {}): string | null {
  const args = ["convex", "env", "get", key, ...buildCliArgs(options)]
  try {
    return execSync(`npx ${args.join(" ")}`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim()
  } catch {
    return null
  }
}
