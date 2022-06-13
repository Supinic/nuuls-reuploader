import { createPool, Pool } from "mariadb";
import { LoggerTemplate } from "./template.js";

declare type SelectResult<T> = Array<T>;
declare type InsertResult = {
    affectedRows: number;
    insertId: number;
    warningStatus: number;
};

declare type MariaLoggerOptions = {
    auth: {
        user: string;
        password: string;
        host?: string;
        port?: number;
        socket?: string;
    },
    schema: string;
    table: string;
    columns: {
        added: string;
        nuuls: string;
        imgur: string;
    }
}

export class MariaLogger extends LoggerTemplate {
    #ready: boolean;

    private readonly pool: Pool;
    private readonly schema: string;
    private readonly table: string;
    private readonly columns: MariaLoggerOptions["columns"];

    public constructor (options: MariaLoggerOptions) {
        super();

        this.#ready = false;

        this.schema = options.schema;
        this.table = options.table;
        this.columns = options.columns;

        this.pool = createPool(options.auth);

        this.initialize()
            .then(() => this.#ready = true)
            .catch((err) => { throw err; });
    }

    private async initialize () {
        const [schemaExists] = await this.pool.query(`
            SELECT 1
            FROM INFORMATION_SCHEMA.SCHEMATA
            WHERE SCHEMA_NAME = '${this.schema}'
        `) as SelectResult<number>;

        if (!schemaExists) {
            console.log("Schema not found, creating...");
            await this.pool.query(`
               CREATE DATABASE \`${this.schema}\` /*!40100 COLLATE 'utf8mb4_general_ci' */
            `);

            console.log("Schema created");
        }
        else {
            console.debug("Schema exists, skipping create");
        }

        const [tableExists] = await this.pool.query(`
            SELECT 1
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = '${this.schema}'
            AND TABLE_NAME = '${this.table}'
        `) as SelectResult<number>;

        if (!tableExists) {
            console.log("Table not found, creating...");
            await this.pool.query(`
                CREATE TABLE IF NOT EXISTS ${this.path} (                    
                    \`${this.columns.nuuls}\` VARCHAR(16) NOT NULL,
                    \`${this.columns.imgur}\` VARCHAR(16) NOT NULL,
                    \`${this.columns.added}\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                    PRIMARY KEY (\`${this.columns.nuuls}\`, \`${this.columns.imgur}\`) USING BTREE
                )
                COLLATE='utf8mb4_general_ci'
                ENGINE=InnoDB;
            `);

            console.log("Table created");
        }
        else {
            console.debug("Table exists, skipping create");
        }
    }

    public async exists (nuuls: string) {
        const [exists] = await this.pool.query(`
            SELECT 1
            FROM ${this.path}
            WHERE \`${this.columns.nuuls}\` = '${nuuls}'
        `) as SelectResult<number>;

        return Boolean(exists);
    }

    public async add (nuuls: string, imgur: string) {
        const result = await this.pool.query(`
            INSERT INTO ${this.path}
            (\`${this.columns.nuuls}\`, \`${this.columns.imgur}\`)
            VALUES ('${nuuls}', '${imgur}')
        `) as InsertResult;

        return (result.affectedRows === 1);
    }

    private get path () {
        return `\`${this.schema}\`.\`${this.table}\``;
    }

    public get ready () { return this.#ready; }
}
