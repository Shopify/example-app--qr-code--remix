import { json } from "@remix-run/node";
import { useLoaderData, Link, useNavigate } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import {
  Card,
  EmptyState,
  Layout,
  Page,
  IndexTable,
  Thumbnail,
  Text,
  Icon,
  HorizontalStack,
  Tooltip,
} from "@shopify/polaris";

import { getQRCodes } from "../models/QRCode.server";
import { DiamondAlertMajor, ImageMajor } from "@shopify/polaris-icons";

// [START loader]
export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const QRCodes = await getQRCodes(session.shop, admin.graphql);

  return json({
    QRCodes,
  });
}
// [END loader]

export default function Index() {
  const { QRCodes } = useLoaderData();
  const navigate = useNavigate();

  function truncate(str) {
    if (!str) return;
    const n = 25;
    return str.length > n ? str.substr(0, n - 1) + "…" : str;
  }

  // [START empty]
  const emptyMarkup = QRCodes.length ? null : (
    <EmptyState
      heading="Create unique QR codes for your product"
      action={{
        content: "Create QR code",
        onAction: () => navigate("qrcodes/new"),
      }}
      image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
    >
      <p>Allow customers to scan codes and buy products using their phones.</p>
    </EmptyState>
  );
  // [END empty]

  // [START table]
  const qrCodesMarkup = QRCodes.length ? (
    <IndexTable
      resourceName={{
        singular: "QR code",
        plural: "QR codes",
      }}
      itemCount={QRCodes.length}
      headings={[
        { title: "Thumbnail", hidden: true },
        { title: "Title" },
        { title: "Product" },
        { title: "Date created" },
        { title: "Scans" },
      ]}
      selectable={false}
    >
      {/* [END table] */}
      {QRCodes.map(
        ({
          id,
          title,
          productImage,
          productTitle,
          productDeleted,
          createdAt,
          scans,
        }) => {
          // [START row]
          return (
            <IndexTable.Row id={id} key={id} position={id}>
              <IndexTable.Cell>
                <Thumbnail
                  source={productImage || ImageMajor}
                  alt={"product image or placeholder"}
                  size="small"
                />
              </IndexTable.Cell>
              <IndexTable.Cell>
                <Link to={`qrcodes/${id}`}>{truncate(title)}</Link>
              </IndexTable.Cell>
              <IndexTable.Cell>
                {/* [START deleted] */}
                {productDeleted ? (
                  <HorizontalStack align="start" gap={"2"}>
                    <span style={{ width: "20px" }}>
                      <Icon source={DiamondAlertMajor} color="critical" />
                    </span>
                    <Text color={"critical"} as="span">
                      product has been deleted
                    </Text>
                  </HorizontalStack>
                ) : (
                  truncate(productTitle)
                )}
                {/* [END deleted] */}
              </IndexTable.Cell>
              <IndexTable.Cell>
                {new Date(createdAt).toDateString()}
              </IndexTable.Cell>
              <IndexTable.Cell>{scans}</IndexTable.Cell>
            </IndexTable.Row>
          );
          // [END row]
        }
      )}
    </IndexTable>
  ) : null;

  // [START page]
  return (
    <Page>
      <ui-title-bar title="QR codes">
        <button variant="primary" onClick={() => navigate("/app/qrcodes/new")}>
          Create QR code
        </button>
      </ui-title-bar>
      <Layout>
        <Layout.Section>
          <Card padding={"0"}>
            {emptyMarkup}
            {qrCodesMarkup}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
  // [END page]
}
