import qrcode from "qrcode";
import invariant from "tiny-invariant";

const METAOBJECT_TYPE = "$app:qrcode";

// [START get-qrcode]
export async function getQRCode(handle, graphql, shop) {
  const response = await graphql(
    `
      query GetQRCode($handle: MetaobjectHandleInput!) {
        metaobjectByHandle(handle: $handle) {
          id
          handle
          createdAt
          title: field(key: "title") { jsonValue }
          product: field(key: "product") {
            jsonValue
            reference {
              ... on Product {
                handle
                title
                media(first: 1) {
                  nodes {
                    preview {
                      image { url altText }
                    }
                  }
                }
              }
            }
          }
          productVariant: field(key: "product_variant") {
            reference {
              ... on ProductVariant { id legacyResourceId }
            }
          }
          destination: field(key: "destination") { jsonValue }
          scans: field(key: "scans") { jsonValue }
        }
      }
    `,
    {
      variables: {
        handle: { type: METAOBJECT_TYPE, handle },
      },
    },
  );

  const { data } = await response.json();
  const metaobject = data?.metaobjectByHandle;

  if (!metaobject) {
    return null;
  }

  return transformMetaobject(metaobject, shop);
}

export async function getQRCodes(graphql, shop) {
  const response = await graphql(
    `
      query GetQRCodes($type: String!) {
        metaobjects(type: $type, first: 50, sortKey: "updated_at", reverse: true) {
          nodes {
            id
            handle
            createdAt
            title: field(key: "title") { jsonValue }
            product: field(key: "product") {
              jsonValue
              reference {
                ... on Product {
                  handle
                  title
                  media(first: 1) {
                    nodes {
                      preview {
                        image { url altText }
                      }
                    }
                  }
                }
              }
            }
            productVariant: field(key: "product_variant") {
              reference {
                ... on ProductVariant { id legacyResourceId }
              }
            }
            destination: field(key: "destination") { jsonValue }
            scans: field(key: "scans") { jsonValue }
          }
        }
      }
    `,
    {
      variables: { type: METAOBJECT_TYPE },
    },
  );

  const { data } = await response.json();
  const metaobjects = data?.metaobjects?.nodes ?? [];

  return metaobjects.map((mo) => transformMetaobject(mo, shop));
}
// [END get-qrcode]

function transformMetaobject(metaobject, shop) {
  const product = metaobject.product?.reference;
  const variant = metaobject.productVariant?.reference;
  const productId = metaobject.product?.jsonValue;

  const qrCode = {
    id: metaobject.id,
    handle: metaobject.handle,
    title: metaobject.title?.jsonValue,
    productId,
    productVariantId: variant?.id,
    productHandle: product?.handle,
    productVariantLegacyId: variant?.legacyResourceId,
    destination: metaobject.destination?.jsonValue,
    scans: metaobject.scans?.jsonValue ?? 0,
    createdAt: metaobject.createdAt,
    productDeleted: productId && !product,
    productTitle: product?.title,
    productImage: product?.media?.nodes[0]?.preview?.image?.url,
    productAlt: product?.media?.nodes[0]?.preview?.image?.altText,
  };

  qrCode.destinationUrl = getDestinationUrl(qrCode, shop);
  qrCode.image = getQRCodeImage(metaobject.handle, shop);

  return qrCode;
}

// [START get-qrcode-image]
export function getQRCodeImage(handle, shop) {
  const url = new URL(
    `/qrcodes/${handle}/scan`,
    process.env.SHOPIFY_APP_URL,
  );
  url.searchParams.set("shop", shop);
  return qrcode.toDataURL(url.href);
}
// [END get-qrcode-image]

// [START get-destination]
export function getDestinationUrl(qrCode, shop) {
  if (qrCode.destination === "product") {
    return `https://${shop}/products/${qrCode.productHandle}`;
  }

  invariant(qrCode.productVariantLegacyId, "Unrecognised product variant ID");

  return `https://${shop}/cart/${qrCode.productVariantLegacyId}:1`;
}
// [END get-destination]

// [START save-qrcode]
export async function saveQRCode(handle, data, graphql) {
  const response = await graphql(
    `
      mutation UpsertQRCode($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
        metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
          metaobject { id handle }
          userErrors { field message }
        }
      }
    `,
    {
      variables: {
        handle: { type: METAOBJECT_TYPE, handle },
        metaobject: {
          fields: [
            { key: "title", value: data.title },
            { key: "product", value: data.productId },
            { key: "product_variant", value: data.productVariantId },
            { key: "destination", value: data.destination },
          ],
        },
      },
    },
  );

  const { data: responseData } = await response.json();
  const { metaobjectUpsert } = responseData;

  if (metaobjectUpsert.userErrors.length) {
    throw new Error(metaobjectUpsert.userErrors[0].message);
  }

  return metaobjectUpsert.metaobject;
}
// [END save-qrcode]

// [START delete-qrcode]
export async function deleteQRCode(id, graphql) {
  const response = await graphql(
    `
      mutation DeleteQRCode($id: ID!) {
        metaobjectDelete(id: $id) {
          deletedId
          userErrors { field message }
        }
      }
    `,
    {
      variables: { id },
    },
  );

  const { data } = await response.json();

  if (data.metaobjectDelete.userErrors.length) {
    throw new Error(data.metaobjectDelete.userErrors[0].message);
  }
}
// [END delete-qrcode]

// [START increment-scans]
export async function incrementQRCodeScans(id, currentScans, graphql) {
  await graphql(
    `
      mutation IncrementScans($id: ID!, $metaobject: MetaobjectUpdateInput!) {
        metaobjectUpdate(id: $id, metaobject: $metaobject) {
          metaobject { id }
          userErrors { field message }
        }
      }
    `,
    {
      variables: {
        id,
        metaobject: {
          fields: [{ key: "scans", value: String(currentScans + 1) }],
        },
      },
    },
  );
}
// [END increment-scans]

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function generateHandle(title) {
  return `${slugify(title)}-${Date.now().toString(36)}`;
}

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
