### Added
- Workspace and agent rows show the metadata plugins and scripts report to herdr
  (`report-metadata`), laid out as your herdr sidebar lays it out: the `$name` values your
  `[ui.sidebar.spaces]` and `[ui.sidebar.agents]` rows (and `rows_by_agent`) name, row by row and
  in their order, joined with ` · `, and hidden where a `hide` rule matches. Nerd Font icons in the
  values draw. Remote PCs' rows follow this PC's layout, as herdr's own client draws them.
