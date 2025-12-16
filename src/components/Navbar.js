'use client'
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiCalendar, FiClipboard, FiTool, FiMenu, FiActivity, FiX } from "react-icons/fi";

export default function Navbar() {
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // เช็คว่าหน้าปัจจุบันตรงกับเมนูไหม
    const isActive = (path) => pathname === path;

    const navItems = [
        { path: "/", label: "ลงทะเบียน", icon: <FiCalendar /> },
        { path: "/ticket", label: "ตรวจสอบสิทธิ์", icon: <FiClipboard /> },
        // { path: "/scan", label: "สแกน (จนท.)", icon: <FiCamera /> }, // อันเดิมคุณคอมเมนต์ไว้
        { path: "/admin", label: "เจ้าหน้าที่", icon: <FiTool /> },
    ];

    return (
        <nav className="bg-white border-b border-emerald-100 shadow-sm sticky top-0 z-50 w-full">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">

                    {/* Logo Section */}
                    <div className="flex items-center cursor-pointer" onClick={() => window.location.href = '/'}>
                        <div className="flex-shrink-0 flex items-center gap-2">
                            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-md">
                                <FiActivity />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-bold text-lg text-emerald-900 leading-tight">คณะการแพทย์แผนไทย</span>
                                <span className="text-[10px] text-emerald-600 font-medium tracking-wider">THAI TRADITIONAL MEDICINE</span>
                            </div>
                        </div>
                    </div>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex md:items-center md:space-x-1">
                        {navItems.map((item) => (
                            <Link
                                key={item.path}
                                href={item.path}
                                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${isActive(item.path)
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "text-gray-500 hover:text-emerald-600 hover:bg-gray-50"
                                    }`}
                            >
                                <span className="text-lg">{item.icon}</span>
                                {item.label}
                            </Link>
                        ))}
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="flex items-center md:hidden">
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="p-2 rounded-md text-gray-500 hover:text-emerald-600 hover:bg-gray-100 focus:outline-none transition-colors"
                        >
                            {isMobileMenuOpen ? <FiX className="h-6 w-6" /> : <FiMenu className="h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {isMobileMenuOpen && (
                <div className="md:hidden bg-white border-t border-gray-100 absolute w-full shadow-lg">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        {navItems.map((item) => (
                            <Link
                                key={item.path}
                                href={item.path}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`flex items-center gap-3 px-3 py-3 rounded-md text-base font-medium transition-colors ${isActive(item.path)
                                        ? "bg-emerald-50 text-emerald-700 border-l-4 border-emerald-600"
                                        : "text-gray-600 hover:bg-gray-50 hover:text-emerald-600"
                                    }`}
                            >
                                <span className="text-xl">{item.icon}</span>
                                {item.label}
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </nav>
    );
}