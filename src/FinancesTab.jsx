import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { DollarSign, TrendingDown, Calendar, Plus, Trash2 } from 'lucide-react';

export default function FinancesTab() {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);

    // Form state
    const [newExpense, setNewExpense] = useState({
        date: new Date().toISOString().split('T')[0],
        item: '',
        category: 'software',
        amount: '',
        recurring: 'no',
        notes: ''
    });

    useEffect(() => {
        loadExpenses();
    }, []);

    const loadExpenses = async () => {
        try {
            const { data, error } = await supabase
                .from('app_expenses')
                .select('*')
                .order('date', { ascending: false });

            if (error) throw error;
            setExpenses(data || []);
        } catch (err) {
            console.error('Error loading expenses:', err);
        } finally {
            setLoading(false);
        }
    };

    const addExpense = async () => {
        if (!newExpense.item || !newExpense.amount) {
            alert('Please fill in item and amount');
            return;
        }

        try {
            const { error } = await supabase
                .from('app_expenses')
                .insert({
                    date: newExpense.date,
                    item: newExpense.item,
                    category: newExpense.category,
                    amount: parseFloat(newExpense.amount),
                    recurring: newExpense.recurring,
                    notes: newExpense.notes
                });

            if (error) throw error;

            setShowAddForm(false);
            setNewExpense({
                date: new Date().toISOString().split('T')[0],
                item: '',
                category: 'software',
                amount: '',
                recurring: 'no',
                notes: ''
            });
            loadExpenses();
        } catch (err) {
            console.error('Error adding expense:', err);
            alert('Failed to add expense');
        }
    };

    const deleteExpense = async (id) => {
        if (!confirm('Delete this expense?')) return;

        try {
            const { error } = await supabase
                .from('app_expenses')
                .delete()
                .eq('id', id);

            if (error) throw error;
            loadExpenses();
        } catch (err) {
            console.error('Error deleting expense:', err);
            alert('Failed to delete expense');
        }
    };

    // Calculate totals
    const monthlyRecurring = expenses
        .filter(e => e.recurring === 'monthly')
        .reduce((sum, e) => sum + Math.abs(e.amount), 0);

    const annualRecurring = expenses
        .filter(e => e.recurring === 'annually')
        .reduce((sum, e) => sum + Math.abs(e.amount), 0);

    const oneTimeExpenses = expenses
        .filter(e => e.recurring === 'no')
        .reduce((sum, e) => sum + Math.abs(e.amount), 0);

    const totalMonthly = monthlyRecurring + (annualRecurring / 12);
    const totalSpent = expenses.reduce((sum, e) => sum + Math.abs(e.amount), 0);

    if (loading) {
        return <div className="text-[var(--soup-dark)] font-bold italic animate-pulse p-8">Loading finances... 💸</div>;
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            {/* Header: burn rate only (no budget or cash reserves) */}
            <div className="bg-white p-8 rounded-[32px] border border-black/5 shadow-sm relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div>
                        <h2 className="text-3xl font-black text-[var(--soup-dark)] tracking-tight mb-2">
                            Finances 💸
                        </h2>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500 font-bold">Monthly burn:</span>
                            <span className="text-2xl font-black text-[var(--soup-dark)]">${totalMonthly.toFixed(2)}</span>
                        </div>
                        <p className="text-xs text-gray-400 font-bold mt-1">Recurring (monthly + annual/12) from expenses below</p>
                    </div>

                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="px-6 py-3 bg-[var(--soup-dark)] text-white rounded-xl font-black hover:scale-105 transition-all flex items-center gap-2 shadow-lg hover:shadow-xl"
                    >
                        <Plus size={20} />
                        Add Expense
                    </button>
                </div>
            </div>

            {/* Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-3xl p-6 border border-black/5 shadow-sm group hover:-translate-y-1 transition-all">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-3 bg-blue-50 rounded-2xl group-hover:scale-110 transition-transform">
                            <DollarSign size={20} className="text-blue-500" />
                        </div>
                        <div className="text-xs font-black text-gray-400 uppercase tracking-wider">Total Spent</div>
                    </div>
                    <div className="text-4xl font-black text-[var(--soup-dark)] tracking-tight">
                        ${totalSpent.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500 font-bold mt-2">
                        Lifetime spend
                    </div>
                </div>

                <div className="bg-white rounded-3xl p-6 border border-black/5 shadow-sm group hover:-translate-y-1 transition-all">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-3 bg-orange-50 rounded-2xl group-hover:scale-110 transition-transform">
                            <Calendar size={20} className="text-orange-500" />
                        </div>
                        <div className="text-xs font-black text-gray-400 uppercase tracking-wider">Recurring</div>
                    </div>
                    <div className="text-4xl font-black text-[var(--soup-dark)] tracking-tight">
                        ${monthlyRecurring.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500 font-bold mt-2">
                        Monthly subscriptions
                    </div>
                </div>

                <div className="bg-white rounded-3xl p-6 border border-black/5 shadow-sm group hover:-translate-y-1 transition-all">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-3 bg-purple-50 rounded-2xl group-hover:scale-110 transition-transform">
                            <TrendingDown size={20} className="text-purple-500" />
                        </div>
                        <div className="text-xs font-black text-gray-400 uppercase tracking-wider">One-Time</div>
                    </div>
                    <div className="text-4xl font-black text-[var(--soup-dark)] tracking-tight">
                        ${oneTimeExpenses.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500 font-bold mt-2">
                        Hardware & setup costs
                    </div>
                </div>
            </div>

            {/* Add Expense Form */}
            {showAddForm && (
                <div className="mb-8 bg-white rounded-3xl p-6 border border-black/5 shadow-sm">
                    <h3 className="text-lg font-black text-[var(--soup-dark)] mb-4">Add New Expense</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase mb-2">Date</label>
                            <input
                                type="date"
                                value={newExpense.date}
                                onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--soup-turquoise)] focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase mb-2">Item</label>
                            <input
                                type="text"
                                value={newExpense.item}
                                onChange={(e) => setNewExpense({ ...newExpense, item: e.target.value })}
                                placeholder="e.g. Supabase Pro"
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--soup-turquoise)] focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase mb-2">Category</label>
                            <select
                                value={newExpense.category}
                                onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--soup-turquoise)] focus:border-transparent"
                            >
                                <option value="software">Software</option>
                                <option value="hardware">Hardware</option>
                                <option value="marketing">Marketing</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase mb-2">Amount ($)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={newExpense.amount}
                                onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                                placeholder="25.00"
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--soup-turquoise)] focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase mb-2">Recurring?</label>
                            <select
                                value={newExpense.recurring}
                                onChange={(e) => setNewExpense({ ...newExpense, recurring: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--soup-turquoise)] focus:border-transparent"
                            >
                                <option value="no">No</option>
                                <option value="monthly">Monthly</option>
                                <option value="annually">Annually</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase mb-2">Notes</label>
                            <input
                                type="text"
                                value={newExpense.notes}
                                onChange={(e) => setNewExpense({ ...newExpense, notes: e.target.value })}
                                placeholder="Optional notes"
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--soup-turquoise)] focus:border-transparent"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                        <button
                            onClick={addExpense}
                            className="px-6 py-2 bg-[var(--soup-turquoise)] text-white rounded-xl font-black hover:scale-105 transition-all"
                        >
                            Save Expense
                        </button>
                        <button
                            onClick={() => setShowAddForm(false)}
                            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-xl font-black hover:scale-105 transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Expenses Table */}
            <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-black text-gray-400 uppercase">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-black text-gray-400 uppercase">Item</th>
                                <th className="px-6 py-3 text-left text-xs font-black text-gray-400 uppercase">Category</th>
                                <th className="px-6 py-3 text-right text-xs font-black text-gray-400 uppercase">Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-black text-gray-400 uppercase">Recurring</th>
                                <th className="px-6 py-3 text-left text-xs font-black text-gray-400 uppercase">Notes</th>
                                <th className="px-6 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {expenses.map((expense) => (
                                <tr key={expense.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-bold text-gray-600">
                                        {new Date(expense.date).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-[var(--soup-dark)]">
                                        {expense.item}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold capitalize">
                                            {expense.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-black text-red-600">
                                        -${Math.abs(expense.amount).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4">
                                        {expense.recurring !== 'no' && (
                                            <span className="px-2 py-1 bg-orange-100 text-orange-600 rounded-lg text-xs font-bold capitalize">
                                                {expense.recurring}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {expense.notes}
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => deleteExpense(expense.id)}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
