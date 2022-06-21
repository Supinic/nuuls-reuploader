import * as TwitchIRC from "https://deno.land/x/twitch_irc@0.10.1/mod.ts";
import { Privmsg } from "https://deno.land/x/twitch_irc@0.10.1/lib/message/privmsg.ts";

import config from "./config.json" assert { type: "json" };
import { Reupload, Nuuls } from "./src/globals.d.ts";

import { MySqlLogger } from "./src/loggers/mysql.ts";
import { ImgurUploader } from "./src/uploaders/imgur.ts";
import { CatboxMoeUploader } from "./src/uploaders/catbox_moe.ts";

import { LoggerTemplate } from "./src/loggers/template.ts";
import { UploaderTemplate } from "./src/uploaders/template.ts";

if (config.twitch.channels.length === 0) {
    throw new Error("No channels have been configured");
}

let logger: LoggerTemplate;
if (config.dataStorage === "mysql") {
    logger = new MySqlLogger(config.mysql);
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
const client = new TwitchIRC.Client();

const cache: Map<Nuuls, Reupload> = new Map();
const nuulsRegex = /i\.nuuls\.com\/(?<filename>\w+\.\w+)/g;

client.on("open", () => {
    for (const channel of config.twitch.channels) {
        client.join(`#${channel}`);
    }
});

client.on("privmsg", async (data: Privmsg) => {
    const { message } = data;

    const matches = [...message.matchAll(nuulsRegex)];
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

        const contentType = response.headers.get("content-type")?.split("/")[0];
        if (!contentType) {
            console.log("Content-Type does not exist.");
            continue;
        }

        const headers = response.headers;
        const blob = await response.blob();
        const reuploadResponse = await uploader.upload({
            url,
            headers,
            filename: nuulsFile,
            data: blob,
            type: contentType,
        });

        if (reuploadResponse.link === null) {
            console.log({ reuploadResponse });
            continue;
        }

        const logSuccess = await logger.add(nuulsFile, reuploadResponse.link);
        if (logSuccess) {
            cache.set(nuulsFile, reuploadResponse.link);
        }
    }
});

client.on("error", (err) => {
    console.warn("Twitch error", err);
});
