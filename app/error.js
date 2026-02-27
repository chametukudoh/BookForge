"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main style={{ padding: "2rem", fontFamily: "Archivo, sans-serif" }}>
          <h1 style={{ marginTop: 0 }}>Something went wrong</h1>
          <p>The workspace hit an unexpected error. You can retry without losing saved local data.</p>
          <button type="button" onClick={reset}>Try again</button>
        </main>
      </body>
    </html>
  );
}