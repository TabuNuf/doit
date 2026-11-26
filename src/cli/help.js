// The text of `doit help`, apart from the command table so cli.js stays small.

export const HELP = `doit: the task board, from the command line. Every command archives what is due first.

  doit projects                                   list projects
  doit project add <name> <folder> [--docs Docs]  register a project (creates folders it lacks)
  doit project set <id> kind=game|application|podcast   what the project is (kind= clears it); Marketing offers games, applications and podcasts
  doit project set <id> marketed=yes|no                 no: keep the kind but leave Marketing (+ Campaign, For lists, Overview, fit)
  doit epics <project>                            open epics with done/total
  doit epic add <project> <name> [--status Planned|Active|Parked]
  doit epic close <project> <EPIC-nnn>            archive the epic's task files, set it Done, move it to Completed/
  doit list [--project p] [--epic EPIC-nnn] [--state open|active|backlog|done|archived] [--owner ai|human] [--json]
  doit show <project>/<T-id> [--json]
  doit add <project> <EPIC-nnn> <title> [--owner ai|human] [--type task|bug] [--done-when text]
           [--deadline YYYY-MM-DD] [--state todo|progress|backlog] [--description text] [--contact <id>]
           [--agent a] [--model m] [--effort low|medium|high|xhigh|max]
  doit set <project>/<T-id> key=value ...         keys: state owner type deadline rank title done-when description blocks contact agent model effort (an empty value clears; agent, model and effort are left out of plain show for owner human but stay in the file and in --json)
  doit comment <project>/<T-id> <text> [--as ai|human]   (default author: ai)
  doit keep <days>                                days a completed task stays before it is archived
  doit sweep                                      archive what is past its deadline or retention
  doit morning                                    sweep, then write the morning report to the activity log and print it
  doit log <name> <text>                          one line in the activity log under <name> (lower case, like festivals), for a scheduled run's summary

  doit contacts [--type t] [--fits <game>] [--contacted <game>] [--not-contacted <game>] [--no-about] [--genre g] [--status active|dormant|parked|archived] [--due] [--reach <n>] [--json]   one line per contact, due first; --reach n = at least n followers; --contacted/--not-contacted keep contacts with/without a touch for the game; --no-about keeps those with no about text yet
           [--scale <label>] [--relevant] [--irrelevant] [--parked] [--all]   parked contacts are hidden unless --parked (only them), --all (everyone) or --status; --relevant = has a fit or shares a scale with a game profile; --irrelevant = neither (who would be parked, read only); --scale keeps contacts covering that scale; with --parked, --due lists those whose review date (next) has come
  doit contacts import <file>                     import every column of the New Streamers CSV (email, channels, reach, genres, dates, Last Contact and BB1/BB2 as mail touches); re-import updates in place by email or channel
  doit contact show <id> [--json]
  doit contact add <name> --type a,b [--email] [--reach <followers>] [--genres a,b] [--about text] [--topic] [--notes] [--status] [--next YYYY-MM-DD] [--channels kind=url|followers|date,...] [--reddit url] [--scales a,b] [--scale_note text] [--checked YYYY-MM-DD]
  doit contact set <id> key=value ...             keys: name types topic email reach genres about notes status next channels channel reddit scales scale_note checked special (channels= replaces the whole list, channel= adds or updates one by url)
           A channel is kind=url or kind=url|followers|date, the date being when it was last active: youtube=https://youtube.com/@a|4.77M|2026-11-26 (followers as 12400, 12k or 1.2M; leave a part empty when unknown, twitch=https://twitch.tv/a||2026-11-20).
           Channel kinds: youtube twitch kick tiktok bluesky x instagram facebook reddit discord steam patreon podcast rumble website linktree. Status parked = not relevant to any game; next is then its review date.
           Scales (contact scales and a profile's scale): solo = made primarily by one developer, may still use purchased assets, freelancers or publishing support; indie = independent development, often a small team, not a precise measure of budget or team size;
           triple-i (III) = independently funded, ambitious scope or production values approaching AAA, the team may include developers from large studios; aa = mid-sized production between indie and AAA in budget, team size and scope, the boundary is informal;
           aaa = blockbuster scale, large budgets, teams and marketing. The labels describe production scale, funding, ownership or team structure, not quality, and a creator or game can carry several.
  doit contacts migrate-scale [--apply]           one-off: move a notes first line "Indie fit: ..." into scales, scale_note and checked, retype website channels of a known host (kick, reddit, rumble...), copy a reddit link to the reddit field; without --apply only lists
  doit fit <id> <game> <reason>                   the contact fits a game (a profile's file name)
  doit fit <id> <game> --remove                   drop the contact's fit for that game
  doit touch <id> mail|reply|video [--game g] [--date YYYY-MM-DD]
  doit profiles                                   the game profiles contacts can fit, with each one's scale
  doit profile add <project> [--kind k]           write <docs>/Marketing/Profile.md in the project; the game is its id, the kind the project's
  doit profile set <project> key=value ...        keys: scale (solo,indie,triple-i,aa,aaa; empty clears) genres platforms stage release needs; the other fields stay

  doit festivals [--fits <game>] [--deadline-within <days>] [--state s] [--json]   festivals and conferences by deadline with days left; past ones hidden unless --state past; --fits keeps those matching the game's profile (and not past their deadline), --deadline-within n those due in n days
  doit festival upsert <name> --year <yyyy> [--type festival,conference] [--topic] [--starts d] [--ends d] [--deadline d] [--cost] [--where steam|epic|gog|itch|physical|online]
           [--genres a,b] [--stages demo,...] [--platforms a,b] [--url] [--notes] [--state s]   add, or update the one of that name and year; fields not given stay
  doit festival set <id> state=watching|applied|accepted|declined|past

  doit templates                                  the mail templates (Templates/ in the marketing docs)
  doit campaign add <project> <name> [--game <game[,game...]>] [--event <festival id|YYYY-MM-DD>] [--occasion o] [--goal t] [--change t] [--measure t] [--audience t] [--message t] [--ask t] [--channels t] [--starts d] [--ends d] [--budget t]   a campaign epic (Active) in the project for a game, application or podcast (the project itself when it has a kind, else --game names a profile); prints its id
  doit campaign contacts <project> <EPIC-nnn> [--limit n]   one "Reach out to" task per fitting contact (default 10), largest reach first
  doit campaign set <project> <EPIC-nnn> key=value ...   change the brief (occasion: release|demo|festival|update|sale|announcement|other; goal, change, measure, audience, message, ask, channels, starts, ends, budget), game=a,b or event=<festival id|date>; an empty value clears one
  doit campaign show <project> <EPIC-nnn> [--json]   the brief, games, event and done/total
  doit campaign suggest <project> <EPIC-nnn> [--limit n] [--json]   fitting contacts not on the campaign (id, name, reach, fit reason, last contacted about the game) and open fitting festivals
  doit outreach [--json]                          this week: contacts to reach, festival deadlines within 14 days, campaign steps
  doit draft add <contact id> --template <name> --game <game> --personal <text>   fill a template into a draft, print it
  doit draft show <id> [--json]
  doit drafts [--state draft|approved|sent|failed] [--json]
  doit mail sweep                                 file replies from contacts as touches and move them to Marketing
  (approving and sending a draft is done in the page, never here)

States: todo, progress, backlog, done, archived. "open" = todo + progress + backlog. Archived is never listed unless asked.`;
