import { Injectable } from '@angular/core';

/**
 * Plays a looping two-tone alarm beep using the Web Audio API.
 *
 * start() begins the loop immediately; stop() cancels it and closes the
 * AudioContext. The sound only stops when stop() is called explicitly — it
 * will not auto-stop. Calling start() while already playing is a no-op.
 */
@Injectable({ providedIn: 'root' })
export class AlarmSoundService {
  private ctx: AudioContext | null = null;
  private playing = false;
  private cycleTimer: ReturnType<typeof setTimeout> | null = null;

  start(): void {
    if (this.playing) return;
    this.playing = true;
    this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    this.runCycle();
  }

  stop(): void {
    this.playing = false;
    if (this.cycleTimer !== null) {
      clearTimeout(this.cycleTimer);
      this.cycleTimer = null;
    }
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }

  private runCycle(): void {
    if (!this.playing || !this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    // First tone: 880 Hz (A5)
    this.beep(ctx, now, 880, 0.25);
    // Second tone: 1046 Hz (C6) — slightly higher
    this.beep(ctx, now + 0.35, 1046, 0.25);
    // Repeat every 1.1 seconds
    this.cycleTimer = setTimeout(() => this.runCycle(), 1100);
  }

  private beep(
    ctx: AudioContext,
    startTime: number,
    frequency: number,
    duration: number,
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.value = frequency;

    // Smooth envelope: fast attack, linear decay to avoid click artifacts
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.45, startTime + 0.01);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }
}
