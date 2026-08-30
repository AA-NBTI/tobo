'use client'

import React, { useState } from 'react'

interface DatePickerCardProps {
  businessId: string;
  options: any[]; // 특정 달의 가용 날짜 목록 등
  onSelect: (selectedData: any) => void;
}

export default function DatePickerCard({ onSelect }: DatePickerCardProps) {
  // 간단한 날짜 선택 UI (실제 구현시 달력 라이브러리 연동 가능)
  // 엔진으로서 구조적 안정감을 위해 그레이톤 미니멀 디자인 유지
  const [selectedDate, setSelectedDate] = useState<string>('')

  const handleConfirm = () => {
    if (selectedDate) {
      onSelect({ date: selectedDate })
    }
  }

  return (
    <div className="border border-gray-200 bg-white rounded-md overflow-hidden shadow-sm">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <h4 className="text-sm font-medium text-gray-700">날짜 선택</h4>
      </div>
      <div className="p-4">
        <input 
          type="date" 
          className="w-full border border-gray-300 rounded-md p-2 text-sm text-gray-700 focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
        <button
          onClick={handleConfirm}
          disabled={!selectedDate}
          className="mt-4 w-full bg-gray-800 text-white text-sm font-medium py-2 rounded-md disabled:bg-gray-300 transition-colors"
        >
          확인
        </button>
      </div>
    </div>
  )
}
