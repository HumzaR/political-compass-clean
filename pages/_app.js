// pages/_app.js
import "../styles/globals.css";
import SidebarLayout from "../components/SidebarLayout";

function MyApp({ Component, pageProps }) {
  // Always wrap every page with the sidebar layout
  const getLayout =
    Component.getLayout || ((page) => <SidebarLayout>{page}</SidebarLayout>);

  return getLayout(<Component {...pageProps} />);
}

export default MyApp;
