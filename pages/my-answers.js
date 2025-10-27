// pages/my-answers.js
import Head from "next/head";
import { useAnswers } from "@/lib/answers";

export default function MyAnswersPage() {
  const { answers, isCloudBacked } = useAnswers();
  const keys = Object.keys(answers || {});

  return (
    <>
      <Head>
        <title>My Answers</title>
      </Head>

      <div className="max-w-3xl">
        <h1 className="text-2xl font-semibold mb-2">My Answers</h1>
        <p className="text-sm text-gray-600 mb-6">
          {isCloudBacked
            ? "Synced with your account (Firestore)."
            : "Stored locally on this device."}
        </p>

        {!keys.length ? (
          <div className="rounded-lg border border-gray-200 p-6 text-gray-600">
            You haven’t saved any answers yet.
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 divide-y">
            {keys.map((k) => (
              <div key={k} className="flex items-start justify-between gap-4 p-4">
                <div>
                  <div className="text-sm font-medium text-gray-900 break-all">{k}</div>
                  <div className="text-sm text-gray-600 break-all">
                    {String(answers[k])}
                  </div>
                </div>
                {/* If you have a quiz page with anchors, link to it here */}
                {/* <a href={`/quiz?focus=${encodeURIComponent(k)}`} className="text-blue-600 text-sm">Edit</a> */}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
