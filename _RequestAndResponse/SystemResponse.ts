import {
    SystemRequest, Route,
    Cookie, setCookie,
    lookup,
    assignToVariables
} from "../mod.ts";

/**
 * クライアントへのレスポンス機能を拡張するクラス。
 * Class that extends the response functionality to the client.
 */
export class SystemResponse {

    /**
     * リクエストイベントオブジェクトを格納する変数。
     * Variable that stores the RequestEvent object.
     */
    #respondWith: Function;

    /**
     * 応答後かどうか。
     * After response or not.
     */
    #responded: boolean = false;

    /**
     * HTML内の変数に挿入するテキストを格納する連想配列。
     * An associative array that stores text to be inserted into variables in HTML.
     */
    #preset: { [key: string]: any; };


    init: ResponseInit;
    headers: Headers;
    status: number;
    body: string | ReadableStream<Uint8Array> | Uint8Array | undefined;

    /**
     * 強制ダウンロードかどうか（初期値はfalse）。
     * Whether to force download or not (default value is false).
     */
    isForceDownload: boolean;

    constructor(requestEvent: Deno.RequestEvent) {
        this.#respondWith = requestEvent.respondWith;

        this.headers = new Headers();
        this.status = 500;
        this.body = "500 Internal Server Error";
        this.init = {headers: this.headers};
        this.setType('text/plain');

        this.#preset = {};

        this.isForceDownload = false;
        Route["500"].GET()(new SystemRequest(requestEvent.request, {}), this);
    }

    /**
     * 応答後かどうか。
     * After response or not.
     */
    get responded(): boolean {
        return this.#responded;
    }

    /**
     * MIMEタイプを設定する。
     * Set the MIME type.
     * @param type MIME (Content-Type)
     * 
     * ```ts
     * response.setType("text/plain");
     * ```
     */
    setType(type: string): SystemResponse {
        this.headers.set('Content-Type', type);
        return this;
    }

    /**
     * レスポンスオブジェクトにテキストを設定する。
     * Set the response object to text.
     * @param text A string to return to the client.
     * @param status Status code (default is 200).
     * @param filePath File path.
     */
    setText(text: string | ReadableStream<Uint8Array> | Uint8Array, status: number = 200, filePath?: string): SystemResponse {
        if(typeof text === "string") {
            this.body = assignToVariables(text, this.#preset, filePath);
        } else {
            this.body = text;
        }
        this.status = status;
        return this;
    }

    /**
     * レスポンスオブジェクトにファイルを設定する。
     * Set the file to the Response object.
     * @param filePath The path of the file to return to the client.
     * @param status Status code (default is 200).
     */
    async setFile(filePath: string, status?: number): Promise<SystemResponse> {
        let file_data: string | ReadableStream<Uint8Array> | Uint8Array = "";
        try {
            const extensions: false | string = lookup(filePath);
            try { // After version 1.16.0
                let readableStream: ReadableStream<Uint8Array> | null;
                if(filePath.match(/^\.\/|^\//)) {
                    const mainModule = Deno.mainModule.split("/").slice(0, -1).join("/");
                    readableStream = (await fetch(`${mainModule}/${filePath.replace(/^\.\/|^\//, "")}`)).body;
                } else {
                    readableStream = (await fetch(filePath)).body;
                }
                if(readableStream) {
                    if(extensions && extensions.split("/")[0] === "text") {
                        file_data = await Deno.readFile(filePath);
                        file_data = new TextDecoder('utf-8').decode(file_data);
                    } else {
                        file_data = readableStream;
                    }
                }
            } catch { // Before version 1.16.0
                file_data = await Deno.readFile(filePath);
                if(extensions && extensions.split("/")[0] === "text") {
                    file_data = new TextDecoder('utf-8').decode(file_data);
                }
            }
            this.setText(file_data, status, filePath);
            if(extensions) this.setType(extensions);
        } catch (e) {
            console.log(`\n[ warning ]\n
            The "${filePath}" file could not be read.\n
            "${filePath}"ファイルが読み取れませんでした。\n`);
        }
        return this;
    }

    /**
     * セットしたファイルや文字列に変数が埋め込まれていた場合に、参照されるオブジェクトを定義する。
     * Defines an object to be referenced when a variable is embedded in a set file or string.
     * @param object An object that contains a variable to be referenced.
     */
    preset(object: { [key: string]: any; }): SystemResponse {
        this.#preset = object;
        return this;
    }

    /**
     * Cookieのセットを行う。
     * Set cookies.
     * @param cookie Cookie object.
     * ```ts
     * response.setCookie({
     *      name: 'deno', value: 'runtime',
     *      httpOnly: true, secure: true, maxAge: 2, domain: "deno.land"
     * });
     * ```
     */
    setCookie(cookie: Cookie): SystemResponse {
        setCookie(this.headers, cookie);
        return this;
    }

    /**
     * Cookieの削除を行う。
     * Delete cookie.
     * @param name Cookie name.
     */
    deleteCookie(
        name: string,
        attributes?: { path?: string; domain?: string }
    ): SystemResponse {
        this.setCookie({
            name: name,
            value: "",
            expires: new Date(0),
            ...attributes,
        });
        return this;
    }

    /**
     * クライアントにレスポンスを返して処理を終了する。
     * Return the response to the client and finish the process.
     */
    async send(response?: string | Response): Promise<void> {
        if(this.#responded) return;
        if(this.isForceDownload) {
            this.headers.set('Content-Type', 'application/octet-stream');
        }
        this.init.status = this.status;
        if(this.init.statusText) this.init.statusText = encodeURIComponent(this.init.statusText);
        let res: Response = new Response(this.body, this.init);
        if(typeof response == "string") this.setText(response);
        else if(response) res = response;
        await this.#respondWith(res);
        this.#responded = true;
    }

    /**
     * リダイレクトさせる。
     * Redirect.
     * @param url URL of the redirection destination.
     */
    redirect(url: string): void {
        this.status = 302;
        this.body = "";
        this.headers.set('Location', url);
        this.send();
    }
}
