// সাধারণ CSV পার্সার — কোটেশন, কমার ভেতরে কমা, ঘরের ভেতরে নতুন লাইন, BOM (Excel) সামলায়
export const COLUMNS = [
    'title', 'category', 'subCategory', 'shortDescription', 'description', 'icon',
    'images', 'videoUrl', 'variantLabel', 'price', 'originalPrice', 'stock',
];
const REQUIRED = ['title', 'category', 'variantLabel', 'price'];

export function parseCSV(input) {
    const text = String(input).replace(/^\uFEFF/, '');
    const first = text.split(/\r?\n/)[0] || '';
    const delim = first.includes('\t') ? '\t' : first.split(';').length > first.split(',').length ? ';' : ',';

    const rows = [];
    let row = [];
    let cell = '';
    let inQ = false;
    let line = 1;
    let rowLine = 1;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inQ) {
            if (ch === '"') {
                if (text[i + 1] === '"') { cell += '"'; i++; } else inQ = false;
            } else {
                if (ch === '\n') line++;
                cell += ch;
            }
        } else if (ch === '"') {
            inQ = true;
        } else if (ch === delim) {
            row.push(cell); cell = '';
        } else if (ch === '\n' || ch === '\r') {
            if (ch === '\r' && text[i + 1] === '\n') i++;
            row.push(cell); cell = '';
            rows.push({ cells: row, line: rowLine });
            row = []; line++; rowLine = line;
        } else {
            cell += ch;
        }
    }
    if (cell !== '' || row.length > 0) {
        row.push(cell);
        rows.push({ cells: row, line: rowLine });
    }
    return rows;
}

// CSV টেক্সট → { rows: [{title, ..., _line}], problem: 'মেসেজ' | '' , unknown: [অচেনা কলাম] }
export function csvToRows(text) {
    const all = parseCSV(text).filter((r) => r.cells.some((c) => c.trim() !== ''));
    if (all.length < 2) return { rows: [], problem: 'ফাইলে হেডার ও অন্তত একটা সারি থাকতে হবে', unknown: [] };

    const lookup = new Map(COLUMNS.map((c) => [c.toLowerCase(), c]));
    const headers = all[0].cells.map((h) => lookup.get(h.trim().toLowerCase()) || null);
    const unknown = all[0].cells.filter((h, i) => !headers[i] && h.trim() !== '').map((h) => h.trim());

    const missing = REQUIRED.filter((c) => !headers.includes(c));
    if (missing.length > 0) {
        return { rows: [], problem: `এই কলামগুলো নেই: ${missing.join(', ')} — নমুনা ফাইলের হেডার ঠিক রাখুন`, unknown };
    }

    const rows = all.slice(1).map((r) => {
        const obj = { _line: r.line };
        headers.forEach((h, i) => { if (h) obj[h] = (r.cells[i] ?? '').trim(); });
        return obj;
    });
    return { rows, problem: '', unknown };
}

// Excel-এ বাংলা ঠিকভাবে খোলার জন্য BOM সহ নমুনা CSV
export function sampleCSV() {
    const lines = [
        COLUMNS.join(','),
        'খাঁটি সুন্দরবনের মধু,মধু,,সুন্দরবনের খাঁটি মধু,"১০০% খাঁটি, প্রাকৃতিক মধু।",🍯,,,৫০০ গ্রাম,850,950,35',
        'খাঁটি সুন্দরবনের মধু,মধু,,,,,,,১ কেজি,1600,1800,20',
        'আজওয়া খেজুর,খেজুর,সৌদি,মদিনার আজওয়া,,🌴,,,৫০০ গ্রাম,1200,,25',
    ];
    return '\uFEFF' + lines.join('\r\n') + '\r\n';
}
