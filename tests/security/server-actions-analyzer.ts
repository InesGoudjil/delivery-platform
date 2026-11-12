/**
 * Static analysis of Next.js server actions, built on the TypeScript compiler API.
 * Used by server-actions-auth.test.ts to make sure every server action performs an
 * authorization step, or is explicitly allowlisted.
 *
 * For every exported function of every module with a top-level "use server"
 * directive, the analyzer works out which capabilities calling it reaches:
 *
 *   authn      the caller must be signed in: requireUser(), createAuthUserAction(),
 *              or an inline `x.getCurrentUser()` / `x.auth.getUser()` call.
 *   authz      the caller is checked against a resource: the workspace, delivery and
 *              platform-admin guards, the client delivery-room (guest) checks, the
 *              createAuthWorkspace/DeliveryAction wrappers, or an inline membership
 *              check (`x.isMember()`, `x.getMember()`) or `.platformRole` comparison.
 *   rateLimit  checkRateLimit() / assertRateLimit().
 *
 * A function reaches a capability when its body calls a primitive, or calls (or
 * passes as an argument) a function declared under the traversal roots
 * (app/actions by default) that reaches it: same-file helpers, helper modules and
 * other actions, resolved through imports, aliases and barrel re-exports and
 * iterated to a fixpoint. Functions outside the traversal roots are opaque unless
 * they are registered in PRIMITIVES, so a guard helper added elsewhere has to be
 * registered there.
 *
 * Limits, by design (this is a cheap regression guard, not a verifier):
 *   - a call counts wherever it appears in the body (any branch or callback), whether
 *     or not its result is checked and whether or not it runs before the side effects;
 *   - it proves an auth step exists, not that it checks the right resource;
 *   - method calls on objects are opaque apart from the patterns above;
 *   - dynamic import() targets are not followed (a primitive destructured from one is
 *     still matched by name);
 *   - only the "@/" path alias is understood.
 */
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

/**
 * serviceRole  the action reaches a service-role client (row-level security bypassed):
 *              getServerAdminServices(), getServerCore() or createAdminClient().
 * scoped       it reaches a check that ties the ids it was sent to the resource it's
 *              authorized for: the client-room gate or the lib/client-room/scope.ts loaders.
 */
export type Capability = "authn" | "authz" | "rateLimit" | "serviceRole" | "scoped";

export interface Primitive {
  /** Repo-relative path of the module that declares the function. */
  module: string;
  name: string;
  capability: Capability | readonly Capability[];
}

function capabilitiesOf(primitive: Primitive): readonly Capability[] {
  return typeof primitive.capability === "string" ? [primitive.capability] : primitive.capability;
}

export const PRIMITIVES: readonly Primitive[] = [
  { module: "core/security/guards.ts", name: "requireUser", capability: "authn" },
  { module: "core/security/guards.ts", name: "requirePlatformAdmin", capability: "authz" },
  { module: "core/security/guards.ts", name: "requireWorkspaceMember", capability: "authz" },
  { module: "core/security/guards.ts", name: "requireDeliveryAccess", capability: "authz" },
  { module: "app/actions/safe-action.ts", name: "createAuthUserAction", capability: "authn" },
  { module: "app/actions/safe-action.ts", name: "createAuthWorkspaceAction", capability: "authz" },
  { module: "app/actions/safe-action.ts", name: "createAuthDeliveryAction", capability: "authz" },
  // Client room: the gate lets in a guest holding the share link (plus the unlock cookie
  // when the delivery has a passcode), or a member of the studio. It also hands back the
  // authorized delivery, which room actions act on.
  { module: "core/security/client-room.ts", name: "requireClientRoom", capability: ["authz", "scoped"] },
  // Load a row by a caller-sent id and refuse it unless it belongs to the authorized delivery.
  { module: "lib/client-room/scope.ts", name: "assetInDelivery", capability: "scoped" },
  { module: "lib/client-room/scope.ts", name: "versionInDelivery", capability: "scoped" },
  { module: "lib/client-room/scope.ts", name: "feedbackInDelivery", capability: "scoped" },
  { module: "lib/client-room/scope.ts", name: "replyInDelivery", capability: "scoped" },
  // Service-role clients: row-level security doesn't apply.
  { module: "core/server.ts", name: "getServerAdminServices", capability: "serviceRole" },
  { module: "core/server.ts", name: "getServerCore", capability: "serviceRole" },
  { module: "lib/supabase/server.ts", name: "createAdminClient", capability: "serviceRole" },
  { module: "lib/security/passcode.ts", name: "verifyDeliveryPasscode", capability: "authz" },
  { module: "lib/upstash/assert-rate-limit.ts", name: "checkRateLimit", capability: "rateLimit" },
  { module: "lib/upstash/assert-rate-limit.ts", name: "assertRateLimit", capability: "rateLimit" },
];

