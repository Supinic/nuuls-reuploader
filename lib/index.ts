import config from "../config.json" assert { type: "json" };
import { Reupload, Nuuls } from "./globals";

import * as DankTwitch from "dank-twitch-irc";
import { MariaLogger } from "./loggers/mariadb.js";
import { ImgurUploader } from "./uploaders/imgur.js";
import { CatboxMoeUploader } from "./uploaders/catbox-moe.js";

import { LoggerTemplate } from "./loggers/template.js";
import { UploaderTemplate } from "./uploaders/template.js";

if (config.twitch.channels.length === 0) {
    throw new Error("No channels have been configured");
}

let logger: LoggerTemplate;
if (config.dataStorage === "mariadb") {
    logger = new MariaLogger(config.mariadb);
}
else {
    throw new Error("Unsupported data storage selected");
}

let uploader: UploaderTemplate;
if (config.reuploader === "imgur") {
    uploader = new ImgurUploader(config.imgur);
}
else if (config.reuploader === "catbox.moe") {
    uploader = new CatboxMoeUploader();
}
else {
    throw new Error("Unsupported logging selected");
}

// Sets up an anonymous read-only connection
const client = new DankTwitch.ChatClient();

const cache: Map<Nuuls, Reupload> = new Map();
const nuulsRegex = /i\.nuuls\.com\/(?<filename>\w+\.\w+)/g;

client.on("PRIVMSG", async (messageData) => {
    const { messageText } = messageData;
    const matches = [...messageText.matchAll(nuulsRegex)];
    if (matches.length === 0) {
        return;
    }

    const files = matches.map(i => i.groups?.filename).filter(Boolean) as string[];
    const unique = new Set(files);

    for (const nuulsFile of unique) {
        const cacheExists = cache.has(nuulsFile);
        if (cacheExists) {
            console.log({ cacheExists });
            continue;
        }

        const databaseRowExists = await logger.exists(nuulsFile);
        if (databaseRowExists) {
            console.log({ databaseRowExists });
            continue;
        }

        const url = `https://i.nuuls.com/${nuulsFile}`;
        const response = await fetch(url);
        if (response.status !== 200) {
            console.log(response.status);
            continue;
        }

        const headers = response.headers;
        const blob = await response.blob();
        const reuploadResponse = await uploader.upload({
            url,
            headers,
            filename: nuulsFile,
            data: blob
        });

        if (reuploadResponse.link === null) {
            console.log({ reuploadResponse });
            continue;
        }

        const logSuccess = await logger.add(nuulsFile, reuploadResponse.link);
        if (logSuccess) {
            console.log({ logSuccess });
            cache.set(nuulsFile, reuploadResponse.link);
        }
    }
})

client.on("error", (err) => {
    console.warn("Twitch error", err);
})

client.on("JOIN", (data) => {
    console.log("channel joined", data.channelName);
})

await client.connect();
await client.joinAll(config.twitch.channels);
