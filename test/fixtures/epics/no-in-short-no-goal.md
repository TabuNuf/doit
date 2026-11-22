# EPIC-004 implementation spec

Unity MCP: `set_active_instance` with `rabbit-rocket-racing-steam@a98a1277` at session start.

## 1. What exists

- `MapStore` keeps the maps the player built, one folder each.

## 2. Folders and files to add

```
Assets/Scripts/Maps/
├── PendingMap.cs      the map waiting to be played
```
