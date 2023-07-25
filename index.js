// data format example:
// {  
//     "name": "泛科學院",
//     "title": "用完就回不去了！取代 PowerPoint 的強大 AI 工具？讓我從此只想用它做簡報？｜Gamma｜泛科學院", 
//     "meta": "觀看次數：82萬次  1 個月前  AI 簡報大全",
//     "description": "使用我的註冊連結 可獲得 200 點 AI 運算點數 ➤ https://gamma.app/signup?r=3502r0602a...Power Point可以被取代嗎？近期做簡報基本上已經不再使用 Power Point，原因就是...",
//     "content": "介紹最強 AI 生成簡報工具？0:00今天要介紹的AI簡報工具0:01讓我認真思考0:02從此放棄Power Point了0:04之前我有支影片0:05分享了AI生成簡報的工具0:07..."
// }

<<<<<<< HEAD
const puppeteer = require('puppeteer');
const fs = require('fs');
=======
/**
 * @typedef {Object} VideoInfo
 * @property {string} name - The name of the channel.
 * @property {string} title - The title of the video.
 * @property {string} meta - The meta of the video.
 * @property {string} description - The description of the video.
 * @property {Transcripts[]} transcripts - The content of the video.
 */
>>>>>>> refs/remotes/origin/main

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
async function main() {
    const url = 'https://www.youtube.com/watch?v=WSlV5PW3QP8';
    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();
<<<<<<< HEAD
    await page.goto(url)
    await page.waitForSelector('#button-shape > button > yt-touch-feedback-shape > div > div.yt-spec-touch-feedback-shape__fill');
    await page.click('#button-shape > button > yt-touch-feedback-shape > div > div.yt-spec-touch-feedback-shape__fill');

    const result = await page.$$eval('tp-yt-paper-listbox > ytd-menu-service-item-renderer', async elements => {
        // wait time
        let data = {};
        function wait(ms) {
            console.log('Start waiting...')
            return new Promise((resolve) => {
                setTimeout(() => {
                    console.log(`Done waiting ${ms} ms`);
                    resolve(ms);
                }, ms);
            });
        };
        async function getCaption(elements) {
            console.log('getting caption...')
            for (let ele of elements) {
                let itemText = ele.innerText;
                if (await itemText.includes('transcript') || await itemText.includes('轉錄稿')) {
                    console.log(`it's caption button: ${itemText}`);
                    await ele.click();
                    await wait(1000);
                    const name = await document.querySelector('#text > .yt-simple-endpoint').innerText || '';
                    const title = await document.querySelector('h1 > yt-formatted-string').innerText || '';
                    const meta = await document.querySelector('#info-container').innerText || '';
                    const description = await document.querySelector('div #description').innerText || '';
                    const content = await document.querySelector('#segments-container').innerText || '';
                    Object.defineProperty(data, 'name', { value: name, writable: false });
                    Object.defineProperty(data, 'content', { value: content, writable: false });             
                    console.log({ earlyData: data });
                    return data;
                } else {
                    console.log(`it's not caption button: ${itemText}`);
                };
            };
            console.log('end getting caption')
        };
        data = await getCaption(elements);
        console.log(data);
        return data;
    });
    console.log(result);
    // await browser.close();
    return result;
};
=======
    await page.goto(url, {waitUntil: 'networkidle0'});
    await page.waitForSelector(LIST_TAG);
>>>>>>> refs/remotes/origin/main

    const info = await fetchVideoInfo(page);

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

    await browser.close();
    return {
        ...info,
        transcripts,
    };
}

/**
 * @param {VideoInfo} value
 */
async function saveAsJsonFile(value) {
    await writeFileSync(OUTPUT_FILE_NAME, JSON.stringify(value));
    console.log('The file has been saved!');
}

main().then(async (info) => {
    await saveAsJsonFile(info);
});
