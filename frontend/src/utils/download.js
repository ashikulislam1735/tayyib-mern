// CSV ফাইল ডাউনলোড (Excel-এ বাংলা ঠিকমতো খোলার জন্য শুরুতে BOM দেওয়া হয়)
// rows: তালিকার তালিকা — সংখ্যা ও লেখা মিশিয়ে দেওয়া যায়
function cell(v) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
    let s = String(v);
    // Excel-এ সূত্র (formula) হিসেবে চালু হওয়া ঠেকাতে: = + - @ দিয়ে শুরু হলে সামনে ' বসানো
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
}

export function downloadCsv(filename, rows) {
    const text = rows.map((r) => r.map(cell).join(',')).join('\r\n');
    const blob = new Blob([`\uFEFF${text}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

// ঢাকার সময়ে আজকের তারিখ (YYYY-MM-DD) ও এখনকার সময়
export const dhakaDate = (d = new Date()) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
export const dhakaDateTime = (d) => new Date(d).toLocaleString('sv-SE', { timeZone: 'Asia/Dhaka' });
