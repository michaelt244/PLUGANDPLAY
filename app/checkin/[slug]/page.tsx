import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import CheckInForm from '@/components/CheckInForm';

export default async function CheckInPage({ params }: { params: { slug: string } }) {
  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, slug')
    .eq('slug', params.slug)
    .single();

  if (!business) notFound();

  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-blue-600 text-xs font-bold uppercase tracking-wider mb-2">Kinetiq</p>
          <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
          <p className="text-gray-400 text-sm mt-1">Check in to earn rewards</p>
        </div>
        <CheckInForm slug={business.slug} />
      </div>
    </main>
  );
}
