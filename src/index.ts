/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */



export interface Env {
	WHOAMI: KVNamespace
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url)
		// https://example.com/path/to/resource?query=value
		// url.pathname =  /path/to/resource
		const path = url.pathname
		// Get IP
		const ip = request.headers.get("CF-Connecting-IP") || "127.0.0.1"
		// Get Country
		const country = request.headers.get("CF-IPCountry") || "XX"

		// 错误处理
		if (!ip) {
			return errorView(500, "failed to determine client ip")
		}
		if (!country) {
			return errorView(500, "failed to determine country")
		}

  
        const ipData = { ip,country};
        await env.WHOAMI.put(Date.now().toString(),JSON.stringify(ipData));

		if (path === '/') {
			return textView(ip, 0)
		}
		else if (path === '/json') {
			return jsonView({IP:ip}, 0)
		}
		else {
			return errorView(404, "invalid url", true)
		}
	},
} satisfies ExportedHandler<Env>;

type Ip = {
	IP: string,
}

/**
 * 生成标准化的 HTTP 错误响应。
 * @param status - HTTP 状态码
 * @param message - 错误信息
 * @param asJson - 是否以 JSON 格式返回错误（默认为 true）
 * @returns HTTP Response
 */
function errorView(status: number, message: string, asJson = true): Response {
	const body = asJson ? JSON.stringify({error: message}) : message
	const headers = new Headers({
		'Content-Type': (asJson ? 'application/json' : 'text/plain') + ';charset=utf-8',
		'Cache-Control': 'no-cache'
	})
	return new Response(body, { headers, status })
}

/**
 * Returns a text view to the client, includes only the IP.
 * If ipInfo.ip is undefined, return a 404.
 */
function textView(ip: string, cacheSecs = 0) {
	if (!ip) {
		return new Response("IP not found\n", { status: 404, headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
	}
	const cache = cacheSecs > 0 ? `max-age=${cacheSecs}` : "no-cache"
	const headers = new Headers({ 'Content-Type': 'text/plain;charset=utf-8', 'Cache-Control': cache })
	return new Response(`${ip}\n`, { headers })
}

/**
 * The JSON view
 */
function jsonView(ip:Ip, cacheSecs = 0) {
	const cache = cacheSecs > 0 ? `max-age=${cacheSecs}` : "no-cache"
	if (!ip) {
		return new Response("Invalid data\n", { status: 400, headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
	}	
	const headers = new Headers({ 'Content-Type': 'application/json;charset=utf-8', 'Cache-Control': cache })
	return new Response(JSON.stringify(ip, null, 2), { headers })
}