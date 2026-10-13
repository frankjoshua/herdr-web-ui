### Changed
- A finished agent you open in the web UI is marked seen in herdr too: the app focuses that pane in
  herdr, as herdr's own terminal does, so it reads `idle` instead of `done` in herdr's CLI, API and
  every other client. Only a pane you opened (picked, linked, or the one a reload returns to), on a
  visible page, while it reads DONE; never one the app picked by itself.
