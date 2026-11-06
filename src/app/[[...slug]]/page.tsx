import { notFound } from 'next/navigation';

type RouteProps = { params: Promise<{ slug?: string[] }> };

export default async function Page({ params }: RouteProps) {
  const { slug = [] } = await params;
  if (slug.length === 1 && ['product-groups', 'product-discounts'].includes(slug[0])) {
    notFound();
  }
  return null;
}
