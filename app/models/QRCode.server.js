import qrcode from "qrcode";
import db from "../db.server";

// [START get-qrcode]
export async function getQRCode(id, graphql) {
  const qrCode = await db.qRCode.findFirst({ where: { id } });

  if (!qrCode) {
    return null;
  }

  return supplementQRCode(qrCode, graphql);
}

export async function getQRCodes(shop, graphql) {
  const qrCodes = await db.qRCode.findMany({
    where: { shop },
    orderBy: { id: "desc" },
  });

  if (!qrCodes.length) {
    return qrCodes;
  }

  return Promise.all(
    qrCodes.map(async (qrCode) => supplementQRCode(qrCode, graphql))
  );
}
// [END get-qrcode]

// [START get-qrcode-image]
export async function getQRCodeImage(id) {
  const url = new URL(`/qrcodes/${id}/scan`, process.env.SHOPIFY_APP_URL);
  const image = await qrcode.toBuffer(url.href);

  return `data:image/jpeg;base64, ${image.toString("base64")}`;
}
// [END get-qrcode-image]

// [START get-destination]
export function getDestinationUrl(qrCode) {
  if (qrCode.destination === "product") {
    return `https://${qrCode.shop}/products/${qrCode.productHandle}`;
  }

  const id = qrCode.productVariantId.replace(
    /gid:\/\/shopify\/ProductVariant\/([0-9]+)/,
    "$1"
  );

  return `https://${qrCode.shop}/cart/${id}:1`;
}
// [END get-destination]

// [START hydrate-qrcode]
async function supplementQRCode(qrCode, graphql) {
  const response = await graphql(
    `
      query supplementQRCode($id: ID!) {
        product(id: $id) {
          title
          images(first: 1) {
            nodes {
              altText
              url
            }
          }
        }
      }
    `,
    {
      variables: {
        id: qrCode.productId,
      },
    }
  );

  const {
    data: { product },
  } = await response.json();

  return {
    ...qrCode,
    productDeleted: !product?.title,
    productTitle: product?.title,
    productImage: product?.images?.nodes[0]?.url,
    productAlt: product?.images?.nodes[0]?.altText,
    destinationUrl: getDestinationUrl(qrCode),
    image: await getQRCodeImage(qrCode.id),
  };
}
// [END hydrate-qrcode]

// [START validate-qrcode]
export function validateQRCode(data) {
  const errors = {};

  if (!data.title) {
    errors.title = "Title is required";
  }

  if (!data.productId) {
    errors.productId = "Product is required";
  }

  if (!data.destination) {
    errors.destination = "Destination is required";
  }

  if (Object.keys(errors).length) {
    return errors;
  }
}
// [END validate-qrcode]
