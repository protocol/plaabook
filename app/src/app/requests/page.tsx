// Requests live on the index behind the Requests rail filter (design).
// Old deep links keep working via this redirect.

import { redirect } from 'next/navigation';

export default function RequestsPage() {
  redirect('/?type=request');
}
