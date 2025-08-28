"use client";
import { useRouter } from "next/navigation";

export default function IntentButtons() {
  const router = useRouter();
  async function go(type:"LIVE"|"WORK"|"TOURISM") {
    const r = await fetch("/api/intent",{ method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ type })});
    const j = await r.json();
    const params = new URLSearchParams();
    params.set("type", type==="LIVE"?"REPORT_LIVE": type==="WORK"?"REPORT_WORK":"REPORT_TOURISM");
    if (j.draftTitle) params.set("draft", j.draftTitle);
    if (j.draftTags?.length) params.set("tags", j.draftTags.join(","));
    router.push(`/new?${params.toString()}`);
  }
  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={()=>go("LIVE")} className="rounded-lg border bg-white px-3 py-1.5 hover:bg-gray-50">笠間に住みたい</button>
      <button onClick={()=>go("WORK")} className="rounded-lg border bg-white px-3 py-1.5 hover:bg-gray-50">笠間で働きたい</button>
      <button onClick={()=>go("TOURISM")} className="rounded-lg border bg-white px-3 py-1.5 hover:bg-gray-50">笠間に行きたい</button>
    </div>
  );
}
