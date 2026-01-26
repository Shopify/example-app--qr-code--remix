/**
 * QR Code Repository
 * Handles all metaobject CRUD operations for QR codes
 */

const METAOBJECT_TYPE = "$app:qrcode";

/**
 * Get a single QR code by ID
 */
export async function getQRCodeById(graphql, id) {
  const response = await graphql(
    `#graphql
      query GetQRCode($id: ID!) {
        metaobject(id: $id) {
          id
          handle
          updatedAt
          title: field(key: "title") { value }
          productId: field(key: "product_id") { value }
          productHandle: field(key: "product_handle") { value }
          productVariantId: field(key: "product_variant_id") { value }
          destination: field(key: "destination") { value }
          scans: field(key: "scans") { value }
        }
      }
    `,
    { variables: { id } }
  );

  const { data } = await response.json();

  if (!data?.metaobject) {
    return null;
  }

  return mapMetaobjectToQRCode(data.metaobject);
}

/**
 * Get all QR codes for the shop
 */
export async function getQRCodes(graphql) {
  const response = await graphql(
    `#graphql
      query GetQRCodes($type: String!) {
        metaobjects(type: $type, first: 100, reverse: true) {
          nodes {
            id
            handle
            updatedAt
            title: field(key: "title") { value }
            productId: field(key: "product_id") { value }
            productHandle: field(key: "product_handle") { value }
            productVariantId: field(key: "product_variant_id") { value }
            destination: field(key: "destination") { value }
            scans: field(key: "scans") { value }
          }
        }
      }
    `,
    { variables: { type: METAOBJECT_TYPE } }
  );

  const { data } = await response.json();

  if (!data?.metaobjects?.nodes) {
    return [];
  }

  return data.metaobjects.nodes.map(mapMetaobjectToQRCode);
}

/**
 * Create a new QR code
 */
export async function createQRCode(graphql, qrCodeData) {
  const response = await graphql(
    `#graphql
      mutation CreateQRCode($metaobject: MetaobjectCreateInput!) {
        metaobjectCreate(metaobject: $metaobject) {
          metaobject {
            id
            handle
            title: field(key: "title") { value }
            productId: field(key: "product_id") { value }
            productHandle: field(key: "product_handle") { value }
            productVariantId: field(key: "product_variant_id") { value }
            destination: field(key: "destination") { value }
            scans: field(key: "scans") { value }
          }
          userErrors {
            field
            message
            code
          }
        }
      }
    `,
    {
      variables: {
        metaobject: {
          type: METAOBJECT_TYPE,
          fields: [
            { key: "title", value: qrCodeData.title },
            { key: "product_id", value: qrCodeData.productId },
            { key: "product_handle", value: qrCodeData.productHandle },
            { key: "product_variant_id", value: qrCodeData.productVariantId },
            { key: "destination", value: qrCodeData.destination },
            { key: "scans", value: "0" },
          ],
        },
      },
    }
  );

  const { data } = await response.json();

  if (data?.metaobjectCreate?.userErrors?.length > 0) {
    throw new Error(data.metaobjectCreate.userErrors.map(e => e.message).join(", "));
  }

  return mapMetaobjectToQRCode(data.metaobjectCreate.metaobject);
}

/**
 * Update an existing QR code
 */
export async function updateQRCode(graphql, id, qrCodeData) {
  const response = await graphql(
    `#graphql
      mutation UpdateQRCode($id: ID!, $metaobject: MetaobjectUpdateInput!) {
        metaobjectUpdate(id: $id, metaobject: $metaobject) {
          metaobject {
            id
            handle
            title: field(key: "title") { value }
            productId: field(key: "product_id") { value }
            productHandle: field(key: "product_handle") { value }
            productVariantId: field(key: "product_variant_id") { value }
            destination: field(key: "destination") { value }
            scans: field(key: "scans") { value }
          }
          userErrors {
            field
            message
            code
          }
        }
      }
    `,
    {
      variables: {
        id,
        metaobject: {
          fields: [
            { key: "title", value: qrCodeData.title },
            { key: "product_id", value: qrCodeData.productId },
            { key: "product_handle", value: qrCodeData.productHandle },
            { key: "product_variant_id", value: qrCodeData.productVariantId },
            { key: "destination", value: qrCodeData.destination },
          ],
        },
      },
    }
  );

  const { data } = await response.json();

  if (data?.metaobjectUpdate?.userErrors?.length > 0) {
    throw new Error(data.metaobjectUpdate.userErrors.map(e => e.message).join(", "));
  }

  return mapMetaobjectToQRCode(data.metaobjectUpdate.metaobject);
}

/**
 * Delete a QR code
 */
export async function deleteQRCode(graphql, id) {
  const response = await graphql(
    `#graphql
      mutation DeleteQRCode($id: ID!) {
        metaobjectDelete(id: $id) {
          deletedId
          userErrors {
            field
            message
            code
          }
        }
      }
    `,
    { variables: { id } }
  );

  const { data } = await response.json();

  if (data?.metaobjectDelete?.userErrors?.length > 0) {
    throw new Error(data.metaobjectDelete.userErrors.map(e => e.message).join(", "));
  }

  return data.metaobjectDelete.deletedId;
}

/**
 * Increment the scan count for a QR code
 */
export async function incrementQRCodeScans(graphql, id) {
  // First get the current scan count
  const qrCode = await getQRCodeById(graphql, id);

  if (!qrCode) {
    return null;
  }

  const newScans = (qrCode.scans || 0) + 1;

  const response = await graphql(
    `#graphql
      mutation IncrementScans($id: ID!, $metaobject: MetaobjectUpdateInput!) {
        metaobjectUpdate(id: $id, metaobject: $metaobject) {
          metaobject {
            id
            scans: field(key: "scans") { value }
          }
          userErrors {
            field
            message
            code
          }
        }
      }
    `,
    {
      variables: {
        id,
        metaobject: {
          fields: [{ key: "scans", value: String(newScans) }],
        },
      },
    }
  );

  const { data } = await response.json();

  if (data?.metaobjectUpdate?.userErrors?.length > 0) {
    throw new Error(data.metaobjectUpdate.userErrors.map(e => e.message).join(", "));
  }

  return { ...qrCode, scans: newScans };
}

/**
 * Map a metaobject to a QR code object
 */
function mapMetaobjectToQRCode(metaobject) {
  if (!metaobject) return null;

  return {
    id: metaobject.id,
    handle: metaobject.handle,
    createdAt: metaobject.updatedAt,
    title: metaobject.title?.value || "",
    productId: metaobject.productId?.value || "",
    productHandle: metaobject.productHandle?.value || "",
    productVariantId: metaobject.productVariantId?.value || "",
    destination: metaobject.destination?.value || "",
    scans: parseInt(metaobject.scans?.value || "0", 10),
  };
}