/** `services.auth.getCurrentUser()`: the session lookup every guard bottoms out in. */
const AUTHN_METHODS = new Set(["getCurrentUser"]);
/** `services.member.isMember(...)` / `.getMember(...)`: inline membership checks. */
const AUTHZ_METHODS = new Set(["isMember", "getMember"]);
/** `profile.platformRole !== "admin"`: inline platform-admin checks (admin.ts). */
const AUTHZ_COMPARED_PROPERTIES = new Set(["platformRole"]);
const EQUALITY_OPERATORS = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken,
  ts.SyntaxKind.EqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsToken,
]);

const SOURCE_EXTENSIONS = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"];
/** Top-level directories that are not part of the Next.js app (tests hold fixture strings). */
const NON_APP_DIRS = ["tests", "coverage", "public", "supabase"];

// ---------------------------------------------------------------------------
// File access
// ---------------------------------------------------------------------------

export interface AnalyzerHost {
  readonly root: string;
  readFile(absPath: string): string | undefined;
  isFile(absPath: string): boolean;
  /** Files below absDir, recursively, skipping node_modules, dot-directories and skipDir matches. */
  listFiles(absDir: string, skipDir?: (absDir: string) => boolean): string[];
}

export function createFsHost(root: string): AnalyzerHost {
  return {
    root,
    readFile(absPath) {
      try {
        return fs.readFileSync(absPath, "utf8");
      } catch {
        return undefined;
      }
    },
    isFile(absPath) {
      try {
        return fs.statSync(absPath).isFile();
      } catch {
        return false;
      }
    },
    listFiles(absDir, skipDir) {
      const files: string[] = [];
      const walk = (dir: string) => {
        let entries: fs.Dirent[] = [];
        try {
          entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
          return;
        }
        for (const entry of entries) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
            if (skipDir?.(full)) continue;
            walk(full);
          } else if (entry.isFile()) {
            files.push(full);
          }
        }
      };
      walk(absDir);
      return files.sort();
    },
  };
}

/**
 * In-memory files (keys are repo-relative paths) laid over the real repo: imports
 * from them still resolve to real modules such as core/security/guards.ts, but
 * listFiles only ever returns the in-memory files.
 */
export function createOverlayHost(root: string, files: Record<string, string>): AnalyzerHost {
  const disk = createFsHost(root);
  const memory = new Map<string, string>();
  for (const [rel, text] of Object.entries(files)) memory.set(path.resolve(root, rel), text);
  return {
    root,
    readFile: (absPath) => (memory.has(absPath) ? memory.get(absPath) : disk.readFile(absPath)),
    isFile: (absPath) => memory.has(absPath) || disk.isFile(absPath),
    listFiles: (absDir) =>
      [...memory.keys()].filter((absPath) => absPath.startsWith(absDir + path.sep)).sort(),
  };
}

// ---------------------------------------------------------------------------
// Syntax helpers
// ---------------------------------------------------------------------------

function toPosix(p: string): string {
  return p.split(path.sep).join("/");
}

function isSourceFile(p: string): boolean {
  return SOURCE_EXTENSIONS.some((ext) => p.endsWith(ext)) && !p.endsWith(".d.ts");
}

