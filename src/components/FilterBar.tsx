import React from 'react';
import { Calendar, Search, SlidersHorizontal } from 'lucide-react';

export const FilterBar: React.FC = () => {
  return (
    <div className="bg-white rounded-[16px] border border-[#E5E5EA] shadow-sm p-4 mb-6">
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2 text-xs">
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#636366]" />
          <span className="font-semibold text-[#1C1C1E]">Active filters</span>
          <span className="bg-[#FF3B30]/10 text-[#FF3B30] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            2
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* All customers dropdown */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F2F2F7] border border-[#E5E5EA] text-sm">
          <span className="text-[10px] font-semibold text-[#636366] uppercase">All customers</span>
          <span className="ml-auto text-[11px] text-[#8E8E93]">▾</span>
        </div>

        {/* All statuses dropdown */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F2F2F7] border border-[#E5E5EA] text-sm">
          <span className="text-[10px] font-semibold text-[#636366] uppercase">All statuses</span>
          <span className="ml-auto text-[11px] text-[#8E8E93]">▾</span>
        </div>

        {/* Date picker */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F2F2F7] border border-[#E5E5EA] text-sm">
          <Calendar className="w-3.5 h-3.5 text-[#636366]" />
          <span className="text-[#1C1C1E] font-medium">November 2023</span>
          <span className="text-[10px] text-[#8E8E93]">→</span>
          <span className="text-[#1C1C1E] font-medium">December 2023</span>
        </div>

        {/* Search */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8E93]">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Enter invoice #"
            className="w-full px-3 py-2 rounded-xl bg-[#F2F2F7] border border-[#E5E5EA] text-sm pl-9 focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]/30"
          />
        </div>
      </div>
    </div>
  );
};
