import { UploaderTemplate, UploadOptions } from "./template.js";

type ImgurOptions = {
    clientID: string;
};
type ImgurUploadResponse = {
    data?: {
        link?: string
    }
};

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

        const response = await fetch("https://api.imgur.com/3/image", {
            method: "POST",
            headers: {
                authorization: `Client-ID ${this.clientID}`,
                "content-type": options.headers.get("content-type") ?? "image/png"
            },
            body: formData
        });

        const result = await response.json() as ImgurUploadResponse;
        return {
            statusCode: response.status,
            link: result.data?.link ?? null
        };
    }
}
