// Skeleton Loading Components
export const SkeletonBox = ({ width = "w-full", height = "h-4", rounded = "rounded-md" }) => (
    <div className={`${width} ${height} ${rounded} bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse`} />
);

export const SkeletonText = ({ lines = 1, width = "w-full" }) => (
    <div className={`space-y-2 ${width}`}>
        {[...Array(lines)].map((_, i) => (
            <SkeletonBox key={i} width={i === lines - 1 ? "w-3/4" : "w-full"} height="h-4" />
        ))}
    </div>
);

// Stats Card Skeleton
export const SkeletonStatCard = () => (
    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm animate-pulse">
        <div className="flex justify-between items-center">
            <div className="flex-1">
                <SkeletonBox width="w-20" height="h-3" />
                <SkeletonBox width="w-16" height="h-6" className="mt-3" />
            </div>
            <div className="w-10 h-10 bg-gray-200 rounded-lg" />
        </div>
    </div>
);

// Table Row Skeleton
export const SkeletonTableRow = ({ columns = 7 }) => (
    <tr className="border-b border-gray-100 animate-pulse">
        {[...Array(columns)].map((_, i) => (
            <td key={i} className="px-4 py-3">
                <SkeletonBox height="h-4" width={i === 0 ? "w-8" : i === columns - 1 ? "w-16" : "w-full"} />
            </td>
        ))}
    </tr>
);

// Table Skeleton
export const SkeletonTable = ({ rows = 5, columns = 7 }) => (
    <div className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm">
        {/* Header */}
        <div className="hidden md:grid grid-cols-7 bg-gray-50 border-b border-gray-100 p-4 animate-pulse">
            {[...Array(columns)].map((_, i) => (
                <div key={i}>
                    <SkeletonBox width="w-20" height="h-3" />
                </div>
            ))}
        </div>
        {/* Rows */}
        <table className="w-full">
            <tbody>
                {[...Array(rows)].map((_, i) => (
                    <SkeletonTableRow key={i} columns={columns} />
                ))}
            </tbody>
        </table>
    </div>
);

// Chart Skeleton
export const SkeletonChart = ({ height = "h-64" }) => (
    <div className={`bg-white p-4 rounded-xl border border-gray-100 shadow-sm ${height} animate-pulse`}>
        <SkeletonBox width="w-1/3" height="h-4" />
        <div className="mt-6 flex items-end justify-between gap-2 h-40">
            {[...Array(6)].map((_, i) => (
                <SkeletonBox 
                    key={i} 
                    width="w-12" 
                    height="h-32" 
                    rounded="rounded-t-md"
                />
            ))}
        </div>
    </div>
);

// Form Skeleton
export const SkeletonForm = () => (
    <div className="space-y-4 animate-pulse">
        <div>
            <SkeletonBox width="w-1/4" height="h-3" />
            <SkeletonBox width="w-full" height="h-10" rounded="rounded-lg" className="mt-2" />
        </div>
        <div>
            <SkeletonBox width="w-1/4" height="h-3" />
            <SkeletonBox width="w-full" height="h-10" rounded="rounded-lg" className="mt-2" />
        </div>
        <SkeletonBox width="w-1/4" height="h-10" rounded="rounded-lg" />
    </div>
);

// Page Loading Overlay
export const SkeletonPageOverlay = () => (
    <div className="fixed inset-0 z-999 flex items-center justify-center bg-white/60 backdrop-blur-sm transition-all duration-300">
        <div className="bg-white p-6 rounded-3xl shadow-2xl border border-emerald-100 flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-3"></div>
            <p className="text-emerald-800 font-semibold text-sm animate-pulse">กำลังโหลดข้อมูล...</p>
        </div>
    </div>
);

// Dashboard Grid Skeleton (Stats + Chart)
export const SkeletonDashboard = () => (
    <div className="space-y-6 animate-pulse">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
                <SkeletonStatCard key={i} />
            ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonChart height="h-64" />
            <SkeletonChart height="h-64" />
        </div>

        {/* Table */}
        <SkeletonTable rows={5} columns={7} />
    </div>
);