function scriptKind(p: string): ts.ScriptKind {
  if (p.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (p.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (/\.[cm]?js$/.test(p)) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function parse(absPath: string, text: string): ts.SourceFile {
  return ts.createSourceFile(absPath, text, ts.ScriptTarget.Latest, true, scriptKind(absPath));
}

function lineOf(sourceFile: ts.SourceFile, node: ts.Node): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
  return ts.canHaveModifiers(node) && (ts.getModifiers(node) ?? []).some((m) => m.kind === kind);
}

function unwrap(expr: ts.Expression): ts.Expression {
  let e = expr;
  while (
    ts.isParenthesizedExpression(e) ||
    ts.isAsExpression(e) ||
    ts.isSatisfiesExpression(e) ||
    ts.isNonNullExpression(e) ||
    ts.isTypeAssertionExpression(e)
  ) {
    e = e.expression;
  }
  return e;
}

/** True when the statements open with a "use server" directive prologue. */
export function hasUseServerDirective(statements: readonly ts.Statement[]): boolean {
  for (const statement of statements) {
    if (!ts.isExpressionStatement(statement) || !ts.isStringLiteral(statement.expression)) return false;
    if (statement.expression.text === "use server") return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Module model
// ---------------------------------------------------------------------------

interface FunctionEntry {
  /** Function body, arrow/function expression, wrapper call, or aliased identifier. */
  root: ts.Node;
}

interface ImportEntry {
  specifier: string;
  /** Export name in the source module: a name, "default", or "*" for a namespace import. */
  name: string;
}

type ExportEntry =
  | { kind: "local"; localName: string; line: number }
  | { kind: "reexport"; specifier: string; importedName: string; line: number }
  | { kind: "value"; description: string; line: number };

interface ModuleInfo {
  abs: string;
  rel: string;
  sourceFile: ts.SourceFile;
  isServerModule: boolean;
  /** Top-level function-like declarations, by local name. */
  functions: Map<string, FunctionEntry>;
  imports: Map<string, ImportEntry>;
  exports: Map<string, ExportEntry>;
  starExports: { specifier: string; line: number }[];
}

function readModule(abs: string, rel: string, text: string): ModuleInfo {
  const sourceFile = parse(abs, text);
  const info: ModuleInfo = {
    abs,
    rel,
    sourceFile,
    isServerModule: hasUseServerDirective(sourceFile.statements),
    functions: new Map(),
    imports: new Map(),
    exports: new Map(),
    starExports: [],
  };

  for (const statement of sourceFile.statements) {
    const line = lineOf(sourceFile, statement);
    const exported = hasModifier(statement, ts.SyntaxKind.ExportKeyword);
    if (hasModifier(statement, ts.SyntaxKind.DeclareKeyword)) continue;

    if (ts.isImportDeclaration(statement)) {
      const clause = statement.importClause;
      if (!clause || clause.isTypeOnly || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
      const specifier = statement.moduleSpecifier.text;
      if (clause.name) info.imports.set(clause.name.text, { specifier, name: "default" });
      const bindings = clause.namedBindings;
      if (bindings && ts.isNamespaceImport(bindings)) {
        info.imports.set(bindings.name.text, { specifier, name: "*" });
      } else if (bindings && ts.isNamedImports(bindings)) {
        for (const element of bindings.elements) {
          if (element.isTypeOnly) continue;
          info.imports.set(element.name.text, {
            specifier,
            name: (element.propertyName ?? element.name).text,
          });
        }
      }
    } else if (ts.isFunctionDeclaration(statement)) {
      if (!statement.body) continue; // overload signature
      const localName = statement.name?.text ?? "default";
      info.functions.set(localName, { root: statement.body });
      if (exported) {
        const exportName = hasModifier(statement, ts.SyntaxKind.DefaultKeyword) ? "default" : localName;
        info.exports.set(exportName, { kind: "local", localName, line });
      }
    } else if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name)) {
          if (exported) {
            info.exports.set(`<destructuring at line ${line}>`, {
              kind: "value",
              description: "a destructured binding",
              line,
            });
          }
          continue;
        }
        const name = declaration.name.text;
        const init = declaration.initializer ? unwrap(declaration.initializer) : undefined;
        const isFunctionLike =
          init &&
          (ts.isArrowFunction(init) ||
            ts.isFunctionExpression(init) ||
            ts.isCallExpression(init) || // createAuthUserAction(...) and friends
            ts.isIdentifier(init)); // const alias = otherFunction
        if (isFunctionLike) info.functions.set(name, { root: init });
        if (exported) {
          info.exports.set(
            name,
            isFunctionLike
              ? { kind: "local", localName: name, line }
              : { kind: "value", description: `\`${name}\`, which is not a function`, line }
          );
        }
      }
    } else if (ts.isExportDeclaration(statement)) {
      if (statement.isTypeOnly) continue;
      const specifier =
        statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)
          ? statement.moduleSpecifier.text
          : undefined;
      const clause = statement.exportClause;
      if (!clause) {
        if (specifier) info.starExports.push({ specifier, line });
      } else if (ts.isNamespaceExport(clause)) {
        info.exports.set(clause.name.text, { kind: "value", description: "a namespace object", line });
      } else {
        for (const element of clause.elements) {
          if (element.isTypeOnly) continue;
          const exportName = element.name.text;
          const sourceName = (element.propertyName ?? element.name).text;
          info.exports.set(
            exportName,
            specifier
              ? { kind: "reexport", specifier, importedName: sourceName, line }
              : { kind: "local", localName: sourceName, line }
          );
        }
      }
    } else if (ts.isExportAssignment(statement)) {
      const expr = unwrap(statement.expression);
      if (ts.isIdentifier(expr)) {
        info.exports.set("default", { kind: "local", localName: expr.text, line });
      } else if (ts.isArrowFunction(expr) || ts.isFunctionExpression(expr) || ts.isCallExpression(expr)) {
        info.functions.set("default", { root: expr });
        info.exports.set("default", { kind: "local", localName: "default", line });
      } else {
        info.exports.set("default", { kind: "value", description: "a non-function default export", line });
      }
    } else if ((ts.isClassDeclaration(statement) || ts.isEnumDeclaration(statement)) && exported) {
      const name = statement.name?.text ?? "default";
      const what = ts.isClassDeclaration(statement) ? "class" : "enum";
      info.exports.set(hasModifier(statement, ts.SyntaxKind.DefaultKeyword) ? "default" : name, {
        kind: "value",
        description: `${what} \`${name}\``,
        line,
      });
    }
    // Interfaces, type aliases and namespaces carry types only.
  }
  return info;
}

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------

