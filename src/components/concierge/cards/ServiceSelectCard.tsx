'use client'

import React from 'react'

interface ServiceSelectCardProps {
  businessId: string;
  options: any[]; // { id, name, price, duration_min }
  onSelect: (selectedData: any) => void;
}

export default function ServiceSelectCard({ options, onSelect }: ServiceSelectCardProps) {
  if (!options || options.length === 0) {
    return (
      <div className="p-4 border border-gray-200 bg-gray-50 text-gray-500 text-sm rounded-md">
        등록된 서비스가 없습니다.
      </div>
    )
  }

  return (
    <div className="border border-gray-200 bg-white rounded-md overflow-hidden shadow-sm">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <h4 className="text-sm font-medium text-gray-700">서비스 선택</h4>
      </div>
      <div className="divide-y divide-gray-100">
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => onSelect({ service_id: option.id })}
            className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex justify-between items-center group"
          >
            <div>
              <div className="text-sm font-medium text-gray-800">{option.name}</div>
              <div className="text-xs text-gray-500 mt-0.5">
                {option.duration_min}분 소요
              </div>
            </div>
            <div className="text-sm font-medium text-gray-600">
              {option.price ? `${option.price.toLocaleString()}원` : '무료/상담'}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
