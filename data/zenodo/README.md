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

The default unauthenticated collection page size is intentionally `25`. Zenodo
currently rejects unauthenticated records API requests using `size=100` with
HTTP 400, while paginated `size=25` requests remain accepted. The collector
therefore keeps `size=25` as its default and follows Zenodo pagination links so
records beyond the first 25 are still fetched.
