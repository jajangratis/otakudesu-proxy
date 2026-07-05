/**
 * @typedef {Object} AnimeItem
 * @property {string} title
 * @property {string} path
 * @property {string|null} [thumbnail]
 * @property {string|null} [badge]
 */

/**
 * @typedef {Object} GridPageResponse
 * @property {true} ok
 * @property {'grid'} kind
 * @property {string} path
 * @property {string} title
 * @property {AnimeItem[]} items
 * @property {string|null} nextPath
 */

/**
 * @typedef {Object} HomeSection
 * @property {string} title
 * @property {AnimeItem[]} items
 */

/**
 * @typedef {Object} HomePageResponse
 * @property {true} ok
 * @property {'home'} kind
 * @property {string} path
 * @property {string} title
 * @property {HomeSection[]} sections
 * @property {string|null} nextPath
 */

module.exports = {};