// Facebook Style Full Page Admin Dashboard Skeleton
export const SkeletonAdminDashboard = () => (
    <div className="w-full max-w-7xl space-y-6 animate-pulse">
        {/* Header/Filter Bar */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap items-center justify-between gap-4">
            <SkeletonBox width="w-32" height="h-10" rounded="rounded-xl" />
            <SkeletonBox width="w-24" height="h-10" rounded="rounded-xl" />
        </div>

        {/* Stats Cards - 4 columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
                <SkeletonStatCard key={i} />
            ))}
        </div>

        {/* Charts Section - 2 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Bar Chart */}
            <div className="lg:col-span-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <SkeletonBox width="w-1/3" height="h-4" className="mb-4" />
                <div className="h-64 flex items-end justify-between gap-2">
                    {[...Array(8)].map((_, i) => (
                        <SkeletonBox key={i} width="w-12" height="h-40" rounded="rounded-t-md" />
                    ))}
                </div>
            </div>

            {/* Pie Chart */}
            <div className="lg:col-span-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <SkeletonBox width="w-1/3" height="h-4" className="mb-4" />
                <div className="h-64 flex items-center justify-center">
                    <div className="w-40 h-40 bg-gray-200 rounded-full animate-pulse" />
                </div>
            </div>
        </div>

        {/* Main Content Area - Table Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Table - Left Side */}
            <div className="lg:col-span-8 flex flex-col bg-white rounded-3xl shadow-md border border-gray-100 overflow-hidden">
                {/* Filter Bar */}
                <div className="p-4 border-b border-gray-100 flex gap-3 bg-gray-50">
                    <SkeletonBox width="flex-1" height="h-10" rounded="rounded-xl" />
                    <SkeletonBox width="w-32" height="h-10" rounded="rounded-xl" />
                    <SkeletonBox width="w-24" height="h-10" rounded="rounded-xl" />
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                {[...Array(7)].map((_, i) => (
                                    <th key={i} className="px-4 py-3">
                                        <SkeletonBox width="w-20" height="h-3" />
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {[...Array(5)].map((_, i) => (
                                <tr key={i} className="border-b border-gray-100">
                                    {[...Array(7)].map((_, j) => (
                                        <td key={j} className="px-4 py-3">
                                            <SkeletonBox height="h-4" />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                    <SkeletonBox width="w-32" height="h-3" />
                    <div className="flex gap-2">
                        <SkeletonBox width="w-16" height="h-8" rounded="rounded-lg" />
                        <SkeletonBox width="w-16" height="h-8" rounded="rounded-lg" />
                    </div>
                </div>
            </div>

            {/* Right Sidebar */}
            <div className="lg:col-span-4 space-y-6">
                {/* Manage Dates Section */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <SkeletonBox width="w-1/2" height="h-4" className="mb-4" />
                    <div className="flex gap-2 mb-4">
                        <SkeletonBox width="flex-1" height="h-10" rounded="rounded-lg" />
                        <SkeletonBox width="w-24" height="h-10" rounded="rounded-lg" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {[...Array(3)].map((_, i) => (
                            <SkeletonBox key={i} width="w-full" height="h-10" rounded="rounded-lg" />
                        ))}
                    </div>
                </div>

                {/* Manage Slots Section */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                        <SkeletonBox width="w-1/2" height="h-4" />
                        <SkeletonBox width="w-16" height="h-8" rounded="rounded-lg" />
                    </div>
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="space-y-2 p-3 bg-gray-50 rounded-lg">
                                <div className="flex justify-between items-center">
                                    <SkeletonBox width="w-1/3" height="h-4" />
                                    <div className="flex gap-1">
                                        <SkeletonBox width="w-6" height="h-6" rounded="rounded" />
                                        <SkeletonBox width="w-6" height="h-6" rounded="rounded" />
                                    </div>
                                </div>
                                <SkeletonBox width="w-full" height="h-2" rounded="rounded-full" />
                                <SkeletonBox width="w-2/3" height="h-3" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    </div>
);

// Booking List Skeleton (for main page)
export const SkeletonBookingList = ({ count = 3 }) => (
    <div className="space-y-3">
        {[...Array(count)].map((_, i) => (
            <div key={i} className="bg-white p-4 rounded-lg border border-gray-100 animate-pulse">
                <div className="flex justify-between items-start mb-2">
                    <SkeletonBox width="w-1/3" height="h-4" />
                    <SkeletonBox width="w-1/6" height="h-3" rounded="rounded-full" />
                </div>
                <SkeletonBox width="w-1/2" height="h-3" />
            </div>
        ))}
    </div>
);

// Ticket Details Skeleton
export const SkeletonTicket = () => (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 animate-pulse">
        <SkeletonBox width="w-1/2" height="h-6" rounded="rounded-lg" className="mb-4" />
        <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
                <div key={i}>
                    <SkeletonBox width="w-1/4" height="h-3" />
                    <SkeletonBox width="w-full" height="h-4" className="mt-2" />
                </div>
            ))}
        </div>
        <SkeletonBox width="w-32" height="h-10" rounded="rounded-lg" className="mt-6" />
    </div>
);

// Mini Skeleton (for quick loaders)
export const SkeletonMini = ({ width = "w-24", height = "h-6" }) => (
    <SkeletonBox width={width} height={height} rounded="rounded-md" />
);
