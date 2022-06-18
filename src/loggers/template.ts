export abstract class LoggerTemplate {
    public abstract add (nuuls: string, imgur: string): Promise<boolean>;
    public abstract exists (nuuls: string): Promise<boolean>;
    public abstract get ready (): boolean;
}
