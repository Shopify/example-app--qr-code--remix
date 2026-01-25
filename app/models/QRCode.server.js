import qrcode from "qrcode";
import invariant from "tiny-invariant";
import {
  getQRCodeById,
  getQRCodes as getQRCodesFromRepo,
} from "./qrcode.repository";

// [START get-qrcode]
export async function getQRCode(id, graphql, shop) {
  const qrCode = await getQRCodeById(graphql, id);

  if (!qrCode) {
    return null;
  }

  return supplementQRCode(qrCode, graphql, shop);
}

export async function getQRCodes(shop, graphql) {
  const qrCodes = await getQRCodesFromRepo(graphql);

  if (qrCodes.length === 0) return [];

  return Promise.all(
    qrCodes.map((qrCode) => supplementQRCode(qrCode, graphql, shop))
  );
}
// [END get-qrcode]

// [START get-qrcode-image]
export function getQRCodeImage(id, shop) {
  // Extract the numeric ID from the GID if needed
  const idForUrl = extractIdFromGid(id);
  const url = new URL(`/qrcodes/${idForUrl}/scan`, process.env.SHOPIFY_APP_URL);
  // Include shop as query parameter for unauthenticated access
  if (shop) {
    url.searchParams.set("shop", shop);
  }
  return qrcode.toDataURL(url.href);
}

function extractIdFromGid(gid) {
  // If it's already a simple ID, return as-is
  if (!gid.startsWith("gid://")) {
    return gid;
  }
  // Extract the ID from gid://shopify/Metaobject/123456
  const match = gid.match(/\/(\d+)$/);
  return match ? match[1] : gid;
}
// [END get-qrcode-image]

// [START get-destination]
export function getDestinationUrl(qrCode, shop) {
  if (qrCode.destination === "product") {
    return `https://${shop}/products/${qrCode.productHandle}`;
  }

  const match = /gid:\/\/shopify\/ProductVariant\/([0-9]+)/.exec(qrCode.productVariantId);
  invariant(match, "Unrecognized product variant ID");

  return `https://${shop}/cart/${match[1]}:1`;
}
// [END get-destination]

// [START hydrate-qrcode]
async function supplementQRCode(qrCode, graphql, shop) {
  const qrCodeImagePromise = getQRCodeImage(qrCode.id, shop);

  const response = await graphql(
    `
      query supplementQRCode($id: ID!) {
        product(id: $id) {
          title
          media(first: 1) {
            nodes {
              preview {
                image {
                  altText
                  url
                }
              }
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
    shop,
    productDeleted: !product?.title,
    productTitle: product?.title,
    productImage: product?.media?.nodes[0]?.preview?.image?.url,
    productAlt: product?.media?.nodes[0]?.preview?.image?.altText,
    destinationUrl: getDestinationUrl(qrCode, shop),
    image: await qrCodeImagePromise,
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
