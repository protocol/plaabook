// Server startup hook: secret sanity check + in-process outbox drain.
// Node-only logic lives in instrumentation-node.ts so the edge bundle never
// touches pg (fs/path). NO separate worker process — 384Mi budget (TeamWork.md).

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./instrumentation-node');
  }
}
