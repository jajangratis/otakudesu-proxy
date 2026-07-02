const { load } = require('cheerio');
const { rewriteHtml } = require('./filter');

const url = process.argv[2] || 'https://otakudesu.blog/episode/mswtd-episode-1-sub-indo/';

fetch(url, {
  headers: {
    'user-agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  },
})
  .then((response) => response.text())
  .then((html) => {
    const filtered = rewriteHtml(html);
    const $ = load(filtered);

    console.log('=== iframes after filter ===');
    $('iframe').each((index, element) => {
      const node = $(element);
      console.log(index, 'src:', node.attr('src'), 'id:', node.attr('id'), 'class:', node.attr('class'));
    });

    console.log('\n=== embed_holder ===');
    console.log($('#embed_holder').html()?.slice(0, 1200).replace(/\s+/g, ' '));

    console.log('\n=== stream links ===');
    $('a[href*="desustream"], a[href*="stream"]').each((index, element) => {
      const node = $(element);
      console.log(index, node.attr('href'), node.text().trim().slice(0, 40));
    });

    console.log('\n=== ids containing ad ===');
    $('[id*="ad"]').each((index, element) => {
      if (index > 15) return;
      console.log($(element).attr('id'), element.tagName);
    });
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
