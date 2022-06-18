type UploadResponse = {
    statusCode: number;
    link: string | null;
}

export type UploadOptions = {
    url: string;
    filename: string;
    data: Blob;
    headers: Headers;
};

export abstract class UploaderTemplate {
    public abstract upload (options: UploadOptions): Promise<UploadResponse>;
}
