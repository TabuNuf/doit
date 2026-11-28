// Splits argv into positional words and --flags. A flag takes the next word unless it is a switch.

const SWITCHES = ["json", "due", "remove", "no-about", "no-facts", "relevant", "irrelevant", "parked", "all", "apply", "now-relevant"];

export function parse(argv) {
  const pos = [], flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      if (SWITCHES.includes(key)) flags[key] = true;
      else flags[key] = argv[++i];
    } else pos.push(a);
  }
  return { pos, flags };
}
