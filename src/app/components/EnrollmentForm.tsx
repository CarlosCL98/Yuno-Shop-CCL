"use client";

import { useEffect, useState } from "react";
import { loadScript } from '@yuno-payments/sdk-web';
import { Yuno, YunoInstance } from '@yuno-payments/sdk-web-types';
import InputField from "./InputField";
import SelectField from "./SelectField";
import { countries } from "../data/countries";
import { PaymentMethodEnrollable } from "../models/definitions";

export default function EnrollmentForm() {
    const [yunoInstance, setYunoInstance] = useState<YunoInstance | null>(null);
    const [showPaymentMethods, setShowPaymentMethods] = useState(false);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethodEnrollable[]>([]);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethodEnrollable | null>(null);
    const [showEnrollmentSection, setShowEnrollmentSection] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState({
        merchant_customer_id: "shopccl_customertest_001",
        first_name: "Carlos",
        last_name: "Medina",
        email: "carlos.medina@yuno.com",
        country: "",
        gender: "M",
        date_of_birth: "2000-12-14",
        nationality: "CO",
        document: {
            document_type: "CC",
            document_number: "1234567891",
        },
        phone: {
            number: "3112221111",
            country_code: "57",
        },
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleNestedChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
        section: "document" | "phone"
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [section]: {
                ...prev[section],
                [name]: value,
            },
        }));
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Create the customer
            const customerResponse = await fetch("/api/create-customer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const customer = await customerResponse.json();
            localStorage.setItem("yuno_customer_id", customer.id);
            console.log("Yuno answer customer:", customer);

            // Create the customer session
            const response = await fetch("/api/create-customer-session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customer_id: customer.id,
                    country: customer.country
                })
            });

            const customerSession = await response.json();
            localStorage.setItem("yuno_customer_session", customerSession.customer_session);
            console.log("Yuno answer customer session:", customerSession);

            // Fetch the available payment methods to enroll
            const paymentMethodsResponse = await fetch("/api/get-payment-methods-enrollable", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customer_session: customerSession.customer_session
                })
            });

            const paymentMethodsData = await paymentMethodsResponse.json();
            const paymentMethodsArray = paymentMethodsData.payment_methods || paymentMethodsData || [];

            setPaymentMethods(paymentMethodsArray);
            setShowPaymentMethods(true);
            console.log("Available payment methods:", paymentMethodsArray);

        } catch (error) {
            console.error("Error sending data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePaymentMethodSelect = async (paymentMethod: PaymentMethodEnrollable) => {
        setSelectedPaymentMethod(paymentMethod);
        setShowEnrollmentSection(true);
        
        // Pass the payment method directly to avoid stale state
        await handleStartEnrollment(paymentMethod);
    };

    // Helper function to create unique identifier for enrollable payment methods
    const getPaymentMethodId = (method: PaymentMethodEnrollable) => {
        return `${method.type}_${method.name}`;
    };

    const getSelectedPaymentMethodId = () => {
        return selectedPaymentMethod ? getPaymentMethodId(selectedPaymentMethod) : null;
    };

    // Start enrollment process
    const handleStartEnrollment = async (paymentMethod?: PaymentMethodEnrollable) => {
        const currentPaymentMethod = paymentMethod || selectedPaymentMethod;
        
        if (!currentPaymentMethod) return;

        try {
            // First, create the enrollment payment method
            console.log('Creating enrollment payment method...',currentPaymentMethod);
            const enrollResponse = await fetch("/api/enroll-payment-method", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customer_session: localStorage.getItem("yuno_customer_session"),
                    payment_method_type: currentPaymentMethod.type,
                    country: formData.country
                }),
            });

            const enrollmentData = await enrollResponse.json();
            console.log("Enrollment payment method created:", enrollmentData);

            // Store the enrollment session for SDK mounting
            if (enrollmentData.enrollment && enrollmentData.enrollment.session) {
                localStorage.setItem("yuno_enrollment_session", enrollmentData.enrollment.session);
            }

            // Now mount the enrollment lite form with the created enrollment
            yunoInstance?.mountEnrollmentLite({
                customerSession: localStorage.getItem("yuno_customer_session") ?? "",
                language: 'en',
                countryCode: formData.country,
                showLoading: true,
                renderMode: {
                    type: 'element',
                    elementSelector: {
                        apmForm: "#enrollment-element",
                        actionForm: "#enrollment-action-element"
                    },
                },
                onLoading: (args: any) => {
                    console.log(args);
                },
                yunoEnrollmentStatus: (params: any) => {
                    console.log('Enrollment status:', params);

                    switch (params.status) {
                        case 'ENROLLED':
                            console.log('Payment method enrolled successfully:', params.vaultedToken);
                            alert('🎉 Payment method enrolled successfully!');
                            // Reset the form
                            setSelectedPaymentMethod(null);
                            setShowEnrollmentSection(false);
                            setShowPaymentMethods(false);
                            break;
                        case 'ERROR':
                            console.log('Enrollment error');
                            alert('❌ Error enrolling payment method. Please try again.');
                            break;
                        default:
                            console.log('Other enrollment status:', params.status);
                    }
                },
                yunoError: (message: any, data: any) => {
                    console.error('Enrollment error:', message, data);
                    alert('Error during enrollment: ' + message);
                },
            } as any);

        } catch (error) {
            console.error('Error creating enrollment:', error);
            alert('❌ Error creating enrollment. Please try again.');
        }
    };

    useEffect(() => {
        const initializeYuno = async () => {
            const yuno = (await loadScript()) as Yuno;
            const yunoInstance = await yuno.initialize(process.env.NEXT_PUBLIC_API_KEY!) as YunoInstance;
            setYunoInstance(yunoInstance);

            if (!yunoInstance) return;
            else console.log("Yuno SDK initialized for enrollment!");
        };

        initializeYuno();
    }, []);

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            {/* Customer Information Form */}
            {!showPaymentMethods && (
                <div className="bg-white rounded-xl shadow-md p-6">
                    <h2 className="text-2xl font-bold mb-6 text-center">💳 Enroll a New Payment Method</h2>
                    <p className="text-gray-600 mb-6 text-center">
                        Add a new payment method to your account for faster checkouts in the future.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField
                                name="first_name"
                                placeholder="First Name"
                                value={formData.first_name}
                                onChange={handleChange}
                            />
                            <InputField
                                name="last_name"
                                placeholder="Last Name"
                                value={formData.last_name}
                                onChange={handleChange}
                            />
                            <SelectField
                                name="country"
                                placeholder="Select Country"
                                value={formData.country}
                                onChange={handleChange}
                                options={countries.map(country => ({
                                    value: country.isoCode,
                                    label: country.name
                                }))}
                            />
                            <InputField
                                name="email"
                                type="email"
                                placeholder="Email"
                                value={formData.email}
                                onChange={handleChange}
                            />
                            <InputField
                                name="document_type"
                                placeholder="Document Type (CC, CE, PP)"
                                value={formData.document.document_type}
                                onChange={(e) => handleNestedChange(e, "document")}
                            />
                            <InputField
                                name="document_number"
                                placeholder="Document Number"
                                value={formData.document.document_number}
                                onChange={(e) => handleNestedChange(e, "document")}
                            />
                            <InputField
                                name="number"
                                type="tel"
                                placeholder="Phone Number"
                                value={formData.phone.number}
                                onChange={(e) => handleNestedChange(e, "phone")}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-full transition font-medium"
                        >
                            {isLoading ? "Loading..." : "Find Available Payment Methods"}
                        </button>
                    </form>
                </div>
            )}

            {/* Payment Methods Selection */}
            {showPaymentMethods && !showEnrollmentSection && (
                <div className="bg-white rounded-xl shadow-md p-6">
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">💳 Choose a Payment Method to Enroll</h2>
                        <p className="text-gray-600">Select the payment method you'd like to add to your account.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Array.isArray(paymentMethods) && paymentMethods.map((method, index) => {
                            const isSelected = getSelectedPaymentMethodId() === getPaymentMethodId(method);

                            return (
                                <div
                                    key={index}
                                    onClick={() => handlePaymentMethodSelect(method)}
                                    className={`relative border-2 rounded-xl p-5 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group
                    ${isSelected
                                            ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg'
                                            : 'border-gray-200 bg-white hover:border-blue-300'
                                        }
                  `}
                                >
                                    <div className="flex items-start space-x-4">
                                        {/* Payment method icon */}
                                        <div className={`flex-shrink-0 p-3 rounded-lg
                      ${isSelected ? 'bg-white shadow-sm' : 'bg-gray-50 group-hover:bg-gray-100'}
                      transition-colors duration-200
                    `}>
                                            <img
                                                src={method.icon}
                                                alt={method.name}
                                                className="w-8 h-8 object-contain"
                                            />
                                        </div>

                                        {/* Payment method details */}
                                        <div className="flex-1 min-w-0">
                                            <h3 className={`font-semibold truncate mb-1
                        ${isSelected ? 'text-blue-900' : 'text-gray-900'}
                      `}>
                                                {method.name}
                                            </h3>

                                            <p className={`text-sm mb-2 line-clamp-2
                        ${isSelected ? 'text-blue-700' : 'text-gray-600'}
                      `}>
                                                {method.description}
                                            </p>

                                            <div className="flex items-center space-x-1 text-gray-500">
                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-0.257-0.257A6 6 0 1118 8zM2 8a6 6 0 1012 0A6 6 0 002 8z" clipRule="evenodd" />
                                                </svg>
                                                <span className="text-xs">Secure enrollment</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            setShowPaymentMethods(false);
                            setPaymentMethods([]);
                        }}
                        className="mt-6 text-sm text-blue-600 hover:text-blue-800 underline flex items-center space-x-1"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span>Back to Customer Information</span>
                    </button>
                </div>
            )}

            {/* Enrollment Section */}
            {showEnrollmentSection && selectedPaymentMethod && (
                <div className="bg-white rounded-xl shadow-md p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">
                                💳 Enroll Your Payment Method
                            </h2>
                            <p className="text-gray-600">
                                Enrolling {selectedPaymentMethod.name}
                                <span className="text-blue-600 ml-1">(New method)</span>
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedPaymentMethod(null);
                                setShowEnrollmentSection(false);
                            }}
                            className="text-sm text-blue-600 hover:text-blue-800 underline flex items-center space-x-1"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            <span>Change Payment Method</span>
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <div id="enrollment-element" className="min-h-[200px]"></div>
                            <div id="enrollment-action-element" className="mt-4"></div>
                        </div>

                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-start space-x-2">
                                <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                <div>
                                    <p className="text-xs font-medium text-blue-800">Secure Enrollment</p>
                                    <p className="text-xs text-blue-700">Your payment information is encrypted and will be securely stored for future use.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}