import mongoose from 'mongoose';

// অর্ডারে transaction (স্টক কমা + কুপন + অর্ডার সেভ একসাথে) নিরাপদে চালু করার ব্যবস্থা।
// .env-এ USE_TRANSACTIONS=true দিলে সার্ভার চালুর সময় ডাটাবেজ পরীক্ষা করে দেখে transaction চালানো যায় কি না:
//   • replica set / Atlas (MongoDB ৪.০+) হলে → transaction চালু
//   • একক MongoDB বা পুরোনো ভার্সন হলে → অর্ডার আগের পদ্ধতিতেই হয় (বন্ধ হয় না), লগে সতর্কবার্তা আসে
let supported = false;

const wanted = () => process.env.USE_TRANSACTIONS === 'true';

// অর্ডারের কোড এটা দেখে সিদ্ধান্ত নেয়
export const useTransactions = () => wanted() && supported;

async function serverInfo() {
    const admin = mongoose.connection.db.admin();
    try {
        return await admin.command({ hello: 1 });
    } catch {
        return admin.command({ isMaster: 1 }); // পুরোনো MongoDB-তে hello নেই
    }
}

// সার্ভার চালুর সময় একবার চালাতে হয় (ডাটাবেজ কানেক্ট হওয়ার পর)
export async function detectTransactions() {
    if (!wanted()) {
        console.log('ℹ️ অর্ডারে transaction বন্ধ (USE_TRANSACTIONS=true দিলে চালু হবে)');
        return false;
    }
    try {
        const info = await serverInfo();
        const sharded = info.msg === 'isdbgrid';
        const replica = Boolean(info.setName);
        const minWire = sharded ? 8 : 7; // replica set-এ MongoDB ৪.০ (wire ৭), sharded-এ ৪.২ (wire ৮)
        supported = (replica || sharded) && Number(info.maxWireVersion) >= minWire;
        if (supported) {
            console.log('✅ অর্ডারে transaction চালু আছে');
        } else if (!replica && !sharded) {
            console.warn('⚠️ USE_TRANSACTIONS=true দেওয়া আছে, কিন্তু ডাটাবেজ replica set নয় — transaction ছাড়াই অর্ডার চলবে। (Atlas বা replica set লাগে)');
        } else {
            console.warn('⚠️ USE_TRANSACTIONS=true দেওয়া আছে, কিন্তু MongoDB ভার্সন পুরোনো — transaction ছাড়াই অর্ডার চলবে।');
        }
    } catch (e) {
        supported = false;
        console.warn('⚠️ transaction চালানো যাবে কি না যাচাই করা যায়নি, transaction ছাড়াই চলবে:', e.message);
    }
    return supported;
}
