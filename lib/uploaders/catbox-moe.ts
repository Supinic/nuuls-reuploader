import { UploaderTemplate, UploadOptions } from "./template.ts";

export class CatboxMoeUploader extends UploaderTemplate {
    public async upload (options: UploadOptions) {
        const formData = new FormData();
        formData.append("reqtype", "urlupload");
        formData.append("url", options.url);

        const response = await fetch("https://catbox.moe/user/api.php", {
            method: "POST",
            body: formData
        });

        const result = await response.text();
        return {
            statusCode: response.status,
            link: result ?? null
        };
    }
}
