import CheckoutForm from "../components/CheckoutForm";

export default function CheckoutPage() {
    return (
        <div className="max-w-3xl mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Complete purchase</h1>
            <CheckoutForm />
        </div>
    );
}