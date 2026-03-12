"use client";

export default function LoadingSpinner({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#2e3348] border-t-indigo-500" />
        <p className="text-sm text-[#8b8fa3]">{message}</p>
      </div>
    </div>
  );
}
