// [START validate-session-token.token-in-header]
function getSessionTokenHeader(request) {
  return request.headers['authorization']?.replace('Bearer ', '');
}
// [END validate-session-token.token-in-header]

// [START validate-session-token.token-in-url-param]
function getSessionTokenFromUrlParam(request) {
  const searchParams = new URLSearchParams(request.url);

  return searchParams.get('id_token');
}
// [END validate-session-token.token-in-url-param]

router.get('/authorize', async function (req, res, next) {

  // [START validate-session-token.get-session-token]
  const encodedSessionToken = getSessionTokenHeader(req) || getSessionTokenFromUrlParam(req);
  // [END validate-session-token.get-session-token]

  // [START validate-session-token.validate-session-token]
  // "shopify" is an instance of the Shopify API library object,
  // You can install and configure the Shopify API library through: https://www.npmjs.com/package/@shopify/shopify-api
  const decodedSessionToken = await shopify.session.decodeSessionToken(encodedSessionToken);
  // [END validate-session-token.validate-session-token]

  // [START validate-session-token.token-exchange]
  // "shopify" is an instance of the Shopify API library object,
  // You can install and configure the Shopify API library through: https://www.npmjs.com/package/@shopify/shopify-api
  const dest = new URL(decodedSessionToken.dest);
  const shop = dest.hostname;
  const accessToken = await shopify.auth.tokenExchange({
    shop,
    sessionToken: encodedSessionToken,
    requestedTokenType: RequestedTokenType.OnlineAccessToken // or RequestedTokenType.OnlineAccessToken
  });
  // [END validate-session-token.token-exchange]
});

