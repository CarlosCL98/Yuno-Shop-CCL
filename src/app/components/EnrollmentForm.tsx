"use client";

import { useEffect, useState } from "react";
import { loadScript } from '@yuno-payments/sdk-web';
import { Yuno, YunoInstance } from '@yuno-payments/sdk-web-types';
import InputField from "./InputField";
import SelectField from "./SelectField";
import { countries, getCountryData, getPhoneCountryCode, getDefaultDocumentType, getSampleDocumentNumber, getDocumentTypes } from "../data/countries";
// Update this import to include PaymentMethod
import { PaymentMethodEnrollable, PaymentMethod } from "../models/definitions";
import { useCurrency } from "../context/CurrencyContext";
import { useCustomer } from "../context/CustomerContext";

export default function EnrollmentForm() {
    const [yunoInstance, setYunoInstance] = useState<YunoInstance | null>(null);
    const { setCountry, country: currencyCountry } = useCurrency();
    const { customerData, updateCustomerField, updateNestedField, updateCountryData } = useCustomer();
    const [showPaymentMethods, setShowPaymentMethods] = useState(false);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethodEnrollable[]>([]);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethodEnrollable | null>(null);
    const [showEnrollmentSection, setShowEnrollmentSection] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // New state for enrolled payment methods management
    const [showEnrolledMethods, setShowEnrolledMethods] = useState(false);
    const [enrolledMethods, setEnrolledMethods] = useState<PaymentMethod[]>([]);
    const [isLoadingEnrolled, setIsLoadingEnrolled] = useState(false);


    // Sync customer data when currency context country changes (e.g., from navbar)
    useEffect(() => {
        if (currencyCountry && currencyCountry !== customerData.country) {
            updateCountryData(currencyCountry);
        }
    }, [currencyCountry, customerData.country, updateCountryData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        
        // Update currency and all country-related data when country changes
        if (name === "country") {
            setCountry(value);
            updateCountryData(value);
        } else {
            updateCustomerField(name as keyof typeof customerData, value);
        }
    };

    const handleNestedChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
        section: "document" | "phone"
    ) => {
        const { name, value } = e.target;
        updateNestedField(section, name, value);
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Create the customer
            const customerResponse = await fetch("/api/create-customer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(customerData),
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
                    country: customerData.country,
                    customer_data: customerData
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
                countryCode: customerData.country,
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

    // New function to fetch enrolled payment methods
    const fetchEnrolledPaymentMethods = async () => {
        const customerId = localStorage.getItem("yuno_customer_id");
        if (!customerId) {
            alert("Please create a customer first by enrolling a payment method");
            return;
        }

        setIsLoadingEnrolled(true);
        try {
            const response = await fetch("/api/get-enrolled-payment-methods", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customer_id: customerId
                })
            });

            const data = await response.json();
            console.log("Raw enrolled payment methods response:", data);
            
            // Handle different possible response structures
            let enrolledMethodsArray = [];
            if (Array.isArray(data)) {
                enrolledMethodsArray = data;
            } else if (data.payment_methods && Array.isArray(data.payment_methods)) {
                enrolledMethodsArray = data.payment_methods;
            } else if (data.data && Array.isArray(data.data)) {
                enrolledMethodsArray = data.data;
            } else {
                console.warn("Unexpected response structure:", data);
                enrolledMethodsArray = [];
            }
            
            // Filter only enrolled methods (those with vaulted_token)
            const filteredEnrolledMethods = enrolledMethodsArray.filter((method: PaymentMethod) => 
                method.vaulted_token !== null && method.vaulted_token !== undefined
            );
            
            setEnrolledMethods(filteredEnrolledMethods);
            setShowEnrolledMethods(true);
            console.log("Enrolled payment methods:", filteredEnrolledMethods);

        } catch (error) {
            console.error("Error fetching enrolled payment methods:", error);
            alert("❌ Error fetching enrolled payment methods. Please try again.");
        } finally {
            setIsLoadingEnrolled(false);
        }
    };

    // New function to handle unenrolling a payment method
    const handleUnenrollPaymentMethod = async (paymentMethod: PaymentMethod) => {
        if (!paymentMethod.vaulted_token) {
            alert("❌ Invalid payment method token");
            return;
        }

        const confirmUnenroll = window.confirm(
            `Are you sure you want to unenroll "${paymentMethod.name}"? This action cannot be undone.`
        );

        if (!confirmUnenroll) return;

        const customerSession = localStorage.getItem("yuno_customer_session");
        if (!customerSession) {
            alert("❌ Customer session not found");
            return;
        }

        setIsLoadingEnrolled(true);
        try {
            const response = await fetch("/api/unenroll-payment-method", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    payment_method_id: paymentMethod.vaulted_token
                })
            });

            const data = await response.json();
            
            if (response.ok && data.success) {
                alert(`🎉 "${paymentMethod.name}" has been successfully unenrolled!`);
                // Refresh the enrolled methods list
                await fetchEnrolledPaymentMethods();
            } else {
                alert(`❌ Error unenrolling payment method: ${data.error || 'Unknown error'}`);
            }

        } catch (error) {
            console.error("Error unenrolling payment method:", error);
            alert("❌ Error unenrolling payment method. Please try again.");
        } finally {
            setIsLoadingEnrolled(false);
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
            {!showPaymentMethods && !showEnrolledMethods && (
                <div className="bg-white rounded-xl shadow-md p-6">
                    <h2 className="text-2xl font-bold mb-6 text-center">💳 Payment Method Management</h2>
                    <p className="text-gray-600 mb-6 text-center">
                        Add new payment methods or manage your existing ones for faster checkouts.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField
                                name="first_name"
                                placeholder="First Name"
                                value={customerData.first_name}
                                onChange={handleChange}
                            />
                            <InputField
                                name="last_name"
                                placeholder="Last Name"
                                value={customerData.last_name}
                                onChange={handleChange}
                            />
                            <SelectField
                                name="country"
                                placeholder="Select Country"
                                value={customerData.country}
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
                                value={customerData.email}
                                onChange={handleChange}
                            />
                            <SelectField
                                name="document_type"
                                placeholder="Document Type"
                                value={customerData.document.document_type}
                                onChange={(e) => handleNestedChange(e, "document")}
                                options={getDocumentTypes(customerData.country).map(docType => ({
                                    value: docType,
                                    label: docType
                                }))}
                            />
                            <InputField
                                name="document_number"
                                placeholder="Document Number"
                                value={customerData.document.document_number}
                                onChange={(e) => handleNestedChange(e, "document")}
                            />
                            <InputField
                                name="number"
                                type="tel"
                                placeholder="Phone Number"
                                value={customerData.phone.number}
                                onChange={(e) => handleNestedChange(e, "phone")}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-full transition font-medium"
                            >
                                {isLoading ? "Loading..." : "➕ Enroll New Payment Method"}
                            </button>
                            
                            <button
                                type="button"
                                onClick={fetchEnrolledPaymentMethods}
                                disabled={isLoadingEnrolled}
                                className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-6 py-3 rounded-full transition font-medium"
                            >
                                {isLoadingEnrolled ? "Loading..." : "📋 Manage Enrolled Methods"}
                            </button>
                        </div>
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

            {/* Enrolled Payment Methods Management */}
            {showEnrolledMethods && (
                <div className="bg-white rounded-xl shadow-md p-6">
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">📋 Your Enrolled Payment Methods</h2>
                        <p className="text-gray-600">Manage your saved payment methods. You can remove any method you no longer wish to use.</p>
                    </div>

                    {enrolledMethods.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="text-gray-400 mb-4">
                                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No Payment Methods Enrolled</h3>
                            <p className="text-gray-500 mb-6">You haven't enrolled any payment methods yet. Add one to get started!</p>
                            <button
                                onClick={() => {
                                    setShowEnrolledMethods(false);
                                    setEnrolledMethods([]);
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full transition font-medium"
                            >
                                ➕ Enroll Your First Payment Method
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {enrolledMethods.map((method, index) => (
                                <div
                                    key={`${method.vaulted_token}_${index}`}
                                    className="border border-gray-200 rounded-xl p-5 bg-gradient-to-r from-gray-50 to-white"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-4">
                                            {/* Payment method icon */}
                                            <div className="flex-shrink-0 p-3 bg-white rounded-lg shadow-sm">
                                                <img
                                                    src={method.icon}
                                                    alt={method.name}
                                                    className="w-8 h-8 object-contain"
                                                />
                                            </div>

                                            {/* Payment method details */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-gray-900 mb-1">
                                                    {method.name}
                                                </h3>
                                                <p className="text-sm text-gray-600 mb-1">
                                                    {method.description}
                                                </p>
                                                <div className="flex items-center space-x-4 text-xs text-gray-500">
                                                    <span className="flex items-center space-x-1">
                                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                        </svg>
                                                        <span>Enrolled</span>
                                                    </span>
                                                    {method.last_successfully_used_at && (
                                                        <span>
                                                            Last used: {new Date(method.last_successfully_used_at).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                    {method.preferred && (
                                                        <span className="flex items-center space-x-1 text-blue-600">
                                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                            </svg>
                                                            <span>Preferred</span>
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Unenroll button */}
                                        <button
                                            onClick={() => handleUnenrollPaymentMethod(method)}
                                            disabled={isLoadingEnrolled}
                                            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                            <span>Remove</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={() => {
                            setShowEnrolledMethods(false);
                            setEnrolledMethods([]);
                        }}
                        className="mt-6 text-sm text-blue-600 hover:text-blue-800 underline flex items-center space-x-1"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span>Back to Payment Management</span>
                    </button>
                </div>
            )}
        </div>
    );
}