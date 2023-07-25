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

let times = 5;

const puppeteer = require('puppeteer');
const fs = require('fs');
const date = new Date().toISOString().slice(0, 19);

const SETTINGS = 'ytd-masthead #end #button';
const LANGUAGE = '#items > ytd-compact-link-renderer:nth-child(2)';
const ZH_TW = '#items > ytd-compact-link-renderer:nth-child(80)';

const MORE_ACTION = '#actions yt-button-shape:last-child button';

const LIST_TAG = 'ytd-engagement-panel-section-list-renderer';
const HEADER_TAG = 'ytd-transcript-section-header-renderer';
const SEGMENT_TAG = 'ytd-transcript-segment-renderer';
const CROSS_BUTTON = 'button[aria-label="關閉轉錄稿"]';

const OUTPUT_FILE_NAME = `${date}_result.json`;

const URL = 'https://www.youtube.com/watch?v=D1W520QVS4I';

/**
 * @typedef {import('puppeteer').Page} Page
 * @param {Page} page - The url of the video.
 * @returns {Promise<Omit<VideoInfo, 'transcripts'>>}
 */

async function changeYoutubeLanguage(page) {
    await page.waitForSelector(SETTINGS);
    await page.click(SETTINGS);
    await page.waitForSelector(LANGUAGE);
    await page.click(LANGUAGE);
    await page.waitForSelector(ZH_TW);
    await page.click(ZH_TW);
}

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

    /** @type {Transcripts[]} */
    const transcripts = [];
    /** @type {Transcripts} */
    const untitled = {title: 'Untitled', contents: []};
   
    await page.click(MORE_ACTION);
    await page.waitForSelector('ytd-popup-container > tp-yt-iron-dropdown');
    try {
        let transcriptChecker = false;
        const actionList = await page.$$('ytd-menu-service-item-renderer');

        for (const actionItem of actionList) {
            const itemText = await actionItem.evaluate((node) => node.textContent);
            if (itemText.includes('轉錄稿') || itemText.includes('transcript')) {
                console.log('Transcript found!');
                transcriptChecker = true;
                await actionItem.click();
                await page.waitForSelector('ytd-transcript-segment-renderer');

                // const sectionList = await page.$('#segments-container');
                const sectionList = await page.$(`${LIST_TAG}:last-child`);
                await sectionList.evaluate((node) => node.setAttribute('visibility', 'ENGAGEMENT_PANEL_VISIBILITY_EXTENDED'));
                // wait for section list to load
                await new Promise((resolve) => setTimeout(resolve, 1000));
                const sectionsElements = await sectionList.$$(`${HEADER_TAG}, ${SEGMENT_TAG}`);
            
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
                console.log('Get transcript done!');
                await page.click(CROSS_BUTTON);
                return transcripts;
            }
        }
        if (transcriptChecker === false) {
            console.log('No transcript found!');
            return untitled;
        }
    } catch (error) {
        console.log(error);
        return untitled;
    }
}

async function fetchData(page, times) {

    let results = [];

    for (let i = 0; i < times; i++) {
            await page.waitForSelector(LIST_TAG);
            const info = await fetchVideoInfo(page);
            const transcripts = await fetchVideoTranscripts(page);
            results.push({...info, transcripts});
            // goto next page
            console.log('Goto next page...');
            const hrefElement = await page.$('a.ytp-next-button');
            await hrefElement.evaluate((link) => link.click());
            await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    return results;
}

async function main() {

    const browser = await puppeteer.launch({headless: false, defaultViewport:null});
    const page = await browser.newPage();
    await page.goto(URL, {waitUntil: 'networkidle0'});
    await changeYoutubeLanguage(page);
    const data = await fetchData(page, times);
    await browser.close();
    return data;
}
/**
 * @param {VideoInfo} value
 */

function saveAsJsonFile(value) {
    fs.writeFileSync(OUTPUT_FILE_NAME, JSON.stringify(value));
    console.log('The file has been saved!');
}

main().then(async (info) => {
    saveAsJsonFile(info);
});