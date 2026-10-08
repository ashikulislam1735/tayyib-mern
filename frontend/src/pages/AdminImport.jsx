import { useState } from 'react';
import { api } from '../api';
import { csvToRows, sampleCSV } from '../utils/csv';

export default function AdminImport() {
    const [fileName, setFileName] = useState('');
    const [rows, setRows] = useState([]);
    const [problem, setProblem] = useState('');
    const [unknown, setUnknown] = useState([]);
    const [check, setCheck] = useState(null);   // সার্ভারের যাচাইয়ের ফল
    const [done, setDone] = useState(null);     // ইমপোর্ট শেষের ফল
    const [busy, setBusy] = useState(false);

    function downloadSample() {
        const blob = new Blob([sampleCSV()], { type: 'text/csv;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'products-sample.csv';
        a.click();
        URL.revokeObjectURL(a.href);
    }

    async function handleFile(e) {
        const file = e.target.files && e.target.files[0];
        e.target.value = '';
        setCheck(null); setDone(null); setRows([]); setProblem(''); setUnknown([]);
        if (!file) return;
        setFileName(file.name);
        const text = await file.text();
        const res = csvToRows(text);
        setRows(res.rows);
        setProblem(res.problem);
        setUnknown(res.unknown);
    }

    async function run(dryRun) {
        setBusy(true);
        try {
            const res = await api.importProducts(rows, dryRun);
            if (dryRun) setCheck(res);
            else { setDone(res); setCheck(null); setRows([]); setFileName(''); }
        } catch (err) {
            alert(err.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="panel">
            <h3 style={{ marginTop: 0 }}>CSV দিয়ে একসাথে অনেক প্রোডাক্ট</h3>
            <ol style={{ paddingLeft: 20, lineHeight: 1.7, fontSize: 14 }}>
                <li>নিচের বাটনে নমুনা ফাইল নামান, Excel-এ খুলুন, নিজের প্রোডাক্ট দিয়ে ভরুন।</li>
                <li>Excel-এ <strong>Save As → CSV UTF-8</strong> বেছে সেভ করুন (সাধারণ "CSV" বাছলে বাংলা ভেঙে যেতে পারে)।</li>
                <li>ফাইলটা এখানে দিন → <strong>যাচাই করুন</strong> → সব ঠিক থাকলে <strong>ইমপোর্ট করুন</strong>।</li>
            </ol>
            <p style={{ fontSize: 13, color: 'var(--walnut-soft)' }}>
                প্রতিটা সারি = একটা সাইজ/ভ্যারিয়েন্ট। একই প্রোডাক্টের একাধিক সাইজ থাকলে একই title ও category দিয়ে আলাদা সারি লিখুন।
                আগে থেকে থাকা প্রোডাক্ট (একই title + category) বাদ যাবে, দুবার ঢুকবে না।
                ছবি পরে প্রোডাক্ট এডিট থেকে দিতে পারবেন, অথবা images কলামে লিংক দিন (একাধিক হলে | দিয়ে আলাদা)।
            </p>

            <button className="btn-primary" style={{ width: 'auto', padding: '8px 16px', background: 'var(--walnut-soft)' }} onClick={downloadSample}>
                ⬇ নমুনা CSV নামান
            </button>

            <label style={{ marginTop: 16 }}>আপনার CSV ফাইল</label>
            <input type="file" accept=".csv,text/csv" onChange={handleFile} disabled={busy} />

            {problem && <p className="status-msg error">{problem}</p>}
            {unknown.length > 0 && <p style={{ fontSize: 13 }}>অচেনা কলাম বাদ দেওয়া হবে: {unknown.join(', ')}</p>}

            {rows.length > 0 && !check && (
                <div style={{ marginTop: 14 }}>
                    <p><strong>{fileName}</strong> — {rows.length}টি সারি পাওয়া গেছে।</p>
                    <button className="btn-primary" style={{ width: 'auto', padding: '8px 18px' }} disabled={busy} onClick={() => run(true)}>
                        {busy ? 'যাচাই হচ্ছে...' : 'যাচাই করুন'}
                    </button>
                </div>
            )}

            {check && !check.ok && (
                <div style={{ marginTop: 14 }}>
                    <p className="status-msg error">
                        {check.errorCount}টি ভুল পাওয়া গেছে — কিছুই ঢোকানো হয়নি। ফাইল ঠিক করে আবার দিন।
                    </p>
                    <ul style={{ fontSize: 14, lineHeight: 1.7 }}>
                        {check.errors.map((er, i) => (
                            <li key={i}>লাইন {er.line}: {er.message}</li>
                        ))}
                    </ul>
                    {check.errorCount > check.errors.length && <p style={{ fontSize: 13 }}>(প্রথম {check.errors.length}টি দেখানো হলো)</p>}
                </div>
            )}

            {check && check.ok && (
                <div style={{ marginTop: 14 }}>
                    <p>✅ ফাইল ঠিক আছে। নতুন ঢুকবে <strong>{check.newCount}টি প্রোডাক্ট</strong> ({check.variantCount}টি ভ্যারিয়েন্ট)।</p>
                    {check.skipped.length > 0 && (
                        <p style={{ fontSize: 13 }}>আগে থেকে আছে বলে বাদ যাবে ({check.skipped.length}টি): {check.skipped.join(', ')}</p>
                    )}
                    {check.newCount > 0 ? (
                        <button className="btn-primary" style={{ width: 'auto', padding: '8px 18px' }} disabled={busy} onClick={() => run(false)}>
                            {busy ? 'ঢোকানো হচ্ছে...' : `ইমপোর্ট করুন (${check.newCount}টি)`}
                        </button>
                    ) : (
                        <p className="status-msg">নতুন কিছু নেই।</p>
                    )}
                </div>
            )}

            {done && (
                <p className="status-msg" style={{ marginTop: 14 }}>
                    ✅ {done.newCount}টি প্রোডাক্ট ইমপোর্ট হয়েছে। প্রোডাক্ট পেজে গিয়ে দেখুন।
                </p>
            )}
        </div>
    );
}
