import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex items-center justify-center w-full h-full min-h-[50vh]">
        <Loader2 className="animate-spin text-primary/50" size={32} />
    </div>
  );
}