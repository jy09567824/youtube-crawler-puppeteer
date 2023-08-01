function reformatData(data) {

    let reformattedData = Object.assign([], data);

    for (const videoIndex in data) {
        videoTranscript = "";
        if (data[videoIndex].transcripts.length) {
            for (const paragraphIndex in data[videoIndex].transcripts) {
                let newParagraph = "";
                // reformat heading to "<h2>${heading}</h2>"
                let paragraphHeading = reformattedData[videoIndex].transcripts[paragraphIndex].heading;
                if (paragraphHeading == "Untitled" ) {
                } else if (paragraphHeading) {
                    newParagraph += "<h2>"+paragraphHeading+"</h2>";
                }
                // reformant content to "<p>${content}</p>"
                let article = ""
                for (const item of data[videoIndex].transcripts[paragraphIndex].contents) {
                    article = article + JSON.stringify(item).split(",")[1].replace(/"|text|:|}/g, "") + ", ";
                }
                reformattedData[videoIndex].transcripts[paragraphIndex].contents = article;
                newParagraph += "<p>"+article+"</p>";
                videoTranscript += newParagraph;
            }
            reformattedData[videoIndex].transcripts = videoTranscript;
        } else {
            reformattedData[videoIndex].transcripts = videoTranscript;
        }
    }
    return reformattedData;
}

module.exports = reformatData