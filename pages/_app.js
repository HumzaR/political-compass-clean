// pages/_app.js
import '../styles/globals.css';
import SidebarLayout from '../components/SidebarLayout';
export default function MyApp({ Component, pageProps }) {
  return (
    <SidebarLayout>
      <Component {...pageProps} />
    </SidebarLayout>
  );
}