export interface ServerAction {
  /** "<repo-relative file>#<export name>" */
  id: string;
  file: string;
  name: string;
  line: number;
  capabilities: ReadonlySet<Capability>;
  /** For each capability reached, the call chain that reaches it. */
  evidence: Readonly<Partial<Record<Capability, string>>>;
}

export interface Analysis {
  serverFiles: string[];
  actions: ServerAction[];
  /** Exports the analyzer cannot classify. Each one must fail the test. */
  problems: string[];
}

export interface AnalyzeOptions {
  host: AnalyzerHost;
  /** Repo-relative directory holding the "use server" modules (default "app/actions"). */
  actionsDir?: string;
  /** Repo-relative directories whose functions are followed transitively (default [actionsDir]). */
  traverse?: string[];
  primitives?: readonly Primitive[];
}

interface GraphNode {
  id: string;
  capabilities: Set<Capability>;
  evidence: Map<Capability, string>;
  edges: Set<string>;
}

interface FunctionRef {
  moduleAbs: string;
  localName: string;
}

class Analyzer {
  private readonly modules = new Map<string, ModuleInfo | null>();
  private readonly nodes = new Map<string, GraphNode>();
  private readonly queue: { node: GraphNode; ref: FunctionRef }[] = [];
  private readonly primitiveAt = new Map<string, Primitive>();
  private readonly primitiveNamed = new Map<string, Primitive>();
  private readonly traverseAbs: string[];

  constructor(
    private readonly host: AnalyzerHost,
    traverse: string[],
    primitives: readonly Primitive[]
  ) {
    this.traverseAbs = traverse.map((dir) => path.resolve(host.root, dir));
    for (const primitive of primitives) {
      this.primitiveAt.set(`${primitive.module}#${primitive.name}`, primitive);
      this.primitiveNamed.set(primitive.name, primitive);
    }
  }

  rel(abs: string): string {
    return toPosix(path.relative(this.host.root, abs));
  }

  load(abs: string): ModuleInfo | null {
    if (!this.modules.has(abs)) {
      const text = this.host.readFile(abs);
      this.modules.set(abs, text === undefined ? null : readModule(abs, this.rel(abs), text));
    }
    return this.modules.get(abs) ?? null;
  }

  resolveModule(fromAbs: string, specifier: string): string | null {
    let base: string;
    if (specifier.startsWith("@/")) {
      base = path.join(this.host.root, specifier.slice(2));
    } else if (specifier === "." || specifier === ".." || specifier.startsWith("./") || specifier.startsWith("../")) {
      base = path.resolve(path.dirname(fromAbs), specifier);
    } else {
      return null; // a package
    }
    const candidates = [
      base,
      ...(/\.[cm]?js$/.test(base) ? [base.replace(/\.([cm]?)js$/, ".$1ts"), base.replace(/\.js$/, ".tsx")] : []),
      ...SOURCE_EXTENSIONS.map((ext) => base + ext),
      ...SOURCE_EXTENSIONS.map((ext) => path.join(base, `index${ext}`)),
    ];
    return candidates.find((candidate) => isSourceFile(candidate) && this.host.isFile(candidate)) ?? null;
  }

  /** Follows an export of a module (through re-exports and barrels) to the function that implements it. */
  resolveExport(moduleAbs: string, exportName: string, seen = new Set<string>()): FunctionRef | null {
    const key = `${moduleAbs}#${exportName}`;
    if (seen.has(key)) return null;
    seen.add(key);
    const mod = this.load(moduleAbs);
    if (!mod) return null;
    const entry = mod.exports.get(exportName);
    if (entry?.kind === "local") return this.resolveBinding(mod, entry.localName, seen);
    if (entry?.kind === "reexport") {
      const target = this.resolveModule(mod.abs, entry.specifier);
      return target ? this.resolveExport(target, entry.importedName, seen) : null;
    }
    if (entry) return null; // a non-function value
    for (const star of mod.starExports) {
      const target = this.resolveModule(mod.abs, star.specifier);
      const found = target ? this.resolveExport(target, exportName, seen) : null;
      if (found) return found;
    }
    return null;
  }

