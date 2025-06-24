import { useEffect } from "react"
import { Outlet, useLoaderData, useRouteError, useNavigate, Link } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};


export default function App() {
  const { apiKey } = useLoaderData();

  const navigate = useNavigate();

  useEffect(() => {
    const handleNavigate = (event) => {
      const href = event.target.getAttribute("href");
      if (href) navigate(href);
    };

    document.addEventListener("shopify:navigate", handleNavigate);

    return () =>
      document.removeEventListener("shopify:navigate", handleNavigate);
  }, [navigate]);


  return (
    <>
      <script
        src="https://cdn.shopify.com/shopifycloud/app-bridge.js"
        data-api-key={apiKey}
        data-link-behavior="remix"
      />
      <script src="https://cdn.shopify.com/shopifycloud/app-bridge-ui-experimental.js"></script>
      <Outlet />
    </>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};