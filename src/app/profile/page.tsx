"use client";

import { useState } from "react";
import ProfileTable from "../components/ProfileTable";
import EnrollmentForm from "../components/EnrollmentForm";

export default function ProfilePage() {
    const [activeTab, setActiveTab] = useState<"orders" | "enrollment">("orders");

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-center">👤 My Profile</h1>
            
            {/* Tab Navigation */}
            <div className="flex justify-center mb-8">
                <div className="bg-gray-100 rounded-lg p-1 flex space-x-1">
                    <button
                        onClick={() => setActiveTab("orders")}
                        className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                            activeTab === "orders"
                                ? "bg-white text-blue-600 shadow-sm"
                                : "text-gray-600 hover:text-gray-900"
                        }`}
                    >
                        🧾 My Orders
                    </button>
                    <button
                        onClick={() => setActiveTab("enrollment")}
                        className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                            activeTab === "enrollment"
                                ? "bg-white text-blue-600 shadow-sm"
                                : "text-gray-600 hover:text-gray-900"
                        }`}
                    >
                        💳 Enroll Payment Methods
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            {activeTab === "orders" && (
                <div>
                    <h2 className="text-2xl font-bold mb-6 text-center">My Orders</h2>
                    <ProfileTable />
                </div>
            )}

            {activeTab === "enrollment" && (
                <div>
                    <EnrollmentForm />
                </div>
            )}
        </div>
    );
}