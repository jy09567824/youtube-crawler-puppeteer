const cheerio = require("cheerio");
const fs = require("fs");

const YTB_LIST_URL = new URL("https://tw.noxinfluencer.com/youtube-channel-rank/top-100-tw-all-youtuber-sorted-by-subs-weekly");
const TAG_ID_LIST = [ 1, 46, 284, 301, 86, 31, 125, 305, 306, 307, 312, 165, 410 ];

async function sleep(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

async function getYoutuberList() {

    let results = [];

    for (id of TAG_ID_LIST) {

        const response = await fetch(YTB_LIST_URL + "tag_id=" + id, {
            headers: {
                Accept: "application/json",
            }
        })
        const data = await response.text()

        .then((text) => cheerio.load(text))
        .then(($) => {
            let data = [];
            list = $(".link.clearfix");
            list.each((i, element) => {
            channel_name = $(element).text().replace(' ','');
            channel_info = "https://tw.noxinfluencer.com" + $(element).attr("href");
            jsonData = { channel_name, channel_info };
            data.push(jsonData);
            });
            return data;
        })
        results = results.concat(data);
    }
    fs.writeFileSync("youtuber_list.json", JSON.stringify(results, null, 2));
}

async function getChannelURL() {

    const youtuberList = await JSON.parse(fs.readFileSync("youtuber_list.json"));

    for (channel of youtuberList) {
        const response = await fetch(channel.channel_info, {
            headers: {
                Accept: "application/json",
            }
        })
        const channel_url = await response.text()
        .then((text) => cheerio.load(text))
        .then(($) => {
            try {
                const channel_url = $(".ytb-subscribe").attr('href').split('?')[0];
                return channel_url;
            } catch (error) {
                return '';
            }
        })
        console.log(channel_url);
        channel.channel_url = channel_url;
        await sleep(3000);
    }
    fs.writeFileSync("youtuber_list.json", JSON.stringify(youtuberList, null, 2));
}

getChannelURL()