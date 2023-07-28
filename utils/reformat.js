function reformatData(data) {

    let reformattedData = Object.assign([], data)

    for (const videoIndex in data) {
        if (data[videoIndex].transcripts.length) {
            for (const paragraphIndex in data[videoIndex].transcripts) {
                let article = ''
                for (const item of data[videoIndex].transcripts[paragraphIndex].contents) {
                    article = article + JSON.stringify(item).split(',')[1].replace(/"|text|:|}/g, '') + ', '
                }
                reformattedData[videoIndex].transcripts[paragraphIndex].contents = article
            }
        }
    }
    return reformattedData
}

module.exports = reformatData