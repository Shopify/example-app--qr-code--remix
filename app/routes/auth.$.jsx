import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-remix/server";

export async function loader({ request }) {
  await authenticate.admin(request);

  return null;
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
