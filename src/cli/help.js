// The text of `doit help`, apart from the command table so cli.js stays small.

export const HELP = `doit: the task board, from the command line. Every command archives what is due first.

  doit projects                                   list projects
  doit project add <name> <folder> [--docs Docs]  register a project (creates folders it lacks)
  doit project set <id> kind=game|application|podcast   what the project is (kind= clears it); Marketing offers games, applications and podcasts
  doit project set <id> marketed=yes|no                 no: keep the kind but leave Marketing (picker, + Campaign, Overview, fit)
  doit epics <project>                            open epics with done/total
  doit epic add <project> <name> [--status Planned|Active|Parked]
  doit epic close <project> <EPIC-nnn>            archive the epic's task files, set it Done, move it to Completed/
  doit list [--project p] [--epic EPIC-nnn] [--state open|active|backlog|done|archived] [--owner ai|human] [--json]
  doit show <project>/<T-id> [--json]
  doit add <project> <EPIC-nnn> <title> [--owner ai|human] [--type task|bug] [--done-when text]
           [--deadline YYYY-MM-DD] [--state todo|progress|backlog] [--description text] [--contact <id>]
  doit set <project>/<T-id> key=value ...         keys: state owner type deadline rank title done-when description blocks contact
  doit comment <project>/<T-id> <text> [--as ai|human]   (default author: ai)
  doit keep <days>                                days a completed task stays before it is archived
  doit sweep                                      archive what is past its deadline or retention
  doit morning                                    sweep, then write the morning report to the activity log and print it
  doit log <name> <text>                          one line in the activity log under <name> (lower case, like festivals), for a scheduled run's summary

  doit contacts [--type t] [--fits <game>] [--genre g] [--status active|dormant|archived] [--due] [--reach <n>] [--json]   one line per contact, due first; --reach n = at least n followers
  doit contacts import <file>                     import every column of the New Streamers CSV (email, channels, reach, genres, dates, Last Contact and BB1/BB2 as mail touches); re-import updates in place by email or channel
  doit contact show <id> [--json]
  doit contact add <name> --type a,b [--email] [--reach <followers>] [--genres a,b] [--about text] [--topic] [--notes] [--status] [--next YYYY-MM-DD] [--channels kind=url,kind=url]
  doit contact set <id> key=value ...             keys: name types topic email reach (a number, e.g. reach=12400) genres (a,b) about notes status next channels
  doit fit <id> <game> <reason>                   the contact fits a game (a profile's file name)
  doit fit <id> <game> --remove                   drop the contact's fit for that game
  doit touch <id> mail|reply|video [--game g] [--date YYYY-MM-DD]
  doit profiles                                   the game profiles contacts can fit
  doit profile add <project> [--kind k]           write <docs>/Marketing/Profile.md in the project; the game is its id, the kind the project's

  doit festivals [--fits <game>] [--deadline-within <days>] [--state s] [--json]   festivals and conferences by deadline with days left; past ones hidden unless --state past; --fits keeps those matching the game's profile (and not past their deadline), --deadline-within n those due in n days
  doit festival upsert <name> --year <yyyy> [--type festival,conference] [--topic] [--starts d] [--ends d] [--deadline d] [--cost] [--where steam|epic|gog|itch|physical|online]
           [--genres a,b] [--stages demo,...] [--platforms a,b] [--url] [--notes] [--state s]   add, or update the one of that name and year; fields not given stay
  doit festival set <id> state=watching|applied|accepted|declined|past

  doit templates                                  the mail templates (Templates/ in the marketing docs)
  doit campaign add <project> <name> [--game <game[,game...]>] [--event <festival id|YYYY-MM-DD>]   a campaign epic (Active) in the project for a game, application or podcast (the project itself when it has a kind, else --game names a profile); prints its id
  doit campaign contacts <project> <EPIC-nnn> [--limit n]   one "Reach out to" task per fitting contact (default 10), largest reach first
  doit outreach [--json]                          this week: contacts to reach, festival deadlines within 14 days, campaign steps
  doit draft add <contact id> --template <name> --game <game> --personal <text>   fill a template into a draft, print it
  doit draft show <id> [--json]
  doit drafts [--state draft|approved|sent|failed] [--json]
  doit mail sweep                                 file replies from contacts as touches and move them to Marketing
  (approving and sending a draft is done in the page, never here)

States: todo, progress, backlog, done, archived. "open" = todo + progress + backlog. Archived is never listed unless asked.`;
