import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';

function todayInDhaka() {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date());
}

function money(value) {
    return `৳${Number(value || 0).toLocaleString('en-BD', { maximumFractionDigits: 2 })}`;
}

export default function AdminExpenses() {
    const [expenses, setExpenses] = useState([]);
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [category, setCategory] = useState('');
    const [date, setDate] = useState(todayInDhaka);
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    async function loadExpenses(filters = {}) {
        setLoading(true);
        setError('');
        try {
            setExpenses(await api.getExpenses(filters));
        } catch (err) {
            setError(err.message || 'খরচের তালিকা আনা যায়নি');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadExpenses();
    }, []);

    const total = useMemo(
        () => expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
        [expenses],
    );

    async function handleSubmit(event) {
        event.preventDefault();
        setError('');
        setMessage('');
        const parsedAmount = Number(amount);
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            setError('শূন্যের বেশি সঠিক খরচের পরিমাণ দিন।');
            return;
        }
        if (note.trim().length > 200 || category.trim().length > 40) {
            setError('বিবরণ সর্বোচ্চ ২০০ এবং খরচের ধরন সর্বোচ্চ ৪০ অক্ষরের হতে হবে।');
            return;
        }
        setSaving(true);
        try {
            await api.createExpense({
                amount: parsedAmount,
                note: note.trim(),
                category: category.trim(),
                date,
            });
            setAmount('');
            setNote('');
            setCategory('');
            setMessage('খরচ সফলভাবে যোগ হয়েছে।');
            await loadExpenses({ from, to });
        } catch (err) {
            setError(err.message || 'খরচ যোগ করা যায়নি');
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(expense) {
        const label = expense.note || expense.category || 'এই খরচ';
        if (!window.confirm(`${label} — ${money(expense.amount)} মুছে ফেলতে চান?`)) return;
        setError('');
        setMessage('');
        try {
            await api.deleteExpense(expense._id);
            setExpenses((current) => current.filter((item) => item._id !== expense._id));
            setMessage('খরচ মুছে ফেলা হয়েছে।');
        } catch (err) {
            setError(err.message || 'খরচ মুছে ফেলা যায়নি');
        }
    }

    function handleFilter(event) {
        event.preventDefault();
        if (from && to && from > to) {
            setError('শুরুর তারিখ শেষের তারিখের পরে হতে পারবে না।');
            return;
        }
        setMessage('');
        loadExpenses({ from, to });
    }

    return (
        <div>
            <h2 className="page-title">খরচের হিসাব</h2>
            <p className="page-sub">দোকানের খরচ যোগ করুন এবং তারিখ অনুযায়ী তালিকা দেখুন।</p>

            {error && <p className="status-msg error" role="alert">{error}</p>}
            {message && <p className="status-msg" role="status">{message}</p>}

            <form className="panel expense-form" onSubmit={handleSubmit}>
                <h3>নতুন খরচ যোগ করুন</h3>
                <div className="expense-form-grid">
                    <label>খরচের পরিমাণ (৳)
                        <input type="number" min="0.01" max="1000000000" step="0.01" required value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="যেমন: ৫০০" />
                    </label>
                    <label>খরচের ধরন
                        <input type="text" maxLength="40" value={category} onChange={(event) => setCategory(event.target.value)} placeholder="যেমন: প্যাকেজিং" />
                    </label>
                    <label>তারিখ
                        <input type="date" required value={date} onChange={(event) => setDate(event.target.value)} />
                    </label>
                    <label className="expense-note-field">বিবরণ
                        <input type="text" maxLength="200" value={note} onChange={(event) => setNote(event.target.value)} placeholder="খরচের সংক্ষিপ্ত বিবরণ" />
                    </label>
                </div>
                <button className="btn-primary" type="submit" disabled={saving}>{saving ? 'সংরক্ষণ হচ্ছে...' : 'খরচ সংরক্ষণ করুন'}</button>
            </form>

            <section className="panel expense-list-panel">
                <div className="expense-list-heading">
                    <h3>খরচের তালিকা</h3>
                    <strong>মোট: {money(total)}</strong>
                </div>
                <form className="expense-filter" onSubmit={handleFilter}>
                    <label>শুরুর তারিখ<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
                    <label>শেষের তারিখ<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
                    <button className="btn-primary" type="submit">ফিল্টার করুন</button>
                    <button className="link-btn" type="button" onClick={() => { setFrom(''); setTo(''); loadExpenses(); }}>সব খরচ দেখুন</button>
                </form>
                {loading ? <p className="status-msg">খরচের তালিকা লোড হচ্ছে...</p> : expenses.length === 0 ? (
                    <p>এই সময়সীমায় কোনো খরচ পাওয়া যায়নি।</p>
                ) : (
                    <div className="expense-list">
                        {expenses.map((expense) => (
                            <div className="expense-row" key={expense._id}>
                                <div className="expense-details">
                                    <strong>{expense.note || expense.category || 'খরচ'}</strong>
                                    <span>{expense.category && expense.note ? expense.category + ' · ' : ''}{new Date(expense.date).toLocaleDateString('bn-BD', { timeZone: 'Asia/Dhaka', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                </div>
                                <strong className="expense-amount">{money(expense.amount)}</strong>
                                <button className="expense-delete" type="button" onClick={() => handleDelete(expense)}>মুছুন</button>
                            </div>
                        ))}
                    </div>
                )}
                <p className="report-muted">একবারে সর্বশেষ ৫০০টি খরচ দেখানো হয়।</p>
            </section>
        </div>
    );
}
