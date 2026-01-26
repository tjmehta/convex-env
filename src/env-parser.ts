/**
 * Parse .env file content, handling multiline quoted values
 */
export function parseEnvFile(content: string): Map<string, string> {
  const result = new Map<string, string>()
  const lines = content.split("\n")

  let currentKey = ""
  let currentValue = ""
  let inMultiline = false

  for (const line of lines) {
    if (inMultiline) {
      // Continue multiline value
      currentValue += "\n" + line

      // Check if this line ends the multiline (ends with unescaped quote)
      if (line.endsWith('"') && !line.endsWith('\\"')) {
        // Remove trailing quote
        currentValue = currentValue.slice(0, -1)
        result.set(currentKey, currentValue)
        currentKey = ""
        currentValue = ""
        inMultiline = false
      }
      continue
    }

    // Skip comments and empty lines
    if (line.startsWith("#") || line.trim() === "") {
      continue
    }

    // Parse KEY=value
    const equalsIndex = line.indexOf("=")
    if (equalsIndex === -1) continue

    currentKey = line.slice(0, equalsIndex)
    let value = line.slice(equalsIndex + 1)

    // Check if value starts with quote but doesn't end with one (multiline)
    if (value.startsWith('"') && !value.endsWith('"')) {
      inMultiline = true
      currentValue = value.slice(1) // Remove leading quote
      continue
    }

    // Single-line value - remove surrounding quotes
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1)
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1)
    }

    // Unescape quotes
    value = value.replace(/\\"/g, '"')

    result.set(currentKey, value)
  }

  return result
}

/**
 * Format env vars for .env file output, handling multiline values
 */
export function formatEnvFile(vars: Map<string, string>): string {
  const lines: string[] = []

  for (const [key, value] of vars) {
    if (value.includes("\n")) {
      // Multiline value - use double quotes
      lines.push(`${key}="${value}"`)
    } else if (value.startsWith("{") || value.startsWith("[")) {
      // JSON value - use single quotes
      lines.push(`${key}='${value}'`)
    } else {
      // Simple value - escape internal quotes and wrap
      const escaped = value.replace(/"/g, '\\"')
      lines.push(`${key}="${escaped}"`)
    }
  }

  return lines.join("\n")
}

/**
 * Parse convex env list output, handling multiline values
 * Output format: KEY=value (where value can span multiple lines)
 */
export function parseConvexEnvList(output: string): Map<string, string> {
  const result = new Map<string, string>()
  const lines = output.split("\n")

  let currentKey = ""
  let currentValue = ""
  let inValue = false

  for (const line of lines) {
    // Check if this line starts a new KEY=value pair
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)

    if (match) {
      // Save previous key-value if we had one
      if (currentKey) {
        result.set(currentKey, currentValue)
      }

      // Start new key-value
      currentKey = match[1]
      currentValue = match[2]
      inValue = true
    } else if (inValue) {
      // Continuation of multiline value
      currentValue += "\n" + line
    }
  }

  // Save the last key-value
  if (currentKey) {
    result.set(currentKey, currentValue)
  }

  return result
}
