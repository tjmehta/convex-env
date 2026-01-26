import { readFileSync, existsSync } from "fs"
import { listEnvVars, ConvexEnvOptions } from "../convex-cli.js"
import { parseEnvFile, parseConvexEnvList } from "../env-parser.js"

interface VerifyOptions {
  previewName: string
}

type Environment = "development" | "dev" | "production" | "prod" | "preview" | "all"

const ENV_FILES: Record<string, { name: string; file: string; options: ConvexEnvOptions }> = {
  development: {
    name: "Development",
    file: ".env.convex.development",
    options: {},
  },
  production: {
    name: "Production",
    file: ".env.convex.production",
    options: { envFile: ".env.convex-cli.production" },
  },
}

export async function verify(environment: Environment, options: VerifyOptions): Promise<void> {
  const envsToVerify: string[] = []

  switch (environment) {
    case "development":
    case "dev":
      envsToVerify.push("development")
      break
    case "production":
    case "prod":
      envsToVerify.push("production")
      break
    case "preview":
      envsToVerify.push("preview")
      break
    case "all":
      envsToVerify.push("development", "production", "preview")
      break
    default:
      console.error(`Unknown environment: ${environment}`)
      process.exit(1)
  }

  let allPassed = true

  for (const env of envsToVerify) {
    const passed = await verifyEnvironment(env, options)
    if (!passed) allPassed = false
  }

  console.log("")
  if (allPassed) {
    console.log("✓ All environments in sync!")
  } else {
    console.log("⚠️  Some environments are out of sync")
    process.exit(1)
  }
}

async function verifyEnvironment(env: string, options: VerifyOptions): Promise<boolean> {
  let name: string
  let localFile: string
  let cliOptions: ConvexEnvOptions

  if (env === "preview") {
    name = `Preview (${options.previewName})`
    localFile = ".env.convex.preview"
    cliOptions = {
      envFile: ".env.convex-cli.preview",
      previewName: options.previewName,
    }
  } else {
    const config = ENV_FILES[env]
    if (!config) {
      console.error(`Unknown environment: ${env}`)
      return false
    }
    name = config.name
    localFile = config.file
    cliOptions = config.options
  }

  console.log(`=== Verifying ${name} ===`)

  if (!existsSync(localFile)) {
    console.log(`  ⚠️  Local file ${localFile} not found`)
    console.log("")
    return false
  }

  try {
    // Get local vars
    const localContent = readFileSync(localFile, "utf-8")
    const localVars = parseEnvFile(localContent)

    // Get remote vars
    const remoteOutput = listEnvVars(cliOptions)
    const remoteVars = parseConvexEnvList(remoteOutput)

    // Compare
    const missingRemote: string[] = []
    const missingLocal: string[] = []
    const different: string[] = []

    for (const [key, localValue] of localVars) {
      const remoteValue = remoteVars.get(key)
      if (remoteValue === undefined) {
        missingRemote.push(key)
      } else if (remoteValue !== localValue) {
        different.push(key)
      }
    }

    for (const key of remoteVars.keys()) {
      if (!localVars.has(key)) {
        missingLocal.push(key)
      }
    }

    let passed = true

    if (missingRemote.length > 0) {
      console.log(`  ⚠️  Missing on remote: ${missingRemote.join(", ")}`)
      passed = false
    }

    if (missingLocal.length > 0) {
      console.log(`  ⚠️  Missing locally: ${missingLocal.join(", ")}`)
      passed = false
    }

    if (different.length > 0) {
      console.log(`  ⚠️  Values differ: ${different.join(", ")}`)
      passed = false
    }

    if (passed) {
      console.log(`  ✓ ${localVars.size} vars in sync`)
    }

    console.log("")
    return passed
  } catch (error) {
    console.log(`  ⚠️  Failed to verify: ${error}`)
    console.log("")
    return false
  }
}
