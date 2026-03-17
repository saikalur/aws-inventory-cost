"use client";

import { useState } from "react";
import { postApi } from "@/lib/api";

interface CredentialModalProps {
  profile: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function CredentialModal({ profile, onSuccess, onCancel }: CredentialModalProps) {
  const [accessKey, setAccessKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await postApi("/api/credentials", {
        profile: profile || "",
        aws_access_key_id: accessKey.trim(),
        aws_secret_access_key: secretKey.trim(),
        aws_session_token: sessionToken.trim(),
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set credentials");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-[#2e3348] bg-[#252836] px-3 py-2 text-sm text-[#e4e6f0] outline-none focus:border-indigo-500 transition-colors font-mono";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-[#2e3348] bg-[#1a1d29] p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/20">
            <svg className="h-5 w-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#e4e6f0]">AWS Credentials Expired</h2>
            <p className="text-xs text-[#8b8fa3]">
              {profile ? `Profile: ${profile}` : "Default profile"} — enter temporary credentials
            </p>
          </div>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#8b8fa3]">Access Key ID</label>
            <input
              type="text"
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
              placeholder="ASIA..."
              required
              className={inputClass}
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#8b8fa3]">Secret Access Key</label>
            <input
              type="password"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              required
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#8b8fa3]">Session Token <span className="text-[#555]">(required for SSO / temporary credentials)</span></label>
            <textarea
              value={sessionToken}
              onChange={(e) => setSessionToken(e.target.value)}
              rows={3}
              className={inputClass + " resize-none"}
              placeholder="Paste session token here..."
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </p>
          )}

          <div className="mt-1 flex gap-3">
            <button
              type="submit"
              disabled={loading || !accessKey || !secretKey}
              className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Set Credentials"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-[#2e3348] px-4 py-2 text-sm text-[#8b8fa3] transition-colors hover:text-[#e4e6f0]"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
