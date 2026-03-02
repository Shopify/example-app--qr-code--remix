import { useState, useEffect, useRef } from "react";
import {
  useActionData,
  useLoaderData,
  useSubmit,
  useNavigation,
  useNavigate,
  useParams,
} from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";

import {
  getQRCode,
  validateQRCode,
  saveQRCode,
  deleteQRCode,
  generateHandle,
} from "../models/QRCode.server";

export async function loader({ request, params }) {
  // [START authenticate]
  const { admin, session } = await authenticate.admin(request);
  // [END authenticate]

  // [START data]
  if (params.id === "new") {
    return {
      destination: "product",
      title: "",
      shop: session.shop,
    };
  }

  const qrCode = await getQRCode(params.id, admin.graphql, session.shop);
  return { ...qrCode, shop: session.shop };
  // [END data]
}

// [START action]
export async function action({ request, params }) {
  const { session, admin, redirect } = await authenticate.admin(request);

  /** @type {any} */
  const data = {
    ...Object.fromEntries(await request.formData()),
  };

  if (data.action === "delete") {
    await deleteQRCode(data.metaobjectId, admin.graphql);
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

  const handle =
    params.id === "new" ? generateHandle(data.title) : params.id;

  const metaobject = await saveQRCode(handle, data, admin.graphql);

  return redirect(`/app/qrcodes/${metaobject.handle}`);
}
// [END action]

export default function QRCodeForm() {
  const navigate = useNavigate();
  const { id } = useParams();

  // [START state]
  const loaderData = useLoaderData();
  const qrCode = loaderData;
  const [initialFormState, setInitialFormState] = useState(qrCode);
  const [formState, setFormState] = useState(qrCode);
  const errors = useActionData()?.errors || {};
  const isSaving = useNavigation().state === "submitting";
  const isDirty =
    JSON.stringify(formState) !== JSON.stringify(initialFormState);
  // [END state]

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

  // [START use-submit]
  const submit = useSubmit();

  function handleSave(e) {
    e.preventDefault();

    const data = {
      title: formState.title,
      productId: formState.productId || "",
      productVariantId: formState.productVariantId || "",
      destination: formState.destination,
    };

    submit(data, { method: "post" });
  }

  function handleDelete(e) {
    e.preventDefault();
    submit(
      { action: "delete", metaobjectId: initialFormState.id },
      { method: "post" },
    );
  }
  // [END use-submit]

  // [START save-bar]
  const saveBarRef = useRef(null);

  function handleReset() {
    setFormState(initialFormState);
    saveBarRef.current?.hide();
  }

  useEffect(() => {
    const saveBar = saveBarRef.current;
    if (!saveBar) return;

    if (isDirty) {
      saveBar.show();
    } else {
      saveBar.hide();
    }
  }, [isDirty]);

  useEffect(() => {
    setInitialFormState(qrCode);
    setFormState(qrCode);
  }, [id, qrCode]);

  return (
    <>
      <ui-save-bar ref={saveBarRef} id="qr-code-form">
        <button variant="primary" onClick={handleSave}></button>
        <button onClick={handleReset}></button>
      </ui-save-bar>
      <form onSubmit={handleSave} onReset={handleReset}>
        {/* [START polaris] */}
        <s-page heading={initialFormState.title || "Create QR code"}>
          {/* [START breadcrumbs] */}
          <s-link
            href="/app"
            slot="breadcrumb-actions"
            onClick={(e) => (isDirty ? e.preventDefault() : navigate("/app/"))}
          >
          {/* [END breadcrumbs] */}
            QR Codes
          </s-link>
          {initialFormState.handle &&
            <s-button slot="secondary-actions" onClick={handleDelete}>Delete</s-button>}
          <s-section heading="QR Code information">
            <s-stack gap="base">
              {/* [START title] */}
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
              {/* [START product] */}
              <s-stack gap="small-400">
                <s-stack direction="inline" gap="small-100" justifyContent="space-between">
                  <s-text color="subdued">Product</s-text>
                  {formState.productId ? (
                    <s-link
                      onClick={removeProduct}
                      accessibilityLabel="Remove the product from this QR Code"
                      variant="tertiary"
                      tone="neutral"
                    >
                      Clear
                    </s-link>
                  ) : null}
                </s-stack>
                {formState.productId ? (
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
                            <s-image src={formState.productImage}></s-image>
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
                    </s-stack>
                  </s-stack>
                ) : (
                  <s-button
                    onClick={selectProduct}
                    accessibilityLabel="Select the product the QR code should be for"
                  >
                    Select product
                  </s-button>
                )}
              </s-stack>
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
                    disabled={!initialFormState.handle}
                    href={`/qrcodes/${initialFormState.handle}?shop=${loaderData.shop}`}
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
        {/* [END polaris] */}
      </form>
    </>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
