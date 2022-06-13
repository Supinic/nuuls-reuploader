type UploadResponse = {
    statusCode: number;
    link: string | null;
}

export abstract class UploaderTemplate {
    public abstract upload (data: Blob, file?: string): Promise<UploadResponse>;
}
