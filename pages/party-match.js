// pages/party-match.js
import Head from "next/head";
import PartyMatch from "@/components/PartyMatch";
import Link from "next/link";

export default function PartyMatchPage() {
  return (
    <>
      <Head>
        <title>Party match</title>
      </Head>

      <div className="max-w-3xl">
        {/* Top bar / breadcrumb-ish */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Party match</h1>
          <Link
            href="/profile"
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50"
          >
            ← Back to My Profile
          </Link>
        </div>

        {/* Main widget */}
        <PartyMatch />
      </div>
    </>
  );
}
