const https = require('https');

async function handler(req, res) {
  const targetUrl = new URL('https://tc.sbtc-mng.com/api.php');

  if (req.query && Object.keys(req.query).length > 0) {
    Object.entries(req.query).forEach(([key, value]) => {
      const normalizedValue = Array.isArray(value) ? value.join(',') : value;
      targetUrl.searchParams.append(key, normalizedValue);
    });
  }

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).end();
    return;
  }

  try {
    const upstreamResponse = await new Promise((resolve, reject) => {
      const request = https.request(
        {
          protocol: targetUrl.protocol,
          hostname: targetUrl.hostname,
          port: targetUrl.port || 443,
          path: `${targetUrl.pathname}${targetUrl.search}`,
          method: req.method || 'GET',
          headers: {
            Accept: 'application/json, text/plain, */*',
            'User-Agent': 'Vercel-Proxy/1.0'
          },
          rejectUnauthorized: false
        },
        (response) => {
          let body = '';
          response.setEncoding('utf8');
          response.on('data', (chunk) => {
            body += chunk;
          });
          response.on('end', () => {
            resolve({
              status: response.statusCode || 200,
              headers: response.headers,
              body
            });
          });
        }
      );

      request.on('error', reject);
      request.end();
    });

    const contentType = upstreamResponse.headers['content-type'] || 'application/json; charset=utf-8';

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate');
    res.status(upstreamResponse.status).send(upstreamResponse.body);
  } catch (error) {
    console.error('Proxy error:', error);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(502).json({
      success: false,
      message: 'Unable to reach upstream API'
    });
  }
}

module.exports = handler;
module.exports.default = handler;
