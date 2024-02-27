// [START auth.token-in-header]
function getSessionTokenHeader(request) {
  return request.headers['authorization']?.replace('Bearer ', '');
}
// [END auth.token-in-header]

// [START auth.token-in-url-param]
function getSessionTokenFromUrlParam(request) {
  const searchParams = new URLSearchParams(request.url);

  return searchParams.get('id_token');
}
// [END auth.token-in-url-param]

// [START auth.session-token-bounce-redirect]
function redirectToSessionTokenBouncePage(req, res) {
  const searchParams = new URLSearchParams(req.query);
  // Remove `id_token` from the query string to prevent an invalid session token sent to the redirect path.
  searchParams.delete('id_token');

  // Using shopify-reload path to redirect the bounce automatically.
  searchParams.append('shopify-reload', `${req.path}?${searchParams.toString()}`);
  res.redirect(`/session-token-bounce?${searchParams.toString()}`);
}

router.get('/session-token-bounce', async function (req, res, next) {
  res.setHeader("Content-Type", "text/html")
  // "process.env.SHOPIFY_API_KEY" is available if you use Shopify CLI to run your app.
  // You can also replace it with your App's Client ID manually.
  const html = `
  <head>
      <meta name="shopify-api-key" content="${process.env.SHOPIFY_API_KEY}" />
      <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
  </head>
  `;
  res.send(html);
});
// [END auth.session-token-bounce-redirect]

router.get('/authorize', async function (req, res, next) {

  let encodedSessionToken = null;
  let decodedSessionToken = null;
  try {
    // [START auth.get-session-token]
    encodedSessionToken = getSessionTokenHeader(req) || getSessionTokenFromUrlParam(req);
    // [END auth.get-session-token]

    // [START auth.validate-session-token]
    // "shopify" is an instance of the Shopify API library object,
    // You can install and configure the Shopify API library through: https://www.npmjs.com/package/@shopify/shopify-api
    decodedSessionToken = await shopify.session.decodeSessionToken(encodedSessionToken);
    // [END auth.validate-session-token]
  } catch (e) {
    return redirectToSessionTokenBouncePage(req, res);
  }

  // [START auth.token-exchange]
  // "shopify" is an instance of the Shopify API library object,
  // You can install and configure the Shopify API library through: https://www.npmjs.com/package/@shopify/shopify-api
  const dest = new URL(decodedSessionToken.dest);
  const shop = dest.hostname;
  const accessToken = await shopify.auth.tokenExchange({
    shop,
    sessionToken: encodedSessionToken,
    requestedTokenType: RequestedTokenType.OnlineAccessToken // or RequestedTokenType.OfflineAccessToken
  });
  // [END auth.token-exchange]
});

