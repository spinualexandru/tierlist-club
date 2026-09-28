// Prints tier lists started and PNGs exported per day and list, from the Workers
// Analytics Engine dataset that worker/index.ts writes to.
//
//   CLOUDFLARE_ACCOUNT_ID=… CLOUDFLARE_API_TOKEN=… node scripts/events.ts [days=30]
//
// The token needs the "Account Analytics: Read" permission. Days are UTC, and
// Analytics Engine keeps data for three months.

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
const token = process.env.CLOUDFLARE_API_TOKEN
if (!accountId || !token) {
  console.error('Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN.')
  process.exit(1)
}

const days = Number(process.argv[2] ?? 30)
if (!Number.isInteger(days) || days < 1) {
  console.error(`Expected a whole number of days, got ${process.argv[2]}.`)
  process.exit(1)
}

// Rows can be sampled at high volume; `_sample_interval` weighs each one back up.
const query = `
  SELECT
    toStartOfInterval(timestamp, INTERVAL '1' DAY) AS day,
    blob2 AS list,
    sumIf(_sample_interval, blob1 = 'list_started') AS started,
    sumIf(_sample_interval, blob1 = 'png_exported') AS exported
  FROM tierlist_events
  WHERE timestamp > NOW() - INTERVAL '${days}' DAY
  GROUP BY day, list
  ORDER BY day DESC, list
  FORMAT JSON`

const response = await fetch(
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics_engine/sql`,
  { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: query },
)
if (!response.ok) {
  console.error(`Query failed (${response.status}): ${await response.text()}`)
  process.exit(1)
}

const { data } = (await response.json()) as {
  data: { day: string; list: string; started: number; exported: number }[]
}
if (data.length === 0) console.log(`No events in the last ${days} days.`)
else
  console.table(
    data.map(({ day, list, started, exported }) => ({
      day: day.slice(0, 10),
      list,
      started: Number(started),
      exported: Number(exported),
    })),
  )
