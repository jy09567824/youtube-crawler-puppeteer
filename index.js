// data format example:
// {  
//     "name": "泛科學院",
//     "title": "用完就回不去了！取代 PowerPoint 的強大 AI 工具？讓我從此只想用它做簡報？｜Gamma｜泛科學院", 
//     "meta": "觀看次數：82萬次  1 個月前  AI 簡報大全",
//     "description": "使用我的註冊連結 可獲得 200 點 AI 運算點數 ➤ https://gamma.app/signup?r=3502r0602a...Power Point可以被取代嗎？近期做簡報基本上已經不再使用 Power Point，原因就是...",
//     "content": "介紹最強 AI 生成簡報工具？0:00今天要介紹的AI簡報工具0:01讓我認真思考0:02從此放棄Power Point了0:04之前我有支影片0:05分享了AI生成簡報的工具0:07..."
// }

const puppeteer = require('puppeteer');
const fs = require('fs');

async function main() {
    const url = 'https://www.youtube.com/watch?v=WSlV5PW3QP8';
    const browser = await puppeteer.launch({ headless: false});
    const page = await browser.newPage();
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

main();

function saveJSONFile() {
    // write to json file
    console.log('saving to json file...')
    fs.writeFile('result.json', JSON.stringify(value), (err) => {
        if (err) throw err;
        console.log('The file has been saved!');
    });
}
// handle with Youtube ads & get caption
// async function youtubeAdsDetector() {
//     // video playing event listener
//     // const video = document.querySelector('video');
//     // video.addEventListener("play", youtubeAdsDetector)
//     console.log("Video is playing");
//     await wait(1000);
//     try {
//         let adContainerText = document.querySelector('.ytp-ad-preview-container') || 'no ads';
//         // const skipButton = document.querySelector('.ytp-ad-skip-button-icon');
//         // const adPreviewText = document.querySelector('.ytp-ad-preview-text').innerText || '';
//         if (adContainerText.innerText.includes('after')) { 
//             // 10 or 15s ads
//             console.log('Video will play after watch (10 or 15s)');
//             // 等待影片播放完畢
//         } else if (adContainerText.innerText.length == 1) {
//             console.log('Ads will skip after 5s');
//             // We can click it immediately
//             document.querySelector('.ytp-ad-skip-button-icon').click();
//             await wait(1000);
//         } else {
//             console.log('Other conditions');
//             await wait(1000);
//         }
//     } catch (error) { 
//         console.log(error)
//         console.log('video is not an ad')
//         video.removeEventListener("play", youtubeAdsDetector);
//         console.log('No ads, stop listening.')
//         console.log('Get caption...');
//         getCaption();
//     }
// };｀