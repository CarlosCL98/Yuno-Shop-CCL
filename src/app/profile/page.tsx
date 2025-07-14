import ProfileTable from "../components/ProfileTable";

export default function ProfilePage() {
    return (
        <div className="p-6 max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-center">🧾 My Orders</h1>
            <ProfileTable />
        </div>
    );
}