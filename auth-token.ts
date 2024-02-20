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

router.get('/authorize', async function (req, res, next) {

  // [START auth.get-session-token]
  const encodedSessionToken = getSessionTokenHeader(req) || getSessionTokenFromUrlParam(req);
  // [END auth.get-session-token]

  // [START auth.validate-session-token]
  // "shopify" is an instance of the Shopify API library object,
  // You can install and configure the Shopify API library through: https://www.npmjs.com/package/@shopify/shopify-api
  const decodedSessionToken = await shopify.session.decodeSessionToken(encodedSessionToken);
  // [END auth.validate-session-token]

  // [START auth.token-exchange]
  // "shopify" is an instance of the Shopify API library object,
  // You can install and configure the Shopify API library through: https://www.npmjs.com/package/@shopify/shopify-api
  const dest = new URL(decodedSessionToken.dest);
  const shop = dest.hostname;
  const accessToken = await shopify.auth.tokenExchange({
    shop,
    sessionToken: encodedSessionToken,
    requestedTokenType: RequestedTokenType.OnlineAccessToken // or RequestedTokenType.OnlineAccessToken
  });
  // [END auth.token-exchange]
});

