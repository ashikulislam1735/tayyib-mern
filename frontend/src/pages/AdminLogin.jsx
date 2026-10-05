import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminLogin() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(username, password);
            navigate('/admin');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="panel" style={{ maxWidth: 360, margin: '40px auto' }}>
            <h2>অ্যাডমিন লগইন</h2>
            {error && <p className="status-msg error">{error}</p>}
            <form onSubmit={handleSubmit}>
                <label>ইউজারনেম</label>
                <input value={username} onChange={(e) => setUsername(e.target.value)} required />
                <label>পাসওয়ার্ড</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button className="btn-primary" style={{ marginTop: 16 }} type="submit" disabled={loading}>
                    {loading ? 'লগইন হচ্ছে...' : 'লগইন করুন'}
                </button>
            </form>
        </div>
    );
}
