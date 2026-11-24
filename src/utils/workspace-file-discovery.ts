export interface WorkspaceFileDiscovery {
  excludedPatterns: string[];
  /** Zero means unlimited. */
  maxFiles: number;
  includeSymlinks: boolean;
}

export const DEFAULT_FILE_DISCOVERY: WorkspaceFileDiscovery = {
  excludedPatterns: [
    ".git",
    "node_modules",
    ".venv",
    "venv",
    "__pycache__",
    "dist",
    "build",
    ".next",
    ".cache",
    ".pytest_cache",
    ".mypy_cache",
    ".turbo",
    ".parcel-cache",
    "target",
  ],
  maxFiles: 2000,
  includeSymlinks: false,
};

export function isValidFileLimit(value: number): boolean {
  return (
    Number.isSafeInteger(value) && value >= 0 && value < Number.MAX_SAFE_INTEGER
  );
}

export function normalizeFileDiscovery(value: unknown): WorkspaceFileDiscovery {
  if (!value || typeof value !== "object") return DEFAULT_FILE_DISCOVERY;
  const options = value as Partial<WorkspaceFileDiscovery>;
  return {
    excludedPatterns:
      Array.isArray(options.excludedPatterns) &&
      options.excludedPatterns.every(
        (pattern) =>
          typeof pattern === "string" &&
          pattern.length > 0 &&
          !/[\0\r\n]/.test(pattern),
      )
        ? options.excludedPatterns
        : DEFAULT_FILE_DISCOVERY.excludedPatterns,
    maxFiles:
      typeof options.maxFiles === "number" && isValidFileLimit(options.maxFiles)
        ? options.maxFiles
        : DEFAULT_FILE_DISCOVERY.maxFiles,
    includeSymlinks: options.includeSymlinks === true,
  };
}

const shellQuote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;

// @spec WFD-001 — Configurable local workspace discovery
export function buildWorkspaceFileListCommand(
  options: WorkspaceFileDiscovery,
): string {
  const patterns = options.excludedPatterns.map((pattern) => {
    if (!pattern.includes("/")) return `-name ${shellQuote(pattern)}`;
    const relative = pattern.startsWith("./") ? pattern : `./${pattern}`;
    return `-path ${shellQuote(relative)}`;
  });
  const prune = patterns.length
    ? `-type d \\( ${patterns.join(" -o ")} \\) -prune -o `
    : "";
  const types = options.includeSymlinks
    ? "\\( -type f -o \\( -type l -exec test -f {} \\; \\) \\)"
    : "-type f";
  // Fetch one extra path to distinguish truncation from an exact-size result.
  const limit =
    options.maxFiles > 0 ? ` | head -n ${options.maxFiles + 1}` : "";
  return `find . ${prune}${types} -print 2>/dev/null | sort${limit}`;
}

export function parseWorkspaceFileList(stdout: string, maxFiles: number) {
  const paths = Array.from(
    new Set(
      stdout
        .split(/\r?\n/)
        .filter(Boolean)
        .map((path) => (path.startsWith("./") ? path.slice(2) : path)),
    ),
  );
  return {
    paths: maxFiles > 0 ? paths.slice(0, maxFiles) : paths,
    isTruncated: maxFiles > 0 && paths.length > maxFiles,
  };
}

// A Windows-hosted local backend runs commands through cmd.exe, where `find`
// is the text-search tool and `head` and `/dev/null` do not exist, so the POSIX
// pipeline exits non-zero and the Files tab shows its empty state. PowerShell
// emits UTF-8 paths, which the caller converts to relative paths.
// The agent-server reports its own working directory, so its shape tells us
// which shell runs the command. The browser's OS says nothing about that: a
// Windows browser can talk to a Linux agent-server in Docker Desktop, and a
// macOS or Linux browser can talk to a remote Windows agent-server.
export function isWindowsWorkingDir(workingDir: string | undefined): boolean {
  return !!workingDir && /^(?:[A-Za-z]:[\\/]|[A-Za-z]:$|\\\\)/.test(workingDir);
}

export function buildWindowsWorkspaceFileListCommand(
  options: WorkspaceFileDiscovery,
  _workingDir: string,
): string {
  // EncodedCommand avoids cmd quoting and preserves Unicode exclusion patterns.
  // Enumerate directories ourselves so excluded trees are never traversed.
  const patterns = options.excludedPatterns.map(
    (pattern) => `'${pattern.replace(/^\.\//, "").replaceAll("'", "''")}'`,
  );
  const script = `[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding
$patterns = @(${patterns.join(",")})
$root = (Get-Location).Path.TrimEnd([char]92)
$dirs = New-Object 'System.Collections.Generic.Stack[string]'
$dirs.Push($root)
while ($dirs.Count -gt 0) {
  $dir = $dirs.Pop()
  foreach ($item in (Get-ChildItem -LiteralPath $dir -Force -ErrorAction SilentlyContinue)) {
    if ($item.PSIsContainer) {
      if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { continue }
      $relative = $item.FullName.Substring($root.Length).TrimStart([char]92).Replace([char]92, [char]47)
      $skip = $false
      foreach ($pattern in $patterns) {
        if (($pattern.Contains('/') -and $relative -like $pattern) -or (!$pattern.Contains('/') -and $item.Name -like $pattern)) { $skip = $true; break }
      }
      if (!$skip) { $dirs.Push($item.FullName) }
    } elseif (${options.includeSymlinks ? "$true" : "(($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -eq 0)"}) {
      [Console]::WriteLine($item.FullName)
    }
  }
}`;
  let bytes = "";
  for (let i = 0; i < script.length; i += 1) {
    const code = script.charCodeAt(i);
    bytes += String.fromCharCode(code & 255, code >> 8);
  }
  return `powershell -NoProfile -NonInteractive -EncodedCommand ${btoa(bytes)}`;
}

export function parseWindowsWorkspaceFileList(
  stdout: string,
  workingDir: string,
  options: WorkspaceFileDiscovery,
) {
  const root = workingDir.replaceAll("/", "\\").replace(/\\+$/, "");
  const excluded = options.excludedPatterns
    .filter((pattern) => !pattern.includes("/"))
    .map((pattern) => pattern.toLowerCase());
  const relative = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) =>
      line.toLowerCase().startsWith(`${root.toLowerCase()}\\`)
        ? line.slice(root.length + 1)
        : line,
    )
    .map((line) => line.replace(/\\/g, "/"))
    .filter((line) => {
      const dirs = line.toLowerCase().split("/").slice(0, -1);
      return !dirs.some((dir) => excluded.includes(dir));
    });
  return parseWorkspaceFileList(relative.sort().join("\n"), options.maxFiles);
}
