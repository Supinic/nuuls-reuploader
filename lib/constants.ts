export const FileTypes = {
    filters: [
        { name: "video", type: "upload", extensions: [ "mp4", "webm", "mkv" ] },
        { name: "image", type: "image", extensions: [ "jpg", "jpeg", "png" ] },
    ]
} as const;