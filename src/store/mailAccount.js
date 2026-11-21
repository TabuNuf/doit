// MailAccount: the mail account from settings key `mail` ({address, name, dailyCap}) and its app password from the
// macOS Keychain (generic password, service `doit-mail`, account the address). The password is read each time and never
// stored, logged or put in an error.

import { execFile } from "node:child_process";

const SERVICE = "doit-mail";
const DEFAULT_CAP = 20;

/** Runs `cmd args` without a shell; resolves with stdout, or null when it fails. */
export function runCommand(cmd, args) {
  return new Promise(resolve => execFile(cmd, args, { timeout: 10000 }, (err, stdout) => resolve(err ? null : stdout)));
}

export class MailAccount {
  constructor(settingsFile, run = runCommand) {
    this.settingsFile = settingsFile;
    this.run = run;
  }

  /** {address, name, password, dailyCap}, or null when settings have no `mail` or the Keychain has no password for it. */
  async read() {
    const m = this.settingsFile.read().mail;
    const address = String(m?.address ?? "").trim();
    if (!address) return null;
    const out = await this.run("security", ["find-generic-password", "-s", SERVICE, "-a", address, "-w"]);
    const password = String(out ?? "").replace(/\r?\n$/, "");
    if (!password) return null;
    const cap = Number(m.dailyCap);
    return { address, name: String(m.name ?? "").trim(), password, dailyCap: Number.isInteger(cap) && cap > 0 ? cap : DEFAULT_CAP };
  }
}
