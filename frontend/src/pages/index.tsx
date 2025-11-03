import Link from 'next/link';

export default function Home() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Yarda AI Landscape Studio</h1>
      <p>Transform your outdoor space with AI-powered landscape design</p>
      <Link href="/register">
        <button style={{ padding: '1rem 2rem', fontSize: '1.2rem', marginTop: '2rem' }}>
          Get Started Free
        </button>
      </Link>
    </div>
  );
}
