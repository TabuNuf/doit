// EventMatch: does a festival or conference fit a game's profile? Pure.

const lower = list => (list ?? []).map(s => String(s).trim().toLowerCase());
const common = (a, b) => a.some(x => b.includes(x));

export class EventMatch {
  /** The profile has genres, platforms and stage; the festival is a contact with an event.
   *  Gives {match:true}, {match:true, criteriaUnknown:true} when the event states no criteria, or {match:false, reason}. */
  check(profile, festival) {
    const c = festival?.event?.criteria;
    if (!c) return { match: false, reason: "not an event" };
    const genres = lower(c.genres), stages = lower(c.stages), platforms = lower(c.platforms);
    if (!genres.length && !stages.length && !platforms.length) return { match: true, criteriaUnknown: true };
    if (genres.length && !common(genres, lower(profile.genres))) return { match: false, reason: `genre: wants ${genres.join(", ")}` };
    const stage = String(profile.stage ?? "").trim().toLowerCase();
    if (stages.length && !stages.includes(stage)) return { match: false, reason: `stage: ${stage || "unknown"} is not among ${stages.join(", ")}` };
    if (platforms.length && !common(platforms, lower(profile.platforms))) return { match: false, reason: `platform: wants ${platforms.join(", ")}` };
    return { match: true };
  }
}