  /** Resolves a top-level name of a module (a local function or an import) to a function. */
  resolveBinding(mod: ModuleInfo, localName: string, seen = new Set<string>()): FunctionRef | null {
    if (mod.functions.has(localName)) return { moduleAbs: mod.abs, localName };
    const imported = mod.imports.get(localName);
    if (!imported || imported.name === "*") return null;
    const target = this.resolveModule(mod.abs, imported.specifier);
    return target ? this.resolveExport(target, imported.name, seen) : null;
  }

  primitiveFor(ref: FunctionRef): Primitive | undefined {
    return this.primitiveAt.get(`${this.rel(ref.moduleAbs)}#${ref.localName}`);
  }

  node(ref: FunctionRef): GraphNode {
    const id = `${this.rel(ref.moduleAbs)}#${ref.localName}`;
    let node = this.nodes.get(id);
    if (!node) {
      node = { id, capabilities: new Set(), evidence: new Map(), edges: new Set() };
      this.nodes.set(id, node);
      this.queue.push({ node, ref });
    }
    return node;
  }

  private isTraversed(abs: string): boolean {
    return this.traverseAbs.some((dir) => abs === dir || abs.startsWith(dir + path.sep));
  }

  private reach(node: GraphNode, capability: Capability, how: string): void {
    if (node.capabilities.has(capability)) return;
    node.capabilities.add(capability);
    node.evidence.set(capability, how);
  }

  private onFunction(ref: FunctionRef, node: GraphNode): void {
    const primitive = this.primitiveFor(ref);
    if (primitive) {
      for (const capability of capabilitiesOf(primitive)) this.reach(node, capability, `${primitive.name}()`);
    } else if (this.isTraversed(ref.moduleAbs)) {
      node.edges.add(this.node(ref).id);
    }
  }

  /** A callee, or a function handed to another call (wrappers, .then(fn), ...). */
  private onReference(mod: ModuleInfo, expr: ts.Expression, node: GraphNode): void {
    const e = unwrap(expr);
    if (ts.isIdentifier(e)) {
      const ref = this.resolveBinding(mod, e.text);
      if (ref) {
        this.onFunction(ref, node);
        return;
      }
      // Unbound at module level (e.g. destructured from a dynamic import): match by name.
      const primitive = this.primitiveNamed.get(e.text);
      if (primitive && !mod.imports.has(e.text)) {
        for (const capability of capabilitiesOf(primitive)) {
          this.reach(node, capability, `${primitive.name}() (matched by name)`);
        }
      }
    } else if (ts.isPropertyAccessExpression(e) && ts.isIdentifier(e.expression)) {
      // ns.fn() through `import * as ns from "..."`
      const imported = mod.imports.get(e.expression.text);
      if (imported?.name !== "*") return;
      const target = this.resolveModule(mod.abs, imported.specifier);
      const ref = target ? this.resolveExport(target, e.name.text) : null;
      if (ref) this.onFunction(ref, node);
    }
  }

  private scan(mod: ModuleInfo, root: ts.Node, node: GraphNode): void {
    const visit = (n: ts.Node): void => {
      if (ts.isCallExpression(n)) {
        const callee = unwrap(n.expression);
        if (ts.isPropertyAccessExpression(callee)) {
          const method = callee.name.text;
          const receiver = unwrap(callee.expression);
          const onAuth =
            (ts.isPropertyAccessExpression(receiver) && receiver.name.text === "auth") ||
            (ts.isIdentifier(receiver) && receiver.text === "auth");
          if (AUTHN_METHODS.has(method)) this.reach(node, "authn", `${method}()`);
          else if (method === "getUser" && onAuth) this.reach(node, "authn", "auth.getUser()");
          else if (AUTHZ_METHODS.has(method)) this.reach(node, "authz", `${method}()`);
        }
        this.onReference(mod, callee, node);
        for (const arg of n.arguments) this.onReference(mod, arg, node);
      } else if (ts.isBinaryExpression(n) && EQUALITY_OPERATORS.has(n.operatorToken.kind)) {
        for (const side of [n.left, n.right]) {
          const operand = unwrap(side);
          if (ts.isPropertyAccessExpression(operand) && AUTHZ_COMPARED_PROPERTIES.has(operand.name.text)) {
            this.reach(node, "authz", `inline .${operand.name.text} check`);
          }
        }
      }
      ts.forEachChild(n, visit);
    };
    if (ts.isIdentifier(root)) this.onReference(mod, root, node); // const alias = otherFunction
    else visit(root);
  }

