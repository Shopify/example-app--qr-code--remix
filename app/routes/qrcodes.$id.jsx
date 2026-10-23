import invariant from "tiny-invariant";
import { useLoaderData } from "react-router";

import { unauthenticated } from "../shopify.server";
import { getQRCodeImage } from "../models/QRCode.server";

// [START loader]
export const loader = async ({ request, params }) => {
  invariant(params.id, "Could not find QR code destination");

  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  invariant(shop, "Missing shop parameter");

  const { admin } = await unauthenticated.admin(shop);

  const response = await admin.graphql(
    `
      query GetPublicQRCode($handle: MetaobjectHandleInput!) {
        metaobjectByHandle(handle: $handle) { id }
      }
    `,
    {
      variables: {
        handle: { type: "$app:qrcode", handle: params.id },
      },
    },
  );

  const { data } = await response.json();
  const metaobject = data?.metaobjectByHandle;
  invariant(metaobject, "Could not find QR code destination");

  // Don't return the title: the editor promises only store staff can see it.
  return {
    image: await getQRCodeImage(params.id, shop),
  };
};
// [END loader]

// [START component]
export default function QRCode() {
  const { image } = useLoaderData();

  return (
    <>
      <h1>Scan this QR code</h1>
      <img src={image} alt={`QR Code for product`} />
    </>
  );
}
// [END component]
