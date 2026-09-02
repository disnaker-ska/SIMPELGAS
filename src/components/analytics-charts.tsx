'use client'

import React from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

export interface BidangChartProps {
  data: { name: string; value: number }[]
  totalLaporan: number
  colors: string[]
}

export function BidangDonutChart({ data, totalLaporan, colors }: BidangChartProps) {
  if (!data || data.length === 0) return null

  return (
    <div className="relative w-48 h-48 shrink-0 flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={75}
            paddingAngle={4}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={colors[index % colors.length]}
              />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0]
                const total = totalLaporan || 1
                const pct = Math.round(((item.value as number) / total) * 100)
                return (
                  <div className="bg-slate-900 text-white text-xs py-1 px-2.5 rounded-lg shadow-md">
                    <p className="font-bold">{item.name}</p>
                    <p className="text-slate-300">
                      <span className="text-sky-400 font-bold">{item.value}</span> ({pct}%)
                    </p>
                  </div>
                )
              }
              return null
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      {/* Center Label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl font-black text-slate-900 tabular-nums">
          {totalLaporan}
        </span>
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          Laporan
        </span>
      </div>
    </div>
  )
}
