export async function fetchRepoInsights(repoUrl: string): Promise<string> {
  // Replace with your actual backend endpoint
  const apiEndpoint = 'https://www.gitforme.tech/api/github/insights';
  try {
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoUrl })
    });
    if (!response.ok) {
      throw new Error('Failed to fetch insights');
    }
    const data = await response.json();
    // You can format the data here as needed
    return JSON.stringify(data, null, 2);
  } catch (err: unknown) {
    if (err instanceof Error) {
      return `Error: ${err.message}`;
    }
    return 'An unknown error occurred';
  }
}