  /** Scans every queued function, then propagates capabilities along call edges to a fixpoint. */
  solve(): void {
    while (this.queue.length > 0) {
      const { node, ref } = this.queue.pop()!;
      const mod = this.load(ref.moduleAbs);
      const fn = mod?.functions.get(ref.localName);
      if (mod && fn) this.scan(mod, fn.root, node);
    }
    let changed = true;
    while (changed) {
      changed = false;
      for (const node of this.nodes.values()) {
        for (const edge of node.edges) {
          const callee = this.nodes.get(edge);
          if (!callee) continue;
          for (const capability of callee.capabilities) {
            if (node.capabilities.has(capability)) continue;
            node.capabilities.add(capability);
            node.evidence.set(capability, `${callee.id} → ${callee.evidence.get(capability)}`);
            changed = true;
          }
        }
      }
    }
  }

  lookup(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }
}

export function analyzeServerActions(options: AnalyzeOptions): Analysis {
  const { host } = options;
  const actionsDir = options.actionsDir ?? "app/actions";
  const analyzer = new Analyzer(host, options.traverse ?? [actionsDir], options.primitives ?? PRIMITIVES);
  const serverFiles: string[] = [];
  const problems: string[] = [];
  const found: { id: string; file: string; name: string; line: number; nodeId: string }[] = [];

  for (const abs of host.listFiles(path.resolve(host.root, actionsDir)).filter(isSourceFile)) {
    const mod = analyzer.load(abs);
    if (!mod?.isServerModule) continue;
    serverFiles.push(mod.rel);

    for (const [exportName, entry] of mod.exports) {
      const where = `${mod.rel}:${entry.line}`;
      if (entry.kind === "value") {
        problems.push(`${where} exports ${entry.description}; a "use server" file may only export async functions.`);
        continue;
      }
      const isLocalFunction = entry.kind === "local" && mod.functions.has(entry.localName);
      let ref: FunctionRef | null;
      if (isLocalFunction) {
        ref = { moduleAbs: abs, localName: entry.localName };
      } else if (entry.kind === "local") {
        ref = analyzer.resolveBinding(mod, entry.localName); // `import { x } ...; export { x }`
      } else {
        const target = analyzer.resolveModule(abs, entry.specifier);
        ref = target ? analyzer.resolveExport(target, entry.importedName) : null;
      }
      if (!ref) {
        const what = entry.kind === "local" && !mod.imports.has(entry.localName) ? "exports" : "re-exports";
        problems.push(`${where} ${what} \`${exportName}\`, which the analyzer cannot resolve to a function.`);
        continue;
      }
      // A re-exported action is checked in the "use server" module that declares it.
      if (!isLocalFunction && analyzer.load(ref.moduleAbs)?.isServerModule) continue;
      found.push({
        id: `${mod.rel}#${exportName}`,
        file: mod.rel,
        name: exportName,
        line: entry.line,
        nodeId: analyzer.node(ref).id,
      });
    }

    for (const star of mod.starExports) {
      const target = analyzer.resolveModule(abs, star.specifier);
      if (!target || !analyzer.load(target)?.isServerModule) {
        problems.push(
          `${mod.rel}:${star.line} \`export * from "${star.specifier}"\` turns every export of that module into a server action; export the functions explicitly.`
        );
      }
    }
  }

  analyzer.solve();

  const actions = found.map(({ nodeId, ...action }): ServerAction => {
    const node = analyzer.lookup(nodeId)!;
    return {
      ...action,
      capabilities: new Set(node.capabilities),
      evidence: Object.fromEntries(node.evidence) as Partial<Record<Capability, string>>,
    };
  });
  return { serverFiles, actions, problems };
}

/** Primitives that are no longer declared (and exported) where PRIMITIVES says. */
export function findMissingPrimitives(host: AnalyzerHost, primitives: readonly Primitive[] = PRIMITIVES): string[] {
  const analyzer = new Analyzer(host, [], primitives);
  return primitives
    .filter((primitive) => {
      const abs = path.resolve(host.root, primitive.module);
      const ref = analyzer.resolveExport(abs, primitive.name);
      return !ref || ref.moduleAbs !== abs || ref.localName !== primitive.name;
    })
    .map((primitive) => `${primitive.module} no longer exports ${primitive.name}(); update PRIMITIVES.`);
}

