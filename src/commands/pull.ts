import { writeFileSync } from "fs"
import { listEnvVars, ConvexEnvOptions } from "../convex-cli.js"
import { parseConvexEnvList, formatEnvFile } from "../env-parser.js"

interface PullOptions {
  previewName: string
  dryRun?: boolean
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

export async function pull(environment: Environment, options: PullOptions): Promise<void> {
  const envsToPull: string[] = []

  switch (environment) {
    case "development":
    case "dev":
      envsToPull.push("development")
      break
    case "production":
    case "prod":
      envsToPull.push("production")
      break
    case "preview":
      envsToPull.push("preview")
      break
    case "all":
      envsToPull.push("development", "production", "preview")
      break
    default:
      console.error(`Unknown environment: ${environment}`)
      process.exit(1)
  }

  for (const env of envsToPull) {
    await pullEnvironment(env, options)
  }

  console.log("\nDone!")
}

async function pullEnvironment(env: string, options: PullOptions): Promise<void> {
  let name: string
  let outputFile: string
  let cliOptions: ConvexEnvOptions

  if (env === "preview") {
    name = `Preview (${options.previewName})`
    outputFile = ".env.convex.preview"
    cliOptions = {
      envFile: ".env.convex-cli.preview",
      previewName: options.previewName,
    }
  } else {
    const config = ENV_FILES[env]
    if (!config) {
      console.error(`Unknown environment: ${env}`)
      return
    }
    name = config.name
    outputFile = config.file
    cliOptions = config.options
  }

  console.log(`=== Convex ${name} ===`)
  console.log(`Output: ${outputFile}`)
  console.log("")

  try {
    const output = listEnvVars(cliOptions)
    const vars = parseConvexEnvList(output)

    const header = [
      `# Convex ${name} Environment Variables`,
      "# Pulled from Convex dashboard - DO NOT COMMIT",
      "",
    ].join("\n")

    const content = header + formatEnvFile(vars) + "\n"

    if (options.dryRun) {
      console.log("# Would write to:", outputFile)
      console.log("")
      console.log(content)
    } else {
      writeFileSync(outputFile, content)
      console.log(`Created ${outputFile}`)
    }
  } catch (error) {
    console.error(`Failed to pull ${name}:`, error)
  }

  console.log("")
}
