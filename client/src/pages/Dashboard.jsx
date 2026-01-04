import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import Input from '../components/Input';

const Dashboard = () => {
    const { user, logout } = useAuth();
    const [receipts, setReceipts] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showConnectModal, setShowConnectModal] = useState(false);
    const [isConnected, setIsConnected] = useState(false); // E-invoice status

    const [newReceipt, setNewReceipt] = useState({ title: '', currency: 'USD', receipt_date: '' });
    const [connectData, setConnectData] = useState({ einvoice_username: '', einvoice_password: '' });

    useEffect(() => {
        fetchReceipts();
        checkEInvoiceStatus();
    }, []);

    const fetchReceipts = async () => {
        try {
            const res = await fetch('/api/receipt');
            if (res.ok) {
                const data = await res.json();
                setReceipts(data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const checkEInvoiceStatus = async () => {
        try {
            const res = await fetch('/api/einvoice/invoice_list');
            if (res.ok) {
                setIsConnected(true);
                const data = await res.json();
                setInvoices(data);
            } else if (res.status === 401) {
                setIsConnected(false);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleLogout = () => {
        logout();
    };

    const handleAddReceipt = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/receipt/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams(newReceipt),
            });
            if (res.ok) {
                fetchReceipts();
                setShowAddModal(false);
                setNewReceipt({ title: '', currency: 'USD', receipt_date: '' });
                // If connected, maybe refresh invoices too?
                if (isConnected) checkEInvoiceStatus();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleConnect = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/einvoice_login/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams(connectData),
            });
            if (res.ok) {
                setIsConnected(true);
                setShowConnectModal(false); // Close modal on success
                checkEInvoiceStatus();
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navbar */}
            <nav className="bg-white shadow-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">HMEICR</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="text-gray-700 hidden sm:block">Hello, {user?.email}</span>
                            <button
                                onClick={handleLogout}
                                className="text-gray-500 hover:text-red-500 font-medium transition-colors"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">

                {/* Header Section */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
                        <p className="text-gray-500 text-sm">Manage your expenses and invoices</p>
                    </div>
                    <div className="w-full sm:w-auto flex gap-3">
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow-md transition-all active:scale-95 text-sm font-semibold"
                        >
                            + Receipt
                        </button>
                    </div>
                </div>

                {/* E-Invoice Status */}
                {!isConnected ? (
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 mb-8 text-white shadow-lg relative overflow-hidden">
                        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-bold">Sync with E-Invoice</h3>
                                <p className="text-indigo-100 text-sm">Connect your account to automatically import invoices.</p>
                            </div>
                            <button
                                onClick={() => setShowConnectModal(true)}
                                className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-bold shadow hover:bg-indigo-50 transition-colors"
                            >
                                Connect Account
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-8 flex items-center justify-between">
                        <div className="flex items-center">
                            <span className="h-3 w-3 bg-green-500 rounded-full mr-3 animate-pulse"></span>
                            <span className="text-green-800 font-medium">E-Invoice Connected</span>
                        </div>
                        {/* Refresh button could go here */}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Manual Receipts */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="text-lg font-semibold text-gray-800">Manual Receipts</h3>
                        </div>
                        <ul className="divide-y divide-gray-100">
                            {receipts.length > 0 ? receipts.map((receipt) => (
                                <li key={receipt._id} className="hover:bg-gray-50 transition-colors p-4">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="font-medium text-gray-900">{receipt.title}</p>
                                            <p className="text-xs text-gray-500">{new Date(receipt.receipt_date).toLocaleDateString()}</p>
                                        </div>
                                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-semibold">
                                            {receipt.currency}
                                        </span>
                                    </div>
                                </li>
                            )) : (
                                <li className="p-8 text-center text-gray-400 text-sm">No receipts added yet.</li>
                            )}
                        </ul>
                    </div>

                    {/* E-Invoices */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="text-lg font-semibold text-gray-800">Latest E-Invoices</h3>
                        </div>
                        <ul className="divide-y divide-gray-100">
                            {isConnected && invoices.length > 0 ? invoices.map((invoice, idx) => (
                                <li key={idx} className="hover:bg-gray-50 transition-colors p-4">
                                    {/* Render invoice details based on API response structure */}
                                    <div className="flex justify-between">
                                        <p className="text-sm font-medium">{invoice.invNum || "Invoice"}</p>
                                        <p className="text-sm font-bold">{invoice.amount || 0}</p>
                                    </div>
                                </li>
                            )) : (
                                <li className="p-8 text-center text-gray-400 text-sm">
                                    {isConnected ? "No invoices found recently." : "Connect account to see invoices."}
                                </li>
                            )}
                        </ul>
                    </div>
                </div>

            </div>

            {/* Add Receipt Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" onClick={() => setShowAddModal(false)}>
                            <div className="absolute inset-0 bg-gray-900 opacity-50 backdrop-blur-sm"></div>
                        </div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
                        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <div className="bg-white px-8 py-6">
                                <h3 className="text-xl font-bold text-gray-900 mb-6">Add New Receipt</h3>
                                <form onSubmit={handleAddReceipt} className="space-y-4">
                                    <Input
                                        label="Title/Merchant"
                                        name="title"
                                        value={newReceipt.title}
                                        onChange={(e) => setNewReceipt({ ...newReceipt, title: e.target.value })}
                                        required
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            label="Currency"
                                            name="currency"
                                            value={newReceipt.currency}
                                            onChange={(e) => setNewReceipt({ ...newReceipt, currency: e.target.value })}
                                            required
                                        />
                                        <Input
                                            label="Date"
                                            type="date"
                                            name="receipt_date"
                                            value={newReceipt.receipt_date}
                                            onChange={(e) => setNewReceipt({ ...newReceipt, receipt_date: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="mt-6 flex justify-end gap-3">
                                        <button
                                            type="button"
                                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                                            onClick={() => setShowAddModal(false)}
                                        >
                                            Cancel
                                        </button>
                                        <div className="w-32">
                                            <Button type="submit">Save</Button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Connect E-Invoice Modal */}
            {showConnectModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4">
                        <div className="fixed inset-0 bg-gray-900 opacity-50 backdrop-blur-sm" onClick={() => setShowConnectModal(false)}></div>
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md z-10 p-8 transform transition-all">
                            <h3 className="text-xl font-bold mb-4">Connect E-Invoice</h3>
                            <form onSubmit={handleConnect} className="space-y-4">
                                <Input
                                    label="Mobile Barcode / Username"
                                    name="einvoice_username"
                                    value={connectData.einvoice_username}
                                    onChange={(e) => setConnectData({ ...connectData, einvoice_username: e.target.value })}
                                    required
                                />
                                <Input
                                    label="Verification Code / Password"
                                    type="password"
                                    name="einvoice_password"
                                    value={connectData.einvoice_password}
                                    onChange={(e) => setConnectData({ ...connectData, einvoice_password: e.target.value })}
                                    required
                                />
                                <div className="pt-2 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                        onClick={() => setShowConnectModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <div className="w-32">
                                        <Button type="submit">Connect</Button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Dashboard;
