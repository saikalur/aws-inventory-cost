"use client";

interface ServiceFilterProps {
  startDate: string;
  endDate: string;
  service: string;
  region: string;
  granularity: string;
  availableServices: string[];
  availableRegions: string[];
  onStartDateChange: (v: string) => void;
  onEndDateChange: (v: string) => void;
  onServiceChange: (v: string) => void;
  onRegionChange: (v: string) => void;
  onGranularityChange: (v: string) => void;
}

export default function ServiceFilter(props: ServiceFilterProps) {
  const inputClass =
    "rounded-lg border border-[#2e3348] bg-[#252836] px-3 py-2 text-sm text-[#e4e6f0] outline-none focus:border-indigo-500 transition-colors";

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[#2e3348] bg-[#1a1d29] p-4">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-[#8b8fa3]">Start Date</label>
        <input
          type="date"
          value={props.startDate}
          onChange={(e) => props.onStartDateChange(e.target.value)}
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-[#8b8fa3]">End Date</label>
        <input
          type="date"
          value={props.endDate}
          onChange={(e) => props.onEndDateChange(e.target.value)}
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-[#8b8fa3]">Service</label>
        <select
          value={props.service}
          onChange={(e) => props.onServiceChange(e.target.value)}
          className={inputClass}
        >
          <option value="">All Services</option>
          {props.availableServices.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-[#8b8fa3]">Region</label>
        <select
          value={props.region}
          onChange={(e) => props.onRegionChange(e.target.value)}
          className={inputClass}
        >
          <option value="">All Regions</option>
          {props.availableRegions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-[#8b8fa3]">Granularity</label>
        <select
          value={props.granularity}
          onChange={(e) => props.onGranularityChange(e.target.value)}
          className={inputClass}
        >
          <option value="DAILY">Daily</option>
          <option value="MONTHLY">Monthly</option>
        </select>
      </div>
    </div>
  );
}
