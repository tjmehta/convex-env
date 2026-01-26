#!/usr/bin/env node
import { Command } from "commander"
import { pull } from "./commands/pull.js"
import { push } from "./commands/push.js"
import { verify } from "./commands/verify.js"

const program = new Command()

program
  .name("convex-env")
  .description("CLI tool for managing Convex environment variables")
  .version("0.1.0")

program
  .command("pull")
  .description("Pull environment variables from Convex to local .env files")
  .argument("[environment]", "Environment to pull (development|production|preview|all)", "all")
  .option("--preview-name <name>", "Preview deployment name", "preview")
  .option("--dry-run", "Print what would be pulled without writing files")
  .action(pull)

program
  .command("push")
  .description("Push local .env files to Convex environment variables")
  .argument("<environment>", "Environment to push to (development|production|preview)")
  .option("--preview-name <name>", "Preview deployment name", "preview")
  .option("--dry-run", "Print what would be pushed without making changes")
  .option("--skip-override-check", "Skip checking if dev/prod have overrides for preview vars")
  .action(push)

program
  .command("verify")
  .description("Verify local env files match Convex deployments")
  .argument("[environment]", "Environment to verify (development|production|preview|all)", "all")
  .option("--preview-name <name>", "Preview deployment name", "preview")
  .action(verify)

program.parse()
