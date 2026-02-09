import { redirect } from "react-router";
import invariant from "tiny-invariant";

import { unauthenticated } from "../shopify.server";
import {
  getDestinationUrl,
  incrementQRCodeScans,
} from "../models/QRCode.server";

export const loader = async ({ request, params }) => {
  // [START validate]
  invariant(params.id, "Could not find QR code destination");

  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  invariant(shop, "Missing shop parameter");

  const { admin } = await unauthenticated.admin(shop);
  // [END validate]

  // [START fetch]
  const response = await admin.graphql(
    `
      query GetQRCodeScan($handle: MetaobjectHandleInput!) {
        metaobjectByHandle(handle: $handle) {
          id
          product: field(key: "product") {
            reference {
              ... on Product { handle }
            }
          }
          productVariant: field(key: "product_variant") {
            reference {
              ... on ProductVariant { legacyResourceId }
            }
          }
          destination: field(key: "destination") { jsonValue }
          scans: field(key: "scans") { jsonValue }
        }
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
  // [END fetch]

  // [START increment]
  const currentScans = metaobject.scans?.jsonValue ?? 0;
  await incrementQRCodeScans(metaobject.id, currentScans, admin.graphql);
  // [END increment]

  // [START redirect]
  const qrCode = {
    destination: metaobject.destination?.jsonValue,
    productHandle: metaobject.product?.reference?.handle,
    productVariantLegacyId: metaobject.productVariant?.reference?.legacyResourceId,
  };

  return redirect(getDestinationUrl(qrCode, shop));
  // [END redirect]
};