/**
 * Server actions this guard would not see: a module-level "use server" outside the
 * actions directory, or an inline "use server" function anywhere.
 */
export function findStrayServerDirectives(options: { host: AnalyzerHost; actionsDir?: string }): string[] {
  const { host } = options;
  const actionsDir = options.actionsDir ?? "app/actions";
  const actionsAbs = path.resolve(host.root, actionsDir);
  const skipped = new Set(NON_APP_DIRS.map((dir) => path.join(host.root, dir)));
  const findings: string[] = [];

  for (const abs of host.listFiles(host.root, (dir) => skipped.has(dir))) {
    if (!isSourceFile(abs)) continue;
    const text = host.readFile(abs);
    if (!text?.includes("use server")) continue;
    const rel = toPosix(path.relative(host.root, abs));
    const sourceFile = parse(abs, text);
    if (hasUseServerDirective(sourceFile.statements) && !abs.startsWith(actionsAbs + path.sep)) {
      findings.push(`${rel}: "use server" module outside ${actionsDir}/; move it there so the auth guard covers it.`);
    }
    const visit = (n: ts.Node): void => {
      const isFunction =
        ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) || ts.isArrowFunction(n) || ts.isMethodDeclaration(n);
      if (isFunction && n.body && ts.isBlock(n.body) && hasUseServerDirective(n.body.statements)) {
        findings.push(
          `${rel}:${lineOf(sourceFile, n)}: inline "use server" function; move it into ${actionsDir}/ so the auth guard covers it.`
        );
      }
      ts.forEachChild(n, visit);
    };
    visit(sourceFile);
  }
  return findings;
}

// ---------------------------------------------------------------------------
// Policy
// ---------------------------------------------------------------------------

export interface PublicActionEntry {
  reason: string;
  /** Whether the action calls checkRateLimit/assertRateLimit; the test keeps this honest. */
  rateLimited: boolean;
}

export interface AuthPolicy {
  /** Callable without a session on purpose. Exempt from both auth checks. */
  publicActions: Readonly<Record<string, PublicActionEntry>>;
  /** No auth step but should have one. Ratchet: entries may only be removed. */
  knownGaps: Readonly<Record<string, string>>;
  /** Signed-in check only, and that is enough: they only touch the caller's own data. */
  userScopedActions: Readonly<Record<string, string>>;
  /** Signed-in check only, but they act on someone's workspace or delivery. Ratchet. */
  knownAuthzGaps: Readonly<Record<string, string>>;
  /**
   * Reach the service role without a scope check (the room gate or a scope.ts loader).
   * Each entry says why that's safe: what checks the ids it writes. Reviewed by hand.
   */
  serviceRoleActions?: Readonly<Record<string, string>>;
}

export interface PolicyViolations {
  /** No auth step and not allowlisted. */
  unguarded: string[];
  /** Signed-in check only, and not listed as user-scoped or a known authz gap. */
  authenticatedOnly: string[];
  /** Entries that no longer match the code: renamed or deleted actions, fixed gaps. */
  staleEntries: string[];
  /** Public entries whose rateLimited flag disagrees with the code. */
  rateLimit: string[];
  /** Missing reasons, or an action listed twice. */
  listErrors: string[];
  /** Reach the service role without a scope check, and not listed in SERVICE_ROLE_ACTIONS. */
  unscopedServiceRole: string[];
}

