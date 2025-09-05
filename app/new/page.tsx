// app/new/page.tsx
import NewPostClient from "./NewPostClient";

export const dynamic = "force-dynamic"; // プリレンダーさせない

type PageProps = {
  searchParams?: { [key: string]: string | string[] | undefined };
};

export default function Page({ searchParams }: PageProps) {
  const initialType =
    typeof searchParams?.type === "string" ? searchParams!.type : "CONSULTATION";
  const initialTitle =
    typeof searchParams?.draft === "string" ? searchParams!.draft : "";
  const initialTags =
    typeof searchParams?.tags === "string" ? searchParams!.tags : "";

  return (
    <NewPostClient
      initialType={initialType}
      initialTitle={initialTitle}
      initialTags={initialTags}
    />
  );
}
