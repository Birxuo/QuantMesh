import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

// Store process references in the global scope so they survive basic Next.js HMR
// Note: In a real production deployment, you'd use Docker/PM2. This is purely for the interactive hackathon demo.
const globalStats = global;
if (!globalStats.processes) {
  globalStats.processes = { provider: null, agent: null };
}

const rootDir = path.resolve(process.cwd(), '..');

function isAlive(proc) {
  return proc && !proc.killed && proc.exitCode === null;
}

export async function GET() {
  const { provider, agent } = globalStats.processes;
  return NextResponse.json({
    provider: isAlive(provider),
    agent: isAlive(agent)
  });
}

export async function POST(req) {
  try {
    const { action, target } = await req.json();

    if (target === 'provider') {
      if (action === 'start') {
        if (!isAlive(globalStats.processes.provider)) {
          console.log('[NODE] Spawning Python Provider...');
          const proc = spawn('python', ['-m', 'provider.main'], {
            cwd: rootDir,
            stdio: 'inherit',
            shell: true,
          });
          proc.on('error', (err) => console.error('[NODE] Provider spawn error:', err.message));
          globalStats.processes.provider = proc;
        }
      } else if (action === 'stop') {
        if (isAlive(globalStats.processes.provider)) {
          console.log('[NODE] Halting Python Provider...');
          globalStats.processes.provider.kill();
          globalStats.processes.provider = null;
        }
      }
    }

    if (target === 'agent') {
      if (action === 'start') {
        if (!isAlive(globalStats.processes.agent)) {
          console.log('[NODE] Spawning Python Agent...');
          const proc = spawn('python', ['-m', 'consumer.agent'], {
            cwd: rootDir,
            stdio: 'inherit',
            shell: true,
          });
          proc.on('error', (err) => console.error('[NODE] Agent spawn error:', err.message));
          globalStats.processes.agent = proc;
        }
      } else if (action === 'stop') {
        if (isAlive(globalStats.processes.agent)) {
          console.log('[NODE] Halting Python Agent...');
          globalStats.processes.agent.kill();
          globalStats.processes.agent = null;
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[NODE] Engine route error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
