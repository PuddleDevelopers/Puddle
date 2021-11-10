import { System, DecodedURL, default_onmessage, default_onopen }  from "../mod.ts";

export type WebSocketHandlerFunction = {
    (client: WebSocketClient, ev?: Event | MessageEvent<any> | ErrorEvent | CloseEvent): void;
}

/**
 * WebSocketRouteを初期化する際の引数として使用されるオブジェクト。
 * An object used as an argument when initializing a WebSocketRoute.
 */
export interface WebSocketEvent {
    onopen?: WebSocketHandlerFunction;
    onclose?: WebSocketHandlerFunction;
    onmessage?: WebSocketHandlerFunction;
    onerror?: WebSocketHandlerFunction;
}

/**
 * WebSocket通信時のイベントの処理を設定、取得するためのクラス。
 * Class for setting and retrieving event handling during WebSocket communication.
 */
export class WebSocketRoute {

    /**
     * クライアントとの通信開始時に実行される関数。
     * Function executed at the start of communication with the client.
     * @param request SystemRequest.
     * @param client WebSocketClient.
     */
    #onopen: WebSocketHandlerFunction;

    /**
     * クライアントとの接続が切れたときに実行される関数。
     * Function to be executed when the connection to the client is lost.
     * @param request SystemRequest.
     * @param client WebSocketClient.
     */
    #onclose: WebSocketHandlerFunction;

    /**
     * クライアントからメッセージが送られてきたときに実行される関数。
     * A function that is executed when a message is sent from a client.
     * @param request SystemRequest.
     * @param client WebSocketClient.
     * @param message A message sent by the client.
     */
    #onmessage: WebSocketHandlerFunction;

    #onerror: WebSocketHandlerFunction;

    constructor(event?: WebSocketEvent) {
        this.#onopen = event?.onopen || default_onopen;
        this.#onclose = event?.onclose || function(){};
        this.#onmessage = event?.onmessage || default_onmessage;
        this.#onerror = event?.onerror || function(){};
    }

    /**
     * クライアントとの通信開始時に実行される関数のセッター兼ゲッター。
     * Setter and getter of the function to be executed when communication with the client starts.
     * @param process function (request: SystemRequest, client: WebSocketClient)
     * @return Function or WebSocketRoute.
     * 
     * ```ts
     * System.createRoute("./ws").WebSocket()
     *  .onopen((req: SystemRequest, client: WebSocketClient) => {
     *      // process
     *  });
     * ```
     */
    onopen(): WebSocketHandlerFunction;
    onopen(process: WebSocketHandlerFunction): WebSocketRoute;
    onopen(process?: WebSocketHandlerFunction): WebSocketHandlerFunction | WebSocketRoute {
        if(process) {
            this.#onopen = process;
            return this;
        }
        return this.#onopen;
    }

    /**
     * クライアントとの接続が切れたときに実行される関数のセッター兼ゲッター。
     * Setter and getter for the function to be executed when the connection to the client is lost.
     * @param process function (request: SystemRequest, client: WebSocketClient)
     * @return Function or WebSocketRoute.
     * 
     * ```ts
     * System.createRoute("./ws").WebSocket()
     *  .onclose((req: SystemRequest, client: WebSocketClient) => {
     *      // process
     *  });
     * ```
     */
    onclose(): WebSocketHandlerFunction;
    onclose(process: WebSocketHandlerFunction): WebSocketRoute;
    onclose(process?: WebSocketHandlerFunction): WebSocketHandlerFunction | WebSocketRoute {
        if(process) {
            this.#onclose = process;
            return this;
        }
        return this.#onclose;
    }

    /**
     * クライアントからメッセージが送られてきたときに実行される関数のゲッター兼セッター。
     * A getter and setter for a function that is executed when a message is sent from a client.
     * @param process function (request: SystemRequest, client: WebSocketClient, message: string)
     * @return Function or WebSocketRoute.
     * 
     * ```ts
     * System.createRoute("./ws").WebSocket()
     *  .onmessage((req: SystemRequest, client: WebSocketClient, message: string) => {
     *      client.sendAll(message);
     *  });
     * ```
     */
    onmessage(): WebSocketHandlerFunction;
    onmessage(process: WebSocketHandlerFunction): WebSocketRoute;
    onmessage(process?: WebSocketHandlerFunction): WebSocketHandlerFunction | WebSocketRoute {
        if(process) {
            this.#onmessage = process;
            return this;
        }
        return this.#onmessage;
    }

