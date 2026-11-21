# Design

How code is shaped in any stack: object-oriented, in modules with low coupling, so a person can read it and a feature can be added or removed without touching the rest. The stack layer says how each rule is met and enforced there (Unity: asmdefs and `ModuleRulesTests`, `Unity/02-Project.md`, Modules and assemblies; apps: `App/README.md`, How the design rules apply).

## The aim

- **A feature is a module, and removing it removes the module and one line in the composition root.** When removing a feature means edits across other modules, the coupling is wrong, and the close audit records it (`01-Tasks.md`, Closing an epic) as a finding.
  Why: ClobberBop's sound and hit effects are listener modules; removing either removes one assembly and nothing else. Decided as the aim for every project by `<Designer>` on 2026-11-20.
- **A person can follow the code from one place.** Reading the composition root shows every module and what it is given; reading a module's public surface shows what it offers.
  Why: the projects are read and steered by a designer, not only by the code's author, and a graph hidden in globals or a container cannot be read. Decided by `<Designer>`, 2026-11-20.

## Objects and modules

- **An object owns its data and the behaviour on it.** Code that reaches into another object's fields to decide for it moves into that object. In a stack built from functions (a component framework), the module is the unit that owns its data and behaviour, and the rules below apply to modules.
  Why: the rule then lives in one place, and a change to it touches one class. Decided by `<Designer>`, 2026-11-20.
- **One module, one job, one public surface.** Everything else in it is internal. A module's name says its job in the design's words.
- **Dependencies go one way, in an order written in `Architecture.md`.** No cycles. The rules (the domain) know nothing of the engine, the framework, the interface or storage.
  Why: Box Trainer's domain compiles without the engine (`noEngineReferences`), so every rule is tested in milliseconds and the simulation runs headless at full speed.
- **Modules at the same level never reference each other.** They talk through events that carry facts, or through a function the composition root hands one of them, typed in the receiver's own terms.
  Why: ClobberBop's effects had to ride a weapon owned by the fighter view; a function from the root joined them without either module knowing the other.
- **One composition root creates every module and passes in what it needs**, through a constructor or one `Init(...)`. No service locator, no static `Instance`. A container that wires by reflection is used only where the framework is built on one, and then all registration sits in the one place the stack layer names.
  Why: with every dependency passed in, reading the root shows the whole graph, and a test builds a module with fakes in one line. Working against a framework's own container costs more than it gives, so the aim there is one registration file to read.
- **Composition over inheritance.** Inherit only for a true "is a" with shared behaviour, at most one level below an abstract base; share behaviour otherwise by holding an object that has it.
  Why: a deep tree spreads one behaviour over several files and makes every subclass depend on its parents' internals. Decided by `<Designer>`, 2026-11-20.
- **An interface goes where a seam is**: between modules, and around anything outside the code (a store, the network, the clock, randomness, files, an SDK). Not one per class.
  Why: ClobberBop's rollback talks to the network through one transport interface, so its tests run on a seeded in-process loopback; a release store is one adapter behind one contract. An interface with one implementation inside a module only adds a file to read.

## Patterns: when and when not

