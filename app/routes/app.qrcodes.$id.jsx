import { useState } from "react";
import { json, redirect } from "@remix-run/node";
import {
  useActionData,
  useLoaderData,
  useNavigation,
  useSubmit,
  useNavigate,
} from "@remix-run/react";
import { authenticate } from "../shopify.server";
import {
  Card,
  Bleed,
  Button,
  ChoiceList,
  Divider,
  EmptyState,
  HorizontalStack,
  InlineError,
  Layout,
  Page,
  Text,
  TextField,
  Thumbnail,
  VerticalStack,
  PageActions,
} from "@shopify/polaris";
import { ImageMajor } from "@shopify/polaris-icons";

import db from "../db.server";
import { getQRCode, validateQRCode } from "../models/QRCode.server";

export async function loader({ request, params }) {
  // [START authenticate]
  const { admin } = await authenticate.admin(request);
  // [END authenticate]

  // [START data]
  if (params.id === "new") {
    return json({
      destination: "product",
      title: "",
    });
  }

  return json(await getQRCode(Number(params.id), admin.graphql));
  // [END data]
}

// [START action]
export async function action({ request, params }) {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  if (request.method === "DELETE") {
    await db.qRCode.delete({ where: { id: Number(params.id) } });
    return redirect("/app");
  }

  const data = {
    ...Object.fromEntries(await request.formData()),
    shop,
  };

  const errors = validateQRCode(data);

  if (errors) {
    return json({ errors }, { status: 422 });
  }

  const QRCode =
    params.id === "new"
      ? await db.qRCode.create({ data })
      : await db.qRCode.update({ where: { id: Number(params.id) }, data });

  return redirect(`/app/qrcodes/${QRCode.id}`);
}
// [END action]

// [START state]
export default function QRCodeForm() {
  const errors = useActionData()?.errors || {};

  const QRCode = useLoaderData();
  const [formState, setFormState] = useState(QRCode);
  const [cleanFormState, setCleanFormState] = useState(QRCode);
  const isDirty = JSON.stringify(formState) !== JSON.stringify(cleanFormState);

  const nav = useNavigation();
  const isSaving = nav.state === "submitting" && nav.formMethod === "POST";
  const isDeleting = nav.state === "submitting" && nav.formMethod === "DELETE";
  // [END state]

  const navigate = useNavigate();

  // [START select-product]
  async function selectProduct() {
    const product = await window.shopify.resourcePicker({
      type: "product",
      action: "Select", // customized action verb, either 'Select' or 'Add',
    });

    if (product) {
      const { images, id, variants, title, handle } = product.selection[0];

      setFormState({
        ...formState,
        productId: id,
        productVariantId: variants[0].id,
        productTitle: title,
        productHandle: handle,
        productAlt: images[0]?.altText,
        productImage: images[0]?.imageSrc || images[0]?.originalSrc,
      });
    }
  }
  // [END select-product]

  // [START save]
  const submit = useSubmit();
  function handleSave() {
    const data = {
      title: formState.title,
      productId: formState.productId,
      productVariantId: formState.productVariantId,
      productHandle: formState.productHandle,
      destination: formState.destination,
    };

    setCleanFormState({ ...formState });
    submit(data, { method: "post" });
  }
  // [END save]

  // [START polaris]
  return (
    <Page>
      {/* [START breadcrumbs] */}
      <ui-title-bar title={QRCode.id ? "Edit QR code" : "Create new QR code"}>
        <button variant="breadcrumb" onClick={() => navigate("/app")}>
          QR codes
        </button>
      </ui-title-bar>
      {/* [END breadcrumbs] */}
      <Layout>
        <Layout.Section>
          <VerticalStack gap="5">
            {/* [START title] */}
            <Card>
              <VerticalStack gap="5">
                <Text as={"h2"} variant="headingLg">
                  Title
                </Text>
                <TextField
                  id="title"
                  helpText="Only store staff can see this title"
                  label="title"
                  labelHidden
                  autoComplete="off"
                  value={formState.title}
                  onChange={(title) =>
                    setFormState({ ...formState, title: title })
                  }
                  error={errors.title}
                />
              </VerticalStack>
            </Card>
            {/* [END title] */}
            <Card>
              <VerticalStack gap="5">
                {/* [START product] */}
                <HorizontalStack align="space-between">
                  <Text as={"h2"} variant="headingLg">
                    Product
                  </Text>
                  {formState.productId ? (
                    <Button plain onClick={selectProduct}>
                      Change product
                    </Button>
                  ) : null}
                </HorizontalStack>
                {formState.productId ? (
                  <HorizontalStack blockAlign="center" gap={"5"}>
                    <Thumbnail
                      source={formState.productImage || ImageMajor}
                      alt={formState.productAlt}
                    />
                    <Text as="span" variant="headingMd" fontWeight="semibold">
                      {formState.productTitle}
                    </Text>
                  </HorizontalStack>
                ) : (
                  <VerticalStack gap="2">
                    <Button onClick={selectProduct} id="select-product">
                      Select product
                    </Button>
                    {errors.productId ? (
                      <InlineError
                        message={errors.productId}
                        fieldID="myFieldID"
                      />
                    ) : null}
                  </VerticalStack>
                )}
                {/* [END product] */}
                <Bleed marginInline="20">
                  <Divider />
                </Bleed>
                {/* [START destination] */}
                <HorizontalStack
                  gap="5"
                  align="space-between"
                  blockAlign="start"
                >
                  <ChoiceList
                    title="Scan destination"
                    choices={[
                      { label: "Link to product page", value: "product" },
                      {
                        label: "Link to checkout page with product in the cart",
                        value: "cart",
                      },
                    ]}
                    selected={[formState.destination]}
                    onChange={(destination) =>
                      setFormState({
                        ...formState,
                        destination: destination[0],
                      })
                    }
                    error={errors.destination}
                  />
                  {QRCode.destinationUrl ? (
                    <Button plain url={QRCode.destinationUrl} external>
                      Go to destination URL
                    </Button>
                  ) : null}
                </HorizontalStack>
              </VerticalStack>
              {/* [END destination] */}
            </Card>
          </VerticalStack>
        </Layout.Section>
        <Layout.Section secondary>
          {/* [START preview] */}
          <Card>
            <Text as={"h2"} variant="headingLg">
              QR code
            </Text>
            {QRCode ? (
              <EmptyState image={QRCode.image} imageContained={true} />
            ) : (
              <EmptyState image="">
                Your QR code will appear here after you save
              </EmptyState>
            )}
            <VerticalStack gap="3">
              <Button
                disabled={!QRCode?.image}
                url={QRCode?.image}
                download
                primary
              >
                Download
              </Button>
              <Button
                disabled={!QRCode.id}
                url={`/qrcodes/${QRCode.id}`}
                external
              >
                Go to public URL
              </Button>
            </VerticalStack>
          </Card>
          {/* [END preview] */}
        </Layout.Section>
        {/* [START actions] */}
        <Layout.Section>
          <PageActions
            secondaryActions={[
              {
                content: "Delete",
                loading: isDeleting,
                disabled: !QRCode.id || !QRCode || isSaving || isDeleting,
                destructive: true,
                outline: true,
                onAction: () => submit({}, { method: "delete" }),
              },
            ]}
            primaryAction={{
              content: "Save",
              loading: isSaving,
              disabled: !isDirty || isSaving || isDeleting,
              onAction: handleSave,
            }}
          />
        </Layout.Section>
        {/* [END actions] */}
      </Layout>
    </Page>
  );
  // [END polaris]
}
