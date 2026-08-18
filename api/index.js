import server from "../dist/server/server.js";

export default async function handler(req, res) {
  try {
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
    const fullUrl = `${protocol}://${host}${req.url}`;

    const headers = new Headers();
    for (const [key, val] of Object.entries(req.headers)) {
      if (val) {
        if (Array.isArray(val)) {
          val.forEach((v) => headers.append(key, v));
        } else {
          headers.set(key, val);
        }
      }
    }

    let body = null;
    if (!["GET", "HEAD"].includes(req.method)) {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      body = Buffer.concat(chunks);
    }

    const webRequest = new Request(fullUrl, {
      method: req.method,
      headers,
      body,
    });

    const response = await server.fetch(webRequest);

    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    const responseBuffer = await response.arrayBuffer();
    res.end(Buffer.from(responseBuffer));
  } catch (error) {
    console.error("Vercel Serverless Function Error:", error);
    res.statusCode = 500;
    res.end("Internal Server Error");
  }
}
