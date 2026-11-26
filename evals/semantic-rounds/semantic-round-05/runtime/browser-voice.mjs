// Original browser recorder; no host DOM/fiber probes, global API patches or disk writes.
export function encodeWave(samples, sourceRate) {
  if (!(samples instanceof Float32Array) || !Number.isFinite(sourceRate) || sourceRate < 8000 || sourceRate > 192000) throw new Error('INVALID_AUDIO');
  const count = Math.floor(samples.length * 16000 / sourceRate);
  if (count > 16000 * 120) throw new Error('AUDIO_TOO_LONG');
  const buffer = new ArrayBuffer(44 + count * 2), view = new DataView(buffer);
  const ascii = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  ascii(0, 'RIFF'); view.setUint32(4, 36 + count * 2, true); ascii(8, 'WAVE'); ascii(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, 16000, true); view.setUint32(28, 32000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); ascii(36, 'data'); view.setUint32(40, count * 2, true);
  for (let i = 0; i < count; i++) { const p = i * sourceRate / 16000, left = Math.floor(p), t = p - left; const x = Math.max(-1, Math.min(1, samples[left] * (1 - t) + (samples[Math.min(left + 1, samples.length - 1)] ?? 0) * t)); view.setInt16(44 + 2 * i, Math.round(x * (x < 0 ? 32768 : 32767)), true); }
  return new Uint8Array(buffer);
}
export function createSilenceGate({ silenceMs = 2000 } = {}) {
  if (![1000, 2000, 3000, 4000, 5000].includes(silenceMs)) throw new Error('INVALID_SILENCE');
  let elapsed = 0, quiet = 0, voiced = 0, heard = false, floor = 0.003;
  return (rms, ms) => {
    elapsed += ms;
    if (elapsed < 350) floor = Math.min(0.02, Math.max(0.001, Math.min(floor, rms)));
    const threshold = Math.max(0.012, floor * 3);
    if (rms >= threshold) { voiced += ms; quiet = 0; if (voiced >= 120) heard = true; }
    else { voiced = 0; if (heard) quiet += ms; }
    return elapsed >= 120000 || (!heard && elapsed >= 12000) || (heard && quiet >= silenceMs);
  };
}
export async function startVoiceCapture({ signal, silenceMs = 2000, onLevel = () => {} } = {}) {
  if (!navigator.mediaDevices?.getUserMedia || !(globalThis.AudioContext || globalThis.webkitAudioContext)) throw new Error('MICROPHONE_UNAVAILABLE');
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true }, video: false });
  if (signal?.aborted) { stream.getTracks().forEach((t) => t.stop()); throw new Error('CANCELLED'); }
  const AudioCtor = globalThis.AudioContext || globalThis.webkitAudioContext;
  let context, source, processor, wallTimer, settled = false, total = 0;
  const chunks = [], gate = createSilenceGate({ silenceMs });
  let resolveDone, rejectDone;
  const done = new Promise((resolve, reject) => { resolveDone = resolve; rejectDone = reject; });
  // A caller can attach after microphone initialization without an unhandled rejection.
  done.catch(() => {});
  const cleanup = () => { clearTimeout(wallTimer); signal?.removeEventListener('abort', cancel); try { processor?.disconnect(); source?.disconnect(); } catch {} stream.getTracks().forEach((t) => t.stop()); if (context) void context.close().catch(() => {}); };
  const finish = (cancelled) => { if (settled) return; settled = true; cleanup(); if (cancelled) { chunks.length = 0; rejectDone(new Error('CANCELLED')); return; } try { const samples = new Float32Array(total); let at = 0; for (const chunk of chunks) { samples.set(chunk, at); at += chunk.length; } chunks.length = 0; resolveDone(encodeWave(samples, context.sampleRate)); } catch (e) { rejectDone(e); } };
  const cancel = () => finish(true);
  try {
    context = new AudioCtor(); source = context.createMediaStreamSource(stream); processor = context.createScriptProcessor(2048, 1, 1);
    processor.onaudioprocess = (event) => { if (settled) return; const raw = event.inputBuffer.getChannelData(0), values = raw.subarray(0, Math.max(0, Math.floor(context.sampleRate * 120) - total)); chunks.push(new Float32Array(values)); total += values.length; let power = 0; for (const v of values) power += v * v; const rms = Math.sqrt(power / values.length); onLevel(rms); if (gate(rms, values.length * 1000 / context.sampleRate)) finish(false); };
    source.connect(processor); processor.connect(context.destination); wallTimer = setTimeout(() => finish(false), 120000); await context.resume(); signal?.addEventListener('abort', cancel, { once: true }); if (signal?.aborted) cancel();
  } catch (e) { cleanup(); throw e; }
  return { done, stop: () => finish(false), cancel };
}
