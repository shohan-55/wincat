const defaults = Object.freeze(require("./defaults.json"));
function sanitize(input = {}) {
  const out = { ...defaults };
  for (const k of Object.keys(defaults)) {
    const v = input[k];
    if (typeof defaults[k] === "boolean" && typeof v === "boolean") out[k] = v;
  }
  for (const [k, min, max] of [
    ["speed", 0.3, 2],
    ["activity", 0, 100],
    ["detectionDistance", 80, 700],
    ["animationFrequency", 10, 100],
    ["size", 0.6, 1.6],
    ["fpsLimit", 15, 60],
  ]) {
    if (Number.isFinite(input[k]))
      out[k] = Math.min(max, Math.max(min, input[k]));
  }
  if (["cream", "orange", "grey", "black", "white"].includes(input.appearance))
    out.appearance = input.appearance;
  if (["economy", "balanced", "high"].includes(input.quality))
    out.quality = input.quality;
  return out;
}
module.exports = { defaults, sanitize };