The catalog is the 22 classic patterns as [refactoring.guru](https://refactoring.guru/design-patterns/catalog) describes them, with its pages for structure and examples. This section decides which of them a project uses, and when. Name the pattern in the class summary when one is used, so the reader knows what to expect.
Why: a shared name lets a reader find a structure's intent in one word, and a pattern used where it is not needed adds classes nobody can remove. Picked as the reference by `<Designer>`, 2026-11-20.

**Wiring**, which is not in the catalog but comes first:

| Pattern | Use it when | Not when |
|---|---|---|
| Composition root (dependency injection by hand) | Always: the one place modules are created and wired | |
| Service locator | Never | Always |

**Creational:** how objects are made.

| Pattern | Use it when | Not when |
|---|---|---|
| [Factory Method](https://refactoring.guru/design-patterns/factory-method) | Which concrete class to create depends on data (a kind read from a table or a file), so the knowledge of every concrete type sits in one place | A plain constructor call does it |
| [Abstract Factory](https://refactoring.guru/design-patterns/abstract-factory) | A whole family of objects must match (every adapter for one platform, every look for one theme) and the root picks the family once | There is one family, or the members are picked one at a time |
| [Builder](https://refactoring.guru/design-patterns/builder) | An object takes many optional parts or steps: test set-ups (a level, a save, an agent), content built through an editing API | A constructor with a few parameters reads as well |
| [Prototype](https://refactoring.guru/design-patterns/prototype) | New objects are copies of a configured one: an engine prefab, a copy of a config asset a test may change | The copy would share mutable state with the original without anyone meaning it to |
| [Singleton](https://refactoring.guru/design-patterns/singleton) | Never as a class that makes and holds its own static instance. "Exactly one" is the composition root's decision: it creates one and passes it in | Always |

**Structural:** how objects are put together.

| Pattern | Use it when | Not when |
|---|---|---|
| [Adapter](https://refactoring.guru/design-patterns/adapter) | Something outside the code (a store, an SDK, a transport, storage) is reached through the project's own interface | The outside thing is used in one place and will not be swapped or faked |
| [Bridge](https://refactoring.guru/design-patterns/bridge) | Two things vary independently and every pairing would be a class (a shape and a renderer, a message and a channel) | Only one side varies: an interface on that side is enough |
| [Composite](https://refactoring.guru/design-patterns/composite) | A tree whose leaves and branches are treated alike: interface elements, nested groups, a level's parts | The structure is a flat list |
| [Decorator](https://refactoring.guru/design-patterns/decorator) | Behaviour is added in layers that can be stacked or left out (logging, caching, a modifier on a score) | One fixed addition: put it in the class |
| [Facade](https://refactoring.guru/design-patterns/facade) | The interface or another tier needs the domain: it calls one facade and reads the sheets it gives | It grows into a hub: split it by area before it passes the size line |
| [Flyweight](https://refactoring.guru/design-patterns/flyweight) | Many objects share heavy, unchanging data (a mesh, a texture, a rules row): they hold a reference, never a copy | Few objects, or the shared data changes per object |
| [Proxy](https://refactoring.guru/design-patterns/proxy) | Access needs a stand-in with the same interface: loading late, caching a remote answer, checking a permission | A plain call works and nothing needs controlling |

**Behavioural:** how objects share the work.

| Pattern | Use it when | Not when |
|---|---|---|
| [Chain of Responsibility](https://refactoring.guru/design-patterns/chain-of-responsibility) | Several handlers may take a case, in an order that is the behaviour: an ordered list of entries with one shape, each claiming or passing (Boundaries, the decision loop) | One handler always answers |
| [Command](https://refactoring.guru/design-patterns/command) | An action must be queued, recorded, replayed, sent or undone: player inputs, menu commands, edits in an editor | The call happens at once and is never looked at again |
| [Iterator](https://refactoring.guru/design-patterns/iterator) | A collection's walk is not a plain list: the language's own iteration (`foreach`, generators) over a method that returns it | Never hand-rolled where the language has it |
| [Mediator](https://refactoring.guru/design-patterns/mediator) | Many parts would otherwise call each other: one flow class decides where each choice leads, and the parts know only it | Two parts talk: a direct call or one event is clearer |
| [Memento](https://refactoring.guru/design-patterns/memento) | State is saved to restore later without exposing its insides: undo, rollback, a save taken before a play check | The state is already plain data that can be copied |
| [Observer](https://refactoring.guru/design-patterns/observer) | A module reacts to a fact it does not own (a sound on a hit), through events on a bus | The caller needs an answer back: call a method instead |
| [State](https://refactoring.guru/design-patterns/state) | An object's allowed actions depend on a mode with explicit transitions (a menu flow, a match phase) | Two booleans would do |
| [Strategy](https://refactoring.guru/design-patterns/strategy) | One job with interchangeable ways to do it, picked by kind or setting (a scorer, a pathfinder, an AI difficulty) | There is one way, or two that will not grow |
| [Template Method](https://refactoring.guru/design-patterns/template-method) | Rarely: a fixed sequence whose steps vary, in a base class at most one level deep | Usually: prefer a Strategy held by the object (Objects and modules, composition over inheritance) |
| [Visitor](https://refactoring.guru/design-patterns/visitor) | Rarely: many operations over a stable set of node types (a level's parts saved, drawn and checked) | The node types change often: every visitor then changes |

- **Singleton, the why.** A static `Instance` is a dependency nobody passed in: the root no longer shows the graph, a test cannot swap it, and removing its module breaks every caller.
  Why: Box Trainer's views each took the session once at start, so switching save slots live would have touched every view, and a scene reload was used instead; with the editor's domain reload off, every static survives between plays and needs a reset, which 15 classes came to carry. Decided as a ban by `<Designer>`, 2026-11-20.
- **Which statics are allowed.** A static is fine when it holds no state a caller could change: a constant, a pure helper (a function of its arguments), a fixed table, or a cache that rebuilds itself and gives the same answer whether it is warm or cold. Any other mutable static is global state: it is either on the stack layer's short list of named exceptions, each with its reason (Unity: `Unity/02-Project.md`, Modules and assemblies), or a finding at the epic's close audit.
  The stack layer checks this, the singleton ban and the inheritance depth by a guard test where it can (Unity: `DesignRulesTests`); removability stays a question for the close audit.
  Why: the ban is on hidden dependencies and state that outlives its owner, not on the keyword; without the line a session could not tell a helper class from a violation, and the Unity rules already keep four statics for reasons a game paid for.
- **Factory Method, the why.** A new kind is then a new class and one entry in one place, which a coverage test over the kinds holds (Boundaries, below).
  Why: a kind known in several places costs an edit in each when one is added, as Box Trainer's ground kinds did (a field, a constructor line, a case and a term each) before one table held them; a factory gives kinds with behaviour the same single place. Decided by `<Designer>`, 2026-11-20.
- **A new kind: a row or a class.** Kinds that differ only in numbers or data (a cost, a name, an icon) are rows in one table, and no class is added. Kinds that differ in behaviour are classes, created by a factory. A kind with both is a class that reads its numbers from its row.
  Why: a class per kind for what is only data spreads one table over many files, and a table with a behaviour switch per row is the branch list the ordered-list rule removes (Boundaries, below). Without the line, this file's factory rule and its table-row rule gave two answers to one question.

## Boundaries

What module rules alone do not stop.
Why: a coupling review in Box Trainer found each of these, and an epic removed them.

- **Presentation reads domain data and calls one game facade.** It never calls a deeper domain service. A view that needs a computed number gets a sheet from the facade (`StatSheet`).
- **Events carry facts**: ids, enums, values. Never a live domain object, a config object, or a string a listener parses.
- **No game rule in a view.** If a method in a view would deserve a unit test, it belongs in the domain.
- **A read changes nothing.** A property or query never writes state or saves; a derived flag that opens once (a shop, a mode) is set by an explicit check the owner calls after a load and after the event that can open it.
  Why: Box Trainer's shop gate saved the campaign from inside its getter, so which screen read it first decided when the save happened, and a test reading it changed what it tested.
- **Words and icons are data.** The domain emits enums and keys; text lives in one table, sprites in the style asset.
- **Size is a smell.** A class past about 300 lines or with two reasons to change is split before the next feature goes in. Known hubs are listed by name in `Architecture.md`.
- **A test lists every class at the size line, with its split named.** One guard test holds a list of files at or near the line and their allowed length; a file that grows past its entry fails, and an entry names the split the next change makes first.
  Why: in Box Trainer a size rule kept only in prose was passed class by class over an epic, each task adding a few lines; the list turned the drift into a failing test at the task that crossed it.
- **A data table past the line splits by its natural key.** An authored table (voice lines, say) becomes one class per key (per tone) over a small shared builder, and the parent joins them; its coverage test reads the joined result.
  Why: Box Trainer's 535-line voice table could not be cut by behaviour, since it has none; by tone it became four files of about 150 lines that were each edited alone.
- **A reaction to an event reads the event, never its condition again.** A prompt, card, voice line or lesson that answers something the simulation did (a hit, damage, an item eaten) opens from the fact the simulation reports that step, never from a second test of where the agent stands. Two tests of one fact (a tile under the centre here, the whole body there) drift apart with every tuning of one of them.
  Why: Box Trainer's teaching card read the tile under the box's centre while damage needed the whole body in water with water all round; each damage fix moved one rule and widened the gap, so for over a day the water and spike cards opened before anything hurt.
- **An override in a decision loop is an entry in an ordered list, never a branch.** Each thing that can take over an agent's step (a leash, a scare, a push) is one class with one shape (`Claims(situation, perception, out decision)`), held in one list in its order, with a line per entry saying why it comes where it does; a test asserts the order. Likewise a per-kind cost or worth is a table row, not a field, a case and a term in the scorer.
  Why: Box Trainer's decide step grew to thirteen `if ... return` lines whose order was the behaviour and was written nowhere, and each ground kind cost a field, a constructor line, a case and a term; every new feeling would have been a branch in four places.
- **Every enum a table must cover has a coverage test.** For each enum whose members need a row elsewhere (a name, an icon, a voice line, a cost), a test walks the members and fails on a missing one, with an explicit list of members that need none and the reason. Check it by adding a probe member and watching it fail.
  Why: in Box Trainer a ground kind added to its enum alone compiled, showed no name and was priced as free ground, and no test failed.

## Interface

The stack layer says where each piece lives and which test holds it (Unity: `Unity/01-UI.md`; apps: `App/README.md`, Styling).

- **Colours are tokens in two tiers: a palette named for the colour, and roles named for the use.** A palette token holds the literal (`--teal-700: #1f5c5a`); a role points at one (`--color-accent: var(--teal-700)`). Every rule outside the token file uses roles only. Sizes, type and spacing stay one tier of steps (`--space-md`), since their names already say the use.
  Why: with one tier, a token's name had to be either the value or the use. Named for the use, changing the palette meant editing every literal; named for the value, a restyle meant renaming across sheets. With roles over a palette, a palette change or a second theme (high contrast, colour-blind) redefines roles in one file. Decided by `<Designer>`, 2026-11-21.
- **Every component and every shared look is shown in one gallery, in each of its variants and states.** A new component, variant or state goes into the gallery in the task that adds it, and a test fails on one the gallery leaves out.
  Why: a component was seen only where some screen used it, in the one state that screen's sample showed, so the set could not be reviewed as a set or picked from before writing a new block. Decided by `<Designer>`, 2026-11-21.

## Code

- Comments state intent, one or two lines. Never restate the code.
- Design hooks: prepare only cheap hooks for the next iteration (a struct instead of an enum, a version number in a save), listed in a table in `Architecture.md` with why the later iteration needs them. Do not build ahead on guesses.
  Why: a guess built ahead is code to read and keep for a feature that may never come; a cheap hook keeps the later change small.