export function checkAuthPolicy(actions: readonly ServerAction[], policy: AuthPolicy): PolicyViolations {
  const violations: PolicyViolations = {
    unguarded: [],
    authenticatedOnly: [],
    staleEntries: [],
    rateLimit: [],
    listErrors: [],
    unscopedServiceRole: [],
  };
  const byId = new Map(actions.map((action) => [action.id, action]));
  const lists: Record<string, Readonly<Record<string, string | PublicActionEntry>>> = {
    PUBLIC_ACTIONS: policy.publicActions,
    KNOWN_GAPS: policy.knownGaps,
    USER_SCOPED_ACTIONS: policy.userScopedActions,
    KNOWN_AUTHZ_GAPS: policy.knownAuthzGaps,
  };

  const listedIn = new Map<string, string>();
  for (const [listName, list] of Object.entries(lists)) {
    for (const [id, value] of Object.entries(list)) {
      const reason = typeof value === "string" ? value : value?.reason;
      if (!reason?.trim()) violations.listErrors.push(`${listName}["${id}"] needs a one-line reason.`);
      const other = listedIn.get(id);
      if (other) violations.listErrors.push(`"${id}" is in both ${other} and ${listName}; keep one.`);
      else listedIn.set(id, listName);
      if (!byId.has(id)) {
        violations.staleEntries.push(
          `${listName}["${id}"] does not match any server action (renamed, moved or deleted?); update or remove the entry.`
        );
      }
    }
  }

  for (const action of actions) {
    const where = `${action.file}:${action.line} ${action.name}`;
    const authn = action.capabilities.has("authn");
    const authz = action.capabilities.has("authz");
    const isPublic = action.id in policy.publicActions;
    if (!authn && !authz && !isPublic && !(action.id in policy.knownGaps)) {
      violations.unguarded.push(
        `${where} has no authorization step. Call a guard (requireWorkspaceMember, requireDeliveryAccess, ` +
          `requirePlatformAdmin, requireClientRoom, requireUser, ...) or, if it must work ` +
          `without a session, add "${action.id}" to PUBLIC_ACTIONS with a reason.`
      );
    }
    if (authn && !authz && !isPublic && !(action.id in policy.userScopedActions) && !(action.id in policy.knownAuthzGaps)) {
      violations.authenticatedOnly.push(
        `${where} only checks that someone is signed in (${action.evidence.authn}); nothing ties the caller ` +
          `to the workspace or delivery it touches. Add a membership/role check, or add "${action.id}" to ` +
          `USER_SCOPED_ACTIONS if it only touches the caller's own data.`
      );
    }
  }

  for (const id of Object.keys(policy.knownGaps)) {
    const action = byId.get(id);
    if (action && (action.capabilities.has("authn") || action.capabilities.has("authz"))) {
      const how = action.evidence.authz ?? action.evidence.authn;
      violations.staleEntries.push(`KNOWN_GAPS["${id}"] is guarded now (${how}); remove the entry.`);
    }
  }
  for (const id of Object.keys(policy.knownAuthzGaps)) {
    const action = byId.get(id);
    if (action?.capabilities.has("authz")) {
      violations.staleEntries.push(`KNOWN_AUTHZ_GAPS["${id}"] checks the resource now (${action.evidence.authz}); remove the entry.`);
    }
  }
  for (const id of Object.keys(policy.userScopedActions)) {
    const action = byId.get(id);
    if (action?.capabilities.has("authz")) {
      violations.staleEntries.push(
        `USER_SCOPED_ACTIONS["${id}"] performs a resource check now (${action.evidence.authz}); remove the entry.`
      );
    }
  }
  // Service-role writes must use ids from the authorized resource: reach the room gate or a
  // scope.ts loader, or be listed (reviewed) in SERVICE_ROLE_ACTIONS.
  const serviceRoleActions = policy.serviceRoleActions ?? {};
  for (const [id, reason] of Object.entries(serviceRoleActions)) {
    if (!reason?.trim()) violations.listErrors.push(`SERVICE_ROLE_ACTIONS["${id}"] needs a one-line reason.`);
    const action = byId.get(id);
    if (!action) {
      violations.staleEntries.push(
        `SERVICE_ROLE_ACTIONS["${id}"] does not match any server action (renamed, moved or deleted?); update or remove the entry.`
      );
    } else if (!action.capabilities.has("serviceRole")) {
      violations.staleEntries.push(`SERVICE_ROLE_ACTIONS["${id}"] no longer uses the service role; remove the entry.`);
    } else if (action.capabilities.has("scoped")) {
      violations.staleEntries.push(
        `SERVICE_ROLE_ACTIONS["${id}"] is scoped now (${action.evidence.scoped}); remove the entry.`
      );
    }
  }
  for (const action of actions) {
    if (!action.capabilities.has("serviceRole") || action.capabilities.has("scoped") || action.id in serviceRoleActions) {
      continue;
    }
    violations.unscopedServiceRole.push(
      `${action.file}:${action.line} ${action.name} uses the service role (${action.evidence.serviceRole}) ` +
        `without tying the ids it writes to an authorized resource. Use the client-room gate or a ` +
        `lib/client-room/scope.ts loader, or add "${action.id}" to SERVICE_ROLE_ACTIONS saying what checks them.`
    );
  }

  for (const [id, entry] of Object.entries(policy.publicActions)) {
    const action = byId.get(id);
    if (!action) continue;
    const actual = action.capabilities.has("rateLimit");
    if (actual !== entry.rateLimited) {
      const found = actual ? `a rate limit (${action.evidence.rateLimit})` : "no checkRateLimit/assertRateLimit call";
      violations.rateLimit.push(
        `PUBLIC_ACTIONS["${id}"] says rateLimited: ${entry.rateLimited}, but the analyzer finds ${found}; update the entry.`
      );
    }
  }
  return violations;
}
