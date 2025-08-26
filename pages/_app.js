// pages/_app.js
import "../styles/globals.css";
import { useRouter } from "next/router";
import SidebarLayout from "../components/SidebarLayout";

function MyApp({ Component, pageProps }) {
  const router = useRouter();

  // Do NOT show the sidebar on the home page
  const noSidebar = router.pathname === "/";

  // If a page sets its own layout, respect it
  const getLayout =
    Component.getLayout ||
    ((page) => (noSidebar ? page : <SidebarLayout>{page}</SidebarLayout>));

  return getLayout(<Component {...pageProps} />);
}

export default MyApp;
