import Head from 'next/head'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <Head>
        <title>Political Compass</title>
      </Head>
      <main className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to the Political Compass Quiz</h1>
        <p className="text-lg">Start the quiz to discover where you fall on the political spectrum.</p>
      </main>
    </div>
  )
}