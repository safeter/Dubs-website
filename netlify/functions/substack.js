const FEED_URL = 'https://woods721787.substack.com/feed';

function parseItems(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null && items.length < 3) {
    const block = match[1];

    const title = (/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/.exec(block) ||
                   /<title>([\s\S]*?)<\/title>/.exec(block) || [])[1] || '';

    const link = (/<link>([\s\S]*?)<\/link>/.exec(block) ||
                  /<guid[^>]*>([\s\S]*?)<\/guid>/.exec(block) || [])[1] || '';

    const pubDate = (/<pubDate>([\s\S]*?)<\/pubDate>/.exec(block) || [])[1] || '';

    const descRaw = (/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/.exec(block) ||
                     /<description>([\s\S]*?)<\/description>/.exec(block) || [])[1] || '';

    // Strip HTML tags and truncate to 150 chars
    const excerpt = descRaw.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' ').trim().slice(0, 150);

    // Format date as "Month YYYY" in both locales
    const d = pubDate ? new Date(pubDate) : null;
    const dateFR = d ? d.toLocaleDateString('fr-CA', { month: 'long', year: 'numeric' }) : '';
    const dateEN = d ? d.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' }) : '';

    items.push({
      title: title.trim(),
      url: link.trim(),
      dateFR,
      dateEN,
      excerpt,
    });
  }

  return items;
}

exports.handler = async () => {
  try {
    const res = await fetch(FEED_URL, {
      headers: { 'User-Agent': 'pascaldubois.com/rss-reader' },
    });

    if (!res.ok) throw new Error(`Feed returned ${res.status}`);

    const xml = await res.text();
    const articles = parseItems(xml);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
      body: JSON.stringify(articles),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
