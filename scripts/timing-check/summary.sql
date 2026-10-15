-- Median and slowest 10% per route, from RequestTiming (same numbers as /admin/timings).
-- psql <db> -f scripts/timing-check/summary.sql
SELECT source, route, count(*) AS n,
  percentile_disc(0.5) WITHIN GROUP (ORDER BY "totalMs") AS median_ms,
  percentile_disc(0.9) WITHIN GROUP (ORDER BY "totalMs") AS slowest10_ms,
  percentile_disc(0.5) WITHIN GROUP (ORDER BY "dbMs") AS db_median_ms,
  percentile_disc(0.5) WITHIN GROUP (ORDER BY "queryCount") AS queries,
  count(*) FILTER (WHERE "coldStart") AS cold
FROM "RequestTiming" GROUP BY source, route ORDER BY source, slowest10_ms DESC;
