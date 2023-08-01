/**
 * @typedef {Object} VideoInfo
 * @property {string} name - The name of the channel.
 * @property {string} title - The title of the video.
 * @property {string} video_url - The url of the video.
 * @property {string} meta - The meta of the video.
 * @property {string} published_date - The published date of the video.
 * @property {string} genre - the category of the video
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
 * @property {string} heading - The heading of the result.
 * @property {Content[]} contents - An array of content objects.
 */

let times = 58;

const puppeteer = require('puppeteer');
const fs = require('fs');
const date = new Date().toISOString().slice(0, 19);
const reformatData = require('./utils/reformat.js');

const URL = 'https://www.youtube.com/watch?v=dQ2bjo07aNs&list=PL-c0DN3fTeQehw1ZGXim96ZvSMEaAi_Bt';

const OUTPUT_FILE_NAME = `results/${date}_result.json`;

const SETTINGS = 'ytd-masthead #end #button';
const LANGUAGE = '#items > ytd-compact-link-renderer:nth-child(2)';
const ZH_TW = '#items > ytd-compact-link-renderer:nth-child(80)';

const MORE_ACTION = '#actions yt-button-shape:last-child button';

const LIST_TAG = 'ytd-engagement-panel-section-list-renderer';
const HEADER_TAG = 'ytd-transcript-section-header-renderer';
const SEGMENT_TAG = 'ytd-transcript-segment-renderer';

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
    console.log('Changed language to: ZH_TW')
}

async function fetchVideoInfo(page) {
    const title = await page.$eval('#title.ytd-watch-metadata yt-formatted-string', (node) => node.textContent) || '';
    const name = await page.$eval('#upload-info a.yt-simple-endpoint', (node) => node.textContent) || '';
    const video_url = await page.$eval('link[itemprop=url]', (node => node.href || ''));
    const meta = await page.$eval('#info-container', (node) => node?.textContent.trim()) || '';
    const excerpt = await page.$eval('meta[itemprop=description]', (node) => node.content || '');
    const published_date = await page.$eval('meta[itemprop=datePublished]', (node) => node.content || '');
    const genre = await page.$eval('meta[itemprop=genre]', (node) => node.content || '');
    await page.$eval('#description tp-yt-paper-button#expand', (node) => node?.click());
    const description = await page.$eval('#description ytd-text-inline-expander yt-attributed-string', (node) => node.textContent) || '';

    return {title, name, video_url, meta, excerpt, published_date, genre, description};
}

/**
 * @returns {Promise<VideoInfo>}
 */

async function fetchVideoTranscripts(page) {

    /** @type {Transcripts[]} */
    const transcripts = [];
    /** @type {Transcripts} */
    const untitled = {heading: 'Untitled', contents: []};
   
    await page.click(MORE_ACTION);
    await page.waitForSelector('ytd-popup-container > tp-yt-iron-dropdown');

    try {
        const actionList = await page.$$('ytd-menu-service-item-renderer');
        for (const actionItem of actionList) {
            const itemText = await actionItem.evaluate((node) => node.textContent);
            if (itemText.includes('轉錄稿') || itemText.includes('transcript')) {
                console.log('Transcript found!');
                await actionItem?.click();
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
                        const heading = await section.$eval('yt-formatted-string', (node) => node.textContent) || '';
                        transcripts.push({heading, contents: []});
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
                await page.$("button[aria-label='關閉轉錄稿']", node => { node?.click()});
                // await page.$("button[aria-label='Close transcript']", node => { node?.click()})
                console.log('Clicked cross button')
                return transcripts;
            }
        }
    } catch (error) {
        console.log('No transcript found!');
        return untitled;
    }
    return transcripts
}

async function goToNextPage(page) {
    try {
        await page.$eval('a.ytp-next-button', (node) => {
            window.location.href = node.href;
            new Promise(function(resolve) { setTimeout(resolve, 3000)});
        });
    } catch (error) {
        console.log(error)
    }
}

async function checkIsBroadcast(page) {
    console.log('Checking if is broadcast');
    try {
        const isBroadcast = await page.$eval("meta[itemprop=isLiveBroadcast]", (node) => node.content);
        if (isBroadcast) {
            console.log('Video is broadcast');
            goToNextPage(page);
        }
    } catch (error) {}
}

async function fetchData(page, times) {

    let results = [];

    for (let i = 1; i < times; i++) {
            await page.waitForSelector(LIST_TAG);
            await page.waitForSelector('.watch-main-col')
            const info = await fetchVideoInfo(page);
            const transcripts = await fetchVideoTranscripts(page);
            results.push({...info, transcripts});
            console.log(`Video ${i+1} has been fetched. Goto next page...`);
            await goToNextPage(page);
            await checkIsBroadcast(page);
    }
    return results;
}

async function main() {

    const browser = await puppeteer.launch({headless: false, defaultViewport:null});
    const page = await browser.newPage();
    await page.goto(URL, {waitUntil: "networkidle0"});
    await changeYoutubeLanguage(page);
    const data = await fetchData(page, times);
    await browser.close();
    const finalData = await reformatData(data);
    console.log(finalData)
    return finalData;
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