# Architecture

<Product> is built from modules wired in one composition root. The general rules are in `<Docs>/Standard/Core/03-Design.md`; this file holds this project's instance of them.

## Layers

| Tier | Modules | May reference | Never references |
|---|---|---|---|
| Domain | `<module>`, ... | lower domain modules only | the framework, interface, storage, network |
| Adapters | storage, network, SDKs | the domain's interfaces | the interface, each other |
| Interface | pages, components | the domain's facade and sheets | adapters, each other's internals |
| Composition root | `<file>` | everything | |

Module order, low to high: <Module1> → <Module2> → ...

## How the boundaries are enforced

The lint rule or test that fails when a module imports what it may not.

## Modules

One line per module: its job, its public surface, what it is given by the root.

## Class diagram

```mermaid
classDiagram
```

## Departures

Places where the code leaves this architecture on purpose, each decided by `<Designer>` at an epic's close audit (`<Docs>/Standard/Core/01-Tasks.md`, Closing an epic).

| Where | What | Why | Until |
|---|---|---|---|

## Design hooks

| Hook | Why the later iteration needs it |
|---|---|