    onerror(): WebSocketHandlerFunction;
    onerror(process: WebSocketHandlerFunction): WebSocketRoute;
    onerror(process?: WebSocketHandlerFunction): WebSocketHandlerFunction | WebSocketRoute {
        if(process) {
            this.#onerror = process;
            return this;
        }
        return this.#onerror;
    }
}

/**
 * 接続された各クライアントの情報の保持とメッセージの送信を行うクラス。
 * Class that maintains information on each connected client and sends messages.
 */
export class WebSocketClient {

    /**
     * 最後に追加されたクライアントのID。
     * ID of the last client that was added.
     */
    static lastInsertedId = 0;

    /**
     * 接続されているクライアントを格納した連想配列。
     * An associative array containing the connected clients.
     * @key Client ID.
     * @value WebSocketClient.
     */
    static list: { [key: number]: WebSocketClient; } = {};

    /**
     * URLのpathnameに含まれる変数の名前とその値
     * The variable name and its value included in the pathname of the URL.
     */
    variables: { [key: string]: string; };

    #id: number;
    #attributes: Map<string, any>;
    #webSocket: WebSocket;
    #url: string;
    #message: string | ArrayBufferLike | Blob | ArrayBufferView;
    #to: WebSocketClient[] = [];

    constructor(webSocket: WebSocket, url: string, variables: { [key: string]: string; }) {
        this.#id = WebSocketClient.lastInsertedId++;
        this.#attributes = new Map<string, any>();
        this.#webSocket = webSocket;
        this.#url = url;
        this.#message = "";
        this.variables = variables;
        WebSocketClient.list[this.#id] = this;
    }

    /**
     * コネクションが開かれた時のURL。
     * The URL when the connection is opened.
     */
    get url(): string {
        return this.#url;
    }

    /**
     * クライアントから送られてきたメッセージ。
     * A message sent by a client.
     */
    get message(): string | ArrayBufferLike | Blob | ArrayBufferView {
        return this.#message;
    }

    /**
     * クライアントIDのゲッター。
     * Getter of client ID.
     */
    get id(): number {
        return this.#id;
    }

    /**
     * WebSocketオブジェクトのゲッター。
     * Getter of WebSocket object.
     */
    get webSocket() {
        return this.#webSocket;
    }

    /**
     * 現在接続しているクライアントの数。
     * Number of clients currently connected.
     */
    static get concurrentConnections(): number {
        return Object.keys(WebSocketClient.list).length;
    }
    get concurrentConnections(): number {
        return WebSocketClient.concurrentConnections;
    }

    /**
     * デコード済みのURLオブジェクトを取得する。
     * Get the decoded URL object.
     * @returns Decoded URL object.
     */
    getURL(): DecodedURL {
        try {
            const url = new DecodedURL(this.#url);
            url.valiable = this.variables;
            return url;
        } catch {
            return new DecodedURL("http://error");
        }
    }

    /**
     * クライアントの属性のゲッター。
     * Getter of client attributes.
     * @param key Attribute name.
     * @returns Attribute value.
     */
    getAttribute(key: string): any {
        return this.#attributes.get(key);
    }
    getAttributes(...keys: string[]): { [key: string]: any; } {
        const attributes: {[key: string]:any;} = {};
        keys.forEach(key=>attributes[key] = this.getAttribute(key));
        return attributes;
    }

    /**
     * クライアントの属性のセッター。
     * Setter of client attributes.
     * @param key Attribute name.
     * @param value Attribute value.
     */
    setAttribute(key: string, value: any): Map<string, any> {
        return this.#attributes.set(key, value);
    }
    setAttributes(attributes: { [key: string]: any; }): Map<string, any> {
        Object.keys(attributes).forEach(key=>this.setAttribute(key, attributes[key]));
        return this.#attributes;
    }

    /**
     * クライアントから指定した属性を削除する。
     * Removes the specified attribute from the client.
     * @param key Attribute name.
     * @returns Attribute value.
     */
    removeAttribute(key: string): any {
        const removedAttribute = this.getAttribute(key);
        this.#attributes.delete(key);
        return removedAttribute;
    }
    removeAttributes(...keys: string[]): {[key: string]:any;} {
        const removedAttributes: {[key: string]:any;} = {};
        keys.forEach(key=>removedAttributes[key] = this.removeAttribute(key));
        return removedAttributes;
    }

    /**
     * クライアントIDでクライアントを取得する。
     * Get the client by client ID.
     * @param id Client ID.
     * @returns WebSocketClient
     */
    static getClientById(id: number): WebSocketClient {
        return WebSocketClient.list[id];
    }
    getClientById(id: number): WebSocketClient {
        return WebSocketClient.getClientById(id);
    }

    /**
     * 接続されているすべてのクライアントを取得する。
     * Get all connected clients.
     * @returns Client array.
     */
    static getAllClients(): WebSocketClient[] {
        return Object.values(WebSocketClient.list);
    }
    getAllClients(): WebSocketClient[] {
        return WebSocketClient.getAllClients();
    }

    /** 
     * クライアント配列を属性から取得する。
     * Getting the client array from attributes.
     * @param attributes { attribute1 and attribute2 and ...} or { attributeN and attributeN+1 and ...} or ...
     * @returns Client array.
     * 
     * ```ts
     * client.getClientsByAttribute({group: 1, type: "A"}, {group: 2, type: "B"}, ...);
     * ```
     */
    static getClientsByAttribute(...attributes: {[key:string]:any;}[]): WebSocketClient[] {
        const allClients: WebSocketClient[] = Object.values(WebSocketClient.list);
        return allClients.filter(client=>{
            return Boolean(attributes.filter(attribute=>{
                return !Object.keys(attribute).filter(key=>!client.getAttribute(key)).length
            }).length);
        });
    }
    getClientsByAttribute(...attributes: {[key:string]:any;}[]): WebSocketClient[] {
        return WebSocketClient.getClientsByAttribute(...attributes);
    }

    /**
     * メッセージを設定する。
     * Set the message.
     * 
     * ```typescript
     * ws.setMessage("Hello!");
     * ws.to(ws.getAllClients());
     * ws.send();
     * ```
     */
    setMessage(message: string | ArrayBufferLike | Blob | ArrayBufferView): void {
        this.#message = message;
    }

    /**
     * 送信するクライアントを指定する。
     * Specify the client to send.
     * @param clients Client array.
     * 
     * ```typescript
     * ws.setMessage("Hello!");
     * ws.to(ws.getAllClients());
     * ws.send();
     * ```
     */
    to(clients: WebSocketClient[]): void {
        this.#to = clients;
    }

    /**
     * 送信したクライアントに返信する。
     * Reply to the client who sent it.
     */
    reply(message?: string | ArrayBufferLike | Blob | ArrayBufferView): void {
        this.send([this], message);
    }

    /**
     * メッセージを送信する。
     * Send the message.
     * @param clients The client array to send to.
     * @param message Message to send.
     */
    static send(clients: WebSocketClient[], message: string | ArrayBufferLike | Blob | ArrayBufferView): void {
        clients.forEach(client=>client.webSocket.send(message));
    }
    send(clients?: WebSocketClient[], message?: string | ArrayBufferLike | Blob | ArrayBufferView): void {
        WebSocketClient.send(clients || this.#to, message || this.#message);
    }

    /**
     * メッセージを接続している全クライアントに送信する。
     * Send the message to all connected clients.
     * @param message Message to send.
     */
    static sendAll(message: string | ArrayBufferLike | Blob | ArrayBufferView): void {
        WebSocketClient.send(WebSocketClient.getAllClients(), message);
    }
    sendAll(message: string | ArrayBufferLike | Blob | ArrayBufferView): void {
        WebSocketClient.sendAll(message);
    }

}