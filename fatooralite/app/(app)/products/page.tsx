"use client";
import { StubScreen } from "@/components/common/StubScreen";
import { usePageMeta } from "@/lib/usePageMeta";

export default function Page() {
  const { title, sub } = usePageMeta();
  return <StubScreen icon="products" title={title} sub={sub} />;
}
