# Zenodo analytics data

The collector intentionally keeps only the newest record for each Zenodo
`conceptrecid` by default. Zenodo's statistics FAQ states that record statistics
are displayed as aggregated counts across all versions of a record by default;
version-specific counts are available separately in the expandable statistics UI:
https://zenodo.org/help/statistics

Because of that Zenodo default, summing every version returned by the REST API
would double count versioned records. Keeping the newest record per `conceptrecid`
and using its `stats.views`, `stats.unique_views`, `stats.downloads`, and
`stats.unique_downloads` values preserves the concept-level cumulative totals
without undercounting.

If Zenodo changes this behavior in the future, update the collector and the test
fixtures together so the aggregation scope remains explicit.

## API search compatibility

Zenodo's search guide lists `creators.name` as a searchable field and documents
quoted phrase searches. The collector therefore uses
`q=creators.name:"Takafumi Matsuoka"` and then performs an exact creator-name
check in Python to avoid false positives.

The GitHub Actions HTTP 400 failure was caused by requesting `size=100` from an
unauthenticated workflow. Public examples for current Zenodo APIs note that
unauthenticated record searches should use a page size of 25, while 100 is for
authenticated requests. The workflow now uses the script default of 25.

References:
- https://help.zenodo.org/guides/search/
- https://developers.zenodo.org/
