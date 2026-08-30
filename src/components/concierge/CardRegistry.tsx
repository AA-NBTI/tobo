'use client'

import React from 'react'
import ServiceSelectCard from './cards/ServiceSelectCard'
import DatePickerCard from './cards/DatePickerCard'
import TimeSlotCard from './cards/TimeSlotCard'

// 확장성을 위한 카드 레지스트리
// DB의 card_templates 테이블의 card_type과 정확히 매핑됩니다.
const CardComponents: Record<string, React.FC<any>> = {
  service_select: ServiceSelectCard,
  date_picker: DatePickerCard,
  time_slot: TimeSlotCard,
  // 향후 party_size, contact_confirm 등이 추가될 수 있습니다.
}

export interface CardRegistryProps {
  cardType: string;
  businessId: string;
  options: any[]; // Tool 함수로부터 전달받은 DB 조회 결과
  onSelect: (selectedData: any) => void;
}

export default function CardRegistry({ cardType, businessId, options, onSelect }: CardRegistryProps) {
  const CardComponent = CardComponents[cardType]

  if (!CardComponent) {
    console.warn(`[CardRegistry] 등록되지 않은 카드 타입입니다: ${cardType}`)
    return (
      <div className="p-4 border border-gray-200 bg-gray-50 text-gray-500 text-sm rounded-md">
        지원되지 않는 카드 형식입니다. ({cardType})
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm my-2">
      <CardComponent 
        businessId={businessId} 
        options={options} 
        onSelect={onSelect} 
      />
    </div>
  )
}
