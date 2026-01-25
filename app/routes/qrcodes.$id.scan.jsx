import { redirect } from "@remix-run/node";
import invariant from "tiny-invariant";

import { unauthenticated } from "../shopify.server";
import { getQRCodeById, incrementQRCodeScans } from "../models/qrcode.repository";
import { getDestinationUrl } from "../models/QRCode.server";

export const loader = async ({ params, request }) => {
  // [START validate]
  invariant(params.id, "Could not find QR code destination");

  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  invariant(shop, "Shop parameter is required");

  const { admin } = await unauthenticated.admin(shop);
  const gid = `gid://shopify/Metaobject/${params.id}`;
  const qrCode = await getQRCodeById(admin.graphql, gid);

  invariant(qrCode, "Could not find QR code destination");
  // [END validate]

  // [START increment]
  await incrementQRCodeScans(admin.graphql, gid);
  // [END increment]

  // [START redirect]
  return redirect(getDestinationUrl(qrCode, shop));
  // [END redirect]
};
