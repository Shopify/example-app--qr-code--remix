import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  // [START process-webhooks]
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);
  // [END process-webhooks]

  return new Response();
};