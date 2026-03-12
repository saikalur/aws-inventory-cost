"use client";

interface TabNavProps {
  activeTab: "graph" | "costs";
  onTabChange: (tab: "graph" | "costs") => void;
}

export default function TabNav({ activeTab, onTabChange }: TabNavProps) {
  const tabs = [
    { id: "graph" as const, label: "Resource Graph" },
    { id: "costs" as const, label: "Cost Analytics" },
  ];

  return (
    <div className="flex gap-1 rounded-lg bg-[#1a1d29] p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${
            activeTab === tab.id
              ? "bg-indigo-500/20 text-indigo-400"
              : "text-[#8b8fa3] hover:text-[#e4e6f0]"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
