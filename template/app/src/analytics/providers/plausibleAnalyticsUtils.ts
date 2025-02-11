const PLAUSIBLE_API_KEY = process.env.PLAUSIBLE_API_KEY!;
const PLAUSIBLE_SITE_ID = process.env.PLAUSIBLE_SITE_ID!;
const PLAUSIBLE_BASE_URL = process.env.PLAUSIBLE_BASE_URL;

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${PLAUSIBLE_API_KEY}`,
};

type PageViewsResult = {
  results: {
    [key: string]: {
      value: number;
    };
  };
};

type PageViewSourcesResult = {
  results: [
    {
      source: string;
      visitors: number;
    }
  ];
};

export async function getDailyPageViews() {
  const totalViews = await getTotalPageViews();
  const prevDayViewsChangePercent = await getPrevDayViewsChangePercent();

  return {
    totalViews,
    prevDayViewsChangePercent,
  };
}

/**
 * Fetches total page views using Plausible's v2 Stats API.
 */
export async function getTotalPageViews() {
  const url = `${process.env.PLAUSIBLE_BASE_URL}/api/v2/query`;
  
  // Construct the payload. In this example, we're asking for total "pageviews"
  // for the entire period (you can adjust the date_range as needed).
  const payload = {
    site_id: process.env.PLAUSIBLE_SITE_ID,
    metrics: ["pageviews"],
    date_range: "all"  // or "7d", "30d", etc.
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.PLAUSIBLE_API_KEY}`,
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  const json = await response.json();
  // Assuming that the API returns a single row of results (an array with one element),
  // and that the "pageviews" metric is the first in the metrics array:
  const totalPageviews = json.results[0]?.metrics[0];
  return totalPageviews;
}

/**
 * Fetches pageviews for a specific day.
 */
export async function getPageviewsForDate(date: string) {
  const url = `${process.env.PLAUSIBLE_BASE_URL}/api/v2/query`;
  
  // When querying for a specific date, use a custom date range with the same start and end dates.
  const payload = {
    site_id: process.env.PLAUSIBLE_SITE_ID,
    metrics: ["pageviews"],
    date_range: [date, date]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.PLAUSIBLE_API_KEY}`,
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }
  
  const json = await response.json();
  // Extract the pageviews from the returned results.
  return json.results[0]?.metrics[0] || 0;
}

async function getPrevDayViewsChangePercent() {
  // Calculate today, yesterday, and the day before yesterday's dates
  const today = new Date();
  const yesterday = new Date(today.setDate(today.getDate() - 1)).toISOString().split('T')[0];
  const dayBeforeYesterday = new Date(new Date().setDate(new Date().getDate() - 2)).toISOString().split('T')[0];

  // Fetch page views for yesterday and the day before yesterday
  const pageViewsYesterday = await getPageviewsForDate(yesterday);
  const pageViewsDayBeforeYesterday = await getPageviewsForDate(dayBeforeYesterday);

  console.table({
    pageViewsYesterday,
    pageViewsDayBeforeYesterday,
    typeY: typeof pageViewsYesterday,
    typeDBY: typeof pageViewsDayBeforeYesterday,
  });

  let change = 0;
  if (pageViewsYesterday === 0 || pageViewsDayBeforeYesterday === 0) {
    return '0';
  } else {
    change = ((pageViewsYesterday - pageViewsDayBeforeYesterday) / pageViewsDayBeforeYesterday) * 100;
  }
  return change.toFixed(0);
}

export async function getSources() {
  const url = `${PLAUSIBLE_BASE_URL}/v1/stats/breakdown?site_id=${PLAUSIBLE_SITE_ID}&property=visit:source&metrics=visitors`;
  const response = await fetch(url, {
    method: 'GET',
    headers: headers,
  });
  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }
  const data = (await response.json()) as PageViewSourcesResult;
  return data.results;
}
