'use client'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { FiBarChart2, FiPieChart } from "react-icons/fi";

// Tooltip สำหรับกราฟแท่ง
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const total = payload.reduce((sum, entry) => sum + entry.value, 0);
        return (
            <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-xl">
                <p className="font-bold text-gray-700 mb-1">{label}</p>
                <hr className="my-1 border-gray-50" />
                {payload.map((entry, index) => (
                    <p key={index} className="text-sm flex justify-between gap-4" style={{ color: entry.fill }}>
                        <span>{entry.name}:</span>
                        <span className="font-semibold">{entry.value}</span>
                    </p>
                ))}
                <hr className="my-2 border-gray-100 border-dashed" />
                <p className="text-sm font-bold text-gray-800 flex justify-between">
                    <span>ยอดรวมทั้งหมด:</span>
                    <span className="text-blue-600 ml-4">{total} รายการ</span>
                </p>
            </div>
        );
    }
    return null;
};

export default function AdminCharts({ chartData, pieData, viewMode, loading }) {
    // Skeleton Loading
    if (loading) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-pulse">
                <div className="lg:col-span-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-[350px]">
                    <div className="h-5 w-48 bg-gray-200 rounded mb-6"></div>
                    <div className="h-[250px] bg-gray-100 rounded-xl w-full"></div>
                </div>
                <div className="lg:col-span-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-[350px]">
                    <div className="h-5 w-32 bg-gray-200 rounded mb-6"></div>
                    <div className="h-[200px] w-[200px] bg-gray-100 rounded-full mx-auto mt-6"></div>
                </div>
            </div>
        );
    }

    return (
        <div id="admin-charts-container" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* กราฟแท่ง */}
            <div className="lg:col-span-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-sm font-bold text-gray-600 mb-4 flex items-center gap-2">
                    <FiBarChart2 />
                    {viewMode === 'daily' && 'สถิติการจองรายชั่วโมง (วันนี้)'}
                    {viewMode === 'monthly' && 'สถิติการจองรายวัน (เดือนนี้)'}
                    {viewMode === 'yearly' && 'สถิติการจองรายเดือน (ปีนี้)'}
                    {viewMode === 'all' && 'แนวโน้มการจองทั้งหมด (ภาพรวม)'}
                </h3>
                <div className="h-[300px] md:h-[250px] w-full">
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                                <YAxis allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                                <Bar dataKey="CHECKED_IN" name="รับบริการแล้ว" fill="#10B981" radius={[4, 4, 0, 0]} barSize={viewMode === 'daily' ? 45 : 15} />
                                <Bar dataKey="BOOKED" name="รอรับบริการ" fill="#EAB308" radius={[4, 4, 0, 0]} barSize={viewMode === 'daily' ? 45 : 15} />
                                <Bar dataKey="CANCELLED" name="ยกเลิกการจอง" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={viewMode === 'daily' ? 45 : 15} />
                                <Bar dataKey="NO_SHOW" name="ไม่มาตามนัด" fill="#6B7280" radius={[4, 4, 0, 0]} barSize={viewMode === 'daily' ? 45 : 15} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-100">
                            <FiBarChart2 className="text-4xl mb-2 opacity-20" />
                            <p className="text-sm font-medium">ไม่พบข้อมูลสถิติ</p>
                        </div>
                    )}
                </div>
            </div>

            {/* กราฟวงกลม */}
            <div className="lg:col-span-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-sm font-bold text-gray-600 mb-4 flex items-center gap-2">
                    <FiPieChart /> สัดส่วนสถานะ
                </h3>
                <div className="h-[250px] w-full flex justify-center">
                    {pieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-100">
                            <FiPieChart className="text-4xl mb-2 opacity-20" />
                            <p className="text-sm font-medium">ไม่มีข้อมูลสัดส่วน</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}