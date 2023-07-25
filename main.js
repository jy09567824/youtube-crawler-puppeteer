/**
 * @typedef {Object} VideoInfo
 * @property {string} name - The name of the channel.
 * @property {string} title - The title of the video.
 * @property {string} meta - The meta of the video.
 * @property {string} description - The description of the video.
 * @property {Transcripts[]} transcripts - The content of the video.
 */

/**
 * @typedef {Object} Content
 * @property {string} timestamp - The timestamp of a content object.
 * @property {string} text - The text of a content object.
 */

/**
 * @typedef {Object} Transcripts
 * @property {string} title - The title of the result.
 * @property {Content[]} contents - An array of content objects.
 */

const puppeteer = require('puppeteer');
const {writeFileSync} = require('fs');

const LIST_TAG = 'ytd-engagement-panel-section-list-renderer';
const HEADER_TAG = 'ytd-transcript-section-header-renderer';
const SEGMENT_TAG = 'ytd-transcript-segment-renderer';

const OUTPUT_FILE_NAME = 'result.json';

const URL = 'https://www.youtube.com/watch?v=C366hnsI8UI';

/**
 * @typedef {import('puppeteer').Page} Page
 * @param {Page} page - The url of the video.
 * @returns {Promise<Omit<VideoInfo, 'transcripts'>>}
 */

async function fetchVideoInfo(page) {
    const title = await page.$eval('#title.ytd-watch-metadata yt-formatted-string', (node) => node.textContent) || '';
    const name = await page.$eval('#upload-info a.yt-simple-endpoint', (node) => node.textContent) || '';
    const meta = await page.$eval('#info-container', (node) => node?.textContent.trim()) || '';

    await page.$eval('#description tp-yt-paper-button#expand', (node) => node?.click());
    const description = await page.$eval('#description ytd-text-inline-expander yt-attributed-string', (node) => node.textContent) || '';

    return {name, title, meta, description};
}

/**
 * @returns {Promise<VideoInfo>}
 */

async function fetchVideoTranscripts(page) {
    const sectionList = await page.$(`${LIST_TAG}:last-child`);
    await sectionList.evaluate((node) => node.setAttribute('visibility', 'ENGAGEMENT_PANEL_VISIBILITY_EXTENDED'));
    // wait for section list to load
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const sectionsElements = await sectionList.$$(`${HEADER_TAG}, ${SEGMENT_TAG}`);

    /** @type {Transcripts[]} */
    const transcripts = [];
    /** @type {Transcripts} */
    const untitled = {title: 'Untitled', contents: []};

    /** @type {Transcripts|null} */
    let cursor = null;
    for (const section of sectionsElements) {
        const tagName = await section.evaluate((node) => node.tagName);
        if (tagName === HEADER_TAG.toUpperCase()) {
            /** @type string */
            const title = await section.$eval('yt-formatted-string', (node) => node.textContent) || '';
            transcripts.push({title, contents: []});
            cursor = transcripts[transcripts.length - 1];
            continue;
        }

        const timestamp = await section.$eval('.segment-timestamp', (node) => node?.textContent.trim()) || '';
        const text = await section.$eval('yt-formatted-string', (node) => node.textContent) || '';
        if (cursor) {
            cursor.contents.push({timestamp, text});
        } else {
            untitled.contents.push({timestamp, text});
        }
    }

    if (untitled.contents.length > 0) {
        transcripts.push(untitled);
    }
    return transcripts;
}

async function main() {

    let data = [];

    const browser = await puppeteer.launch({headless: false});
    let page = await browser.newPage();
    await page.goto(url, {waitUntil: 'networkidle0'});
    await page.waitForSelector(LIST_TAG);
    let info = await fetchVideoInfo(page);
    console.log(info);
    let transcripts = await fetchVideoTranscripts(page);
    console.log(transcripts);
    
    data.push({
        ...info,
        transcripts,
    });

    return data;
}
/**
 * @param {VideoInfo} value
 */

async function saveAsJsonFile(info) {
    await writeFileSync(OUTPUT_FILE_NAME, JSON.stringify(info));
    console.log('The file has been saved!');
}

main().then(async (info) => {
    saveAsJsonFile(info);
});
