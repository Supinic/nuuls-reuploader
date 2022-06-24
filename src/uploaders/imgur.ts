import { UploaderTemplate, UploadOptions } from "./template.ts";

type ImgurOptions = {
    clientID: string;
};
type ImgurUploadResponse = {
    data?: {
        link?: string
    }
};
interface FileType {
    image: string;
    video: string;
}

export class ImgurUploader extends UploaderTemplate {
    private readonly clientID: string;

    public constructor (options: ImgurOptions) {
        super();

        this.clientID = options.clientID;
    }

    public async upload (options: UploadOptions) {
        const formData = new FormData();

        // !!! FILE NAME MUST BE SET, OR THE API NEVER RESPONDS !!!
        formData.append("image", options.data, options.filename);

        const endpoint = this.getEndpoint(options.type);
        const response = await fetch(`https://api.imgur.com/3/${endpoint}`, {
            method: "POST",
            headers: {
                authorization: `Client-ID ${this.clientID}`
            },
            body: formData
        });

        const result = await response.json() as ImgurUploadResponse;
        // Weird edge case with Imgur when uploading .webm or .mkv files will leave a "." at the end of the link
        if (result.data?.link?.endsWith(".")) {
            return {
                statusCode: response.status,
                link: `${result.data.link}mp4`
            };
        }

        return {
            statusCode: response.status,
            link: result.data?.link ?? null
        };
    }

    public getEndpoint (fileType: string) {
        const type: FileType = {
            "image": "image",
            "video": "upload"
        }

        return type[fileType as keyof FileType];
    }
}