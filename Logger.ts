import {
    path
} from "./mod.ts";

async function ensureDir(dir: string) {
    try {
        const fileInfo = await Deno.lstat(dir);
        if (!fileInfo.isDirectory) {
            throw new Error(
                `Ensure path exists, expected 'dir', "${dir}"`,
            );
        }
    } catch (err) {
        if (err instanceof Deno.errors.NotFound) {
            // if dir not exists. then create it.
            await Deno.mkdir(dir, { recursive: true });
            return;
        }
        throw err;
    }
}

async function ensureFile(filePath: string) {
    try {
        // if file exists
        const stat = await Deno.lstat(filePath);
        if (!stat.isFile) {
            throw new Error(
                `Ensure path exists, expected 'file', "${filePath}"`,
            );
        }
    } catch (err) {
        // if file not exists
        if (err instanceof Deno.errors.NotFound) {
            // ensure dir exists
            await ensureDir(path.dirname(filePath));
            // create file
            await Deno.writeFile(filePath, new Uint8Array());
            return;
        }

        throw err;
    }
}

export class Log {
    fileName: string = ".log"
    header: string[] = ["Date"];
    data: string[];
    constructor(...data: string[]) {
        this.data = [];
        this.data.push(new Date().toString().replace(/\s\(.*\)/g, ""));
        this.data.push(...data);
    }
    get headerLine(): string {
        return `${this.header.join(",")}\n`;
    }
    toString(): string {
        return `${this.data.join(",")}\n`;
    }
}

export class RequestLog extends Log {
    fileName = "request.log";
    header = ["Date", "Path", "Method", "URL", "Address"];
    constructor(Path: string, Method: string, URL: string, Address: string) {
        super(Path, Method, URL, Address);
    }
}

export class ErrorLog extends Log {
    fileName: string = "error.log";
    header: string[] = ["Date", "Type", "Message"];
    constructor(Type: "error" | "warning", Message: string) {
        super(Type, Message);
    }
}

export class Logger {
    
    #directoryPath: string;

    constructor(directoryPath?: string) {
        this.#directoryPath = directoryPath || "./log";
    }
    
    async read(fileName: string): Promise<string> {
        const filePath: string = `${this.#directoryPath}/${fileName}`;
        await ensureFile(filePath)
        const text:string = await Deno.readTextFile(filePath);
        return new Promise(resolve=>resolve(text));
    }

    async write(fileName: string, text: string): Promise<void> {
        const filePath: string = `${this.#directoryPath}/${fileName}`;
        await ensureFile(filePath)
        await Deno.writeTextFile(filePath, text)
    }

    async insert(fileName: string, text: string): Promise<void> {
        const texts: string = await this.read(fileName);
        await this.write(fileName, texts+text);
    }

    async record(log: Log): Promise<void> {
        const texts: string = await this.read(log.fileName);
        if(!texts.length) await this.insert(log.fileName, log.headerLine);
        await this.insert(log.fileName, log.toString());
    }
}