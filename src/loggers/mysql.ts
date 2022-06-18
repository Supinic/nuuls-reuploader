import { Client } from "https://deno.land/x/mysql@v2.10.2/mod.ts";
import { LoggerTemplate } from "./template.ts";

declare type InsertResult = {
    affectedRows: number;
    insertId: number;
    warningStatus: number;
};

type MySqlAuthOptions = {
    user: string;
    password: string;
    host?: string;
    port?: number;
    socket?: string;
};

declare type MySqlLoggerOptions = {
    auth: MySqlAuthOptions,
    schema: string;
    table: string;
    columns: {
        added: string;
        nuuls: string;
        reupload: string;
    }
}

export class MySqlLogger extends LoggerTemplate {
    #ready: boolean;

    private readonly client: Client;
    private readonly schema: string;
    private readonly table: string;
    private readonly columns: MySqlLoggerOptions["columns"];

    public constructor (options: MySqlLoggerOptions) {
        super();

        this.#ready = false;
1
        this.schema = options.schema;
        this.table = options.table;
        this.columns = options.columns;

        this.client = new Client();

        this.initialize(options.auth)
            .then(() => this.#ready = true)
            .catch((err) => { throw err; });
    }

    private async initialize (auth: MySqlAuthOptions) {
        await this.client.connect({
            hostname: auth.host,
            username: auth.user,
            password: auth.password
        });

        const { rows: databaseRows } = await this.client.execute(`
            SELECT 1
            FROM INFORMATION_SCHEMA.SCHEMATA
            WHERE SCHEMA_NAME = '${this.schema}'
        `);

        if (!databaseRows || databaseRows.length === 0) {
            console.log("Schema not found, creating...");
            await this.client.execute(`
               CREATE DATABASE \`${this.schema}\` /*!40100 COLLATE 'utf8mb4_general_ci' */
            `);

            console.log("Schema created");
        }
        else {
            console.debug("Schema exists, skipping create");
        }

        const { rows: tableRows } = await this.client.execute(`
            SELECT 1
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = '${this.schema}'
            AND TABLE_NAME = '${this.table}'
        `);

        if (!tableRows || tableRows.length === 0) {
            console.log("Table not found, creating...");
            await this.client.execute(`
                CREATE TABLE IF NOT EXISTS ${this.path} (                    
                    \`${this.columns.nuuls}\` VARCHAR(16) NOT NULL,
                    \`${this.columns.reupload}\` VARCHAR(256) NOT NULL,
                    \`${this.columns.added}\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                    PRIMARY KEY (\`${this.columns.nuuls}\`) USING BTREE
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
        const { rows } = await this.client.execute(`
            SELECT 1
            FROM ${this.path}
            WHERE \`${this.columns.nuuls}\` = '${nuuls}'
        `);

        return Boolean(rows && rows.length === 1);
    }

    public async add (nuuls: string, reupload: string) {
        const result = await this.client.execute(`
            INSERT INTO ${this.path}
            (\`${this.columns.nuuls}\`, \`${this.columns.reupload}\`)
            VALUES ('${nuuls}', '${reupload}')
        `) as InsertResult;

        return (result.affectedRows === 1);
    }

    private get path () {
        return `\`${this.schema}\`.\`${this.table}\``;
    }

    public get ready () { return this.#ready; }
}
