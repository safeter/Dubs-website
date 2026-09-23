const FEED_URL = 'https://woods721787.substack.com/feed';
const EXCERPT_MAX = 150;

const NAMED_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

// Decode &amp; / &#8217; / &#x2019; style entities into real characters
function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return NAMED_ENTITIES[e.toLowerCase()] ?? m;
  });
}

// Cut at a word boundary and add an ellipsis only when the text is actually shortened
function truncate(s, max) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.\-–—]+$/, '') + '…';
}

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

    // Strip HTML tags, decode entities, collapse whitespace, cap at 150 chars
    const text = decodeEntities(descRaw.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    const excerpt = truncate(text, EXCERPT_MAX);

    // Format date as "Month YYYY" in both locales
    const d = pubDate ? new Date(pubDate) : null;
    const dateFR = d ? d.toLocaleDateString('fr-CA', { month: 'long', year: 'numeric' }) : '';
    const dateEN = d ? d.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' }) : '';

    items.push({
      title: decodeEntities(title).trim(),
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
