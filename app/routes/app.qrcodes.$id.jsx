import { useState, useEffect } from "react";
import {
  useActionData,
  useLoaderData,
  useSubmit,
  useNavigation,
  useNavigate,
  useParams,
  Link,
} from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";

import db from "../db.server";
import { getQRCode, validateQRCode } from "../models/QRCode.server";

export async function loader({ request, params }) {
  // [START authenticate]
  const { admin } = await authenticate.admin(request);
  // [END authenticate]

  // [START data]
  if (params.id === "new") {
    return {
      destination: "product",
      title: "",
    };
  }

  return await getQRCode(Number(params.id), admin.graphql);
  // [END data]
}

// [START action]
export async function action({ request, params }) {
  const { session, redirect } = await authenticate.admin(request);
  const { shop } = session;

  /** @type {any} */
  const data = {
    ...Object.fromEntries(await request.formData()),
    shop,
  };

  if (data.action === "delete") {
    await db.qRCode.delete({ where: { id: Number(params.id) } });
    return redirect("/app");
  }

  const errors = validateQRCode(data);

  if (errors) {
    return new Response(JSON.stringify({ errors }), {
      status: 422,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  const qrCode =
    params.id === "new"
      ? await db.qRCode.create({ data })
      : await db.qRCode.update({ where: { id: Number(params.id) }, data });

  return redirect(`/app/qrcodes/${qrCode.id}`);
}
// [END action]

export default function QRCodeForm() {
  // [START state]
  const qrCode = useLoaderData();
  const [initialFormState, setInitialFormState] = useState(qrCode);
  const [formState, setFormState] = useState(qrCode);
  const errors = useActionData()?.errors || {};
  const navigate = useNavigate();
  const { id } = useParams();
  // [END state]

  // [START save-bar]
  const isDirty =
    JSON.stringify(formState) !== JSON.stringify(initialFormState);

  useEffect(() => {
    setInitialFormState(qrCode);
    setFormState(qrCode);
  }, [id, qrCode])

  useEffect(() => {
    if (isDirty) {
      window.shopify.saveBar.show("qr-code-form");
    } else {
      window.shopify.saveBar.hide("qr-code-form");
    }
    return () => {
      window.shopify.saveBar.hide("qr-code-form");
    };
  }, [isDirty]);

  console.log(isDirty);

  // [END save-bar]

  // [START select-product]
  async function selectProduct() {
    const products = await window.shopify.resourcePicker({
      type: "product",
      action: "select", // customized action verb, either 'select' or 'add',
    });

    if (products) {
      const { images, id, variants, title, handle } = products[0];

      setFormState({
        ...formState,
        productId: id,
        productVariantId: variants[0].id,
        productTitle: title,
        productHandle: handle,
        productAlt: images[0]?.altText,
        productImage: images[0]?.originalSrc,
      });
    }
  }

  function removeProduct() {
    setFormState({
      title: formState.title,
      destination: formState.destination,
    });
  }

  const productUrl = formState.productId
    ? `shopify://admin/products/${formState.productId.split("/").at(-1)}`
    : "";
  // [END select-product]

  console.log()

  // [START save]
  const nav = useNavigation();
  const isSaving =
    nav.state === "submitting" && nav.formData?.get("action") !== "delete";
  const submit = useSubmit();
  function handleSave() {
    const data = {
      title: formState.title,
      productId: formState.productId || "",
      productVariantId: formState.productVariantId || "",
      productHandle: formState.productHandle || "",
      destination: formState.destination,
    };

    submit(data, { method: "post" });
  }

  function handleReset() {
    setFormState(initialFormState);
    window.shopify.saveBar.hide("qr-code-form");
  }
  // [END save]

  // [START polaris]
  return (
    <>
      <ui-save-bar id="qr-code-form">
        <button onClick={handleReset} disabled={isSaving}>
          Discard
        </button>
        <button onClick={handleSave} disabled={isSaving} variant="primary">
          Save
        </button>
      </ui-save-bar>
      <ui-title-bar title={initialFormState.title || "Create QR code"}>
        <Link
          to="/app"
          variant="breadcrumb"
          onClick={(e) => (isDirty ? e.preventDefault() : navigate("/app/"))}
        >
          QR Codes
        </Link>
        {initialFormState.id && (
          <button
            onClick={() => submit({ action: "delete" }, { method: "post" })}
          >
            Delete
          </button>
        )}
      </ui-title-bar>
      <form>
        <s-page>
          {/* [START title] */}
          <s-section heading="QR Code information">
            <s-text-field
              label="Title"
              details="Only store staff can see this title"
              error={errors.title}
              autoComplete="off"
              name="title"
              value={formState.title}
              onInput={(e) =>
                setFormState({ ...formState, title: e.target.value })
              }
            ></s-text-field>
            {/* [END title] */}
            {/* [START destination] */}
            <s-stack gap="500" align="space-between" blockAlign="start">
              <s-select
                name="destination"
                label="Scan destination"
                value={formState.destination}
                onChange={(e) =>
                  setFormState({ ...formState, destination: e.target.value })
                }
              >
                <s-option
                  value="product"
                  selected={formState.destination === "product"}
                >
                  Link to product page
                </s-option>
                <s-option
                  value="cart"
                  selected={formState.destination === "cart"}
                >
                  Link to checkout page with product in the cart
                </s-option>
              </s-select>
              {initialFormState.destinationUrl ? (
                <s-link
                  variant="plain"
                  href={initialFormState.destinationUrl}
                  target="_blank"
                >
                  Go to destination URL
                </s-link>
              ) : null}
            </s-stack>
            {/* [END destination] */}
          </s-section>
          {/* [START product] */}
          <s-section heading="Product">
            <s-stack gap="base">
              {formState.productId ? (
                <s-box border="base" borderRadius="base" padding="small-100">
                  <s-stack
                    direction="inline"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <s-stack
                      direction="inline"
                      gap="small-100"
                      alignItems="center"
                    >
                      <s-clickable
                        href={productUrl}
                        target="_blank"
                        accessibilityLabel={`Go to the product page for ${formState.productTitle}`}
                        borderRadius="base"
                      >
                        <s-box
                          padding="small-200"
                          border="base"
                          borderRadius="base"
                          background="subdued"
                          inlineSize="38px"
                          blockSize="38px"
                        >
                          {formState.productImage ? (
                            <s-image
                              src={formState.productImage}
                            ></s-image>
                          ) : (
                            <s-icon size="large" type="product" />
                          )}
                        </s-box>
                      </s-clickable>
                      <s-link href={productUrl} target="_blank">
                        {formState.productTitle}
                      </s-link>
                    </s-stack>
                    <s-stack direction="inline" gap="small">
                      <s-button
                        onClick={selectProduct}
                        accessibilityLabel="Change the product the QR code should be for"
                      >
                        Change
                      </s-button>
                      <s-button
                        onClick={removeProduct}
                        accessibilityLabel="Remove the product from this QR Code"
                        tone="critical"
                      >
                        Remove
                      </s-button>
                    </s-stack>
                  </s-stack>
                </s-box>
              ) : (
                <s-button
                  onClick={selectProduct}
                  accessibilityLabel="Select the product the QR code should be for"
                >
                  Select product
                </s-button>
              )}
            </s-stack>
          </s-section>
          {/* [END product] */}
          {/* [START preview] */}
          <s-box slot="aside">
            <s-section heading="Preview">
              <s-stack gap="base">
                <s-box
                  padding="base"
                  border="none"
                  borderRadius="base"
                  background="subdued"
                >
                  {initialFormState.image ? (
                    <s-image
                      aspectRatio="1/0.8"
                      src={initialFormState.image}
                      alt="The QR Code for the current form"
                    />
                  ) : (
                    <s-stack
                      direction="inline"
                      alignItems="center"
                      justifyContent="center"
                      blockSize="198px"
                    >
                      <s-text color="subdued">
                        See a preview once you save
                      </s-text>
                    </s-stack>
                  )}
                </s-box>
                <s-stack
                  gap="small"
                  direction="inline"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <s-button
                    disabled={!initialFormState.id}
                    href={`/qrcodes/${initialFormState.id}`}
                    target="_blank"
                  >
                    Go to public URL
                  </s-button>
                  <s-button
                    disabled={!initialFormState?.image}
                    href={initialFormState?.image}
                    download
                    variant="primary"
                  >
                    Download
                  </s-button>
                </s-stack>
              </s-stack>
            </s-section>
          </s-box>
          {/* [END preview] */}
        </s-page>
      </form>
    </>
  );
  // [END polaris]
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
