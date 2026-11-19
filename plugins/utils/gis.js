const REGEX = /\["(\bhttps?:\/\/[^"]+)",(\d+),(\d+)\],null/g;

// async port of the g-i-s npm module
async function gis(searchTerm, limit, options = {}) {
  if (!searchTerm || typeof searchTerm !== "string") return [];
  if (typeof options !== "object") return [];

  const {
      query = {},
      userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    } = options,
    body = await fetch(
      `http://www.google.com/search?${new URLSearchParams({
        ...query,
        udm: "2",
        tbm: "isch",
        q: searchTerm,
      })}`,
      { headers: { "User-Agent": userAgent }, signal: AbortSignal.timeout(30000) }
    ).then((res) => res.text()),
    content = body;
  REGEX.lastIndex = 0;
  let result;
  let urls = [];
  let i = 0;
  while ((result = REGEX.exec(content))) {
    if (i == limit) break;
    urls.push(result[1]);
    i++;
  }
  return urls;
}

/**
 * @deprecated since 6.2.11
 */
async function pinterestSearch(searchTerm, limit, options = {}) {
  searchTerm = "pinterest " + searchTerm;
  if (!searchTerm || typeof searchTerm !== "string") return [];
  if (typeof options !== "object") return [];

  const {
      query = {},
      userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    } = options,
    body = await fetch(
      `http://www.google.com/search?${new URLSearchParams({
        ...query,
        udm: "2",
        tbm: "isch",
        q: searchTerm,
      })}`,
      { headers: { "User-Agent": userAgent }, signal: AbortSignal.timeout(30000) }
    ).then((res) => res.text()),
    content = body.slice(
      body.lastIndexOf("ds:1"),
      body.lastIndexOf("sideChannel")
    );

  REGEX.lastIndex = 0;
  let result;
  let urls = [];
  let i = 0;
  while ((result = REGEX.exec(content))) {
    if (result[1].includes("pinimg.com")) {
      if (i == limit) break;
      urls.push(result[1]);
      i++;
    }
  }
  return urls;
}
module.exports = { gis, pinterestSearch };
