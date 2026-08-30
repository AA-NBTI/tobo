'use client'

import React from 'react'

interface TimeSlotCardProps {
  businessId: string;
  options: any[]; // { id, datetime, is_available }
  onSelect: (selectedData: any) => void;
}

export default function TimeSlotCard({ options, onSelect }: TimeSlotCardProps) {
  if (!options || options.length === 0) {
    return (
      <div className="p-4 border border-gray-200 bg-gray-50 text-gray-500 text-sm rounded-md">
        예약 가능한 시간대가 없습니다.
      </div>
    )
  }

  // 시간 문자열 포맷팅 헬퍼
  const formatTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
  }

  return (
    <div className="border border-gray-200 bg-white rounded-md overflow-hidden shadow-sm">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <h4 className="text-sm font-medium text-gray-700">시간 선택</h4>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-3 gap-2">
          {options.map((option) => (
            <button
              key={option.id}
              onClick={() => onSelect({ time_slot: option.id })}
              disabled={!option.is_available}
              className={`py-2 text-sm font-medium rounded-md border transition-colors ${
                option.is_available 
                  ? 'border-gray-300 text-gray-700 hover:border-gray-500 hover:bg-gray-50' 
                  : 'border-gray-100 text-gray-300 bg-gray-50 cursor-not-allowed'
              }`}
            >
              {formatTime(option.datetime)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
