import { readFileSync, existsSync } from "fs"
import { listEnvVars, setEnvVar, ConvexEnvOptions } from "../convex-cli.js"
import { parseEnvFile, parseConvexEnvList } from "../env-parser.js"
import * as readline from "readline"

interface PushOptions {
  previewName: string
  dryRun?: boolean
  skipOverrideCheck?: boolean
}

type Environment = "development" | "dev" | "production" | "prod" | "preview"

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

export async function push(environment: Environment, options: PushOptions): Promise<void> {
  let name: string
  let inputFile: string
  let cliOptions: ConvexEnvOptions

  switch (environment) {
    case "development":
    case "dev":
      const devConfig = ENV_FILES.development
      name = devConfig.name
      inputFile = devConfig.file
      cliOptions = devConfig.options
      break
    case "production":
    case "prod":
      const prodConfig = ENV_FILES.production
      name = prodConfig.name
      inputFile = prodConfig.file
      cliOptions = prodConfig.options
      break
    case "preview":
      name = `Preview (${options.previewName})`
      inputFile = ".env.convex.preview"
      cliOptions = {
        envFile: ".env.convex-cli.preview",
        previewName: options.previewName,
      }
      break
    default:
      console.error(`Unknown environment: ${environment}`)
      process.exit(1)
  }

  if (!existsSync(inputFile)) {
    console.error(`Error: ${inputFile} not found`)
    process.exit(1)
  }

  // For preview, check dev/prod have overrides
  if (environment === "preview" && !options.skipOverrideCheck) {
    const shouldContinue = await checkDevProdOverrides(inputFile, options)
    if (!shouldContinue) {
      console.log("Aborted.")
      process.exit(1)
    }
  }

  console.log(`=== Push ${inputFile} ===`)
  console.log("")

  const content = readFileSync(inputFile, "utf-8")
  const vars = parseEnvFile(content)

  for (const [key, value] of vars) {
    if (options.dryRun) {
      const displayValue = value.includes("\n") ? "<multiline value>" : "<value>"
      console.log(`[dry-run] convex env set "${key}" ${displayValue}`)
    } else {
      console.log(`Setting ${key}...`)
      await setEnvVar(key, value, cliOptions)
    }
  }

  if (environment === "preview") {
    console.log("")
    console.log("📋 Remember: Set these as Project Defaults in Convex Dashboard")
    console.log("   (CLI can only push to specific preview, not defaults)")
  }

  console.log("")
  console.log("Done!")
}

async function checkDevProdOverrides(previewFile: string, options: PushOptions): Promise<boolean> {
  console.log("=== Checking dev/prod have overrides ===")
  console.log("")

  const content = readFileSync(previewFile, "utf-8")
  const previewVars = parseEnvFile(content)

  // Get dev and prod vars
  let devVars: Set<string>
  let prodVars: Set<string>

  try {
    const devOutput = listEnvVars({})
    devVars = new Set(parseConvexEnvList(devOutput).keys())
  } catch {
    devVars = new Set()
  }

  try {
    const prodOutput = listEnvVars({ envFile: ".env.convex-cli.production" })
    prodVars = new Set(parseConvexEnvList(prodOutput).keys())
  } catch {
    prodVars = new Set()
  }

  const missingDev: string[] = []
  const missingProd: string[] = []

  for (const key of previewVars.keys()) {
    if (!devVars.has(key)) missingDev.push(key)
    if (!prodVars.has(key)) missingProd.push(key)
  }

  if (missingDev.length === 0) {
    console.log("✓ Dev has all overrides")
  } else {
    console.log(`⚠️  Dev missing overrides for: ${missingDev.join(", ")}`)
  }

  if (missingProd.length === 0) {
    console.log("✓ Prod has all overrides")
  } else {
    console.log(`⚠️  Prod missing overrides for: ${missingProd.join(", ")}`)
  }

  console.log("")

  if (missingDev.length > 0 || missingProd.length > 0) {
    console.log("Preview vars become defaults - dev/prod should override them!")
    console.log("Add missing vars to dev/prod before pushing to preview.")
    console.log("")

    if (options.dryRun) {
      return true
    }

    return await confirm("Continue anyway? (y/N) ")
  }

  return true
}

function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === "y")
    })
  })
}
