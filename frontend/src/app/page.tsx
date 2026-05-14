import Calculator from "./Calculator";

export default function Home({ searchParams }: { searchParams: { session?: string } }) {
  return <Calculator sessionId={searchParams.session} />;
}
