import { json } from "@remix-run/node";
import invariant from "tiny-invariant";
import { useLoaderData } from "@remix-run/react";

import { unauthenticated } from "../shopify.server";
import { getQRCodeById } from "../models/qrcode.repository";
import { getQRCodeImage } from "../models/QRCode.server";

// [START loader]
export const loader = async ({ params, request }) => {
  invariant(params.id, "Could not find QR code destination");

  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  invariant(shop, "Shop parameter is required");

  const { admin } = await unauthenticated.admin(shop);
  const gid = `gid://shopify/Metaobject/${params.id}`;
  const qrCode = await getQRCodeById(admin.graphql, gid);

  invariant(qrCode, "Could not find QR code destination");

  return json({
    title: qrCode.title,
    image: await getQRCodeImage(gid, shop),
  });
};
// [END loader]

// [START component]
export default function QRCode() {
  const { image, title } = useLoaderData();

  return (
    <>
      <h1>{title}</h1>
      <img src={image} alt={`QR Code for product`} />
    </>
  );
}
// [START component]
